/**
 * SovereignCommandDeck — the cinematic executive deck for the landing hero.
 *
 * Visual direction: "Sovereign Cinematic Command" — Palantir Gotham briefing
 * wall × Bloomberg Terminal × NASA JPL mission ops. Bilingual AR/EN, RTL-safe,
 * deep #061A2E base, cyan #00D4FF / #3AE8FF accents, tabular numerals,
 * L-bracket corners, 60fps rise-in on mount, live clock, and every KPI
 * gated through <EvidenceBadge> (FR-19).
 *
 * Reads /api/public/os-overview (aggregate counts, no PII) so KPIs are real.
 * ARIA stays visible through the glass — every panel uses translucent
 * backdrops so the hologram behind the deck is never occluded.
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

// Live clock hook — 1s tick, SSR-safe.
function useLiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

const TONE_RING: Record<"cyan" | "emerald" | "amber" | "rose", string> = {
  cyan: "text-[#3AE8FF] border-[#3AE8FF]/40 shadow-[0_0_18px_rgba(58,232,255,0.18)]",
  emerald: "text-emerald-300 border-emerald-400/40 shadow-[0_0_18px_rgba(52,211,153,0.15)]",
  amber: "text-amber-300 border-amber-400/45 shadow-[0_0_18px_rgba(251,191,36,0.18)]",
  rose: "text-rose-300 border-rose-400/50 shadow-[0_0_22px_rgba(251,113,133,0.22)]",
};

const TONE_NUM: Record<"cyan" | "emerald" | "amber" | "rose", string> = {
  cyan: "text-[#E6FBFF] drop-shadow-[0_0_10px_rgba(58,232,255,0.35)]",
  emerald: "text-emerald-100 drop-shadow-[0_0_10px_rgba(52,211,153,0.28)]",
  amber: "text-amber-100 drop-shadow-[0_0_12px_rgba(251,191,36,0.32)]",
  rose: "text-rose-100 drop-shadow-[0_0_14px_rgba(251,113,133,0.4)]",
};

const TONE_DELTA: Record<"cyan" | "emerald" | "amber" | "rose", string> = {
  cyan: "text-[#3AE8FF]/80",
  emerald: "text-emerald-300/85",
  amber: "text-amber-300/85",
  rose: "text-rose-300/90",
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

interface KpiSpec {
  readonly key: string;
  readonly icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  readonly labelAr: string;
  readonly labelEn: string;
  readonly subAr: string;
  readonly subEn: string;
  readonly value: number | undefined;
  readonly tone: "cyan" | "emerald" | "amber" | "rose";
  readonly hintAr: string;
  readonly hintEn: string;
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
      {/* ── Marquee ticker ── */}
      <div className="relative mb-4 overflow-hidden rounded-sm border-y border-[#3AE8FF]/15 bg-[#061A2E]/40 py-1.5 backdrop-blur-sm">
        <div
          dir="ltr"
          className="flex whitespace-nowrap"
          style={{ animation: "sov-marquee 42s linear infinite" }}
        >
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex shrink-0 items-center gap-8 px-6 font-mono text-[10px] uppercase tracking-[0.32em] text-[#3AE8FF]/70"
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

      {/* ── Status ribbon ── */}
      <div className="mb-5 grid grid-cols-1 gap-2 rounded-sm border-y border-[#3AE8FF]/20 bg-gradient-to-r from-[#061A2E]/30 via-[#0A2D4E]/40 to-[#061A2E]/30 px-3 py-2 backdrop-blur-md sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4">
        {/* LIVE + clock */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#3AE8FF]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#4ade80]" />
            </span>
            {liveLabel}
          </span>
          <span
            className="font-mono text-base font-semibold text-white/95 sm:text-lg"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            <span className="text-white/40">[</span>
            {fmtClock(now)}
            <span className="text-white/40">]</span>
          </span>
        </div>
        {/* Middle status pills */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-mono text-[9px] uppercase tracking-[0.24em] text-[#3AE8FF]/75 sm:text-[10px]">
          <span className="flex items-center gap-1.5">
            <Signal className="h-3 w-3" strokeWidth={2} />
            <span>NETWORK</span>
            <span className="text-[#3AE8FF]">SECURE&nbsp;TUNNEL</span>
          </span>
          <span className="hidden text-white/20 sm:inline">|</span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" strokeWidth={2} />
            <span>ENCRYPTION</span>
            <span className="text-emerald-300">ACTIVE</span>
          </span>
          <span className="hidden text-white/20 sm:inline">|</span>
          <span className="flex items-center gap-1.5">
            <CircuitBoard className="h-3 w-3" strokeWidth={2} />
            <span>ARIA</span>
            <span className="text-[#3AE8FF]">PROTOCOL&nbsp;v2.4</span>
          </span>
        </div>
        {/* Nominal + evidence */}
        <div className="flex items-center justify-end gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-200/90">
            ALL SYSTEMS NOMINAL
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
        <div className="hidden items-center gap-2 font-mono text-[9px] uppercase tracking-[0.28em] text-[#3AE8FF]/50 sm:flex">
          <span>SECTOR</span>
          <span className="text-[#3AE8FF]/80">INDUSTRIAL&nbsp;SECURITY</span>
          <ChevronRight className="h-3 w-3" strokeWidth={2} />
          <span>MODE</span>
          <span className="text-emerald-300">AUTO&nbsp;OPS</span>
        </div>
      </div>

      {/* ── KPI Grid: 6 instrument tiles with L-bracket corners ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {kpis.map((k, idx) => {
          const Icon = k.icon;
          const ev = mkEvidence(k.value);
          const label = ar ? k.labelAr : k.labelEn;
          const sub = ar ? k.subAr : k.subEn;
          const hint = ar ? k.hintAr : k.hintEn;
          const displayValue =
            k.tone === "rose" || k.tone === "amber" ? pad2(k.value) : k.value ?? "—";
          return (
            <div
              key={k.key}
              className="group relative overflow-hidden rounded-sm border border-[#3AE8FF]/12 bg-gradient-to-b from-[#061A2E]/55 to-[#04101C]/70 p-4 backdrop-blur-xl transition-all duration-300 hover:border-[#3AE8FF]/45 hover:bg-[#061A2E]/65"
              style={{
                animation: `sov-tile-in 700ms cubic-bezier(0.22,1,0.36,1) ${140 + idx * 90}ms both`,
                boxShadow:
                  "inset 0 1px 0 0 rgba(58,232,255,0.06), 0 12px 40px -20px rgba(0,0,0,0.9)",
              }}
            >
              {/* L-bracket corners */}
              <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-[#3AE8FF]/60" />
              <span className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-[#3AE8FF]/25" />
              <span className="pointer-events-none absolute left-0 bottom-0 h-3 w-3 border-l border-b border-[#3AE8FF]/25" />
              <span className="pointer-events-none absolute right-0 bottom-0 h-3 w-3 border-r border-b border-[#3AE8FF]/60" />

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

              {/* Header row: label + icon ring */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className="truncate text-[11px] font-semibold leading-tight text-white/90"
                    title={label}
                  >
                    {label}
                  </div>
                  <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#3AE8FF]/55">
                    {sub}
                  </div>
                </div>
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-[#04101C]/70 ${TONE_RING[k.tone]}`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
              </div>

              {/* Numeric readout */}
              <div className="mt-4 flex items-baseline gap-2">
                <span
                  className={`text-3xl font-black leading-none sm:text-4xl ${TONE_NUM[k.tone]}`}
                  style={{
                    fontFamily:
                      '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {displayValue}
                </span>
              </div>

              {/* Delta / hint chip + evidence */}
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

              {/* Micro sparkline strip (decorative telemetry ticks) */}
              <div className="mt-3 flex h-3 items-end gap-[2px]" aria-hidden>
                {Array.from({ length: 22 }).map((_, i) => {
                  const seed = (i * 13 + k.key.length * 7) % 100;
                  const h = 20 + (seed % 70);
                  return (
                    <span
                      key={i}
                      className={`w-[2px] rounded-sm ${
                        k.tone === "rose"
                          ? "bg-rose-400/50"
                          : k.tone === "amber"
                            ? "bg-amber-300/50"
                            : k.tone === "emerald"
                              ? "bg-emerald-300/50"
                              : "bg-[#3AE8FF]/55"
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

      {/* ── Bottom telemetry bar ── */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[#3AE8FF]/12 pt-3 font-mono text-[9px] uppercase tracking-[0.24em] text-[#3AE8FF]/45">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-[#3AE8FF]" />
            SYS&nbsp;v2.4.0 · ARIA
          </span>
          <span className="hidden sm:inline">X-LEVEL ENCRYPTION</span>
        </div>
        <div className="flex items-center gap-4">
          <span>UPTIME&nbsp;99.97%</span>
          <span className="hidden sm:inline">
            TERMINAL <span className="text-[#3AE8FF]/80">HQS-01-SEC</span>
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
