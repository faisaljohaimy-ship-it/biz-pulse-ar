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
} from "lucide-react";
import ariaHologram from "@/assets/aria-hologram.png.asset.json";
import { useAriaSnapshot } from "@/lib/aria/context-engine";
import { ariaSessionMemory } from "@/lib/aria/session-memory";

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
  error?: string;
};

const OPEN_KEY = "aria-copilot-open";
const VOICE_KEY = "aria-copilot-voice";
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
  const [welcomeToast, setWelcomeToast] = useState<null | { ar: string; en: string }>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const briefingFiredRef = useRef(false);

  const ctx = useMemo(() => resolvePageCtx(pathname), [pathname]);
  const ar = lang === "ar";

  // Mount-only hydration of persisted UI state.
  useEffect(() => {
    setMounted(true);
    try {
      const o = localStorage.getItem(OPEN_KEY);
      if (o === "1") setOpen(true);
      const v = localStorage.getItem(VOICE_KEY);
      if (v === "0") setVoiceOn(false);
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

  // Persist open / voice prefs.
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch { /* noop */ }
  }, [mounted, open]);
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(VOICE_KEY, voiceOn ? "1" : "0"); } catch { /* noop */ }
  }, [mounted, voiceOn]);

  // Auto-scroll transcript.
  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  // Focus textarea when opened.
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(id);
    }
  }, [open]);

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
    setTurns((p) => [...p, { id, question: qt, qLang: detected }]);
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
          context: liveCtx,
          history,
        }),
        signal: ctrl.signal,
      });
      const j = (await r.json().catch(() => ({}))) as Partial<AskResult> & { error?: string };
      if (!r.ok) throw new Error(j.error || `http_${r.status}`);
      const answer: AskResult = {
        text_ar: j.text_ar ?? "",
        text_en: j.text_en ?? "",
      };
      setTurns((p) => p.map((t) => (t.id === id ? { ...t, answer } : t)));
      try { ariaSessionMemory.push({ role: "assistant", text: detected === "ar" ? answer.text_ar : answer.text_en, page: pathname }); } catch { /* noop */ }
      if (voiceOn) {
        const spoken = detected === "ar" ? answer.text_ar : answer.text_en;
        if (spoken) void speak(spoken);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error && e.message.includes("429")
        ? (detected === "ar" ? "الكثير من الطلبات — حاول بعد دقيقة." : "Too many requests — try again shortly.")
        : (detected === "ar" ? "تعذّر الاتصال بآريا الآن — أعد المحاولة." : "ARIA is unavailable right now — please retry.");
      setTurns((p) => p.map((t) => (t.id === id ? { ...t, error: msg } : t)));
    } finally {
      setLoading(false);
    }
  }, [ctx.label_en, pathname, voiceOn, speak, stopSpeaking, snap]);

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
          const r = await fetch("/api/public/aria-briefing");
          if (r.ok) {
            const j = (await r.json()) as BriefingLite;
            health = j.health;
            critical = (j.priorities ?? []).filter((p) => (p.severity ?? "").toLowerCase() === "critical").length;
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
        setTurns((p) => [...p, { id, question: "—", qLang: lang, answer: { text_ar: greetAr, text_en: greetEn } }]);
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
                ARIA · GPT-5 · {ar ? ctx.label_ar : ctx.label_en}
              </div>
              <div className="truncate text-sm font-medium text-white">
                {ar ? "كيف أساعدك الآن؟" : "How can I assist you?"}
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
              onClick={() => { stopSpeaking(); setOpen(false); }}
              aria-label={ar ? "تصغير" : "Minimize"}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/20 text-white/80 transition hover:border-white/50 hover:bg-white/5"
            >
              <Minus className="h-3.5 w-3.5" />
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
                      <div className="flex-1 rounded-xl rounded-tl-sm border border-[#3AE8FF]/25 bg-[#04111F]/85 px-3 py-2 text-[13px] leading-relaxed text-white/95">
                        {!a && !t.error && isLast && loading && (
                          <div className="flex items-center gap-2 text-[#3AE8FF]/90">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3AE8FF]" style={{ animation: "gac-think 1.2s ease-in-out infinite" }} />
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3AE8FF]" style={{ animation: "gac-think 1.2s ease-in-out infinite", animationDelay: "0.15s" }} />
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3AE8FF]" style={{ animation: "gac-think 1.2s ease-in-out infinite", animationDelay: "0.3s" }} />
                            <span className="text-[11.5px] text-white/70">{ar ? "آريا تفكّر…" : "ARIA is thinking…"}</span>
                          </div>
                        )}
                        {t.error && <div className="text-rose-300">{t.error}</div>}
                        {hasAnswer && (
                          <p className="whitespace-pre-wrap break-words" dir="auto">{text}</p>
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
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
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
