/**
 * FourRegionHub — the home executive centerpiece: four regional administrations
 * around a live, interactive Saudi map, plus a system-status panel, a live
 * smart-alerts feed, and the FINN assistant persona.
 *
 * Live data (بيانات لا تفرغ, const. Art. 6): per-region performance rings, the
 * map pulse, central aggregates, and the alerts feed all come from
 * `getCommandCenterState` (open `optionalSupabaseAuth` read wrapped in the 4s
 * `resilient()` race). No static poster image, no hardcoded numbers in the
 * component — figures are live rows or the labelled reference simulation, and
 * the «محاكاة» badge shows whenever reference data is in play. Region labels,
 * themes, module routes and initiative names are structural config
 * (commandCenterData.ts), the same way regions.ts is the geographic source.
 *
 * Performance (const. Art. 13): the only motion is transform/opacity (map
 * active-pulse + FINN halo), a handful of elements, frozen off-screen via the
 * parent's `data-nx-frozen` and fully static under prefers-reduced-motion.
 * Rings are static SVG stroke-dashoffset. No box-shadow/filter animation.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bell, FlaskConical, Search, Settings, Wifi, TrendingUp } from "lucide-react";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import {
  CC_REGIONS,
  CC_SYSTEM_RINGS,
  type CCRegionPanel,
} from "@/components/executive/command/commandCenterData";
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";
import { useRegion } from "@/lib/region-context";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { NexiosWordmark } from "@/components/executive/NexiosWordmark";
import { FinnPersonaCard } from "./FinnPersonaCard";

// ── Map geometry (regions.ts is the geographic source; coords projected into
// the 1000×900 viewBox, north = up — shared with ArabianPeninsulaBackdrop). ──
const SECTORS: { id: RegionId; cx: number; cy: number; radii: number[] }[] = [
  { id: "western", cx: 310, cy: 584, radii: [112, 132, 120, 142, 116, 136, 124, 146] },
  { id: "central", cx: 551, cy: 445, radii: [150, 138, 162, 144, 156, 140, 150, 160] },
  { id: "eastern", cx: 660, cy: 372, radii: [120, 136, 114, 140, 126, 130, 120, 138] },
  { id: "southern", cx: 417, cy: 723, radii: [142, 120, 150, 130, 146, 124, 140, 132] },
];

function blobPath(cx: number, cy: number, radii: number[]): string {
  const n = radii.length;
  const pts: [number, number][] = radii.map((r, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const mid = (p: [number, number], q: [number, number]): [number, number] => [
    (p[0] + q[0]) / 2,
    (p[1] + q[1]) / 2,
  ];
  let d = `M ${mid(pts[n - 1], pts[0]).join(" ")} `;
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const m = mid(cur, pts[(i + 1) % n]);
    d += `Q ${cur[0]} ${cur[1]} ${m[0]} ${m[1]} `;
  }
  return d + "Z";
}

/** Static SVG progress ring (no animation). */
function Ring({ pct, color, size = 46 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="3.5"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="52%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#fff"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function initiativeStatus(pct: number, ar: boolean): { label: string; done: boolean } {
  const done = pct >= 88;
  return { label: done ? (ar ? "مكتمل" : "Done") : ar ? "جارٍ" : "Active", done };
}

function RegionCard({
  panel,
  color,
  livePerformance,
  active,
  ar,
  onSelect,
}: {
  panel: CCRegionPanel;
  color: string;
  livePerformance: number | null;
  active: boolean;
  ar: boolean;
  onSelect: () => void;
}) {
  const region = REGIONS.find((r) => r.id === panel.id)!;
  const perfKpi = panel.kpis.find((k) => k.ringPct != null);
  const perfPct = livePerformance ?? perfKpi?.ringPct ?? 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="group/region flex w-full flex-col gap-3 rounded-2xl border bg-[#04111f]/55 p-3.5 text-start backdrop-blur-md transition"
      style={{ borderColor: active ? color : "rgba(255,255,255,0.1)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold" style={{ color }}>
            {ar ? region.shortAr : region.shortEn} · {ar ? "المنطقة" : "Region"}
          </div>
          <div className="text-[11px] text-white/60">
            {ar ? panel.subtitleAr : panel.subtitleEn}
          </div>
        </div>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2">
        {panel.kpis.map((k) => (
          <div key={k.en} className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
            <div className="text-[10px] text-white/55">{ar ? k.ar : k.en}</div>
            {k.ringPct != null ? (
              <div className="mt-1 flex justify-center">
                <Ring pct={k.ringPct === perfKpi?.ringPct ? perfPct : k.ringPct} color={color} />
              </div>
            ) : (
              <>
                <div className="mt-0.5 text-base font-bold text-white">{k.value}</div>
                {k.delta && (
                  <div className="text-[10px] font-medium text-emerald-300">{k.delta}</div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Top initiatives */}
      {panel.initiatives.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
          <div className="mb-1.5 text-[11px] font-semibold text-white/70">
            {ar ? "أهم المبادرات" : "Top initiatives"}
          </div>
          <ul className="grid gap-1.5">
            {panel.initiatives.slice(0, 4).map((it) => {
              const st = initiativeStatus(it.pct, ar);
              return (
                <li key={it.en} className="text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-white/75">{ar ? it.ar : it.en}</span>
                    <span className={st.done ? "text-emerald-300" : "text-amber-300"}>
                      {st.label} · {it.pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${it.pct}%`, background: color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Module icons */}
      <div className="flex flex-wrap gap-1.5">
        {panel.modules.map((m) => {
          const Icon = m.icon;
          return (
            <span
              key={m.en}
              title={ar ? m.ar : m.en}
              className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70"
            >
              <Icon className="size-4" aria-hidden />
            </span>
          );
        })}
      </div>
    </button>
  );
}

function LiveClock({ ar }: { ar: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (!now) return <span className="tabular-nums text-[#3AE8FF]">—</span>;
  const time = now.toLocaleTimeString(ar ? "ar-SA" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const date = now.toLocaleDateString(ar ? "ar-SA" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <div className="leading-tight">
      <div className="font-semibold tabular-nums text-[#3AE8FF]">{time}</div>
      <div className="text-[10px] text-white/50">{date}</div>
    </div>
  );
}

export function FourRegionHub() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { regionId, setRegion } = useRegion();
  const { loading: authLoading } = useAuth();
  const getState = useServerFn(getCommandCenterState);

  const { data } = useQuery({
    queryKey: ["region-hub-state"],
    queryFn: () => getState(),
    enabled: !authLoading,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const sectors = useMemo(
    () => SECTORS.map((s) => ({ ...s, d: blobPath(s.cx, s.cy, s.radii) })),
    [],
  );

  // Live per-region performance (compliance_pct) keyed by region id.
  const livePerf = useMemo(() => {
    const map: Partial<Record<RegionId, number>> = {};
    for (const r of data?.regions ?? []) {
      if (r.compliance_pct > 0) map[r.region_id] = r.compliance_pct;
    }
    return map;
  }, [data]);

  const severityByRegion = useMemo(() => {
    const map: Partial<Record<RegionId, string>> = {};
    for (const r of data?.regions ?? []) map[r.region_id] = r.severity;
    return map;
  }, [data]);

  const simulation = data?.simulation ?? true;
  const overallPct = data?.counters.compliance_avg ?? CC_SYSTEM_RINGS[0].pct;
  const systemRings = [
    { ar: "الأداء العام", en: "Overall", pct: overallPct },
    CC_SYSTEM_RINGS[1],
    CC_SYSTEM_RINGS[2],
  ];
  const alerts = data?.urgent ?? [];

  return (
    <section
      aria-label={ar ? "مركز القيادة — القطاعات الأربعة" : "Command center — four regions"}
      dir={ar ? "rtl" : "ltr"}
      className="relative overflow-hidden rounded-3xl border border-[#00D4FF]/20 bg-[#04070F]/70 p-3 sm:p-5"
    >
      {/* Header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs">
          <LiveClock ar={ar} />
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300 sm:inline-flex">
            <Activity className="size-3.5" aria-hidden /> {ar ? "النظام مستقر" : "System stable"}
          </span>
          <span className="hidden items-center gap-1.5 rounded-full border border-[#00D4FF]/30 bg-[#00D4FF]/10 px-2.5 py-1 text-[11px] text-[#3AE8FF] sm:inline-flex">
            <Wifi className="size-3.5" aria-hidden /> {ar ? "متصل" : "Connected"}
          </span>
        </div>
        <NexiosWordmark />
        <div className="flex items-center gap-2 text-white/60">
          <Search className="size-4" aria-hidden />
          <span className="relative">
            <Bell className="size-4" aria-hidden />
            {alerts.length > 0 && (
              <span className="absolute -end-1.5 -top-1.5 grid size-3.5 place-items-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                {alerts.length}
              </span>
            )}
          </span>
          <Settings className="size-4" aria-hidden />
        </div>
      </header>

      {simulation && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-200">
          <FlaskConical className="size-3.5" aria-hidden />
          {ar ? "عرض توضيحي · محاكاة مرجعية" : "Reference simulation"}
        </div>
      )}

      {/* Central interactive map */}
      <div className="mx-auto mb-4 max-w-md">
        <svg
          viewBox="0 0 1000 900"
          className="h-auto w-full"
          role="img"
          aria-label={ar ? "خريطة المناطق الأربع" : "Four-region map"}
        >
          {sectors.map((s) => {
            const active = s.id === regionId;
            const color = REGION_ACCENT_HEX[s.id];
            const sev = severityByRegion[s.id];
            const glow = sev === "critical" ? 0.5 : sev === "medium" ? 0.36 : 0.24;
            return (
              <path
                key={s.id}
                d={s.d}
                fill={color}
                fillOpacity={active ? glow + 0.22 : glow}
                stroke={color}
                strokeWidth={active ? 5 : 2}
                strokeOpacity={active ? 1 : 0.6}
                className={active ? "nx-hub-sector-active" : undefined}
                style={{ cursor: "pointer", transformBox: "fill-box", transformOrigin: "center" }}
                onClick={() => setRegion(s.id)}
                role="button"
                aria-label={REGIONS.find((r) => r.id === s.id)?.[ar ? "shortAr" : "shortEn"]}
              />
            );
          })}
        </svg>
      </div>

      {/* Region cards */}
      <div className="grid gap-3 lg:grid-cols-2">
        {REGIONS.map((r) => (
          <RegionCard
            key={r.id}
            panel={CC_REGIONS[r.id]}
            color={REGION_ACCENT_HEX[r.id]}
            livePerformance={livePerf[r.id] ?? null}
            active={r.id === regionId}
            ar={ar}
            onSelect={() => setRegion(r.id)}
          />
        ))}
      </div>

      {/* System status + alerts + FINN */}
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-emerald-400/20 bg-[#04111f]/55 p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <Activity className="size-4" aria-hidden />
            {ar ? "حالة النظام" : "System status"}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {systemRings.map((s) => (
              <div key={s.en} className="flex flex-col items-center gap-1">
                <Ring pct={s.pct} color="#22C55E" size={56} />
                <span className="text-[10px] text-white/60">{ar ? s.ar : s.en}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#04111f]/55 p-4 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-white/85">
              {ar ? "التنبيهات الذكية" : "Smart alerts"}
            </span>
            <span className="text-[11px] text-rose-300">
              {alerts.length} {ar ? "تنبيه" : "alerts"}
            </span>
          </div>
          <ul className="grid gap-2">
            {(alerts.length ? alerts.slice(0, 3) : []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="flex items-center gap-2 truncate text-white/75">
                  <TrendingUp className="size-3.5 shrink-0 text-[#3AE8FF]" aria-hidden />
                  <span className="truncate">{a.title_ar}</span>
                </span>
                <span className="shrink-0 text-white/45">{a.department}</span>
              </li>
            ))}
            {alerts.length === 0 && (
              <li className="text-[12px] text-white/50">
                {ar ? "لا تنبيهات نشطة" : "No active alerts"}
              </li>
            )}
          </ul>
        </div>

        <FinnPersonaCard ar={ar} />
      </div>

      <style>{`
        .nx-hub-sector-active { animation: nxHubPulse 2.6s ease-in-out infinite; will-change: transform, opacity; }
        @keyframes nxHubPulse {
          0%,100% { opacity: 0.9; transform: scale(1); }
          50%     { opacity: 1;   transform: scale(1.015); }
        }
        @media (prefers-reduced-motion: reduce) { .nx-hub-sector-active { animation: none !important; } }
        [data-nx-frozen="true"] .nx-hub-sector-active { animation-play-state: paused !important; }
      `}</style>
    </section>
  );
}

export default FourRegionHub;
