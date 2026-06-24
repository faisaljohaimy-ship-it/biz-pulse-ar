import { useMemo } from "react";
import {
  Mail, Sparkles, BarChart3, FileText, Bell, ShieldAlert,
  Activity, GitBranch, Bot, Brain, Search, Globe2, HeartPulse,
  Radio, LineChart, Clock, Lightbulb,
} from "lucide-react";

type Widget = { icon: typeof Mail; label: string; labelAr: string; tone?: "bar" | "spark" | "dot" };

const WIDGETS: Widget[] = [
  { icon: Mail,        label: "Executive Mail",     labelAr: "البريد التنفيذي",  tone: "dot" },
  { icon: Sparkles,    label: "AI Responses",       labelAr: "ردود الذكاء",       tone: "spark" },
  { icon: BarChart3,   label: "KPI Analytics",      labelAr: "مؤشرات الأداء",      tone: "bar" },
  { icon: FileText,    label: "Executive Reports",  labelAr: "تقارير تنفيذية",     tone: "dot" },
  { icon: Bell,        label: "Live Notifications", labelAr: "تنبيهات حية",        tone: "dot" },
  { icon: ShieldAlert, label: "Security Alerts",    labelAr: "تنبيهات أمنية",      tone: "dot" },
  { icon: Activity,    label: "Risk Analysis",      labelAr: "تحليل المخاطر",      tone: "spark" },
  { icon: LineChart,   label: "Predictive Intel",   labelAr: "تحليلات تنبؤية",     tone: "spark" },
  { icon: GitBranch,   label: "Workflow Status",    labelAr: "حالة سير العمل",     tone: "bar" },
  { icon: Bot,         label: "AI Agents",          labelAr: "وكلاء الذكاء",       tone: "dot" },
  { icon: Brain,       label: "Decision Intel",     labelAr: "ذكاء القرار",        tone: "spark" },
  { icon: Search,      label: "Enterprise Search",  labelAr: "بحث المؤسسة",        tone: "dot" },
  { icon: Globe2,      label: "Digital Twin",       labelAr: "التوأم الرقمي",      tone: "bar" },
  { icon: HeartPulse,  label: "System Health",      labelAr: "صحة الأنظمة",        tone: "bar" },
  { icon: Radio,       label: "Realtime Ops",       labelAr: "العمليات الفورية",   tone: "spark" },
  { icon: Lightbulb,   label: "Recommendations",    labelAr: "توصيات ARIA",        tone: "dot" },
];

function WidgetMini({ tone }: { tone: Widget["tone"] }) {
  if (tone === "bar") {
    return (
      <div className="flex h-4 items-end gap-[2px]">
        {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => (
          <span
            key={i}
            className="aria-mini-bar w-[3px] rounded-sm bg-[var(--aria-cyan-bright)]"
            style={{ height: `${h * 100}%`, animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    );
  }
  if (tone === "spark") {
    return (
      <svg viewBox="0 0 40 16" className="h-4 w-10">
        <polyline
          points="0,12 6,8 12,10 18,4 24,7 30,3 36,6 40,2"
          fill="none"
          stroke="var(--aria-aqua)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--aria-aqua)]" />;
}

function HoloCard({ w, isAr, className, style }: {
  w: Widget; isAr: boolean; className?: string; style?: React.CSSProperties;
}) {
  const Icon = w.icon;
  return (
    <div
      className={`aria-glass-card group pointer-events-auto flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[10px] ${className ?? ""}`}
      style={style}
    >
      <span className="grid h-6 w-6 place-items-center rounded-md bg-[color-mix(in_oklab,var(--aria-cyan)_25%,transparent)] text-[var(--aria-aqua)]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="whitespace-nowrap font-medium text-[var(--aria-text)]/95">
        {isAr ? w.labelAr : w.label}
      </span>
      <span className="ml-auto pl-2"><WidgetMini tone={w.tone} /></span>
    </div>
  );
}

/** Premium holographic AI core — no humanoid, no robot. Pure SVG + CSS. */
export function AriaExecutiveCore({ size = 320 }: { size?: number }) {
  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* halo */}
      <div
        className="absolute inset-[-22%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--aria-cyan) 55%, transparent) 0%, color-mix(in oklab, var(--aria-glow) 25%, transparent) 35%, transparent 70%)",
          filter: "blur(24px)",
          animation: "aria-pulse-core 5s ease-in-out infinite",
        }}
      />
      {/* outer dashed ring */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" style={{ animation: "aria-spin-slow 28s linear infinite" }}>
        <circle cx="100" cy="100" r="92" fill="none" stroke="var(--aria-cyan)" strokeOpacity="0.55" strokeWidth="0.8" strokeDasharray="2 6" />
        <circle cx="100" cy="100" r="86" fill="none" stroke="var(--aria-cyan-bright)" strokeOpacity="0.25" strokeWidth="0.5" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const x1 = 100 + Math.cos(a) * 92, y1 = 100 + Math.sin(a) * 92;
          const x2 = 100 + Math.cos(a) * 96, y2 = 100 + Math.sin(a) * 96;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--aria-aqua)" strokeWidth="0.8" />;
        })}
      </svg>
      {/* mid neural ring */}
      <svg viewBox="0 0 200 200" className="absolute inset-[10%] h-[80%] w-[80%]" style={{ animation: "aria-spin-rev 22s linear infinite" }}>
        <circle cx="100" cy="100" r="78" fill="none" stroke="var(--aria-cyan)" strokeOpacity="0.7" strokeWidth="1" />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const x = 100 + Math.cos(a) * 78, y = 100 + Math.sin(a) * 78;
          return <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.1} fill="var(--aria-aqua)" />;
        })}
        {/* neural chords */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a1 = (i / 8) * Math.PI * 2;
          const a2 = a1 + Math.PI * 0.6;
          const x1 = 100 + Math.cos(a1) * 78, y1 = 100 + Math.sin(a1) * 78;
          const x2 = 100 + Math.cos(a2) * 78, y2 = 100 + Math.sin(a2) * 78;
          return <path key={i} d={`M${x1} ${y1} Q 100 100 ${x2} ${y2}`} stroke="var(--aria-cyan-bright)" strokeOpacity="0.22" strokeWidth="0.6" fill="none" />;
        })}
      </svg>
      {/* inner plasma sphere */}
      <div
        className="relative rounded-full"
        style={{
          width: "46%", height: "46%",
          background:
            "radial-gradient(circle at 35% 30%, var(--aria-aqua) 0%, var(--aria-cyan-bright) 35%, var(--aria-cyan) 60%, var(--aria-glow) 90%)",
          boxShadow:
            "0 0 80px color-mix(in oklab, var(--aria-cyan) 80%, transparent), inset 0 0 40px color-mix(in oklab, white 25%, transparent), inset 0 -20px 40px color-mix(in oklab, var(--aria-bg) 60%, transparent)",
          animation: "aria-pulse-core 4s ease-in-out infinite",
        }}
      >
        {/* core glyph */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-70">
          <circle cx="50" cy="50" r="6" fill="white" />
          <circle cx="50" cy="50" r="18" fill="none" stroke="white" strokeOpacity="0.45" strokeWidth="0.8" strokeDasharray="2 3" />
          <circle cx="50" cy="50" r="28" fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="0.6" />
        </svg>
      </div>
      {/* ARIA label */}
      <div className="pointer-events-none absolute bottom-[6%] rounded-full border border-[var(--aria-cyan)]/40 bg-[var(--aria-bg)]/70 px-3 py-0.5 text-[9px] font-semibold tracking-[0.4em] text-[var(--aria-aqua)] backdrop-blur">
        ARIA
      </div>
    </div>
  );
}

/** Cinematic executive-office backdrop — full bleed. */
export function ExecutiveOfficeBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 aria-hero-bg" />
      {/* faint grid */}
      <div className="absolute inset-0 aria-grid opacity-60" />
      {/* blurred glass-wall silhouettes (out-of-focus office) */}
      <div
        className="absolute -left-10 top-1/3 h-72 w-80 rounded-[40px] opacity-30"
        style={{ background: "linear-gradient(135deg, var(--aria-surface), transparent)", filter: "blur(40px)" }}
      />
      <div
        className="absolute -right-16 bottom-10 h-80 w-96 rounded-[40px] opacity-30"
        style={{ background: "linear-gradient(225deg, var(--aria-card), transparent)", filter: "blur(50px)" }}
      />
      {/* volumetric light rays */}
      <div className="absolute inset-0 aria-ray" style={{
        background:
          "conic-gradient(from 200deg at 50% -20%, transparent 0deg, color-mix(in oklab, var(--aria-cyan-bright) 18%, transparent) 12deg, transparent 30deg, transparent 180deg, color-mix(in oklab, var(--aria-aqua) 14%, transparent) 200deg, transparent 220deg)",
        mixBlendMode: "screen",
      }} />
      {/* particle dust */}
      <svg className="absolute inset-0 h-full w-full opacity-70">
        {Array.from({ length: 60 }).map((_, i) => {
          const x = (i * 137) % 100, y = (i * 53) % 100, r = (i % 3) * 0.6 + 0.4;
          return (
            <circle
              key={i}
              cx={`${x}%`} cy={`${y}%`} r={r}
              fill="var(--aria-aqua)"
              opacity={0.35 + ((i % 5) / 10)}
              style={{ animation: `aria-tick ${3 + (i % 5)}s ease-in-out ${i * 0.07}s infinite` }}
            />
          );
        })}
      </svg>
      {/* bottom gradient fade to next scene */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#04060d]" />
    </div>
  );
}

/** Holographic widgets surrounding ARIA. Orbit on desktop, grid on mobile. */
export function HoloWidgetRing({
  isAr,
  radiusX = 360,
  radiusY = 240,
}: { isAr: boolean; radiusX?: number; radiusY?: number }) {
  const positioned = useMemo(() => {
    const n = WIDGETS.length;
    return WIDGETS.map((w, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * radiusX;
      const y = Math.sin(a) * radiusY;
      return { w, x, y, delay: (i % 6) * 0.4 };
    });
  }, [radiusX, radiusY]);

  return (
    <>
      {/* Desktop orbit */}
      <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
        {positioned.map(({ w, x, y, delay }, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              animation: `${i % 2 ? "aria-float-y" : "aria-float-x"} ${5 + (i % 4)}s ease-in-out ${delay}s infinite`,
            }}
          >
            <HoloCard w={w} isAr={isAr} />
          </div>
        ))}
      </div>

      {/* Mobile: compact grid below the core */}
      <div className="mt-8 grid grid-cols-2 gap-2 md:hidden" dir={isAr ? "rtl" : "ltr"}>
        {WIDGETS.slice(0, 6).map((w, i) => (
          <HoloCard key={i} w={w} isAr={isAr} />
        ))}
      </div>
    </>
  );
}
