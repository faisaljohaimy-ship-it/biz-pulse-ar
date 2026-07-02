/**
 * GlobalAriaCopilot — the permanent floating ARIA assistant available on
 * EVERY page of NEXIOS AI OS (mounted once in `__root.tsx`).
 *
 * Architecture rules:
 * - Mounts exactly once at the root. Conversation state, voice prefs,
 *   open/collapsed UI state all persist across route navigation via
 *   React state + `localStorage` (no remount).
 * - Defers to the authenticated `AriaDock` (Digital Human surface)
 *   whenever it is mounted: `AriaDock` sets `window.__aria_dock = true`
 *   on mount; this copilot hides itself in that case to avoid two
 *   ARIA presences on the same screen.
 * - Uses the public `/api/public/aria-ask` (GPT-5) endpoint so it works
 *   for unauthenticated landing-page visitors AND authenticated users.
 *   Falls back gracefully on rate-limit / network failure.
 * - Voice via `/api/public/aria-tts` (ElevenLabs, Sarah multilingual).
 * - Route-aware: shows contextual quick prompts derived from the
 *   current pathname so executives can launch the most likely query
 *   in one click.
 * - Welcome message fires ONCE per browser session (sessionStorage).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowUp,
  Loader2,
  MessageSquare,
  Sparkles,
  User,
  Volume2,
  VolumeX,
  Minus,
  X,
  ArrowRight,
  Mic,
  MicOff,
} from "lucide-react";
import ariaHologram from "@/assets/aria-hologram.png.asset.json";
import { useAriaSnapshot } from "@/lib/aria/context-engine";
import { ariaSessionMemory } from "@/lib/aria/session-memory";
import { resolvePersona } from "@/lib/aria/personas";
import {
  ExecutiveEvidencePanel,
  type ExecutivePayload,
  type ExecutiveDecision,
} from "./ExecutiveEvidencePanel";
import {
  STAGE_DESCRIPTORS,
  stageFromElapsed,
  type ConversationStage,
} from "@/lib/aria/conversation-stages";
import { Pin, PinOff, EyeOff, Eye } from "lucide-react";

type AskResult = { text_ar: string; text_en: string };
type BriefingLite = {
  health?: { openIncidents?: number; alerts24h?: number; overdueWorkOrders?: number; patrolsDoneToday?: number; patrolsPlannedToday?: number };
  priorities?: Array<{ severity?: string }>;
  greeting_ar?: string;
  greeting_en?: string;
};
type QuickAction = { label_ar: string; label_en: string; to: string };
type Turn = {
  id: string;
  question: string;
  qLang: "ar" | "en";
  answer?: AskResult;
  executive?: ExecutivePayload;
  stage: ConversationStage;
  startedAt?: number;
  error?: string;
};

const OPEN_KEY = "aria-copilot-open";
const VOICE_KEY = "aria-copilot-voice";
const PIN_KEY = "aria-copilot-pinned";
const HIDDEN_KEY = "aria-copilot-hidden";
const WELCOMED_KEY = "aria-copilot-welcomed-v2";
const WELCOME_TOAST_KEY = "aria-copilot-welcome-toast-v2";

const QUICK_ACTIONS: QuickAction[] = [
  { label_ar: "غرفة العمليات", label_en: "Operations", to: "/operations" },
  { label_ar: "التقارير التنفيذية", label_en: "Exec Reports", to: "/executive-reports" },
  { label_ar: "منظومة الحج", label_en: "Hajj Ops", to: "/hajj" },
  { label_ar: "الأمن الصناعي", label_en: "Security", to: "/sec" },
];

function isArabic(s: string) {
  return /[\u0600-\u06FF]/.test(s);
}

function cleanForVoice(s: string) {
  return s
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1100);
}

type PageCtx = {
  label_ar: string;
  label_en: string;
  prompts_ar: string[];
  prompts_en: string[];
};

const ROUTE_CTX: { match: (p: string) => boolean; ctx: PageCtx }[] = [
  {
    match: (p) => p === "/" || p.startsWith("/runtime-hub"),
    ctx: {
      label_ar: "الصفحة الرئيسية",
      label_en: "Home",
      prompts_ar: [
        "أعطني ملخصاً تنفيذياً لـ نكسيوس.",
        "كيف يدعم النظام رؤية 2030؟",
        "ما المميزات الرئيسية للمنصة؟",
      ],
      prompts_en: [
        "Give me a 30-second executive brief.",
        "How does NEXIOS support Vision 2030?",
        "What are the platform's core capabilities?",
      ],
    },
  },
  {
    match: (p) => p.startsWith("/hajj"),
    ctx: {
      label_ar: "منظومة الحج",
      label_en: "Hajj Operations",
      prompts_ar: [
        "ما حالة عمليات الحج الآن؟",
        "أعطني ملخص مؤشرات المشاعر.",
        "ما المخاطر الحرجة في هذه اللحظة؟",
      ],
      prompts_en: [
        "Status of Hajj operations now?",
        "Summarize Mashaer KPIs.",
        "What are the critical risks right now?",
      ],
    },
  },
  {
    match: (p) => p.startsWith("/operations") || p.startsWith("/command"),
    ctx: {
      label_ar: "غرفة العمليات",
      label_en: "Operations Center",
      prompts_ar: [
        "ما البلاغات المفتوحة الحرجة؟",
        "أعطني تقرير الوردية الحالية.",
        "ما الأصول التي تحتاج تدخلاً عاجلاً؟",
      ],
      prompts_en: [
        "Open critical incidents?",
        "Brief me on the current shift.",
        "Which assets need urgent action?",
      ],
    },
  },
  {
    match: (p) => p.startsWith("/executive-reports") || p.startsWith("/exec"),
    ctx: {
      label_ar: "التقارير التنفيذية",
      label_en: "Executive Reports",
      prompts_ar: [
        "أنشئ ملخص اليوم التنفيذي.",
        "حلّل آخر تقرير صادر.",
        "ما اتجاهات الأداء الأسبوعية؟",
      ],
      prompts_en: [
        "Draft today's executive summary.",
        "Analyze the most recent report.",
        "What are the weekly performance trends?",
      ],
    },
  },
  {
    match: (p) => p.startsWith("/sec"),
    ctx: {
      label_ar: "الأمن الصناعي",
      label_en: "Industrial Security",
      prompts_ar: [
        "ما المخاطر الأمنية المفتوحة؟",
        "أعطني حالة الدوريات والتصاريح.",
        "اقترح خطة تحسين أسبوعية.",
      ],
      prompts_en: [
        "Open security risks?",
        "Patrol and permit status?",
        "Suggest a weekly improvement plan.",
      ],
    },
  },
  {
    match: (p) => /\/risk/.test(p),
    ctx: {
      label_ar: "لوحة المخاطر",
      label_en: "Risk Register",
      prompts_ar: [
        "ما أعلى ٥ مخاطر مفتوحة؟",
        "اقترح خطة تخفيف للأكثر حرجاً.",
        "ما الاتجاه الأسبوعي للمخاطر؟",
      ],
      prompts_en: [
        "Top 5 open risks right now?",
        "Suggest a mitigation for the most critical.",
        "Weekly risk trend?",
      ],
    },
  },
  {
    match: (p) => /\/patrol/.test(p),
    ctx: {
      label_ar: "الدوريات",
      label_en: "Patrols",
      prompts_ar: [
        "أي دوريات فاتها الموعد؟",
        "أعطني نسبة إنجاز الدوريات اليوم.",
        "أظهر انحرافات المسار الأخيرة.",
      ],
      prompts_en: [
        "Which patrols are overdue?",
        "Today's patrol completion rate?",
        "Show recent route deviations.",
      ],
    },
  },
  {
    match: (p) => /\/(employees|hr|workforce)/.test(p),
    ctx: {
      label_ar: "الموارد البشرية",
      label_en: "Workforce",
      prompts_ar: [
        "من الموظف الأعلى أداءً هذا الأسبوع؟",
        "ما فجوات التدريب الحالية؟",
        "أعطني ملخص الحضور اليوم.",
      ],
      prompts_en: [
        "Top performer this week?",
        "Current training gaps?",
        "Today's attendance summary.",
      ],
    },
  },
];

const DEFAULT_CTX: PageCtx = {
  label_ar: "النظام",
  label_en: "Platform",
  prompts_ar: [
    "بماذا تساعدني هذه الصفحة؟",
    "أعطني ملخصاً تنفيذياً سريعاً.",
    "ما الإجراء المقترح التالي؟",
  ],
  prompts_en: [
    "What can this page do for me?",
    "Give me a quick executive brief.",
    "What's the recommended next action?",
  ],
};

function resolvePageCtx(pathname: string): PageCtx {
  return ROUTE_CTX.find((r) => r.match(pathname))?.ctx ?? DEFAULT_CTX;
}

export function GlobalAriaCopilot() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const snap = useAriaSnapshot();
  const [mounted, setMounted] = useState(false);
  const [hideForAuthDock, setHideForAuthDock] = useState(false);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [lang, setLang] = useState<"ar" | "en">("en");
  const [pinned, setPinned] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [welcomeToast, setWelcomeToast] = useState<null | { ar: string; en: string }>(null);
  const [listening, setListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const [interimText, setInterimText] = useState("");
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const briefingFiredRef = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const recogRef = useRef<unknown>(null);
  const askRef = useRef<((q: string) => void) | null>(null);

  const ctx = useMemo(() => resolvePageCtx(pathname), [pathname]);
  const persona = useMemo(() => resolvePersona(pathname), [pathname]);
  const ar = lang === "ar";

  // Derive Affected Departments from the current page + live widgets.
  // Pure derivation — no fetch, no fabrication. Falls back to route hint.
  const affectedDepartments = useMemo<string[]>(() => {
    const bag = new Set<string>();
    const p = pathname;
    if (p.startsWith("/sec") || p.startsWith("/operations")) bag.add("Industrial Security");
    if (p.startsWith("/hajj")) bag.add("Hajj Operations");
    if (p.startsWith("/executive-reports")) bag.add("Executive Office");
    if (p.startsWith("/hse")) bag.add("HSE");
    for (const w of snap.widgets.slice(0, 24)) {
      const hay = `${w.label ?? ""} ${w.hint ?? ""}`.toLowerCase();
      if (hay.includes("patrol") || hay.includes("دورية")) bag.add("Patrol Operations");
      if (hay.includes("incident") || hay.includes("بلاغ")) bag.add("Incident Response");
      if (hay.includes("permit") || hay.includes("تصريح")) bag.add("Permits & Compliance");
      if (hay.includes("hse") || hay.includes("سلامة")) bag.add("HSE");
      if (hay.includes("kpi") || hay.includes("مؤشر")) bag.add("Performance Office");
    }
    return Array.from(bag).slice(0, 5);
  }, [pathname, snap.widgets]);

  // Mount-only hydration of persisted UI state.
  useEffect(() => {
    setMounted(true);
    try {
      const o = localStorage.getItem(OPEN_KEY);
      if (o === "1") setOpen(true);
      const v = localStorage.getItem(VOICE_KEY);
      if (v === "0") setVoiceOn(false);
      if (localStorage.getItem(PIN_KEY) === "1") { setPinned(true); setOpen(true); }
      if (localStorage.getItem(HIDDEN_KEY) === "1") setHidden(true);
    } catch { /* noop */ }
    // Detect the authenticated AriaDock at mount-time AND every route change.
    const probe = () => {
      try {
        const w = window as unknown as { __aria_dock?: boolean };
        setHideForAuthDock(Boolean(w.__aria_dock));
      } catch { /* noop */ }
    };
    probe();
    const id = setInterval(probe, 1000);
    return () => clearInterval(id);
  }, []);

  // Persist open / voice / pin / hidden prefs.
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch { /* noop */ }
  }, [mounted, open]);
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(VOICE_KEY, voiceOn ? "1" : "0"); } catch { /* noop */ }
  }, [mounted, voiceOn]);
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(PIN_KEY, pinned ? "1" : "0"); } catch { /* noop */ }
  }, [mounted, pinned]);
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(HIDDEN_KEY, hidden ? "1" : "0"); } catch { /* noop */ }
  }, [mounted, hidden]);

  // Live Highlighting: pulse any [data-aria-widget-id="<id>"] when ARIA emits focus.
  useEffect(() => {
    if (!mounted) return;
    const onFocus = (e: Event) => {
      const detail = (e as CustomEvent<{ widgetIds?: string[] }>).detail;
      const ids = detail?.widgetIds ?? [];
      for (const id of ids) {
        const nodes = document.querySelectorAll<HTMLElement>(`[data-aria-widget-id="${CSS.escape(id)}"]`);
        nodes.forEach((n) => {
          n.classList.add("aria-focus-pulse");
          setTimeout(() => n.classList.remove("aria-focus-pulse"), 3600);
        });
      }
    };
    window.addEventListener("nexios:aria-focus", onFocus as EventListener);
    return () => window.removeEventListener("nexios:aria-focus", onFocus as EventListener);
  }, [mounted]);

  // Auto-scroll transcript.
  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  // Executive conversation stage ticker — advances the *current* in-flight
  // turn through listening → thinking → searching → reasoning → planning
  // based on real elapsed request time. Zero fake delay: the moment the
  // response resolves, `ask()` writes stage="done" and this ticker stops.
  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => {
      setTurns((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        if (last.stage === "done" || last.stage === "error" || !last.startedAt) return prev;
        const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - last.startedAt;
        const next = stageFromElapsed(elapsed);
        if (next === last.stage) return prev;
        const clone = prev.slice();
        clone[clone.length - 1] = { ...last, stage: next };
        return clone;
      });
    }, 220);
    return () => clearInterval(iv);
  }, [loading]);

  // Focus textarea when opened.
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Click-outside to minimize (respects pin).
  useEffect(() => {
    if (!open || pinned) return;
    const onDown = (ev: MouseEvent | TouchEvent) => {
      const el = panelRef.current;
      if (!el) return;
      const target = ev.target as Node | null;
      if (target && !el.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open, pinned]);

  // Detect Web Speech API availability (browser-native STT, no backend).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSttSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);


  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch { /* noop */ }
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    const clean = cleanForVoice(text);
    if (!clean) return;
    stopSpeaking();
    try {
      setSpeaking(true);
      const r = await fetch("/api/public/aria-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (!r.ok) { setSpeaking(false); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      try { await audio.play(); } catch { setSpeaking(false); URL.revokeObjectURL(url); }
    } catch {
      setSpeaking(false);
    }
  }, [stopSpeaking]);

  // Voice input via Web Speech API. Graceful fallback: mic button hidden
  // when unsupported; user still has full text input.
  const stopListening = useCallback(() => {
    const rec = recogRef.current as { stop?: () => void; abort?: () => void } | null;
    try { rec?.stop?.(); } catch { /* noop */ }
    recogRef.current = null;
    setListening(false);
    setInterimText("");
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => unknown;
      webkitSpeechRecognition?: new () => unknown;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    // Natural interruption: stop any speaking playback while user talks.
    stopSpeaking();
    try {
      const rec = new Ctor() as {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: (e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
      rec.lang = ar ? "ar-SA" : "en-US";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      let finalText = "";
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const seg = e.results[i];
          const txt = seg[0]?.transcript ?? "";
          if (seg.isFinal) finalText += txt;
          else interim += txt;
        }
        setInterimText(interim);
        if (interim) setQuestion(interim);
      };
      rec.onerror = () => {
        setListening(false);
        setInterimText("");
        recogRef.current = null;
      };
      rec.onend = () => {
        setListening(false);
        setInterimText("");
        recogRef.current = null;
        const finalQ = (finalText || "").trim();
        if (finalQ) {
          setQuestion("");
          const runner = askRef.current;
          if (runner) void runner(finalQ);
        }
      };
      recogRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
      recogRef.current = null;
    }
  }, [ar, stopSpeaking]);


  const ask = useCallback(async (q: string) => {
    const qt = q.trim();
    if (!qt) return;
    stopSpeaking();
    setLoading(true);
    const detected: "ar" | "en" = isArabic(qt) ? "ar" : "en";
    setLang(detected);
    const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    setTurns((p) => [...p, { id, question: qt, qLang: detected, stage: "listening", startedAt }]);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    // Persist the user turn into executive memory for cross-page recall.
    try { ariaSessionMemory.push({ role: "user", text: qt, page: pathname }); } catch { /* noop */ }
    // Assemble the live Executive Context payload from the global engine.
    const liveCtx = {
      page: {
        path: snap.page.path,
        title: snap.page.title,
        section: snap.page.section ?? ctx.label_en,
        filters: snap.page.filters ?? {},
        selected: snap.page.selected ?? null,
      },
      widgets: snap.widgets.slice(0, 24).map((w) => ({
        id: w.id, kind: w.kind, label: w.label, value: w.value, hint: w.hint,
      })),
      anchors: ariaSessionMemory.anchors().slice(-12),
      locale: snap.locale,
      persona: {
        id: persona.id,
        label: detected === "ar" ? persona.label_ar : persona.label_en,
        mission: detected === "ar" ? persona.mission_ar : persona.mission_en,
      },
    };
    const history = ariaSessionMemory.list().slice(-8).map((t) => ({
      role: t.role, text: t.text, ts: t.ts, anchors: t.anchors,
    }));
    try {
      const r = await fetch("/api/public/aria-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: qt,
          lang: detected,
          persona: persona.id,
          context: liveCtx,
          history,
        }),
        signal: ctrl.signal,
      });
      const j = (await r.json().catch(() => ({}))) as Partial<AskResult> & { error?: string; executive?: ExecutivePayload };
      if (!r.ok) throw new Error(j.error || `http_${r.status}`);
      const answer: AskResult = {
        text_ar: j.text_ar ?? "",
        text_en: j.text_en ?? "",
      };
      setTurns((p) => p.map((t) => (t.id === id ? { ...t, answer, executive: j.executive, stage: "done" } : t)));
      try { ariaSessionMemory.push({ role: "assistant", text: detected === "ar" ? answer.text_ar : answer.text_en, page: pathname }); } catch { /* noop */ }
      // Live Highlighting — pulse any registered widgets referenced in the answer.
      try {
        const spoken = (detected === "ar" ? answer.text_ar : answer.text_en) ?? "";
        const hay = spoken.toLowerCase();
        const matched = snap.widgets
          .filter((w) => w.label && hay.includes(w.label.toLowerCase()))
          .slice(0, 6)
          .map((w) => w.id);
        if (matched.length) {
          window.dispatchEvent(new CustomEvent("nexios:aria-focus", {
            detail: { widgetIds: matched, persona: persona.id },
          }));
        }
      } catch { /* noop */ }
      if (voiceOn) {
        const spoken = detected === "ar" ? answer.text_ar : answer.text_en;
        if (spoken) void speak(spoken);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error && e.message.includes("429")
        ? (detected === "ar" ? "الكثير من الطلبات — حاول بعد دقيقة." : "Too many requests — try again shortly.")
        : (detected === "ar" ? "تعذّر الاتصال بآريا الآن — أعد المحاولة." : "ARIA is unavailable right now — please retry.");
      setTurns((p) => p.map((t) => (t.id === id ? { ...t, error: msg, stage: "error" } : t)));
    } finally {
      setLoading(false);
    }
  }, [ctx.label_en, pathname, voiceOn, speak, stopSpeaking, snap, persona]);

  // Keep the STT closure pointed at the latest ask() reference.
  useEffect(() => { askRef.current = ask; }, [ask]);

  // Executive Welcome — fires once per browser session when the platform opens.
  // Runs whether the dock is open or collapsed; if collapsed we surface a
  // dismissible preview toast above the launcher so the executive still sees it.
  useEffect(() => {
    if (!mounted || briefingFiredRef.current) return;
    briefingFiredRef.current = true;
    let welcomed = false;
    try { welcomed = sessionStorage.getItem(WELCOMED_KEY) === "1"; } catch { /* noop */ }
    if (welcomed) return;
    const t = setTimeout(() => {
      void (async () => {
        let health: BriefingLite["health"] = undefined;
        let critical = 0;
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const r = await fetch("/api/public/aria-briefing", {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (r.ok) {
              const j = (await r.json()) as BriefingLite;
              health = j.health;
              critical = (j.priorities ?? []).filter((p) => (p.severity ?? "").toLowerCase() === "critical").length;
            }
          }
        } catch { /* noop */ }
        const openInc = health?.openIncidents ?? 0;
        const done = health?.patrolsDoneToday ?? 0;
        const planned = health?.patrolsPlannedToday ?? 0;
        const healthPct = planned > 0 ? Math.max(0, Math.min(100, Math.round((done / planned) * 100))) : 100;
        const greetEn =
          `Welcome back. All systems have been analyzed. System Health: ${healthPct}%. ` +
          (critical > 0
            ? `${critical} critical alert${critical === 1 ? "" : "s"} require attention. `
            : openInc > 0
              ? `${openInc} open incident${openInc === 1 ? "" : "s"} in the field. `
              : "No critical alerts. ") +
          `Would you like an executive briefing?`;
        const greetAr =
          `مرحباً بعودتك. تم تحليل جميع الأنظمة. صحة النظام: ${healthPct}٪. ` +
          (critical > 0
            ? `${critical} تنبيه حرج بحاجة إلى انتباهك. `
            : openInc > 0
              ? `${openInc} بلاغ مفتوح في الميدان. `
              : "لا توجد تنبيهات حرجة. ") +
          `هل تودّ إحاطة تنفيذية؟`;
        try { sessionStorage.setItem(WELCOMED_KEY, "1"); } catch { /* noop */ }
        const id = `welcome_${Date.now()}`;
        setTurns((p) => [...p, { id, question: "—", qLang: lang, stage: "done", answer: { text_ar: greetAr, text_en: greetEn } }]);
        try { ariaSessionMemory.push({ role: "assistant", text: greetEn, page: pathname }); } catch { /* noop */ }
        if (!open) {
          let toastDismissed = false;
          try { toastDismissed = sessionStorage.getItem(WELCOME_TOAST_KEY) === "0"; } catch { /* noop */ }
          if (!toastDismissed) setWelcomeToast({ ar: greetAr, en: greetEn });
        }
        if (voiceOn) void speak(ar ? greetAr : greetEn);
      })();
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void ask(question);
    setQuestion("");
  };

  if (!mounted || hideForAuthDock) return null;

  // Hidden state — user chose to fully hide ARIA. Show a tiny restore pill.
  if (hidden) {
    return (
      <div
        dir={ar ? "rtl" : "ltr"}
        className="pointer-events-none fixed bottom-3 z-[60] ltr:right-3 rtl:left-3"
      >
        <button
          type="button"
          onClick={() => setHidden(false)}
          aria-label={ar ? "استعادة آريا" : "Restore ARIA"}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#3AE8FF]/50 bg-[#061A2E]/85 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-[#3AE8FF] shadow-[0_8px_28px_-8px_rgba(0,212,255,0.55)] backdrop-blur hover:bg-[#3AE8FF]/10"
        >
          <Eye className="h-3 w-3" /> ARIA
        </button>
      </div>
    );
  }

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      aria-label="ARIA executive copilot"
      role="region"
      className="pointer-events-none fixed bottom-4 z-[60] flex flex-col items-end gap-3 ltr:right-4 rtl:left-4 sm:bottom-6 sm:ltr:right-6 sm:rtl:left-6"
    >
      <style>{`
        @keyframes gac-pulse { 0%,100% { box-shadow: 0 0 22px rgba(58,232,255,0.55), inset 0 0 12px rgba(58,232,255,0.3); } 50% { box-shadow: 0 0 36px rgba(58,232,255,0.85), inset 0 0 18px rgba(58,232,255,0.5); } }
        @keyframes gac-think { 0%,100% { transform: scale(.85); opacity: .35; } 50% { transform: scale(1.15); opacity: .9; } }
        @keyframes gac-speak { 0%,100% { transform: scaleY(.4); } 50% { transform: scaleY(1); } }
        @keyframes gac-halo { 0% { transform: scale(1); opacity: .6; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes aria-focus-pulse-kf { 0% { box-shadow: 0 0 0 0 rgba(58,232,255,0.55); } 60% { box-shadow: 0 0 0 12px rgba(58,232,255,0); } 100% { box-shadow: 0 0 0 0 rgba(58,232,255,0); } }
        .aria-focus-pulse { animation: aria-focus-pulse-kf 1.4s ease-out 2; outline: 1px solid rgba(58,232,255,0.55); outline-offset: 2px; border-radius: inherit; transition: outline 200ms; }
      `}</style>


      {open && (
        <div
          className="pointer-events-auto w-[min(420px,calc(100vw-1.5rem))] origin-bottom rounded-2xl border border-[#3AE8FF]/45 bg-[#061A2E]/95 p-3 shadow-[0_24px_80px_-12px_rgba(0,212,255,0.6)] backdrop-blur-xl animate-scale-in"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <span
              className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-[#3AE8FF]/60 bg-[#04111F]"
              style={{ animation: "gac-pulse 3.2s ease-in-out infinite" }}
            >
              <img src={ariaHologram.url} alt="ARIA" className="absolute inset-0 h-full w-full object-cover object-top" draggable={false} />
              {loading ? (
                <span className="absolute inset-0 grid place-items-center bg-[#061A2E]/55 backdrop-blur-[1px]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#3AE8FF]" />
                </span>
              ) : speaking ? (
                <span className="absolute bottom-1 left-1/2 flex h-4 -translate-x-1/2 items-end gap-[2px] rounded-full bg-[#061A2E]/65 px-1.5 py-0.5">
                  {[0, 0.1, 0.2, 0.15].map((d, i) => (
                    <span
                      key={i}
                      className="w-[3px] rounded-sm bg-[#3AE8FF] shadow-[0_0_6px_rgba(58,232,255,0.9)]"
                      style={{ height: "100%", transformOrigin: "bottom", animation: `gac-speak 0.6s ease-in-out ${d}s infinite` }}
                    />
                  ))}
                </span>
              ) : null}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#3AE8FF]/80">
                ARIA · GPT-5 · {ar ? persona.label_ar : persona.label_en}
              </div>
              <div className="truncate text-sm font-medium text-white">
                {ar ? persona.mission_ar : persona.mission_en}
              </div>
              <div className="truncate text-[10px] text-white/45">
                {ar ? ctx.label_ar : ctx.label_en}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVoiceOn((v) => !v)}
              aria-pressed={voiceOn}
              aria-label={voiceOn ? (ar ? "كتم الصوت" : "Mute voice") : (ar ? "تشغيل الصوت" : "Unmute voice")}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/40 text-[#3AE8FF] transition hover:border-[#3AE8FF]/80 hover:bg-[#3AE8FF]/10"
            >
              {voiceOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setPinned((v) => !v)}
              aria-pressed={pinned}
              aria-label={pinned ? (ar ? "إلغاء التثبيت" : "Unpin") : (ar ? "تثبيت" : "Pin")}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${pinned ? "border-[#3AE8FF]/80 bg-[#3AE8FF]/15 text-[#3AE8FF]" : "border-white/20 text-white/70 hover:border-white/50 hover:bg-white/5"}`}
            >
              {pinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => { stopSpeaking(); setOpen(false); }}
              disabled={pinned}
              aria-label={ar ? "تصغير" : "Minimize"}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/20 text-white/80 transition hover:border-white/50 hover:bg-white/5 disabled:opacity-30"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { stopSpeaking(); setOpen(false); setHidden(true); }}
              aria-label={ar ? "إخفاء" : "Hide"}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/20 text-white/70 transition hover:border-white/50 hover:bg-white/5"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          </div>


          {/* Transcript */}
          {(turns.length > 0 || loading) && (
            <div
              ref={transcriptRef}
              aria-live="polite"
              className="mt-3 max-h-[300px] space-y-2 overflow-y-auto pr-1"
            >
              {turns.map((t, idx) => {
                const isLast = idx === turns.length - 1;
                const a = t.answer;
                const hasAnswer = Boolean(a && (ar ? a.text_ar : a.text_en));
                const text = a ? (ar ? a.text_ar : a.text_en) : "";
                const isGreeting = t.question === "—";
                return (
                  <div key={t.id} className="space-y-1.5">
                    {!isGreeting && (
                      <div className="flex items-start gap-2" dir={t.qLang === "ar" ? "rtl" : "ltr"}>
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white/70">
                          <User className="h-3 w-3" />
                        </span>
                        <div className="rounded-xl rounded-tl-sm border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] leading-relaxed text-white/85">
                          <p className="whitespace-pre-wrap break-words">{t.question}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 text-[#3AE8FF]">
                        <MessageSquare className="h-3 w-3" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="rounded-xl rounded-tl-sm border border-[#3AE8FF]/25 bg-[#04111F]/85 px-3 py-2 text-[13px] leading-relaxed text-white/95">
                          {!a && !t.error && isLast && loading && (() => {
                            const desc = STAGE_DESCRIPTORS[t.stage] ?? STAGE_DESCRIPTORS.thinking;
                            return (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[#3AE8FF]/90">
                                  <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ background: desc.glow, boxShadow: `0 0 8px ${desc.glow}`, animation: "gac-think 1.2s ease-in-out infinite" }}
                                  />
                                  <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ background: desc.glow, boxShadow: `0 0 8px ${desc.glow}`, animation: "gac-think 1.2s ease-in-out infinite", animationDelay: "0.15s" }}
                                  />
                                  <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ background: desc.glow, boxShadow: `0 0 8px ${desc.glow}`, animation: "gac-think 1.2s ease-in-out infinite", animationDelay: "0.3s" }}
                                  />
                                  <span className="text-[10px] uppercase tracking-[0.22em] text-[#3AE8FF]/80">
                                    {ar ? desc.label_ar : desc.label_en}
                                  </span>
                                </div>
                                <p className="text-[11.5px] text-white/75" dir="auto">
                                  {ar ? desc.narration_ar : desc.narration_en}
                                </p>
                              </div>
                            );
                          })()}
                          {t.error && <div className="text-rose-300">{t.error}</div>}
                          {hasAnswer && (
                            <p className="whitespace-pre-wrap break-words" dir="auto">{text}</p>
                          )}
                        </div>
                        {hasAnswer && t.executive && !isGreeting && (
                          <ExecutiveEvidencePanel
                            payload={t.executive}
                            ar={ar}
                            affectedDepartments={affectedDepartments}
                            onDecision={(_d, prompt) => { void ask(prompt); }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick prompts (empty state) */}
          {turns.length === 0 && !loading && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(ar ? ctx.prompts_ar : ctx.prompts_en).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => void ask(p)}
                  className="rounded-full border border-[#3AE8FF]/30 bg-[#3AE8FF]/[0.06] px-2.5 py-1 text-[11px] text-[#3AE8FF] transition hover:border-[#3AE8FF]/70 hover:bg-[#3AE8FF]/15"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Follow-up suggestions after any answer */}
          {turns.length > 0 && !loading && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {(ar ? ctx.prompts_ar : ctx.prompts_en).slice(0, 3).map((p) => (
                  <button
                    key={`fu-${p}`}
                    type="button"
                    onClick={() => void ask(p)}
                    className="rounded-full border border-[#3AE8FF]/30 bg-[#3AE8FF]/[0.06] px-2.5 py-1 text-[11px] text-[#3AE8FF] transition hover:border-[#3AE8FF]/70 hover:bg-[#3AE8FF]/15"
                  >
                    {p}
                  </button>
                ))}
              </div>
              {/* Executive Actions — navigation shortcuts */}
              <div className="flex flex-wrap gap-1.5 border-t border-white/5 pt-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  {ar ? "إجراءات تنفيذية" : "Executive Actions"}
                </span>
                {QUICK_ACTIONS.filter((a) => !pathname.startsWith(a.to)).slice(0, 3).map((a) => (
                  <button
                    key={a.to}
                    type="button"
                    onClick={() => { stopSpeaking(); void navigate({ to: a.to }); }}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/80 transition hover:border-[#3AE8FF]/60 hover:text-white"
                  >
                    <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                    {ar ? a.label_ar : a.label_en}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Composer */}
          <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => { if (speaking) stopSpeaking(); setQuestion(e.target.value); }}
              onFocus={() => { if (speaking) stopSpeaking(); }}
              onKeyDown={(e) => {
                // Natural interruption — any keypress while ARIA speaks stops speech.
                if (speaking) stopSpeaking();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e as unknown as React.FormEvent);
                }
              }}
              rows={1}
              placeholder={ar ? "اكتب سؤالك لآريا…" : "Ask ARIA…"}
              className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-xl border border-[#3AE8FF]/30 bg-[#04111F]/70 px-3 py-2 text-[13px] text-white placeholder:text-white/40 focus:border-[#3AE8FF]/70 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              aria-label={ar ? "إرسال" : "Send"}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/60 bg-gradient-to-br from-[#00D4FF]/40 to-[#3AE8FF]/15 text-white shadow-[0_0_20px_rgba(58,232,255,0.55)] transition hover:scale-105 disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}

      {/* Executive Welcome preview toast — appears above the collapsed launcher */}
      {!open && welcomeToast && (
        <div className="pointer-events-auto w-[min(320px,calc(100vw-1.5rem))] rounded-2xl border border-[#3AE8FF]/45 bg-[#061A2E]/95 p-3 text-[12.5px] leading-relaxed text-white/90 shadow-[0_18px_60px_-12px_rgba(0,212,255,0.55)] backdrop-blur-xl animate-fade-in">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#3AE8FF]/80">
              {ar ? "إحاطة تنفيذية" : "Executive Briefing"}
            </span>
            <button
              type="button"
              onClick={() => {
                try { sessionStorage.setItem(WELCOME_TOAST_KEY, "0"); } catch { /* noop */ }
                setWelcomeToast(null);
              }}
              aria-label={ar ? "إغلاق" : "Dismiss"}
              className="grid h-5 w-5 place-items-center rounded-full border border-white/15 text-white/70 hover:border-white/40"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <p dir="auto" className="whitespace-pre-wrap">{ar ? welcomeToast.ar : welcomeToast.en}</p>
          <div className="mt-2 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => { setWelcomeToast(null); setOpen(true); }}
              className="inline-flex items-center gap-1 rounded-full border border-[#3AE8FF]/60 bg-[#3AE8FF]/10 px-3 py-1 text-[11px] font-medium text-[#3AE8FF] hover:bg-[#3AE8FF]/20"
            >
              {ar ? "افتح آريا" : "Open ARIA"}
              <ArrowRight className="h-3 w-3 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* Floating launcher (always visible when collapsed) */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={ar ? "افتح آريا" : "Open ARIA"}
          className="pointer-events-auto group relative grid h-14 w-14 place-items-center rounded-full border border-[#3AE8FF]/70 bg-gradient-to-br from-[#00D4FF]/40 via-[#0a2a44] to-[#061A2E] text-[#3AE8FF] transition hover:scale-110"
          style={{ animation: "gac-pulse 3.2s ease-in-out infinite" }}
        >
          <span aria-hidden className="pointer-events-none absolute -inset-2 rounded-full border border-[#3AE8FF]/25" style={{ animation: "gac-halo 3.6s ease-out infinite" }} />
          <img src={ariaHologram.url} alt="ARIA" className="absolute inset-0 h-full w-full rounded-full object-cover object-top" draggable={false} />
          <Sparkles className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-[#061A2E]/85 p-0.5 drop-shadow-[0_0_10px_rgba(58,232,255,0.95)]" />
          <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-[#3AE8FF]/50 bg-[#061A2E] text-[8px] font-bold text-[#3AE8FF]">
            5
          </span>
          <span className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-md border border-[#3AE8FF]/30 bg-[#061A2E]/95 px-2 py-1 text-[10px] uppercase tracking-wider text-[#3AE8FF] opacity-0 transition group-hover:opacity-100">
            ARIA · GPT-5
          </span>
        </button>
      )}
    </div>
  );
}
