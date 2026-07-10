import { RouteError, RouteNotFound } from "@/components/route-boundaries";
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
  Cpu,
  FileBarChart2,
  Flame,
  Gauge,
  Hexagon,
  KeyRound,
  LifeBuoy,
  Map,
  Network,
  Radio,
  ShieldCheck,
  SignalHigh,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { getExecKpis } from "@/lib/sec.functions";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { queryEvidence } from "@/lib/evidence/gate";
import { AlertsPanel } from "@/components/sec/alerts-panel";
import { HoloCommandStage } from "@/components/cinematic/HoloCommandStage";
import { NexusRevealHero } from "@/components/cinematic/NexusRevealHero";
import { EnterpriseActivityFeed } from "@/components/events/EventTimeline";

export const Route = createFileRoute("/_authenticated/dashboard")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  head: () => ({
    meta: [
      { title: "AI Command Center — Nexus AI OS" },
      {
        name: "description",
        content:
          "Live executive cockpit: KPIs, incidents, patrols, work orders, and digital twin telemetry for the Western Region Industrial Security operations.",
      },
      { property: "og:title", content: "AI Command Center — Nexus AI OS" },
      { property: "og:description", content: "Live executive cockpit and operations telemetry." },
      { property: "og:url", content: "https://neexios.com/dashboard" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://neexios.com/dashboard" }],
  }),
  component: OperationsCockpit,
});

type ExecKpiData = Awaited<ReturnType<typeof getExecKpis>>;

type Node = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  ar: string;
  en: string;
  hint?: (k: ExecKpiData | undefined) => string;
  tone?: keyof typeof TONE;
};

const TONE = {
  primary: {
    text: "text-primary",
    border: "border-primary/40",
    bg: "bg-primary",
    rgb: "0,212,255",
  },
  secondary: {
    text: "text-secondary",
    border: "border-secondary/40",
    bg: "bg-secondary",
    rgb: "58,232,255",
  },
  amber: {
    text: "text-amber-400",
    border: "border-amber-400/40",
    bg: "bg-amber-400",
    rgb: "251,191,36",
  },
  rose: {
    text: "text-rose-400",
    border: "border-rose-400/40",
    bg: "bg-rose-400",
    rgb: "251,113,133",
  },
  emerald: {
    text: "text-emerald-400",
    border: "border-emerald-400/40",
    bg: "bg-emerald-400",
    rgb: "52,211,153",
  },
} as const;

// Tier 1 — Command & Intelligence
const TIER_COMMAND: Node[] = [
  {
    to: "/executive-reports",
    icon: FileBarChart2,
    ar: "التقارير التنفيذية",
    en: "Executive Reports",
    tone: "primary",
  },
  { to: "/sec/kpi", icon: Activity, ar: "مؤشرات الأداء", en: "Live KPIs", tone: "secondary" },
  {
    to: "/executive-map",
    icon: Map,
    ar: "الخريطة التنفيذية",
    en: "Executive Map",
    tone: "primary",
  },
  { to: "/exec", icon: Gauge, ar: "محرك التنفيذ", en: "Execution Engine", tone: "emerald" },
];

// Tier 2 — Core Operations
const TIER_OPERATIONS: Node[] = [
  {
    to: "/sec",
    icon: Network,
    ar: "مركز العمليات",
    en: "Operations Hub",
    tone: "primary",
    hint: (k) => `${k?.sites_operational ?? 0}/${k?.sites_total ?? 0} sites`,
  },
  {
    to: "/sec/incidents",
    icon: AlertTriangle,
    ar: "البلاغات والحوادث",
    en: "Incidents",
    tone: "rose",
    hint: (k) => `${k?.incidents_open ?? 0} open · ${k?.incidents_critical ?? 0} critical`,
  },
  {
    to: "/sec/patrols",
    icon: ShieldCheck,
    ar: "الدوريات",
    en: "Patrols",
    tone: "secondary",
    hint: (k) => `${k?.patrols_active ?? 0} active`,
  },
  {
    to: "/sec/cctv",
    icon: Camera,
    ar: "المراقبة المرئية",
    en: "CCTV Grid",
    tone: "primary",
    hint: (k) => `${k?.cameras_online ?? 0}/${k?.cameras_total ?? 0} online`,
  },
  { to: "/sec/twin", icon: Hexagon, ar: "التوأم الرقمي", en: "Digital Twin", tone: "secondary" },
  {
    to: "/sec/maintenance",
    icon: Wrench,
    ar: "أوامر الصيانة",
    en: "Work Orders",
    tone: "amber",
    hint: (k) => `${k?.wo_open ?? 0} open`,
  },
  {
    to: "/sec/permits",
    icon: KeyRound,
    ar: "التصاريح",
    en: "Permits",
    tone: "secondary",
    hint: (k) => `${k?.permits_active ?? 0} active`,
  },
  { to: "/sec/visitors", icon: Users, ar: "الزوار", en: "Visitors", tone: "secondary" },
];

// Tier 3 — Field Support
const TIER_FIELD: Node[] = [
  { to: "/sec/emergency", icon: LifeBuoy, ar: "الطوارئ", en: "Emergency", tone: "rose" },
  { to: "/sec/risks", icon: Flame, ar: "المخاطر", en: "Risks", tone: "amber" },
  { to: "/sec/assets", icon: Boxes, ar: "الأصول", en: "Assets", tone: "secondary" },
  { to: "/sec/facilities", icon: Building2, ar: "المنشآت", en: "Facilities", tone: "secondary" },
  { to: "/sec/contractors", icon: Truck, ar: "المقاولون", en: "Contractors", tone: "secondary" },
  { to: "/sec/shifts", icon: ClipboardList, ar: "الورديات", en: "Shifts", tone: "primary" },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function NodeCard({
  n,
  k,
  size = "md",
}: {
  n: Node;
  k: ExecKpiData | undefined;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = n.icon;
  const t = TONE[n.tone ?? "secondary"];
  const pad = size === "lg" ? "p-5" : size === "sm" ? "p-3" : "p-4";
  const iconSize = size === "lg" ? "w-6 h-6" : "w-5 h-5";
  const iconBox = size === "lg" ? "w-12 h-12" : "w-10 h-10";
  return (
    <Link
      to={n.to}
      className={`group relative flex flex-col gap-2.5 ${pad} rounded-xl bg-gradient-to-br from-background/60 to-background/30 backdrop-blur-xl border border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden`}
      style={{ boxShadow: `0 0 30px -12px rgba(${t.rgb},0.4)` }}
    >
      <div
        className={`absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent ${t.text} opacity-60`}
      />
      <div
        className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${t.bg}`}
      />
      <div className="relative flex items-start justify-between">
        <div
          className={`${iconBox} rounded-lg border ${t.border} bg-background/70 flex items-center justify-center`}
        >
          <Icon className={`${iconSize} ${t.text}`} />
        </div>
        <ArrowUpRight className="w-4 h-4 text-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>
      <div className="relative">
        <div
          className={`${size === "lg" ? "text-base" : "text-sm"} font-semibold text-foreground leading-tight`}
        >
          {n.ar}
        </div>
        <div className="text-[10px] text-foreground/40 uppercase tracking-wider mt-0.5">{n.en}</div>
        {n.hint && (
          <div className={`text-[10px] font-mono mt-2 ${t.text} opacity-80`}>{n.hint(k)}</div>
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
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: keyof typeof TONE;
}) {
  const t = TONE[tone];
  return (
    <div className="relative p-4 rounded-xl bg-gradient-to-br from-background/60 to-background/20 backdrop-blur-xl border border-white/5 overflow-hidden">
      <div className={`absolute inset-y-0 right-0 w-px ${t.bg} opacity-70`} />
      <div className="text-[10px] uppercase tracking-[0.25em] text-foreground/50 font-mono">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-bold tabular-nums ${t.text}`}>{value}</div>
      {sub && <div className="text-[11px] text-foreground/40 font-mono mt-1">{sub}</div>}
    </div>
  );
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono text-foreground/60 uppercase tracking-widest mb-1.5">
        <span>{label}</span>
        <span className="text-foreground/90">{Math.round(value)}%</span>
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

function TierLabel({
  index,
  ar,
  en,
  color,
}: {
  index: string;
  ar: string;
  en: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${color} bg-background/60 backdrop-blur`}
      >
        <span className="text-[10px] font-mono tracking-widest text-foreground/70">
          TIER {index}
        </span>
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{ar}</div>
        <div className="text-[10px] text-foreground/40 uppercase tracking-wider">{en}</div>
      </div>
      <div className="flex-1 h-px bg-gradient-to-l from-white/10 to-transparent" />
    </div>
  );
}

// Vertical connector line between tiers
function Connector() {
  return (
    <div className="relative flex justify-center my-2">
      <div className="w-px h-8 bg-gradient-to-b from-primary/60 via-secondary/40 to-transparent" />
      <div className="absolute top-0 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor] animate-pulse" />
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
    sysStatus === "OPTIMAL"
      ? "text-emerald-400"
      : sysStatus === "ELEVATED"
        ? "text-amber-400"
        : sysStatus === "ALERT"
          ? "text-rose-400"
          : "text-primary";

  const scrollToOps = () => {
    if (typeof document === "undefined") return;
    document.getElementById("ops-cockpit")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative w-full bg-[#04060d] text-slate-100">
      {/* SCREEN 01 — NEXUS Reveal hero (cinematic holographic identity) */}
      <NexusRevealHero onEnterOps={scrollToOps} />

      {/* SCREEN 02 — Operations cockpit */}
      <div
        id="ops-cockpit"
        className="relative min-h-[calc(100vh-3rem)] w-full p-5 md:p-8 overflow-hidden"
        dir="rtl"
      >
        {/* Holographic Executive Command backdrop — live KPI-driven, GPU animated */}
        <HoloCommandStage isAr k={k} status={sysStatus} />

        {/* Ambient grid + neural backdrop (above stage, below content) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/6 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-secondary/6 blur-[120px] rounded-full" />
        </div>

        {/* Header */}
        <header className="relative z-20 w-full max-w-[1680px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 pb-5 border-b border-primary/15">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase ${sysTone}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-current ${kpisQ.isFetching ? "animate-pulse" : ""}`}
                />
                SYSTEM · {sysStatus}
              </span>
              <EvidenceBadge
                evidence={queryEvidence(
                  "sec_exec_kpis",
                  kpisQ.dataUpdatedAt,
                  kpisQ.isFetching ? "SYNCING" : "LIVE",
                )}
                label={kpisQ.isFetching ? "SYNCING" : "LIVE"}
                tone="cyan"
              />

              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase text-primary/80">
                <Cpu className="w-3 h-3" /> NEXUS · AI · OS
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-primary to-secondary">
              مركز عمليات الأمن الصناعي
            </h1>
            <div className="text-xs text-foreground/50 mt-1">
              إدارة الأمن الصناعي · المنطقة الغربية · {date}
            </div>
          </div>
          <div className="text-left">
            <div className="text-3xl font-mono text-primary tracking-widest tabular-nums">
              {time}
            </div>
            <div className="flex items-center gap-2 justify-end text-[10px] text-foreground/40 uppercase tracking-widest font-mono mt-1">
              <Radio className="w-3 h-3 text-primary animate-pulse" />
              JED · MKK · YBU
            </div>
          </div>
        </header>

        {/* Live KPI strip */}
        <section className="relative z-10 w-full max-w-[1680px] mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
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
          <KpiStat label="Work Orders" value={fmt(k?.wo_open)} sub="open" tone="amber" />
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
            tone="emerald"
          />
          <KpiStat
            label="Readiness"
            value={`${Math.round(k?.executive_readiness ?? 0)}%`}
            sub={`risk ${Math.round(k?.risk_index ?? 0)}%`}
            tone="primary"
          />
        </section>

        {/* Main: Organizational hierarchy + telemetry */}
        <main className="relative z-10 w-full max-w-[1680px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Org hierarchy */}
          <section className="lg:col-span-9 relative">
            {/* TIER 1 — Command */}
            <TierLabel
              index="01"
              ar="القيادة والاستخبارات"
              en="Command & Intelligence"
              color="border-primary/40"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TIER_COMMAND.map((n) => (
                <NodeCard key={n.to} n={n} k={k} size="lg" />
              ))}
            </div>

            <Connector />

            {/* TIER 2 — Operations */}
            <TierLabel
              index="02"
              ar="العمليات الميدانية"
              en="Field Operations"
              color="border-secondary/40"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TIER_OPERATIONS.map((n) => (
                <NodeCard key={n.to} n={n} k={k} />
              ))}
            </div>

            <Connector />

            {/* TIER 3 — Support */}
            <TierLabel
              index="03"
              ar="الإسناد والموارد"
              en="Support & Resources"
              color="border-amber-400/40"
            />
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {TIER_FIELD.map((n) => (
                <NodeCard key={n.to} n={n} k={k} size="sm" />
              ))}
            </div>
          </section>

          {/* Side telemetry */}
          <aside className="lg:col-span-3 space-y-4">
            <AlertsPanel />
            <div className="p-4 rounded-xl bg-gradient-to-br from-background/60 to-background/20 backdrop-blur-xl border border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <SignalHigh className="w-4 h-4 text-primary" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/60 font-mono">
                  Live Telemetry
                </span>
              </div>
              <div className="space-y-3">
                <ProgressBar label="CCTV Coverage" value={k?.cctv_health ?? 0} color="bg-primary" />
                <ProgressBar
                  label="Access Control"
                  value={k?.access_health ?? 0}
                  color="bg-secondary"
                />
                <ProgressBar
                  label="Patrol Completion"
                  value={k?.patrol_completion ?? 0}
                  color="bg-emerald-400"
                />
                <ProgressBar
                  label="Readiness"
                  value={k?.executive_readiness ?? 0}
                  color="bg-secondary"
                />
                <ProgressBar label="Risk Index" value={k?.risk_index ?? 0} color="bg-rose-500" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-background/60 to-background/20 backdrop-blur-xl border border-white/5 font-mono text-[11px] leading-relaxed">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-secondary" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/60">
                  Edge Nodes
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                <span className="text-foreground/50">CAMERAS</span>
                <span className="text-primary text-right">
                  {fmt(k?.cameras_online)}/{fmt(k?.cameras_total)}
                </span>
                <span className="text-foreground/50">GATES</span>
                <span className="text-secondary text-right">
                  {fmt(k?.gates_online)}/{fmt(k?.gates_total)}
                </span>
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

            <EnterpriseActivityFeed height="h-[360px]" compact filter={{ limit: 40 }} />
          </aside>
        </main>
      </div>
    </div>
  );
}
