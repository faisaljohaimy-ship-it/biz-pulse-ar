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
  Volume2,
  VolumeX,
  X,
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

// Executive demo script — 10 short Arabic sentences that ARIA narrates
// automatically 60 seconds after the platform loads, once per session, so a
// first-time visitor immediately understands what NEXIOS does. The user can
// silence + hide ARIA at any moment by clicking her floating icon.
const DEMO_SCRIPT_AR: string[] = [
  "أهلاً بك في نكسيوس. أنا آريا، الذكاء التنفيذي لإدارة الأمن الصناعي بالمنطقة الغربية.",
  "أراقب الآن أربعة مواقع رئيسية: جدة، مكة المكرمة، ينبع، والمنطقة الصناعية.",
  "حالة النظام مستقرة، والدوريات الميدانية تسير وفق الخطة اليومية.",
  "لدينا عدد من البلاغات المفتوحة تتابعها غرفة العمليات لحظة بلحظة.",
  "أعرض عبر لوحة القيادة مؤشرات الأداء الحيّة وحالة الأصول والتصاريح.",
  "يمكنك الانتقال إلى غرفة العمليات لعرض تفصيلي، أو التقارير التنفيذية لملخّص فوري.",
  "في منظومة الحج، أتابع المشاعر المقدسة وأنبّهك فوراً عند أي مخاطرة حرجة.",
  "أستطيع تحليل أي بلاغ، اقتراح خطة استجابة، وإصدار أوامر عمل خلال ثوانٍ.",
  "جميع قراراتي مبنية على بيانات حقيقية موثّقة من قواعد النظام، دون تخمين.",
  "اضغط على أيقونتي في أي وقت لإسكاتي وإخفائي، أو اسألني مباشرة وسأخدمك فوراً.",
];
const DEMO_DELAY_MS = 60_000;
const DEMO_STARTED_KEY = "aria-copilot-demo-started-v1";

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
const GREETED_KEY = "aria-copilot-greeted-v1";

const QUICK_ACTIONS: QuickAction[] = [
  { label_ar: "غرفة العمليات", label_en: "Operations", to: "/operations" },
  { label_ar: "التقارير التنفيذية", label_en: "Exec Reports", to: "/executive-reports" },
  { label_ar: "منظومة الحج", label_en: "Hajj Ops", to: "/hajj" },
  { label_ar: "الأمن الصناعي", label_en: "Security", to: "/sec" },
];

// Executive Action Mode — canonical intents surfaced as chips in the panel.
type ExecIntent = {
  id:
    | "executive_summary"
    | "explain_current_page"
    | "explain_kpis"
    | "next_action"
    | "risk_review"
    | "awareness_scan"
    | "suggest_automation"
    | "executive_tour";
  label_ar: string;
  label_en: string;
  prompt_ar: string;
  prompt_en: string;
};
const EXEC_INTENTS: readonly ExecIntent[] = [
  { id: "executive_summary",    label_ar: "ملخص تنفيذي",       label_en: "Executive Summary",
    prompt_ar: "أعطني ملخصاً تنفيذياً موجزاً لحالة النظام الآن، بدون تفاصيل تقنية.",
    prompt_en: "Give me a concise executive summary of the current system state, no technical detail." },
  { id: "explain_current_page", label_ar: "اشرح الصفحة",       label_en: "Explain This Page",
    prompt_ar: "اشرح لي هذه الصفحة وأهم عناصرها بإيجاز تنفيذي، بما في ذلك الأزرار والمخططات وسير العمل.",
    prompt_en: "Explain this page briefly — its key elements, buttons, charts, and workflow — in executive style." },
  { id: "explain_kpis",         label_ar: "اشرح المؤشرات",     label_en: "Explain KPIs",
    prompt_ar: "اشرح لي المؤشرات الظاهرة على الشاشة الآن، وماذا تعني تنفيذياً، وما الجيد وما المقلق منها.",
    prompt_en: "Explain the KPIs currently on screen, what they mean at the executive level, and which are healthy vs concerning." },
  { id: "next_action",          label_ar: "ما الإجراء التالي؟", label_en: "Next Action",
    prompt_ar: "ما الإجراء التنفيذي التالي الذي يجب أن أتخذه الآن؟ اذكر خطوة واحدة واضحة.",
    prompt_en: "What is the single next executive action I should take right now?" },
  { id: "risk_review",          label_ar: "اعرض المخاطر",       label_en: "Show Risks",
    prompt_ar: "اعرض لي أعلى المخاطر المفتوحة مع خطة تخفيف مقترحة لكل منها.",
    prompt_en: "Show me the top open risks with a suggested mitigation for each." },
  { id: "awareness_scan",       label_ar: "افحص الشاشة",        label_en: "Scan Screen",
    prompt_ar: "افحص الشاشة الحالية: هل توجد بيانات ناقصة أو مؤشرات فارغة أو أعطال في التدفق؟ اذكر النقاط بإيجاز.",
    prompt_en: "Scan the current screen: any missing data, empty widgets, broken flow, or UX problems? List briefly." },
  { id: "suggest_automation",   label_ar: "اقترح أتمتة",        label_en: "Suggest Automation",
    prompt_ar: "بناءً على هذه الصفحة، اقترح فرصة أتمتة أو تقرير تنفيذي أو تحسين واحد يوفر وقت القيادة.",
    prompt_en: "Based on this page, suggest one automation, executive report, or optimisation that saves leadership time." },
  { id: "executive_tour",       label_ar: "ابدأ جولة تنفيذية",  label_en: "Executive Tour",
    prompt_ar: "ابدأ جولة تنفيذية مختصرة تشرح أهم قدرات نكسيوس في خطوات قصيرة.",
    prompt_en: "Start a short executive tour of the top NEXIOS capabilities in brief steps." },
] as const;

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
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const briefingFiredRef = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const demoStartedRef = useRef(false);
  const demoCancelRef = useRef(false);
  const [demoPlaying, setDemoPlaying] = useState(false);

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
    try {
      (window as unknown as { __aria_copilot_open?: boolean }).__aria_copilot_open = open;
    } catch { /* noop */ }
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

  // Global opener: any UI element can dispatch `aria:open` to reveal ARIA.
  useEffect(() => {
    if (!mounted) return;
    const onOpen = () => { setHidden(false); setOpen(true); };
    window.addEventListener("aria:open", onOpen as EventListener);
    return () => window.removeEventListener("aria:open", onOpen as EventListener);
  }, [mounted]);

  // Greet once per session — only when the executive explicitly opens ARIA.
  // Silent by default (no auto-TTS); the greeting is a written turn.
  useEffect(() => {
    if (!mounted || !open) return;
    let greeted = false;
    try { greeted = sessionStorage.getItem(GREETED_KEY) === "1"; } catch { /* noop */ }
    if (greeted) return;
    try { sessionStorage.setItem(GREETED_KEY, "1"); } catch { /* noop */ }
    const greet_ar = "أهلاً بك. أنا آريا، مساعدك التنفيذي. اختر إجراءً من الأسفل أو اسألني مباشرة.";
    const greet_en = "Welcome. I'm ARIA, your executive assistant. Pick an action below or ask me directly.";
    setTurns((p) => [
      ...p,
      { id: `greet_${Date.now()}`, question: "—", qLang: "ar", stage: "done",
        answer: { text_ar: greet_ar, text_en: greet_en } },
    ]);
  }, [mounted, open]);


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



  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch { /* noop */ }
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  // Singleton Constitution: on route change, abort in-flight ARIA work and
  // silence voice so replies never bind to a page the user already left.
  // Conversation history, memory, avatar and open/closed UI state are
  // preserved — only obsolete work is cancelled.
  const lastPathRef = useRef(pathname);
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    try { abortRef.current?.abort(); } catch { /* noop */ }
    abortRef.current = null;
    demoCancelRef.current = true;
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch { /* noop */ }
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
  }, [pathname]);



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

  // Speak-and-wait: resolves when playback ends (or on error/timeout).
  const speakAndWait = useCallback(async (text: string) => {
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
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; setSpeaking(false); URL.revokeObjectURL(url); resolve(); };
        audio.onended = finish;
        audio.onerror = finish;
        audio.play().catch(finish);
      });
    } catch {
      setSpeaking(false);
    }
  }, [stopSpeaking]);


  const ask = useCallback(async (q: string) => {
    const qt = q.trim();
    if (!qt) return;
    demoCancelRef.current = true;
    setDemoPlaying(false);
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
    // Resilient send: exponential backoff on transient failures, offline-aware,
    // preserves conversation and memory. Never surfaces raw provider errors.
    const attemptSend = async (): Promise<Response> => {
      return fetch("/api/public/aria-ask", {
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
    };
    const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
    const waitForOnline = () =>
      new Promise<void>((resolve) => {
        if (!isOffline()) return resolve();
        const onOnline = () => { window.removeEventListener("online", onOnline); resolve(); };
        window.addEventListener("online", onOnline, { once: true });
        // Safety: resolve after 15s so we still surface a retry message.
        setTimeout(() => { window.removeEventListener("online", onOnline); resolve(); }, 15000);
      });
    try {
      // Wait quietly if the browser is offline before the first attempt.
      if (isOffline()) {
        setTurns((p) => p.map((t) => (t.id === id
          ? { ...t, stage: "listening", error: detected === "ar" ? "جارٍ إعادة الاتصال…" : "Reconnecting…" }
          : t)));
        await waitForOnline();
        if (ctrl.signal.aborted) return;
      }
      let r: Response | null = null;
      let lastErr: unknown = null;
      const delays = [0, 500, 1500]; // 3 attempts, exponential-ish backoff
      for (let i = 0; i < delays.length; i += 1) {
        if (ctrl.signal.aborted) return;
        if (delays[i] > 0) await new Promise((res) => setTimeout(res, delays[i]));
        try {
          r = await attemptSend();
          // Retry only transient upstream failures (5xx). 4xx is terminal.
          if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429)) break;
          lastErr = new Error(`http_${r.status}`);
          // Clear message shows a soft retry state instead of the raw error.
          if (i < delays.length - 1) {
            setTurns((p) => p.map((t) => (t.id === id
              ? { ...t, stage: "listening", error: detected === "ar" ? "جارٍ إعادة المحاولة…" : "Retrying…" }
              : t)));
          }
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          lastErr = err;
          if (i < delays.length - 1) {
            setTurns((p) => p.map((t) => (t.id === id
              ? { ...t, stage: "listening", error: detected === "ar" ? "جارٍ إعادة الاتصال…" : "Reconnecting…" }
              : t)));
          }
        }
      }
      if (!r) throw lastErr instanceof Error ? lastErr : new Error("network");
      const j = (await r.json().catch(() => ({}))) as Partial<AskResult> & { error?: string; executive?: ExecutivePayload };
      if (!r.ok) throw new Error(j.error || `http_${r.status}`);
      const answer: AskResult = {
        text_ar: j.text_ar ?? "",
        text_en: j.text_en ?? "",
      };
      setTurns((p) => p.map((t) => (t.id === id ? { ...t, answer, executive: j.executive, stage: "done", error: undefined } : t)));
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
      const raw = e instanceof Error ? e.message : "";
      const msg = raw.includes("429")
        ? (detected === "ar" ? "الكثير من الطلبات — سيتم المتابعة تلقائيًا." : "Too many requests — will resume automatically.")
        : isOffline()
        ? (detected === "ar" ? "الخدمة غير متاحة مؤقتًا — سيتم إعادة الاتصال." : "Service temporarily unavailable — reconnecting.")
        : (detected === "ar" ? "تعذّر الوصول للخدمة الآن — الجلسة والسياق محفوظان." : "Service temporarily unavailable — session and context preserved.");
      setTurns((p) => p.map((t) => (t.id === id ? { ...t, error: msg, stage: "error" } : t)));
    } finally {
      setLoading(false);
    }
  }, [ctx.label_en, pathname, voiceOn, speak, stopSpeaking, snap, persona]);

  // Demo auto-narration — 60s after mount, once per session, ARIA walks the
  // user through NEXIOS using the 10-sentence script. Cancellable by clicking
  // the floating icon (silence + hide) or by starting any interaction.
  const runDemo = useCallback(async () => {
    if (demoStartedRef.current) return;
    demoStartedRef.current = true;
    demoCancelRef.current = false;
    setDemoPlaying(true);
    setOpen(true);
    setLang("ar");
    for (let i = 0; i < DEMO_SCRIPT_AR.length; i += 1) {
      if (demoCancelRef.current) break;
      const line = DEMO_SCRIPT_AR[i];
      const id = `demo_${Date.now()}_${i}`;
      setTurns((p) => [
        ...p,
        { id, question: "—", qLang: "ar", stage: "done", answer: { text_ar: line, text_en: line } },
      ]);
      try { ariaSessionMemory.push({ role: "assistant", text: line, page: pathname }); } catch { /* noop */ }
      if (voiceOn && !demoCancelRef.current) {
        await speakAndWait(line);
      } else {
        await new Promise((r) => setTimeout(r, 2600));
      }
      if (demoCancelRef.current) break;
      await new Promise((r) => setTimeout(r, 650));
    }
    setDemoPlaying(false);
  }, [pathname, voiceOn, speakAndWait]);

  const cancelDemo = useCallback(() => {
    demoCancelRef.current = true;
    setDemoPlaying(false);
    stopSpeaking();
  }, [stopSpeaking]);

  // Auto-narration and welcome briefing are intentionally disabled:
  // ARIA stays silent and her conversation surface stays hidden until the
  // executive explicitly opens it by clicking the launcher.
  useEffect(() => {
    if (!mounted) return;
    demoStartedRef.current = true;
    briefingFiredRef.current = true;
    try { sessionStorage.setItem(DEMO_STARTED_KEY, "1"); } catch { /* noop */ }
    try { sessionStorage.setItem(WELCOMED_KEY, "1"); } catch { /* noop */ }
    try { sessionStorage.setItem(WELCOME_TOAST_KEY, "0"); } catch { /* noop */ }
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
          ARIA
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
        @keyframes gac-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
        @keyframes gac-blink { 0%,92%,100% { transform: scaleY(0); opacity: 0; } 94%,98% { transform: scaleY(1); opacity: .55; } }
        @keyframes gac-listen { 0%,100% { box-shadow: 0 0 0 0 rgba(255,88,120,0.55); } 50% { box-shadow: 0 0 0 10px rgba(255,88,120,0); } }
        @keyframes aria-focus-pulse-kf { 0% { box-shadow: 0 0 0 0 rgba(58,232,255,0.55); } 60% { box-shadow: 0 0 0 12px rgba(58,232,255,0); } 100% { box-shadow: 0 0 0 0 rgba(58,232,255,0); } }
        .aria-focus-pulse { animation: aria-focus-pulse-kf 1.4s ease-out 2; outline: 1px solid rgba(58,232,255,0.55); outline-offset: 2px; border-radius: inherit; transition: outline 200ms; }
        .aria-avatar-breathe { animation: gac-breathe 4.2s ease-in-out infinite; }
        .aria-avatar-blink { position: absolute; left: 12%; right: 12%; top: 38%; height: 6%; background: #04111F; border-radius: 4px; transform-origin: center; animation: gac-blink 5.4s ease-in-out infinite; pointer-events: none; }
      `}</style>


      {open && (
        <div
          ref={panelRef}
          className="pointer-events-auto w-[min(420px,calc(100vw-1.5rem))] origin-bottom rounded-2xl border border-[#3AE8FF]/45 bg-[#061A2E]/95 p-3 shadow-[0_24px_80px_-12px_rgba(0,212,255,0.6)] backdrop-blur-xl animate-scale-in"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { cancelDemo(); setOpen(false); setHidden(true); }}
              aria-label={ar ? "إسكات وإخفاء آريا" : "Silence and hide ARIA"}
              title={ar ? "إسكات وإخفاء" : "Silence & hide"}
              className="relative grid h-12 w-12 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-[#3AE8FF]/60 bg-[#04111F] transition hover:border-[#3AE8FF]/90"
              style={{ animation: "gac-pulse 3.2s ease-in-out infinite" }}
            >
              <img src={ariaHologram.url} alt="ARIA" className="aria-avatar-breathe absolute inset-0 h-full w-full object-cover object-top" draggable={false} />
              <span aria-hidden className="aria-avatar-blink" />
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
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#3AE8FF]/80">
                ARIA · {ar ? persona.label_ar : persona.label_en}
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
              onClick={() => { cancelDemo(); setOpen(false); }}
              className="shrink-0 rounded-full border border-white/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70 transition hover:border-white/50 hover:bg-white/5"
            >
              {ar ? "تصغير" : "Minimize"}
            </button>
            <button
              type="button"
              onClick={() => { cancelDemo(); setOpen(false); setHidden(true); }}
              className="shrink-0 rounded-full border border-white/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70 transition hover:border-white/50 hover:bg-white/5"
            >
              {ar ? "إخفاء" : "Hide"}
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
                        <span className="mt-0.5 shrink-0 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-white/60">
                          {ar ? "أنت" : "You"}
                        </span>
                        <div className="rounded-xl rounded-tl-sm border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] leading-relaxed text-white/85">
                          <p className="whitespace-pre-wrap break-words">{t.question}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-[#3AE8FF]">
                        ARIA
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

          {/* Executive Awareness — client-side scan of the live snapshot */}
          {!loading && (() => {
            const notes: string[] = [];
            const widgets = snap.widgets;
            const kpis = widgets.filter((w) => w.kind === "kpi");
            const emptyKpis = kpis.filter((w) => {
              const v = w.value;
              return v === null || v === undefined || v === "" || v === 0 || v === "0";
            });
            if (!widgets.length) {
              notes.push(ar
                ? "لا توجد بيانات مباشرة في هذه الصفحة حاليًا، ويمكنني شرح محتواها أو اقتراح الإجراء التالي."
                : "No live data on this page right now — I can explain its content or suggest the next action.");
            }
            if (kpis.length && emptyKpis.length === kpis.length) {
              notes.push(ar
                ? `جميع المؤشرات (${kpis.length}) فارغة أو صفر — تحقّق من مصدر البيانات.`
                : `All KPIs (${kpis.length}) are empty or zero — check the data source.`);
            } else if (emptyKpis.length >= 2) {
              notes.push(ar
                ? `${emptyKpis.length} مؤشرات فارغة: ${emptyKpis.slice(0, 3).map((w) => w.label).join("، ")}.`
                : `${emptyKpis.length} empty KPIs: ${emptyKpis.slice(0, 3).map((w) => w.label).join(", ")}.`);
            }
            if (!notes.length) return null;
            return (
              <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-2.5 py-1.5 text-[11px] text-amber-200/90">
                <div className="mb-0.5 text-[10px] uppercase tracking-[0.2em] text-amber-300/80">
                  {ar ? "وعي ARIA" : "ARIA Awareness"}
                </div>
                <ul className="list-disc space-y-0.5 ps-4">
                  {notes.map((n) => <li key={n}>{n}</li>)}
                </ul>
              </div>
            );
          })()}

          {/* Executive Action chips — always visible, canonical intents */}
          {!loading && (
            <div className="mt-3 space-y-2">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#3AE8FF]/70">
                {ar ? "إجراءات ARIA السريعة" : "ARIA Quick Actions"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EXEC_INTENTS.map((intent) => (
                  <button
                    key={intent.id}
                    type="button"
                    data-aria-intent={intent.id}
                    onClick={() => void ask(ar ? intent.prompt_ar : intent.prompt_en)}
                    className="rounded-full border border-[#3AE8FF]/40 bg-[#3AE8FF]/[0.08] px-2.5 py-1 text-[11px] font-medium text-[#3AE8FF] transition hover:border-[#3AE8FF]/80 hover:bg-[#3AE8FF]/20"
                  >
                    {ar ? intent.label_ar : intent.label_en}
                  </button>
                ))}
              </div>
            </div>
          )}


          {/* Follow-up: contextual page prompts after any answer */}
          {turns.length > 0 && !loading && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {(ar ? ctx.prompts_ar : ctx.prompts_en).slice(0, 3).map((p) => (
                  <button
                    key={`fu-${p}`}
                    type="button"
                    onClick={() => void ask(p)}
                    className="rounded-full border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/75 transition hover:border-[#3AE8FF]/60 hover:text-white"
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
          <span className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-md border border-[#3AE8FF]/30 bg-[#061A2E]/95 px-2 py-1 text-[10px] uppercase tracking-wider text-[#3AE8FF] opacity-0 transition group-hover:opacity-100">
            ARIA
          </span>
        </button>
      )}
    </div>
  );
}
