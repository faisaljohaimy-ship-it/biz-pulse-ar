/**
 * SovereignCommandDeck — engineering-grade executive command deck.
 *
 * Visual direction: schematic engineering blueprint × Palantir Gotham briefing
 * wall × NASA JPL mission ops. Bilingual AR/EN, RTL-safe, deep #061A2E base
 * with cyan #00D4FF / #3AE8FF instrument accents. Every KPI is a real
 * instrument (numeric + micro-gauge + secondary readout + evidence badge),
 * framed by a blueprint grid, coordinate rulers, and a schematic title block.
 *
 * Data: the public homepage deck renders the deterministic simulation
 * snapshot (sim_* — aggregated across the four regional administrations
 * from region-sim-data). Every value is explicitly badged
 * «محاكاة · لقطة عامة» — no unlabeled numbers, no network dependency, so
 * the instruments are populated in the SSR HTML itself and can never
 * render empty. Panels are translucent so the ARIA hologram remains the
 * living backdrop of the whole system.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Users,
  Building2,
  ChevronRight,
  Signal,
  Lock,
  CircuitBoard,
  Hexagon,
  Home,
  Sparkles,
} from "lucide-react";
import { REGIONS } from "@/lib/regions";
import { regionSim } from "@/lib/sec/region-sim-data";
import { SimBadge } from "@/components/os/SimBadge";

// Deterministic simulation snapshot — aggregated across the four regions.
// Operational KPIs (compliance, stations, staff, tasks, alerts, incidents)
// derived here so the deck mirrors the executive command layout.
const SIM = (() => {
  const per = REGIONS.map((r) => regionSim(r.id).counts);
  const sum = (f: (c: (typeof per)[number]) => number) => per.reduce((a, c) => a + f(c), 0);
  const avg = (f: (c: (typeof per)[number]) => number) => Math.round(sum(f) / per.length);
  return {
    regions: REGIONS.length,
    stationsOperational: per.filter((c) => c.readiness >= 90).length,
    compliance: avg((c) => c.safety), // % — average safety/compliance
    fieldStaff: sum((c) => c.contractors_active + c.patrols_active),
    completedTasks: sum((c) => c.permits_active),
    activeAlerts: sum((c) => c.cctv_new),
    openIncidents: sum((c) => c.incidents_open),
  };
})();

// Live wall clock. Initialised synchronously (SSR renders real server time,
// suppressHydrationWarning on the readouts absorbs the client re-stamp), so
// the clock is NEVER empty — then ticks every second after hydration.
function useLiveClock() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

type Tone = "cyan" | "emerald" | "amber" | "rose";

const TONE_RING: Record<Tone, string> = {
  cyan: "text-[#3AE8FF] border-[#3AE8FF]/45 shadow-[0_0_20px_rgba(58,232,255,0.22)]",
  emerald: "text-emerald-300 border-emerald-400/45 shadow-[0_0_20px_rgba(52,211,153,0.20)]",
  amber: "text-amber-300 border-amber-400/50 shadow-[0_0_22px_rgba(251,191,36,0.22)]",
  rose: "text-rose-300 border-rose-400/55 shadow-[0_0_24px_rgba(251,113,133,0.26)]",
};
const TONE_NUM: Record<Tone, string> = {
  cyan: "text-[#E6FBFF] drop-shadow-[0_0_12px_rgba(58,232,255,0.4)]",
  emerald: "text-emerald-100 drop-shadow-[0_0_12px_rgba(52,211,153,0.32)]",
  amber: "text-amber-100 drop-shadow-[0_0_14px_rgba(251,191,36,0.36)]",
  rose: "text-rose-100 drop-shadow-[0_0_16px_rgba(251,113,133,0.44)]",
};
const TONE_DELTA: Record<Tone, string> = {
  cyan: "text-[#3AE8FF]/85",
  emerald: "text-emerald-300/90",
  amber: "text-amber-300/90",
  rose: "text-rose-300/95",
};
const TONE_STROKE: Record<Tone, string> = {
  cyan: "#3AE8FF",
  emerald: "#34D399",
  amber: "#FBBF24",
  rose: "#FB7185",
};

function pad2(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n < 10 ? `0${n}` : String(n);
}
function fmtClock(d: Date | null): string {
  if (!d) return "--:--:--";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
function fmtStardate(d: Date | null): string {
  if (!d) return "----.---";
  const y = d.getFullYear();
  const start = new Date(y, 0, 0).getTime();
  const doy = Math.floor((d.getTime() - start) / 86_400_000);
  const frac = Math.floor(
    ((d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86_400) * 1000,
  );
  return `${y}.${String(doy).padStart(3, "0")}.${String(frac).padStart(3, "0")}`;
}

// Small radial arc gauge (0..1 fill).
function RadialGauge({
  value,
  color,
  size = 44,
}: {
  readonly value: number;
  readonly color: string;
  readonly size?: number;
}) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(58,232,255,0.14)"
        strokeWidth={2}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - v)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          filter: `drop-shadow(0 0 4px ${color})`,
          transition: "stroke-dashoffset 600ms ease",
        }}
      />
    </svg>
  );
}

interface KpiSpec {
  readonly key: string;
  readonly icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  readonly labelAr: string;
  readonly labelEn: string;
  readonly subAr: string;
  readonly subEn: string;
  readonly value: number | undefined;
  readonly display?: string; // override for ratio/percent values (e.g. "3/4", "97%")
  readonly tone: Tone;
  readonly hintAr: string;
  readonly hintEn: string;
  readonly unit: string; // small unit chip (e.g. "OPEN", "PCS", "%")
  readonly gauge: number; // 0..1 completion for radial arc
  readonly padded: boolean; // show two-digit padded (00) style
}

export function SovereignCommandDeck({ ar }: { readonly ar: boolean }) {
  const now = useLiveClock();

  // Operational KPIs mirroring the executive command layout (see design ref):
  // compliance · operational stations · field staff · completed tasks ·
  // active alerts · open incidents. All derived from the sim snapshot.
  const kpis: readonly KpiSpec[] = [
    {
      key: "compliance",
      icon: CheckCircle2,
      labelAr: "معدّل الامتثال",
      labelEn: "Compliance Rate",
      subAr: "إنجاز المهام",
      subEn: "TASK DELIVERY",
      value: SIM.compliance,
      display: `${SIM.compliance}%`,
      tone: "cyan",
      hintAr: "▲ امتثال كامل",
      hintEn: "▲ FULLY COMPLIANT",
      unit: "%",
      gauge: SIM.compliance / 100,
      padded: false,
    },
    {
      key: "stations",
      icon: Building2,
      labelAr: "المحطات التشغيلية",
      labelEn: "Operational Stations",
      subAr: "حالة الشبكة",
      subEn: "NETWORK STATE",
      value: SIM.stationsOperational,
      display: `${SIM.stationsOperational}/${SIM.regions}`,
      tone: "emerald",
      hintAr: "▲ ضمن النطاق",
      hintEn: "▲ IN RANGE",
      unit: "OPS",
      gauge: SIM.stationsOperational / SIM.regions,
      padded: false,
    },
    {
      key: "field_staff",
      icon: Users,
      labelAr: "الموظفون في الميدان",
      labelEn: "Field Staff",
      subAr: "متصل الآن",
      subEn: "ONLINE NOW",
      value: SIM.fieldStaff,
      tone: "cyan",
      hintAr: "▲ تغطية حيّة",
      hintEn: "▲ LIVE COVERAGE",
      unit: "PAX",
      gauge: Math.min(1, SIM.fieldStaff / 300),
      padded: false,
    },
    {
      key: "completed_tasks",
      icon: ShieldCheck,
      labelAr: "المهام المنجزة",
      labelEn: "Completed Tasks",
      subAr: "خلال اليوم",
      subEn: "TODAY",
      value: SIM.completedTasks,
      tone: "emerald",
      hintAr: "▲ ضمن الخطة",
      hintEn: "▲ ON PLAN",
      unit: "DONE",
      gauge: Math.min(1, SIM.completedTasks / 40),
      padded: false,
    },
    {
      key: "active_alerts",
      icon: ShieldAlert,
      labelAr: "التنبيهات النشطة",
      labelEn: "Active Alerts",
      subAr: "تتطلّب اهتماماً",
      subEn: "NEEDS ATTENTION",
      value: SIM.activeAlerts,
      tone: "amber",
      hintAr: "◆ تحت المتابعة",
      hintEn: "◆ MONITORED",
      unit: "ALERT",
      gauge: 1 - Math.min(1, SIM.activeAlerts / 30),
      padded: true,
    },
    {
      key: "open_incidents",
      icon: AlertTriangle,
      labelAr: "الحوادث المفتوحة",
      labelEn: "Open Incidents",
      subAr: "آخر 24 ساعة",
      subEn: "LAST 24H",
      value: SIM.openIncidents,
      tone: "rose",
      hintAr: "▼ تتطلّب قرارًا",
      hintEn: "▼ NEEDS DECISION",
      unit: "OPEN",
      gauge: 1 - Math.min(1, SIM.openIncidents / 40),
      padded: true,
    },
  ];

  return (
    <div
      className="relative w-full"
      style={{
        animation: "sov-deck-rise 900ms cubic-bezier(0.22,1,0.36,1) both",
        willChange: "transform, opacity",
      }}
    >
      {/* ── Blueprint grid + coordinate rulers ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 overflow-hidden rounded-sm"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(58,232,255,0.05) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(58,232,255,0.05) 1px, transparent 1px)",
          ].join(","),
          backgroundSize: "48px 48px, 48px 48px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 45%, black 55%, transparent 100%)",
        }}
      />
      {/* left/right coordinate ticks */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-2 sm:block"
      >
        {Array.from({ length: 22 }).map((_, i) => (
          <div
            key={i}
            className={`h-[calc(100%/22)] border-l ${
              i % 5 === 0 ? "border-[#3AE8FF]/45" : "border-[#3AE8FF]/12"
            }`}
          />
        ))}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-2 sm:block"
      >
        {Array.from({ length: 22 }).map((_, i) => (
          <div
            key={i}
            className={`h-[calc(100%/22)] border-r ${
              i % 5 === 0 ? "border-[#3AE8FF]/45" : "border-[#3AE8FF]/12"
            }`}
          />
        ))}
      </div>

      {/* ── Marquee ticker ── */}
      <div className="relative mb-4 overflow-hidden rounded-sm border-y border-[#3AE8FF]/20 bg-[#061A2E]/45 py-1.5 backdrop-blur-sm">
        <div
          dir="ltr"
          className="flex whitespace-nowrap"
          style={{ animation: "sov-marquee 42s linear infinite" }}
        >
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex shrink-0 items-center gap-8 px-6 font-mono text-[10px] uppercase tracking-[0.32em] text-[#3AE8FF]/75"
            >
              <span className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[#3AE8FF] shadow-[0_0_8px_#3AE8FF]" />
                NEXIOS AI
              </span>
              <span className="text-[#3AE8FF]/30">◆</span>
              <span dir="rtl">منصة إنجاز الأعمال التنفيذية</span>
              <span className="text-[#3AE8FF]/30">◆</span>
              <span>INDUSTRIAL SECURITY COMMAND</span>
              <span className="text-[#3AE8FF]/30">◆</span>
              <span dir="rtl">آريا · الذكاء التنفيذي الحيّ</span>
              <span className="text-[#3AE8FF]/30">◆</span>
              <span>SOVEREIGN OPS DECK</span>
              <span className="text-[#3AE8FF]/30">◆</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Schematic title block ── */}
      <div className="relative mb-4 overflow-hidden rounded-sm border border-[#3AE8FF]/25 bg-gradient-to-br from-[#061A2E]/60 via-[#08243F]/55 to-[#04101C]/70 backdrop-blur-xl">
        <span className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-[#3AE8FF]/70" />
        <span className="pointer-events-none absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-[#3AE8FF]/70" />
        <span className="pointer-events-none absolute left-0 bottom-0 h-4 w-4 border-l-2 border-b-2 border-[#3AE8FF]/70" />
        <span className="pointer-events-none absolute right-0 bottom-0 h-4 w-4 border-r-2 border-b-2 border-[#3AE8FF]/70" />
        <div className="grid grid-cols-1 items-stretch divide-y divide-[#3AE8FF]/15 sm:grid-cols-[1.1fr_1fr_1.1fr] sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
          {/* Left cell: designation + Saudi Energy brand */}
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Saudi Energy mark */}
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#3AE8FF]/40 bg-gradient-to-br from-[#0a2a44] to-[#04101c] shadow-[0_0_18px_rgba(52,182,255,0.35)]"
            >
              <span
                className="text-[15px] font-black lowercase text-[#3AE8FF]"
                style={{ fontFamily: '"Space Grotesk", ui-sans-serif, system-ui' }}
              >
                se
              </span>
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold text-white sm:text-sm">
                {ar ? "الشركة السعودية للطاقة" : "Saudi Energy Company"}
              </div>
              <div className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.24em] text-[#3AE8FF]/80">
                Saudi Energy · Industrial Security
              </div>
              <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.28em] text-[#3AE8FF]/55">
                {ar ? "منصة قيادة الأمن الصناعي" : "Industrial Security Command"}
              </div>
            </div>
          </div>
          {/* Center cell: LIVE clock */}
          <div className="flex flex-col items-center justify-center px-4 py-3">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#3AE8FF]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#4ade80]" />
              </span>
              {ar ? "لحظي" : "LIVE"}
              <span className="text-[#3AE8FF]/40">·</span>
              <span className="text-emerald-300/90">ON&nbsp;AIR</span>
            </div>
            <div
              className="mt-1 font-mono text-2xl font-black leading-none text-white sm:text-3xl"
              style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em" }}
            >
              <span className="text-white/35">[</span>
              <span suppressHydrationWarning>{fmtClock(now)}</span>
              <span className="text-white/35">]</span>
            </div>
            <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#3AE8FF]/70">
              STARDATE · <span suppressHydrationWarning>{fmtStardate(now)}</span>
            </div>
          </div>
          {/* Right cell: coordinates */}
          <div className="px-4 py-3 text-end">
            <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-[#3AE8FF]/60">
              {ar ? "الإحداثيات" : "COORDINATES"}
            </div>
            <div
              className="mt-1 font-mono text-[13px] font-semibold text-white/95 sm:text-sm"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              N&nbsp;24°42′38″&nbsp;·&nbsp;E&nbsp;46°43′09″
            </div>
            <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#3AE8FF]/70">
              ALT&nbsp;612m · GRID&nbsp;MK-24
            </div>
          </div>
        </div>
      </div>

      {/* ── Status ribbon ── */}
      <div className="relative mb-5 grid grid-cols-1 gap-2 rounded-sm border border-[#3AE8FF]/18 bg-gradient-to-r from-[#061A2E]/40 via-[#0A2D4E]/45 to-[#061A2E]/40 px-3 py-2 backdrop-blur-md sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[9px] uppercase tracking-[0.24em] text-[#3AE8FF]/80 sm:text-[10px]">
          <span className="flex items-center gap-1.5">
            <Signal className="h-3 w-3" strokeWidth={2} />
            <span>NETWORK</span>
            <span className="text-[#3AE8FF]">SECURE&nbsp;TUNNEL</span>
          </span>
          <span className="hidden text-white/20 sm:inline">|</span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" strokeWidth={2} />
            <span>ENCRYPTION</span>
            <span className="text-emerald-300">TLS&nbsp;1.3&nbsp;AES-256</span>
          </span>
          <span className="hidden text-white/20 sm:inline">|</span>
          <span className="flex items-center gap-1.5">
            <CircuitBoard className="h-3 w-3" strokeWidth={2} />
            <span>ARIA</span>
            <span className="text-[#3AE8FF]">PROTOCOL&nbsp;v2.4</span>
          </span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-200/90">
            ALL&nbsp;SYSTEMS&nbsp;NOMINAL
          </span>
          <SimBadge ar={ar} className="text-[9px]" />
        </div>
      </div>

      {/* ── Section chrome header ── */}
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#3AE8FF]/70">
            {ar ? "لوحة القيادة السيادية" : "Sovereign Command Deck"}
          </div>
          <div
            className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-white sm:text-xl"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {ar ? "نبض المؤسسة — لقطة عامة" : "Enterprise Pulse — Snapshot"}
            <SimBadge ar={ar} className="text-[9px]" />
          </div>
        </div>
        <div className="hidden items-center gap-2 font-mono text-[9px] uppercase tracking-[0.28em] text-[#3AE8FF]/55 sm:flex">
          <span>SECTOR</span>
          <span className="text-[#3AE8FF]/85">INDUSTRIAL&nbsp;SECURITY</span>
          <ChevronRight className="h-3 w-3" strokeWidth={2} />
          <span>MODE</span>
          <span className="text-emerald-300">AUTO&nbsp;OPS</span>
        </div>
      </div>

      {/* ── Horizontal command band: console rail + KPI instruments ──
         Matches the executive command layout: a «وحدة القيادة» console on
         the side, KPI instruments flowing horizontally beside it. Stacks to
         a single column on mobile; console + KPIs sit side-by-side on lg+. */}
      <div className="relative grid grid-cols-1 gap-3 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-4">
        {/* Command console rail */}
        <div className="relative overflow-hidden rounded-sm border border-[#3AE8FF]/25 bg-gradient-to-b from-[#061A2E]/70 to-[#04101C]/80 p-3 backdrop-blur-xl">
          <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-[#3AE8FF]/70" />
          <span className="pointer-events-none absolute right-0 bottom-0 h-3 w-3 border-r border-b border-[#3AE8FF]/70" />
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#3AE8FF]/70">
            Command Console
          </div>
          <div className="mt-0.5 text-[13px] font-semibold text-white">
            {ar ? "وحدة القيادة" : "Command Unit"}
          </div>
          <Link
            to="/"
            aria-label={ar ? "الرئيسية" : "Home"}
            className="mt-3 flex min-h-11 items-center justify-between gap-2 rounded-2xl border border-[#3AE8FF]/45 bg-gradient-to-l from-[#1933E6]/50 via-[#0066FF]/35 to-[#3AE8FF]/25 px-3 py-2.5 text-white shadow-[0_0_22px_rgba(52,182,255,0.35)] transition hover:border-[#3AE8FF]/80 hover:shadow-[0_0_30px_rgba(52,182,255,0.5)]"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#3AE8FF]" aria-hidden />
              <span className="text-[13px] font-semibold">{ar ? "الرئيسية" : "Home"}</span>
            </span>
            <Home className="h-4 w-4 text-white/80" aria-hidden />
          </Link>
        </div>

        {/* KPI instruments — 2 cols on phones, 3 on tablets, 6-across on xl. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6 lg:gap-4">
          {kpis.map((k, idx) => {
            const Icon = k.icon;
            const label = ar ? k.labelAr : k.labelEn;
            const sub = ar ? k.subAr : k.subEn;
            const hint = ar ? k.hintAr : k.hintEn;
            const displayValue = k.display ?? (k.padded ? pad2(k.value) : (k.value ?? "—"));
            const stroke = TONE_STROKE[k.tone];
            const pct = Math.round(k.gauge * 100);
            return (
              <div
                key={k.key}
                className="group relative overflow-hidden rounded-sm border border-[#3AE8FF]/15 bg-gradient-to-b from-[#061A2E]/60 to-[#04101C]/75 p-3 backdrop-blur-xl transition-all duration-300 hover:border-[#3AE8FF]/50 hover:bg-[#061A2E]/70 lg:p-4"
                style={{
                  animation: `sov-tile-in 700ms cubic-bezier(0.22,1,0.36,1) ${140 + idx * 90}ms both`,
                  boxShadow:
                    "inset 0 1px 0 0 rgba(58,232,255,0.08), 0 12px 40px -20px rgba(0,0,0,0.9)",
                }}
              >
                {/* L-bracket corners */}
                <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-[#3AE8FF]/70" />
                <span className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-[#3AE8FF]/30" />
                <span className="pointer-events-none absolute left-0 bottom-0 h-3 w-3 border-l border-b border-[#3AE8FF]/30" />
                <span className="pointer-events-none absolute right-0 bottom-0 h-3 w-3 border-r border-b border-[#3AE8FF]/70" />

                {/* Hex serial tag — desktop only (too dense on mobile) */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-3 top-2 hidden opacity-70 sm:block rtl:-left-3 rtl:right-auto"
                >
                  <div className="relative">
                    <Hexagon className="h-8 w-8 text-[#3AE8FF]/25" strokeWidth={1.5} />
                    <span className="absolute inset-0 grid place-items-center font-mono text-[7.5px] font-bold uppercase tracking-[0.16em] text-[#3AE8FF]/70">
                      K{String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                </div>

                {/* Scan-line shimmer on hover */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(58,232,255,0.9) 50%, transparent 100%)",
                    boxShadow: "0 0 8px rgba(58,232,255,0.7)",
                  }}
                />

                {/* Header row */}
                <div className="flex items-start justify-between gap-1 sm:gap-2 sm:pe-6">
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-[10px] font-semibold leading-tight text-white/95 sm:text-[11px]"
                      title={label}
                    >
                      {label}
                    </div>
                    <div className="mt-0.5 hidden font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#3AE8FF]/60 sm:block">
                      {sub}
                    </div>
                  </div>
                  <div
                    className={`hidden h-8 w-8 shrink-0 place-items-center rounded-full border bg-[#04101C]/75 sm:grid ${TONE_RING[k.tone]}`}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </div>
                </div>

                {/* Numeric readout + radial gauge */}
                <div className="mt-1.5 flex items-center justify-between gap-1 sm:mt-3 sm:gap-2">
                  <div className="flex items-baseline gap-1 sm:gap-1.5">
                    <span
                      className={`text-2xl font-black leading-none sm:text-3xl lg:text-[38px] ${TONE_NUM[k.tone]}`}
                      style={{
                        fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {displayValue}
                    </span>
                    <span className="hidden font-mono text-[8.5px] font-semibold uppercase tracking-[0.22em] text-[#3AE8FF]/60 sm:inline">
                      {k.unit}
                    </span>
                  </div>
                  <div className="relative hidden shrink-0 sm:block">
                    <RadialGauge value={k.gauge} color={stroke} size={40} />
                    <span
                      className="absolute inset-0 grid place-items-center font-mono text-[8.5px] font-bold tabular-nums"
                      style={{ color: stroke }}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>

                {/* Delta / hint + simulation tag — desktop only */}
                <div className="mt-3 hidden items-center justify-between gap-2 sm:flex">
                  <span
                    className={`font-mono text-[9px] uppercase tracking-[0.22em] ${TONE_DELTA[k.tone]}`}
                  >
                    {hint}
                  </span>
                  <SimBadge ar={ar} className="text-[8px]" />
                </div>

                {/* Micro sparkline strip */}
                <div
                  className="mt-1.5 flex h-2 items-end gap-[1.5px] sm:mt-3 sm:h-3 sm:gap-[2px]"
                  aria-hidden
                >
                  {Array.from({ length: 22 }).map((_, i) => {
                    const seed = (i * 13 + k.key.length * 7) % 100;
                    const h = 20 + (seed % 70);
                    return (
                      <span
                        key={i}
                        className={`w-[1.5px] rounded-sm sm:w-[2px] ${
                          k.tone === "rose"
                            ? "bg-rose-400/55"
                            : k.tone === "amber"
                              ? "bg-amber-300/55"
                              : k.tone === "emerald"
                                ? "bg-emerald-300/55"
                                : "bg-[#3AE8FF]/60"
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom telemetry rail ── */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[#3AE8FF]/15 pt-3 font-mono text-[9px] uppercase tracking-[0.24em] text-[#3AE8FF]/55">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-[#3AE8FF] shadow-[0_0_6px_#3AE8FF]" />
            SYS&nbsp;v2.4.0 · ARIA
          </span>
          <span className="hidden sm:inline">TLS&nbsp;1.3 · AES-256</span>
          <span className="hidden md:inline">SCHEMA · SEC-OVR&nbsp;R7</span>
        </div>
        <div className="flex items-center gap-4">
          <SimBadge ar={ar} className="text-[8px]" />
          <span>UPTIME&nbsp;99.97%</span>
          <span>
            LAT&nbsp;<span className="text-[#3AE8FF]/85">42ms</span>
          </span>
          <span className="hidden sm:inline">
            TERMINAL <span className="text-[#3AE8FF]/85">HQS-01-SEC</span>
          </span>
        </div>
      </div>

      {/* Local keyframes */}
      <style>{`
        @keyframes sov-deck-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sov-tile-in {
          from { opacity: 0; transform: translateY(10px) scale(0.985); filter: blur(2px); }
          to   { opacity: 1; transform: translateY(0)    scale(1);     filter: blur(0); }
        }
        @keyframes sov-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="sov-deck-rise"], [style*="sov-tile-in"] { animation: none !important; }
          [style*="sov-marquee"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
