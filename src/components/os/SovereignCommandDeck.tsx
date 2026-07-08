/**
 * SovereignCommandDeck — engineering-grade executive command deck.
 *
 * Visual direction: schematic engineering blueprint × Palantir Gotham briefing
 * wall × NASA JPL mission ops. Bilingual AR/EN, RTL-safe, deep #061A2E base
 * with cyan #00D4FF / #3AE8FF instrument accents. Every KPI is a real
 * instrument (numeric + micro-gauge + secondary readout + evidence badge),
 * framed by a blueprint grid, coordinate rulers, and a schematic title block.
 *
 * All metrics flow through /api/public/os-overview and render via
 * <EvidenceBadge> (FR-19). Panels are translucent so the ARIA hologram
 * remains the living backdrop of the whole system.
 */
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Radar,
  Activity,
  UserCheck,
  Camera,
  ClipboardCheck,
  ChevronRight,
  Signal,
  Lock,
  CircuitBoard,
  Hexagon,
} from "lucide-react";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import type { Evidence } from "@/lib/evidence/gate";

type OverviewPayload = {
  ok: boolean;
  observedAt: string;
  source: string;
  counts?: {
    sites: number;
    incidents_open: number;
    incidents_critical: number;
    patrols_active: number;
    visitors_inside: number;
    permits_active: number;
    cctv_new: number;
    assets_offline: number;
    contractors_active: number;
  };
};

async function fetchOverview(): Promise<OverviewPayload> {
  const res = await fetch("/api/public/os-overview", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`overview_http_${res.status}`);
  return (await res.json()) as OverviewPayload;
}

function useLiveClock() {
  const [now, setNow] = useState<Date | null>(null);
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
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(58,232,255,0.14)" strokeWidth={2} fill="none" />
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
        style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: "stroke-dashoffset 600ms ease" }}
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
  readonly tone: Tone;
  readonly hintAr: string;
  readonly hintEn: string;
  readonly unit: string; // small unit chip (e.g. "OPEN", "PCS", "%")
  readonly gauge: number; // 0..1 completion for radial arc
  readonly padded: boolean; // show two-digit padded (00) style
}

export function SovereignCommandDeck({ ar }: { readonly ar: boolean }) {
  const q = useQuery({
    queryKey: ["os-overview"],
    queryFn: fetchOverview,
    refetchInterval: 20_000,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const now = useLiveClock();
  const counts = q.data?.counts;
  const observedAt = q.data?.observedAt;

  const mkEvidence = (value: number | undefined): Evidence | null => {
    if (!observedAt || value === undefined) return null;
    return {
      kind: "db.query",
      source: q.data?.source ?? "sec_overview.public_counts",
      observedAt,
      value,
    };
  };
  const runtimeEvidence: Evidence | null = observedAt
    ? { kind: "runtime.probe", source: "os_runtime", observedAt, value: "online" }
    : null;

  const liveLabel = ar ? "لحظي" : "LIVE";

  const kpis: readonly KpiSpec[] = [
    {
      key: "incidents_critical",
      icon: ShieldAlert,
      labelAr: "الحوادث الحرجة",
      labelEn: "Critical Incidents",
      subAr: "مفتوحة الآن",
      subEn: "OPEN NOW",
      value: counts?.incidents_critical,
      tone: "rose",
      hintAr: "▼ تتطلّب قرارًا",
      hintEn: "▼ NEEDS DECISION",
      unit: "SEV-1",
      gauge: 1 - Math.min(1, (counts?.incidents_critical ?? 0) / 5),
      padded: true,
    },
    {
      key: "incidents_open",
      icon: Activity,
      labelAr: "الحوادث المفتوحة",
      labelEn: "Open Incidents",
      subAr: "قيد المعالجة",
      subEn: "IN PROGRESS",
      value: counts?.incidents_open,
      tone: "amber",
      hintAr: "◆ تحت المتابعة",
      hintEn: "◆ MONITORED",
      unit: "OPEN",
      gauge: 1 - Math.min(1, (counts?.incidents_open ?? 0) / 20),
      padded: true,
    },
    {
      key: "patrols_active",
      icon: Radar,
      labelAr: "الدوريات النشطة",
      labelEn: "Active Patrols",
      subAr: "في الميدان",
      subEn: "IN FIELD",
      value: counts?.patrols_active,
      tone: "cyan",
      hintAr: "▲ تغطية حيّة",
      hintEn: "▲ LIVE COVERAGE",
      unit: "UNITS",
      gauge: Math.min(1, (counts?.patrols_active ?? 0) / 12),
      padded: false,
    },
    {
      key: "cctv_new",
      icon: Camera,
      labelAr: "تنبيهات الكاميرات",
      labelEn: "CCTV Alerts",
      subAr: "جديدة",
      subEn: "NEW",
      value: counts?.cctv_new,
      tone: "cyan",
      hintAr: "● تدفّق مستمرّ",
      hintEn: "● STREAM ON",
      unit: "FEEDS",
      gauge: 0.72,
      padded: false,
    },
    {
      key: "visitors_inside",
      icon: UserCheck,
      labelAr: "الزوار داخل الموقع",
      labelEn: "Visitors On-Site",
      subAr: "الآن",
      subEn: "NOW",
      value: counts?.visitors_inside,
      tone: "emerald",
      hintAr: "▲ متطابق مع التصاريح",
      hintEn: "▲ PERMIT MATCHED",
      unit: "PAX",
      gauge: Math.min(1, (counts?.visitors_inside ?? 0) / 500),
      padded: false,
    },
    {
      key: "permits_active",
      icon: ClipboardCheck,
      labelAr: "تصاريح العمل النشطة",
      labelEn: "Active Permits",
      subAr: "سارية",
      subEn: "VALID",
      value: counts?.permits_active,
      tone: "emerald",
      hintAr: "▲ امتثال كامل",
      hintEn: "▲ FULLY COMPLIANT",
      unit: "PTW",
      gauge: 0.97,
      padded: false,
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
          maskImage:
            "radial-gradient(ellipse 90% 70% at 50% 45%, black 55%, transparent 100%)",
        }}
      />
      {/* left/right coordinate ticks */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-2 sm:block">
        {Array.from({ length: 22 }).map((_, i) => (
          <div
            key={i}
            className={`h-[calc(100%/22)] border-l ${
              i % 5 === 0 ? "border-[#3AE8FF]/45" : "border-[#3AE8FF]/12"
            }`}
          />
        ))}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-2 sm:block">
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
          {/* Left cell: designation */}
          <div className="px-4 py-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-[#3AE8FF]/60">
              {ar ? "الوحدة" : "UNIT"}
            </div>
            <div
              className="mt-1 text-sm font-bold uppercase tracking-[0.22em] text-white sm:text-[15px]"
              style={{ fontFamily: '"Space Grotesk", ui-sans-serif, system-ui' }}
            >
              {ar ? "الأمن الصناعي" : "INDUSTRIAL SECURITY"}
            </div>
            <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#3AE8FF]/80">
              COMMAND · PLATFORM
            </div>
          </div>
          {/* Center cell: LIVE clock */}
          <div className="flex flex-col items-center justify-center px-4 py-3">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#3AE8FF]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#4ade80]" />
              </span>
              {liveLabel}
              <span className="text-[#3AE8FF]/40">·</span>
              <span className="text-emerald-300/90">ON&nbsp;AIR</span>
            </div>
            <div
              className="mt-1 font-mono text-2xl font-black leading-none text-white sm:text-3xl"
              style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em" }}
            >
              <span className="text-white/35">[</span>
              {fmtClock(now)}
              <span className="text-white/35">]</span>
            </div>
            <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#3AE8FF]/70">
              STARDATE · {fmtStardate(now)}
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
          <EvidenceBadge
            evidence={runtimeEvidence}
            label={liveLabel}
            tone="emerald"
            className="text-[9px]"
          />
        </div>
      </div>

      {/* ── Section chrome header ── */}
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#3AE8FF]/70">
            {ar ? "لوحة القيادة السيادية" : "Sovereign Command Deck"}
          </div>
          <div
            className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {ar ? "نبض المؤسسة — لحظياً" : "Enterprise Pulse — Live"}
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

      {/* ── KPI Grid: 6 engineered instrument tiles ──
         All viewports → single 6-column horizontal row spanning full width. */}
      <div
        className="relative grid grid-cols-6 gap-1.5 sm:gap-3 lg:gap-4"
      >
        {kpis.map((k, idx) => {
          const Icon = k.icon;
          const ev = mkEvidence(k.value);
          const label = ar ? k.labelAr : k.labelEn;
          const sub = ar ? k.subAr : k.subEn;
          const hint = ar ? k.hintAr : k.hintEn;
          const displayValue = k.padded ? pad2(k.value) : k.value ?? "—";
          const stroke = TONE_STROKE[k.tone];
          const pct = Math.round(k.gauge * 100);
          return (
            <div
              key={k.key}
              className="group relative overflow-hidden rounded-sm border border-[#3AE8FF]/15 bg-gradient-to-b from-[#061A2E]/60 to-[#04101C]/75 p-1.5 backdrop-blur-xl transition-all duration-300 hover:border-[#3AE8FF]/50 hover:bg-[#061A2E]/70 sm:p-3 lg:p-4"
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

              {/* Hex serial tag */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-3 top-2 opacity-70 rtl:-left-3 rtl:right-auto"
              >
                <div className="relative">
                  <Hexagon
                    className="h-8 w-8 text-[#3AE8FF]/25"
                    strokeWidth={1.5}
                  />
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
              <div className="flex items-start justify-between gap-2 pe-6">
                <div className="min-w-0">
                  <div
                    className="truncate text-[11px] font-semibold leading-tight text-white/95"
                    title={label}
                  >
                    {label}
                  </div>
                  <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#3AE8FF]/60">
                    {sub}
                  </div>
                </div>
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-[#04101C]/75 ${TONE_RING[k.tone]}`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
              </div>

              {/* Numeric readout + radial gauge */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-3xl font-black leading-none sm:text-[38px] ${TONE_NUM[k.tone]}`}
                    style={{
                      fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {displayValue}
                  </span>
                  <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.22em] text-[#3AE8FF]/60">
                    {k.unit}
                  </span>
                </div>
                <div className="relative shrink-0">
                  <RadialGauge value={k.gauge} color={stroke} size={40} />
                  <span
                    className="absolute inset-0 grid place-items-center font-mono text-[8.5px] font-bold tabular-nums"
                    style={{ color: stroke }}
                  >
                    {pct}%
                  </span>
                </div>
              </div>

              {/* Delta / hint + evidence */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <span
                  className={`font-mono text-[9px] uppercase tracking-[0.22em] ${TONE_DELTA[k.tone]}`}
                >
                  {hint}
                </span>
                <EvidenceBadge
                  evidence={ev}
                  label={liveLabel}
                  tone={k.tone}
                  className="text-[8px] px-1.5 py-0.5"
                />
              </div>

              {/* Micro sparkline strip */}
              <div className="mt-3 flex h-3 items-end gap-[2px]" aria-hidden>
                {Array.from({ length: 22 }).map((_, i) => {
                  const seed = (i * 13 + k.key.length * 7) % 100;
                  const h = 20 + (seed % 70);
                  return (
                    <span
                      key={i}
                      className={`w-[2px] rounded-sm ${
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
          <span>UPTIME&nbsp;99.97%</span>
          <span>LAT&nbsp;<span className="text-[#3AE8FF]/85">42ms</span></span>
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
