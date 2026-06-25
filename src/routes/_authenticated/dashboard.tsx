import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Building2,
  Camera,
  ClipboardList,
  FileBarChart2,
  Flame,
  Gauge,
  Hexagon,
  KeyRound,
  Layers,
  LifeBuoy,
  Map,
  Radio,
  ShieldCheck,
  SignalHigh,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { getExecKpis } from "@/lib/sec.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: OperationsCockpit,
});

type Module = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  ar: string;
  en: string;
  hint?: (k: ExecKpiData | undefined) => string;
  tone?: "primary" | "secondary" | "amber" | "rose";
};

type ExecKpiData = Awaited<ReturnType<typeof getExecKpis>>;

const PRIMARY_MODULES: Module[] = [
  { to: "/sec", icon: Layers, ar: "مركز العمليات", en: "Operations Hub", tone: "primary",
    hint: (k) => `${k?.sites_operational ?? 0}/${k?.sites_total ?? 0} sites live` },
  { to: "/sec/incidents", icon: AlertTriangle, ar: "البلاغات والحوادث", en: "Incidents & Alerts", tone: "rose",
    hint: (k) => `${k?.incidents_open ?? 0} open · ${k?.incidents_critical ?? 0} critical` },
  { to: "/sec/patrols", icon: ShieldCheck, ar: "الدوريات الأمنية", en: "Security Patrols", tone: "secondary",
    hint: (k) => `${k?.patrols_active ?? 0} active patrols` },
  { to: "/sec/cctv", icon: Camera, ar: "المراقبة المرئية", en: "CCTV Grid", tone: "primary",
    hint: (k) => `${k?.cameras_online ?? 0}/${k?.cameras_total ?? 0} online` },
  { to: "/sec/twin", icon: Hexagon, ar: "التوأم الرقمي", en: "Digital Twin", tone: "secondary" },
  { to: "/sec/maintenance", icon: Wrench, ar: "أوامر العمل والصيانة", en: "Work Orders", tone: "amber",
    hint: (k) => `${k?.wo_open ?? 0} open` },
  { to: "/sec/permits", icon: KeyRound, ar: "تصاريح العمل", en: "Access Permits", tone: "secondary",
    hint: (k) => `${k?.permits_active ?? 0} active` },
  { to: "/sec/visitors", icon: Users, ar: "إدارة الزوار", en: "Visitor Management", tone: "secondary" },
  { to: "/executive-reports", icon: FileBarChart2, ar: "التقارير التنفيذية", en: "Executive Reports", tone: "primary" },
  { to: "/sec/kpi", icon: Activity, ar: "مؤشرات الأداء", en: "Live KPIs", tone: "primary" },
];

const QUICK_LAUNCH: Module[] = [
  { to: "/sec/emergency", icon: LifeBuoy, ar: "الطوارئ", en: "Emergency", tone: "rose" },
  { to: "/sec/risks", icon: Flame, ar: "المخاطر", en: "Risks", tone: "amber" },
  { to: "/sec/assets", icon: Boxes, ar: "الأصول", en: "Assets", tone: "secondary" },
  { to: "/sec/facilities", icon: Building2, ar: "المنشآت", en: "Facilities", tone: "secondary" },
  { to: "/sec/contractors", icon: Truck, ar: "المقاولون", en: "Contractors", tone: "secondary" },
  { to: "/sec/shifts", icon: ClipboardList, ar: "الورديات", en: "Shifts", tone: "secondary" },
  { to: "/executive-map", icon: Map, ar: "الخريطة التنفيذية", en: "Executive Map", tone: "primary" },
  { to: "/exec", icon: Gauge, ar: "محرك التنفيذ", en: "Execution Engine", tone: "primary" },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const TONE_TEXT = {
  primary: "text-primary",
  secondary: "text-secondary",
  amber: "text-amber-400",
  rose: "text-rose-400",
} as const;

const TONE_BORDER = {
  primary: "border-primary/40",
  secondary: "border-secondary/40",
  amber: "border-amber-400/40",
  rose: "border-rose-400/40",
} as const;

const TONE_GLOW = {
  primary: "shadow-[0_0_24px_-8px_rgba(0,212,255,0.55)]",
  secondary: "shadow-[0_0_24px_-8px_rgba(58,232,255,0.55)]",
  amber: "shadow-[0_0_24px_-8px_rgba(251,191,36,0.55)]",
  rose: "shadow-[0_0_24px_-8px_rgba(251,113,133,0.55)]",
} as const;

function ModuleCard({ m, k }: { m: Module; k: ExecKpiData | undefined }) {
  const Icon = m.icon;
  const tone = m.tone ?? "secondary";
  return (
    <Link
      to={m.to}
      className={`group relative flex flex-col gap-3 p-4 rounded-xl bg-background/40 backdrop-blur-xl border border-white/5 hover:border-white/15 hover:bg-background/60 transition-all duration-300 overflow-hidden ${TONE_GLOW[tone]}`}
    >
      <div className={`absolute -top-px right-0 left-0 h-px bg-gradient-to-r from-transparent via-current to-transparent ${TONE_TEXT[tone]} opacity-50`} />
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg border ${TONE_BORDER[tone]} bg-background/60 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${TONE_TEXT[tone]}`} />
        </div>
        <ArrowUpRight className="w-4 h-4 text-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground leading-tight">{m.ar}</div>
        <div className="text-[10px] text-foreground/40 uppercase tracking-wider mt-0.5">{m.en}</div>
        {m.hint && (
          <div className={`text-[10px] font-mono mt-2 ${TONE_TEXT[tone]} opacity-80`}>
            {m.hint(k)}
          </div>
        )}
      </div>
    </Link>
  );
}

function KpiStat({
  label,
  value,
  sub,
  tone = "primary",
}: { label: string; value: string; sub?: string; tone?: keyof typeof TONE_TEXT }) {
  return (
    <div className="relative p-4 rounded-xl bg-background/40 backdrop-blur-xl border border-white/5 overflow-hidden">
      <div className={`absolute inset-y-0 right-0 w-px ${TONE_TEXT[tone]} opacity-60 bg-current`} />
      <div className="text-[10px] uppercase tracking-[0.25em] text-foreground/50 font-mono">{label}</div>
      <div className={`mt-2 text-3xl font-bold tabular-nums ${TONE_TEXT[tone]}`}>{value}</div>
      {sub && <div className="text-[11px] text-foreground/40 font-mono mt-1">{sub}</div>}
    </div>
  );
}

function ProgressBar({ label, value, suffix = "%", color }: { label: string; value: number; suffix?: string; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono text-foreground/60 uppercase tracking-widest mb-1.5">
        <span>{label}</span>
        <span className="text-foreground/90">{Math.round(value)}{suffix}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} shadow-[0_0_10px_currentColor] transition-[width] duration-700`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function OperationsCockpit() {
  const now = useClock();
  const time = now.toLocaleTimeString("en-GB", { hour12: false });
  const date = now.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" });
  const kpisQ = useQuery({
    queryKey: ["exec-kpis"],
    queryFn: () => getExecKpis(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
  const k = kpisQ.data;
  const fmt = (v: number | undefined) => (v === undefined ? "—" : v.toLocaleString("en-US"));
  const sysStatus = !k
    ? "INITIALIZING"
    : k.executive_readiness >= 75
      ? "OPTIMAL"
      : k.executive_readiness >= 50
        ? "ELEVATED"
        : "ALERT";
  const sysTone =
    sysStatus === "OPTIMAL" ? "text-emerald-400"
    : sysStatus === "ELEVATED" ? "text-amber-400"
    : sysStatus === "ALERT" ? "text-rose-400"
    : "text-primary";

  return (
    <div
      className="relative min-h-[calc(100vh-3rem)] w-full bg-[#061A2E] text-slate-100 p-5 md:p-8 overflow-hidden"
      dir="rtl"
    >
      {/* Ambient grid + glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/8 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-secondary/8 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,212,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,212,255,0.04)_1px,transparent_1px)] bg-[size:60px_60px] opacity-50" />
      </div>

      {/* Header */}
      <header className="relative z-20 w-full max-w-[1680px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 pb-5 border-b border-primary/15">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase ${sysTone}`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-current ${kpisQ.isFetching ? "animate-pulse" : ""}`} />
              SYSTEM · {sysStatus}
            </span>
            <span className="text-[10px] text-foreground/40 font-mono">{kpisQ.isFetching ? "SYNCING" : "LIVE"}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-primary to-secondary">
            مركز عمليات الأمن الصناعي
          </h1>
          <div className="text-xs text-foreground/50 mt-1">إدارة الأمن الصناعي · المنطقة الغربية · {date}</div>
        </div>
        <div className="text-left">
          <div className="text-3xl font-mono text-primary tracking-widest tabular-nums">{time}</div>
          <div className="flex items-center gap-2 justify-end text-[10px] text-foreground/40 uppercase tracking-widest font-mono mt-1">
            <Radio className="w-3 h-3 text-primary animate-pulse" />
            JED · MKK · YBU
          </div>
        </div>
      </header>

      {/* Live KPI strip */}
      <section className="relative z-10 w-full max-w-[1680px] mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiStat
          label="Open Incidents"
          value={fmt(k?.incidents_open)}
          sub={`${k?.incidents_critical ?? 0} critical`}
          tone="rose"
        />
        <KpiStat
          label="Active Patrols"
          value={fmt(k?.patrols_active)}
          sub={`completion ${Math.round(k?.patrol_completion ?? 0)}%`}
          tone="secondary"
        />
        <KpiStat
          label="Work Orders"
          value={fmt(k?.wo_open)}
          sub="open"
          tone="amber"
        />
        <KpiStat
          label="Active Permits"
          value={fmt(k?.permits_active)}
          sub={`${k?.contractors_active ?? 0} contractors`}
          tone="primary"
        />

        <KpiStat
          label="Sites Online"
          value={`${k?.sites_operational ?? 0}/${k?.sites_total ?? 0}`}
          sub="Western Region"
          tone="secondary"
        />
        <KpiStat
          label="Readiness"
          value={`${Math.round(k?.executive_readiness ?? 0)}%`}
          sub={`risk ${Math.round(k?.risk_index ?? 0)}%`}
          tone="primary"
        />
      </section>

      {/* Main grid: modules + ops telemetry */}
      <main className="relative z-10 w-full max-w-[1680px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Modules grid */}
        <section className="lg:col-span-9">
          <div className="flex items-center gap-3 mb-3">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/60 font-mono">Operational Modules</span>
            <div className="flex-1 h-px bg-gradient-to-l from-primary/30 to-transparent" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {PRIMARY_MODULES.map((m) => (
              <ModuleCard key={m.to} m={m} k={k} />
            ))}
          </div>
        </section>

        {/* Side telemetry */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="p-4 rounded-xl bg-background/40 backdrop-blur-xl border border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <SignalHigh className="w-4 h-4 text-primary" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/60 font-mono">Live Telemetry</span>
            </div>
            <div className="space-y-3">
              <ProgressBar label="CCTV Coverage" value={k?.cctv_health ?? 0} color="bg-primary" />
              <ProgressBar label="Access Control" value={k?.access_health ?? 0} color="bg-secondary" />
              <ProgressBar label="Patrol Completion" value={k?.patrol_completion ?? 0} color="bg-emerald-400" />
              <ProgressBar label="Readiness" value={k?.executive_readiness ?? 0} color="bg-secondary" />
              <ProgressBar label="Risk Index" value={k?.risk_index ?? 0} color="bg-rose-500" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-background/40 backdrop-blur-xl border border-white/5 font-mono text-[11px] leading-relaxed">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-secondary" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/60">Edge Nodes</span>
            </div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-3">
              <span className="text-foreground/50">CAMERAS</span>
              <span className="text-primary text-right">{fmt(k?.cameras_online)}/{fmt(k?.cameras_total)}</span>
              <span className="text-foreground/50">GATES</span>
              <span className="text-secondary text-right">{fmt(k?.gates_online)}/{fmt(k?.gates_total)}</span>
              <span className="text-foreground/50">SENSORS</span>
              <span className="text-emerald-400 text-right">{fmt(k?.sensors_total)}</span>
              <span className="text-foreground/50">ALARMING</span>
              <span className="text-rose-400 text-right">{fmt(k?.sensors_alarming)}</span>
              <span className="text-foreground/50">VISITORS</span>
              <span className="text-foreground/80 text-right">{fmt(k?.visitors_inside)}</span>
              <span className="text-foreground/50">CONTRACTORS</span>
              <span className="text-foreground/80 text-right">{fmt(k?.contractors_active)}</span>
            </div>
          </div>
        </aside>
      </main>

      {/* Quick launcher */}
      <section className="relative z-10 w-full max-w-[1680px] mx-auto mt-8">
        <div className="flex items-center gap-3 mb-3">
          <Gauge className="w-4 h-4 text-primary" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/60 font-mono">Quick Launch</span>
          <div className="flex-1 h-px bg-gradient-to-l from-primary/30 to-transparent" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {QUICK_LAUNCH.map((t) => {
            const Icon = t.icon;
            const tone = t.tone ?? "secondary";
            return (
              <Link
                key={t.to}
                to={t.to}
                className="group flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-white/5 bg-background/40 backdrop-blur-xl hover:border-primary/60 hover:bg-primary/10 transition-all duration-300"
              >
                <Icon className={`w-5 h-5 ${TONE_TEXT[tone]} group-hover:scale-110 transition-transform`} />
                <span className="text-[11px] text-foreground/80 text-center">{t.ar}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
