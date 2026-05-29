import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Activity,
  AlertTriangle,
  Bot,
  Building2,
  Cpu,
  Database,
  GitBranch,
  Heart,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Workflow,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: CommandCenter,
});

type OrbitNode = {
  id: string;
  label_ar: string;
  label_en: string;
  meta_ar: string;
  meta_en: string;
  icon: React.ComponentType<{ className?: string }>;
  // position on the stage, in percentages
  x: number;
  y: number;
  hue: number; // accent hue for the node glow
};

const NODES: OrbitNode[] = [
  { id: "dept", label_ar: "الأقسام", label_en: "DEPARTMENTS", meta_ar: "24 نشط", meta_en: "24 Active", icon: Building2, x: 18, y: 22, hue: 210 },
  { id: "data", label_ar: "بحيرة البيانات", label_en: "DATA LAKE", meta_ar: "1.4 تيرابايت", meta_en: "1.4 TB Active", icon: Database, x: 78, y: 22, hue: 195 },
  { id: "int", label_ar: "التكاملات", label_en: "INTEGRATIONS", meta_ar: "18 متصل", meta_en: "18 Connected", icon: GitBranch, x: 10, y: 62, hue: 220 },
  { id: "agents", label_ar: "وكلاء الذكاء", label_en: "AI AGENTS", meta_ar: "48 نشط", meta_en: "48 Active", icon: Bot, x: 86, y: 62, hue: 175 },
  { id: "auto", label_ar: "الأتمتة", label_en: "AUTOMATIONS", meta_ar: "342 تشغيل", meta_en: "342 Running", icon: Workflow, x: 50, y: 82, hue: 200 },
];

function CommandCenter() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [query, setQuery] = useState("");

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#04060f]">
      {/* ── background field ────────────────────────────────────────── */}
      <CityscapeBackdrop />

      <div className="relative z-10 flex h-full flex-col p-4 md:p-6">
        {/* ── top bar ──────────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 opacity-80 blur-md" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/40 bg-[#081428]">
                <Sparkles className="h-5 w-5 text-cyan-300" />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-[0.3em] text-cyan-300/80">NEXUS</div>
              <div className="text-[10px] tracking-[0.25em] text-slate-400">
                {isAr ? "مركز القيادة الذكي" : "AI COMMAND CENTER"}
              </div>
            </div>
          </div>

          {/* global command bar */}
          <div className="relative mx-auto hidden w-full max-w-2xl md:block">
            <div className="absolute -inset-px rounded-full bg-gradient-to-r from-cyan-400/40 via-blue-500/20 to-cyan-400/40 opacity-60 blur" />
            <div className="relative flex items-center gap-3 rounded-full border border-cyan-400/20 bg-[#06101f]/80 px-4 py-2.5 backdrop-blur-xl">
              <span className="rounded-md bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-cyan-300">
                {isAr ? "أوامر AI" : "AI COMMAND"}
              </span>
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isAr ? "اسأل المساعد عن أي شيء..." : "Ask AI anything..."}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
              <kbd className="rounded border border-slate-700/60 bg-slate-900/60 px-1.5 py-0.5 text-[10px] text-slate-400">⌘K</kbd>
            </div>
          </div>

          {/* status pill */}
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 backdrop-blur-xl">
            <div className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-end">
              <div className="text-[10px] font-semibold tracking-wider text-emerald-300/90">{isAr ? "حالة النظام" : "SYSTEM STATUS"}</div>
              <div className="text-[10px] text-slate-400">{isAr ? "جميع الأنظمة تعمل" : "All Systems Operational"}</div>
            </div>
          </div>
        </header>

        {/* ── 3D stage ─────────────────────────────────────────────── */}
        <main className="relative mt-6 flex-1">
          <Stage isAr={isAr} />
        </main>

        {/* ── KPI strip ────────────────────────────────────────────── */}
        <footer className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Kpi icon={Workflow} label={isAr ? "إجمالي سير العمل" : "TOTAL WORKFLOWS"} value="1,247" delta="+15.3%" />
          <Kpi icon={Bot} label={isAr ? "وكلاء الذكاء" : "AI AGENTS ACTIVE"} value="48" delta="+12.7%" />
          <Kpi icon={Zap} label={isAr ? "المهام المكتملة" : "TASKS COMPLETED"} value="8,932" delta="+23.8%" />
          <Kpi icon={Activity} label={isAr ? "تشغيل النظام" : "SYSTEM UPTIME"} value="99.98%" delta="+0.02%" />
          <Kpi icon={Database} label={isAr ? "البيانات المعالجة" : "DATA PROCESSED"} value="2.4 TB" delta="+0.02%" />
          <Kpi icon={TrendingUp} label={isAr ? "العائد الشهري" : "ROI THIS MONTH"} value="$1.42M" delta="+31.4%" highlight />
        </footer>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function Stage({ isAr }: { isAr: boolean }) {
  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-b from-[#060d1e]/80 to-[#020512]/80 shadow-[0_40px_120px_-40px_rgba(34,211,238,0.35)] backdrop-blur-xl md:h-[560px]">
      {/* radial floor grid */}
      <FloorGrid />
      {/* connection beams */}
      <BeamsLayer />
      {/* orbit rings */}
      <OrbitRings />
      {/* central orb */}
      <CoreOrb isAr={isAr} />
      {/* nodes */}
      {NODES.map((n, i) => (
        <NodeChip key={n.id} node={n} delay={i * 120} isAr={isAr} />
      ))}
      {/* corner badges */}
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
        <span className="rounded-full border border-cyan-400/20 bg-[#06101f]/70 px-3 py-1 text-[10px] font-semibold tracking-[0.3em] text-cyan-300/80 backdrop-blur">
          {isAr ? "الواجهة الرئيسية ثلاثية الأبعاد" : "3D ENTERPRISE COMMAND VIEW"}
        </span>
      </div>
    </div>
  );
}

function FloorGrid() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-x-0 bottom-0 h-[55%]"
        style={{
          background:
            "linear-gradient(to top, rgba(34,211,238,0.10), transparent 80%)",
          maskImage:
            "linear-gradient(to top, black 30%, transparent 100%)",
        }}
      />
      <svg
        className="absolute inset-x-0 bottom-0 h-[60%] w-full opacity-50"
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="gridFade" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(56,189,248,0.45)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </linearGradient>
        </defs>
        {/* horizontal lines, perspective */}
        {Array.from({ length: 10 }).map((_, i) => {
          const t = i / 9;
          const y = 600 - Math.pow(t, 1.8) * 600;
          return (
            <line
              key={"h" + i}
              x1={0}
              x2={1000}
              y1={y}
              y2={y}
              stroke="url(#gridFade)"
              strokeWidth={0.6}
            />
          );
        })}
        {/* radial verticals */}
        {Array.from({ length: 21 }).map((_, i) => {
          const x = (i / 20) * 1000;
          return (
            <line
              key={"v" + i}
              x1={500}
              y1={250}
              x2={x}
              y2={600}
              stroke="url(#gridFade)"
              strokeWidth={0.5}
            />
          );
        })}
      </svg>
    </div>
  );
}

function OrbitRings() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
      {[260, 360, 480].map((size, i) => (
        <div
          key={size}
          className="absolute rounded-full border border-cyan-400/15"
          style={{
            width: size,
            height: size * 0.35,
            left: -size / 2,
            top: -(size * 0.35) / 2,
            animation: `spin ${30 + i * 12}s linear infinite ${i % 2 ? "reverse" : ""}`,
            boxShadow: "inset 0 0 30px rgba(34,211,238,0.05)",
          }}
        />
      ))}
    </div>
  );
}

function CoreOrb({ isAr }: { isAr: boolean }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
      <div className="relative h-48 w-48 md:h-56 md:w-56">
        {/* halo */}
        <div className="absolute inset-[-30%] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute inset-[-10%] rounded-full bg-blue-500/30 blur-2xl animate-pulse" />
        {/* sphere */}
        <div
          className="absolute inset-0 rounded-full border border-cyan-300/40"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(186,230,253,0.95), rgba(56,189,248,0.55) 35%, rgba(14,116,144,0.35) 65%, rgba(2,8,23,0.95) 100%)",
            boxShadow:
              "0 0 60px rgba(56,189,248,0.5), inset 0 0 40px rgba(186,230,253,0.4)",
          }}
        />
        {/* latitude lines */}
        <svg className="absolute inset-0" viewBox="0 0 100 100">
          {[20, 35, 50, 65, 80].map((cy) => (
            <ellipse
              key={cy}
              cx={50}
              cy={cy}
              rx={48}
              ry={4}
              fill="none"
              stroke="rgba(186,230,253,0.35)"
              strokeWidth={0.3}
            />
          ))}
          {[15, 30, 50, 70, 85].map((cx) => (
            <ellipse
              key={cx}
              cx={cx}
              cy={50}
              rx={4}
              ry={48}
              fill="none"
              stroke="rgba(186,230,253,0.25)"
              strokeWidth={0.3}
            />
          ))}
        </svg>
        {/* label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-[10px] font-semibold tracking-[0.4em] text-cyan-200/90">NEXUS</div>
          <div className="text-[9px] tracking-[0.35em] text-cyan-200/60">{isAr ? "نواة الذكاء" : "AI CORE"}</div>
        </div>
      </div>
    </div>
  );
}

function BeamsLayer() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(34,211,238,0)" />
          <stop offset="50%" stopColor="rgba(34,211,238,0.7)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0)" />
        </linearGradient>
      </defs>
      {NODES.map((n) => (
        <line
          key={n.id}
          x1={50}
          y1={42}
          x2={n.x}
          y2={n.y + 4}
          stroke="url(#beam)"
          strokeWidth={0.25}
          strokeDasharray="0.6 0.8"
          style={{ animation: "dash 6s linear infinite" }}
        />
      ))}
    </svg>
  );
}

function NodeChip({ node, delay, isAr }: { node: OrbitNode; delay: number; isAr: boolean }) {
  const Icon = node.icon;
  return (
    <div
      className="group absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        animation: `float-y 6s ease-in-out ${delay}ms infinite`,
      }}
    >
      {/* light pillar */}
      <div
        className="absolute left-1/2 top-full h-24 w-px -translate-x-1/2 opacity-70"
        style={{
          background: `linear-gradient(to bottom, hsla(${node.hue},90%,70%,0.9), transparent)`,
          boxShadow: `0 0 12px hsla(${node.hue},90%,70%,0.6)`,
        }}
      />
      {/* base ring */}
      <div
        className="absolute left-1/2 top-[calc(100%+6rem)] h-3 w-16 -translate-x-1/2 rounded-full blur-md"
        style={{ background: `hsla(${node.hue},90%,60%,0.6)` }}
      />
      {/* chip */}
      <div
        className="relative flex min-w-[140px] items-center gap-2.5 rounded-2xl border border-cyan-300/30 bg-[#06101f]/85 px-3 py-2 shadow-[0_8px_30px_-8px_rgba(34,211,238,0.6)] backdrop-blur-xl transition-transform group-hover:-translate-y-1"
        style={{
          boxShadow: `0 0 30px hsla(${node.hue},90%,60%,0.25), inset 0 0 0 1px hsla(${node.hue},90%,70%,0.15)`,
        }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `hsla(${node.hue},90%,55%,0.18)`, color: `hsl(${node.hue},90%,75%)` }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-[10px] font-semibold tracking-[0.2em] text-slate-200">
            {isAr ? node.label_ar : node.label_en}
          </div>
          <div className="text-[10px] text-slate-400">{isAr ? node.meta_ar : node.meta_en}</div>
        </div>
      </div>
    </div>
  );
}

function CityscapeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* nebula glows */}
      <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-cyan-500/15 blur-[120px]" />
      <div className="absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute bottom-0 left-1/2 h-80 w-[80%] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[120px]" />
      {/* starfield */}
      <svg className="absolute inset-0 h-full w-full opacity-60">
        {Array.from({ length: 80 }).map((_, i) => {
          const cx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
          const cy = (Math.cos(i * 78.233) * 43758.5453) % 1;
          const x = Math.abs(cx) * 100;
          const y = Math.abs(cy) * 100;
          const r = (i % 4 === 0 ? 1.2 : 0.6);
          return (
            <circle
              key={i}
              cx={`${x}%`}
              cy={`${y}%`}
              r={r}
              fill="white"
              opacity={0.25 + ((i % 5) * 0.1)}
            />
          );
        })}
      </svg>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#06101f]/80 p-4 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-cyan-300/40"
      style={{
        boxShadow: highlight
          ? "0 0 40px rgba(34,211,238,0.25), inset 0 0 0 1px rgba(34,211,238,0.15)"
          : undefined,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="text-[10px] font-semibold tracking-[0.2em] text-slate-400">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-50">{value}</div>
      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
        {delta}
        <span className="text-slate-500"> vs last month</span>
      </div>
    </div>
  );
}
