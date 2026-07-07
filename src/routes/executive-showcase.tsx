// Executive Showcase — full-screen cinematic auto-play tour of the NEXIOS
// platform components, narrated end-to-end by ARIA (voice + captions).
// RTL-first, bilingual, sim-tagged, respects prefers-reduced-motion.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import {
  Shield,
  Bot,
  Radar,
  BarChart3,
  Moon,
  Sparkles,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  ArrowLeft,
  Volume2,
  VolumeX,
} from "lucide-react";
import { SimulationRibbon } from "@/components/SimulationRibbon";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import ariaHologram from "@/assets/aria-hologram.png.asset.json";

export const Route = createFileRoute("/executive-showcase")({
  head: () => ({
    meta: [
      { title: "العرض التنفيذي — نيكسيوس | Executive Showcase" },
      {
        name: "description",
        content:
          "عرض سينمائي كامل الشاشة يستعرض مكوّنات منصة نيكسيوس — الأمن الصناعي، الوكلاء، التوأم الرقمي، التقارير، الحج، وARIA.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExecutiveShowcasePage,
});

type Scene = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title_ar: string;
  title_en: string;
  value_ar: string;
  value_en: string;
  /** ARIA narration text (Arabic, fully diacritized for TTS). */
  narration_ar: string;
  /** ARIA narration text (English fallback / captions). */
  narration_en: string;
  accent: string; // hex
  durationMs: number; // fallback when narration audio is unavailable
  visual: () => React.ReactNode;
};


const ACCENT_NAVY = "#3AE8FF";
const ACCENT_EMERALD = "#34D399";

const SCENES: Scene[] = [
  {
    id: "security",
    icon: Shield,
    title_ar: "الأمن الصناعي",
    title_en: "Industrial Security",
    value_ar: "حوادث، دوريات، تصاريح، زوّار ومركبات في منصة موحّدة.",
    value_en: "Incidents, patrols, permits, visitors and vehicles — one unified surface.",
    accent: ACCENT_NAVY,
    durationMs: 6500,
    visual: () => <SecurityHUD />,
  },
  {
    id: "agents",
    icon: Bot,
    title_ar: "الوكلاء التنفيذيون",
    title_en: "Executive Agents",
    value_ar: "14+ وكيل ذكاء مع تنسيق أدوات وسجل شرعي للأحداث.",
    value_en: "14+ AI agents with tool orchestration and an immutable event ledger.",
    accent: ACCENT_NAVY,
    durationMs: 6500,
    visual: () => <AgentsHUD />,
  },
  {
    id: "twin",
    icon: Radar,
    title_ar: "التوأم الرقمي",
    title_en: "Digital Twin",
    value_ar: "نبض حي للأصول والمواقع والعمليات عبر المؤسسة.",
    value_en: "Live pulse of assets, sites and operations across the enterprise.",
    accent: ACCENT_EMERALD,
    durationMs: 6500,
    visual: () => <TwinHUD />,
  },
  {
    id: "reports",
    icon: BarChart3,
    title_ar: "التقارير التنفيذية",
    title_en: "Executive Reports",
    value_ar: "مؤشرات أداء لحظية، ذاكرة إنتاجية، وتسليم عبر Outlook.",
    value_en: "Real-time KPIs, production memory, and Outlook delivery.",
    accent: ACCENT_EMERALD,
    durationMs: 6500,
    visual: () => <ReportsHUD />,
  },
  {
    id: "hajj",
    icon: Moon,
    title_ar: "منصة الحج",
    title_en: "Hajj Operations",
    value_ar: "وحدة مشاعر 1447 لإدارة العمليات الميدانية في الموسم.",
    value_en: "Mashaer 1447 module for field operations during the season.",
    accent: ACCENT_NAVY,
    durationMs: 6500,
    visual: () => <HajjHUD />,
  },
  {
    id: "aria",
    icon: Sparkles,
    title_ar: "ARIA — الذكاء التنفيذي",
    title_en: "ARIA — Executive Intelligence",
    value_ar: "محرك تنفيذي ثنائي اللغة بصوت طبيعي وذاكرة حيّة.",
    value_en: "Bilingual executive engine with natural voice and live memory.",
    accent: ACCENT_EMERALD,
    durationMs: 7000,
    visual: () => <AriaHUD />,
  },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

function ExecutiveShowcasePage() {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const [idx, setIdx] = React.useState(0);
  // Do not autoplay when the user prefers reduced motion — require manual nav.
  const [playing, setPlaying] = React.useState(!reduced);
  const [progress, setProgress] = React.useState(0);
  const [ended, setEnded] = React.useState(false);
  const isFinale = idx >= SCENES.length;

  // Keep playing state in sync if the media pref flips at runtime.
  React.useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);

  // Auto-advance timer + progress ticker.
  React.useEffect(() => {
    if (!playing || ended || isFinale) return;
    const scene = SCENES[idx];
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / scene.durationMs);
      setProgress(p);
      if (p >= 1) {
        if (idx < SCENES.length - 1) {
          setIdx((n) => n + 1);
          setProgress(0);
        } else {
          setEnded(true);
          setIdx(SCENES.length); // finale
          setPlaying(false);
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, idx, ended, isFinale]);

  // Keyboard controls
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate({ to: "/" });
      else if (e.key === "ArrowLeft") setIdx((i) => Math.min(SCENES.length - 1, i + 1));
      else if (e.key === "ArrowRight") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [navigate]);

  const goPrev = () => {
    setEnded(false);
    setProgress(0);
    setIdx((i) => Math.max(0, (isFinale ? SCENES.length - 1 : i - 1)));
  };
  const goNext = () => {
    if (idx >= SCENES.length - 1) {
      setEnded(true);
      setIdx(SCENES.length);
      setPlaying(false);
      return;
    }
    setProgress(0);
    setIdx((i) => i + 1);
  };
  const restart = () => {
    setEnded(false);
    setIdx(0);
    setProgress(0);
    setPlaying(!reduced);
  };

  const shownIdx = isFinale ? SCENES.length - 1 : idx;
  const scene = SCENES[shownIdx];
  const overallProgress = isFinale
    ? 100
    : ((idx + progress) / SCENES.length) * 100;

  return (
    <div
      dir="rtl"
      lang="ar"
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#03111f] text-white select-none"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="العرض التنفيذي · Executive Showcase"
    >
      <SimulationRibbon />

      {/* Background accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(60% 45% at 50% 25%, ${scene.accent}22, transparent 70%), radial-gradient(80% 60% at 50% 100%, #061A2E 0%, #03111f 60%, #010810 100%)`,
            transition: "background 800ms ease",
          }}
        />
      </div>

      {/* Top bar */}
      <header className="relative z-30 flex items-center justify-between gap-3 px-4 pt-3 sm:px-8 sm:pt-4">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white/80">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: scene.accent, boxShadow: `0 0 12px ${scene.accent}` }}
          />
          نيكسيوس · NEXIOS
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[11px] text-white/60 sm:inline">
            {String(Math.min(idx + 1, SCENES.length)).padStart(2, "0")} / {String(SCENES.length).padStart(2, "0")}
          </span>
          <Link
            to="/"
            aria-label="خروج · Exit"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur transition hover:border-[#3AE8FF]/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Progress bar */}
      <div className="relative z-30 mt-3 h-[3px] w-full bg-white/10">
        <div
          className="h-full"
          style={{
            width: `${overallProgress}%`,
            background: `linear-gradient(90deg, ${ACCENT_NAVY}, ${ACCENT_EMERALD})`,
            transition: reduced ? "none" : "width 180ms linear",
            boxShadow: `0 0 12px ${scene.accent}`,
          }}
        />
      </div>

      {/* Body */}
      <main className="relative z-20 flex flex-1 items-center justify-center px-4 sm:px-10">
        {isFinale ? (
          <Finale onRestart={restart} />
        ) : (
          <SceneView scene={scene} reduced={reduced} />
        )}
      </main>

      {/* Bottom controls */}
      <footer className="relative z-30 flex flex-col items-center gap-3 pb-4 sm:pb-6">
        <div className="flex items-center gap-2" aria-hidden={isFinale}>
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setEnded(false);
                setProgress(0);
                setIdx(i);
              }}
              aria-label={`${i + 1}. ${s.title_ar}`}
              className={`h-2 rounded-full transition-all ${
                !isFinale && i === idx
                  ? "w-8"
                  : "w-2 bg-white/30 hover:bg-white/60"
              }`}
              style={
                !isFinale && i === idx
                  ? { background: scene.accent, boxShadow: `0 0 10px ${scene.accent}` }
                  : undefined
              }
            />
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <CtrlBtn onClick={goPrev} label="السابق · Previous">
            <SkipBack className="h-4 w-4" />
          </CtrlBtn>
          {isFinale ? (
            <CtrlBtn onClick={restart} label="إعادة · Restart">
              <Play className="h-4 w-4" />
            </CtrlBtn>
          ) : (
            <CtrlBtn
              onClick={() => setPlaying((p) => !p)}
              label={playing ? "إيقاف مؤقت · Pause" : "تشغيل · Play"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </CtrlBtn>
          )}
          <CtrlBtn onClick={goNext} label="التالي · Next">
            <SkipForward className="h-4 w-4" />
          </CtrlBtn>
          <Link
            to="/"
            className="mr-1 rounded-full border border-white/20 bg-black/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur transition hover:border-[#3AE8FF]/60 hover:text-white sm:px-4 sm:text-[11px]"
          >
            خروج · Exit
          </Link>
        </div>
      </footer>
    </div>
  );
}

function CtrlBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/40 text-white/85 backdrop-blur transition hover:-translate-y-0.5 hover:border-[#3AE8FF]/60 hover:text-white"
    >
      {children}
    </button>
  );
}

function SceneView({ scene, reduced }: { scene: Scene; reduced: boolean }) {
  const Icon = scene.icon;
  return (
    <div
      key={scene.id}
      className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-10"
      style={{
        animation: reduced ? undefined : "showcase-in 700ms cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      <div className="order-2 md:order-1">
        <div
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.32em]"
          style={{
            borderColor: `${scene.accent}66`,
            color: scene.accent,
            background: `${scene.accent}14`,
          }}
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{scene.title_en}</span>
        </div>
        <h1
          className="mt-4 text-[28px] font-black leading-[1.15] tracking-tight text-white sm:text-[44px]"
          style={{ textShadow: "0 2px 24px rgba(0,0,0,0.5)" }}
        >
          {scene.title_ar}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
          {scene.value_ar}
        </p>
        <p dir="ltr" className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
          {scene.value_en}
        </p>
        <span
          className="mt-5 inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.28em] text-amber-200"
        >
          عرض توضيحي · Demo
        </span>
      </div>
      <div className="order-1 md:order-2">
        <div
          className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
          style={{
            boxShadow: `0 30px 80px ${scene.accent}22, 0 0 0 1px ${scene.accent}22 inset`,
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(60% 50% at 50% 40%, ${scene.accent}22, transparent 70%)`,
            }}
          />
          <div className="relative flex h-full w-full items-center justify-center p-6">
            {scene.visual()}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes showcase-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Finale({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
      <div
        className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#3AE8FF]"
        style={{ textShadow: "0 0 18px rgba(58,232,255,0.6)" }}
      >
        NEXIOS · AI OPERATING SYSTEM
      </div>
      <h1
        className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl"
        style={{ textShadow: "0 0 40px rgba(58,232,255,0.35)" }}
      >
        الذكاء، تحت <span style={{ color: "#4ADE80" }}>القيادة</span>.
      </h1>
      <p dir="ltr" className="mt-3 text-sm uppercase tracking-[0.3em] text-white/60">
        Intelligence, under command.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          to="/os"
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#3AE8FF] px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#061A2E] shadow-[0_6px_28px_rgba(58,232,255,0.35)] transition hover:bg-[#5CEEFF]"
        >
          بدء العملية · Start Operation
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#3AE8FF]/45 bg-[#3AE8FF]/[0.06] px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#3AE8FF] transition hover:border-[#3AE8FF]/80 hover:bg-[#3AE8FF]/[0.12]"
        >
          <Play className="h-4 w-4" /> إعادة العرض · Replay
        </button>
      </div>
    </div>
  );
}

/* ─────────── HUD visuals (lightweight, brand-consistent) ─────────── */

function HudFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-full w-full grid-cols-6 grid-rows-6 gap-2 font-mono text-[10px] text-white/70">
      {children}
    </div>
  );
}

function SecurityHUD() {
  return (
    <HudFrame>
      <div className="col-span-4 row-span-4 rounded-lg border border-[#3AE8FF]/25 bg-[#3AE8FF]/[0.04] p-3">
        <div className="text-[9px] uppercase tracking-[0.3em] text-[#3AE8FF]/80">Incidents · حوادث</div>
        <div className="mt-2 space-y-1.5">
          {[
            { t: "P1 · تسرّب حراري — موقع A", c: "#F87171" },
            { t: "P2 · إنذار محيط — بوابة 3", c: "#F59E0B" },
            { t: "P3 · صيانة وقائية", c: "#3AE8FF" },
            { t: "P4 · دورية منتظمة", c: "#94A3B8" },
          ].map((r) => (
            <div key={r.t} className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: r.c, boxShadow: `0 0 8px ${r.c}` }}
              />
              <span className="truncate text-white/80">{r.t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="col-span-2 row-span-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-center">
        <div className="text-[8px] uppercase tracking-[0.25em] text-white/50">Open</div>
        <div className="mt-1 text-2xl font-black text-[#3AE8FF]">14</div>
      </div>
      <div className="col-span-2 row-span-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-center">
        <div className="text-[8px] uppercase tracking-[0.25em] text-white/50">SLA</div>
        <div className="mt-1 text-2xl font-black text-emerald-300">98%</div>
      </div>
      <div className="col-span-6 row-span-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
        <div className="text-[9px] uppercase tracking-[0.25em] text-white/50">Patrol Coverage</div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[82%] bg-gradient-to-r from-[#3AE8FF] to-emerald-400" />
        </div>
      </div>
    </HudFrame>
  );
}

function AgentsHUD() {
  const agents = ["Ops", "Sec", "HR", "Finance", "Risk", "Legal", "CX", "IT"];
  return (
    <div className="grid h-full w-full grid-cols-4 grid-rows-2 gap-2">
      {agents.map((a, i) => (
        <div
          key={a}
          className="flex flex-col items-center justify-center rounded-lg border border-[#3AE8FF]/20 bg-[#3AE8FF]/[0.05] p-2"
          style={{ animation: `pulse 2.4s ease-in-out ${i * 0.15}s infinite` }}
        >
          <Bot className="h-4 w-4 text-[#3AE8FF]" />
          <div className="mt-1 text-[10px] font-semibold text-white/80">{a}</div>
          <div className="text-[8px] text-white/40">agent</div>
        </div>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
    </div>
  );
}

function TwinHUD() {
  return (
    <svg viewBox="0 0 300 240" className="h-full w-full">
      <defs>
        <radialGradient id="tw" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="150" cy="120" r="90" fill="url(#tw)" />
      {[
        [80, 70],
        [220, 90],
        [200, 180],
        [90, 170],
        [150, 60],
        [150, 190],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill="#3AE8FF">
            <animate attributeName="r" values="3;6;3" dur="2s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
          </circle>
          <line x1="150" y1="120" x2={x} y2={y} stroke="#3AE8FF" strokeOpacity="0.35" strokeWidth="1" />
        </g>
      ))}
      <circle cx="150" cy="120" r="6" fill="#34D399" />
      <text x="150" y="230" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="monospace">
        LIVE · digital twin · sim
      </text>
    </svg>
  );
}

function ReportsHUD() {
  const bars = [40, 62, 55, 78, 66, 82, 70, 90];
  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div className="text-[9px] uppercase tracking-[0.3em] text-white/60">KPIs · Q3</div>
        <div className="font-mono text-emerald-300">+12.4%</div>
      </div>
      <div className="flex flex-1 items-end gap-1.5">
        {bars.map((b, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-[#3AE8FF] to-emerald-300"
            style={{ height: `${b}%`, opacity: 0.85 }}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
        {[
          ["Revenue", "$4.2M"],
          ["OpEx", "-6.1%"],
          ["NPS", "72"],
        ].map(([k, v]) => (
          <div key={k} className="rounded border border-white/10 bg-white/[0.03] p-1.5">
            <div className="text-[8px] uppercase tracking-[0.25em] text-white/40">{k}</div>
            <div className="text-white">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HajjHUD() {
  return (
    <div className="grid h-full w-full grid-cols-2 gap-2 font-mono text-[10px]">
      {[
        ["مِنى · Mina", "Zone A", "#3AE8FF"],
        ["عرفة · Arafat", "Zone B", "#F5C560"],
        ["مزدلفة · Muzdalifah", "Zone C", "#34D399"],
        ["مكة · Makkah", "Central", "#A78BFA"],
      ].map(([ar, en, c]) => (
        <div
          key={ar}
          className="flex flex-col justify-between rounded-lg border p-2"
          style={{ borderColor: `${c}55`, background: `${c}0d` }}
        >
          <div className="text-[9px] uppercase tracking-[0.25em]" style={{ color: c }}>
            {en}
          </div>
          <div className="text-sm font-bold text-white" dir="rtl">
            {ar}
          </div>
          <div className="flex items-center gap-1 text-white/60">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: c, boxShadow: `0 0 6px ${c}` }}
            />
            live
          </div>
        </div>
      ))}
    </div>
  );
}

function AriaHUD() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <div className="relative">
        <div
          className="h-32 w-32 rounded-full"
          style={{
            background: "radial-gradient(circle at 40% 40%, #3AE8FF, #0B3B5C 60%, transparent 70%)",
            boxShadow: "0 0 60px rgba(58,232,255,0.55), inset 0 0 40px rgba(0,212,255,0.3)",
            animation: "orb 3s ease-in-out infinite",
          }}
        />
        <style>{`@keyframes orb{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
      </div>
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.4em] text-[#3AE8FF]">ARIA · آريا</div>
        <div className="mt-1 font-mono text-[10px] text-white/60">bilingual · voice · memory</div>
      </div>
    </div>
  );
}
