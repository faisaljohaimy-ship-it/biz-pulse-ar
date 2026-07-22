/**
 * FourRegionHub — the official NEXIOS executive command surface.
 *
 * Layout mirrors the approved executive poster: four corner region panels
 * around a central interactive Saudi map, with ARIA persona bottom-left and
 * system-status + smart-alerts bottom-right, plus a module tab-bar. Live
 * figures come from getCommandCenterState (open read wrapped in resilient());
 * reference simulation is labelled with the amber محاكاة badge.
 *
 * Motion is transform/opacity only, frozen when off-screen and disabled under
 * prefers-reduced-motion (const. Art. 13).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  FlaskConical,
  Search,
  Settings,
  Wifi,
  TrendingUp,
  CheckCircle2,
  Home,
  BarChart3,
  FolderKanban,
  Users,
  ShieldAlert,
  FileText,
  Brain,
  Cog,
} from "lucide-react";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { FinnPersonaCard } from "@/components/home/FinnPersonaCard";
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

// ── Map geometry ────────────────────────────────────────────────────────────
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

// ── Small visual primitives ─────────────────────────────────────────────────

/** Static progress ring (transform-free). */
function Ring({ pct, color, size = 46 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <defs>
        <linearGradient id={`rg-${color}-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="4"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#rg-${color}-${size})`}
        strokeWidth="4"
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

/** Deterministic mini sparkline (seed from KPI label). */
function Sparkline({ color, seed }: { color: string; seed: number }) {
  const points = useMemo(() => {
    let s = seed;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const n = 20;
    const arr: number[] = [];
    let v = 0.4 + rnd() * 0.2;
    for (let i = 0; i < n; i++) {
      v += (rnd() - 0.4) * 0.15;
      v = Math.max(0.05, Math.min(0.95, v));
      arr.push(v);
    }
    // final tilt up for that "growth" look
    for (let i = n - 4; i < n; i++) arr[i] = Math.min(1, arr[i] + (i - (n - 5)) * 0.05);
    return arr;
  }, [seed]);
  const w = 68;
  const h = 22;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (points.length - 1)) * w} ${h - p * h}`)
    .join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  const gid = `spark-${color.replace("#", "")}-${seed}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-0.5 shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function initiativeStatus(pct: number, ar: boolean): { label: string; done: boolean } {
  const done = pct >= 88;
  return { label: done ? (ar ? "مكتمل" : "Done") : ar ? "جارٍ" : "Active", done };
}

// ── Region panel ────────────────────────────────────────────────────────────
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
  const hex = color.replace("#", "");
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="group/region relative flex h-full w-full flex-col gap-3 overflow-hidden rounded-2xl border p-3.5 text-start transition"
      style={{
        borderColor: active ? color : `${color}55`,
        background: `linear-gradient(155deg, ${color}18 0%, rgba(4,17,31,0.75) 55%, rgba(4,7,15,0.9) 100%)`,
        boxShadow: active
          ? `0 0 0 1px ${color}88, 0 22px 60px -25px ${color}90, inset 0 1px 0 ${color}44`
          : `0 12px 40px -25px ${color}66, inset 0 1px 0 ${color}22`,
      }}
    >
      {/* Corner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -end-8 -top-10 h-32 w-32 rounded-full opacity-40 blur-3xl"
        style={{ background: color }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className="truncate text-[15px] font-bold tracking-tight"
            style={{ color, textShadow: `0 0 22px ${color}66` }}
          >
            {ar ? region.shortAr : region.shortEn}
            <span className="ms-1.5 text-[11px] font-medium text-white/55">
              {ar ? "المنطقة" : "Region"}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-white/55">
            {ar ? panel.subtitleAr : panel.subtitleEn}
          </div>
        </div>
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 12px ${color}` }}
          aria-hidden
        />
      </div>

      {/* KPI row */}
      <div className="relative grid grid-cols-3 gap-1.5">
        {panel.kpis.map((k, i) => (
          <div
            key={k.en}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-2 backdrop-blur-sm"
          >
            <div className="mb-0.5 truncate text-[9.5px] uppercase tracking-wider text-white/50">
              {ar ? k.ar : k.en}
            </div>
            {k.ringPct != null ? (
              <div className="flex items-center justify-between gap-1">
                <div className="flex flex-col">
                  <span className="text-[15px] font-black tabular-nums text-white">{k.value}</span>
                  {k.delta && (
                    <span className="text-[9px] font-semibold text-emerald-300">{k.delta}</span>
                  )}
                </div>
                <Ring
                  pct={k.ringPct === perfKpi?.ringPct ? perfPct : k.ringPct}
                  color={color}
                  size={38}
                />
              </div>
            ) : (
              <>
                <div className="text-[15px] font-black leading-tight tabular-nums text-white">
                  {k.value}
                </div>
                <div className="flex items-end justify-between gap-1">
                  {k.delta && (
                    <span className="text-[9px] font-semibold text-emerald-300">{k.delta}</span>
                  )}
                  <Sparkline color={color} seed={i * 37 + hex.charCodeAt(0)} />
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Top initiatives */}
      {panel.initiatives.length > 0 && (
        <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
              {ar ? "أهم المبادرات" : "Top initiatives"}
            </span>
          </div>
          <ul className="grid gap-1.5">
            {panel.initiatives.slice(0, 4).map((it) => {
              const st = initiativeStatus(it.pct, ar);
              return (
                <li key={it.en} className="text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-white/80">
                      <CheckCircle2 className="size-3 shrink-0" style={{ color }} aria-hidden />
                      <span className="truncate">{ar ? it.ar : it.en}</span>
                    </span>
                    <span
                      className={
                        "shrink-0 text-[10px] font-semibold " +
                        (st.done ? "text-emerald-300" : "text-amber-300")
                      }
                    >
                      {st.label} · {it.pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${it.pct}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                        boxShadow: `0 0 8px ${color}88`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Module icons */}
      <div className="relative mt-auto flex flex-wrap gap-1.5">
        {panel.modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.en}
              to={m.to}
              onClick={(e) => e.stopPropagation()}
              title={ar ? m.ar : m.en}
              className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-white/30 hover:bg-white/[0.09] hover:text-white"
            >
              <Icon className="size-4" aria-hidden />
            </Link>
          );
        })}
      </div>
    </button>
  );
}

// ── Header clock ────────────────────────────────────────────────────────────
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

// ── Central map + southern column ───────────────────────────────────────────
type SectorWithPath = (typeof SECTORS)[number] & { d: string };

function CentralMap({
  ar,
  sectors,
  regionId,
  setRegion,
  severityByRegion,
}: {
  ar: boolean;
  sectors: SectorWithPath[];
  regionId: RegionId;
  setRegion: (id: RegionId) => void;
  severityByRegion: Partial<Record<RegionId, string>>;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <svg
        viewBox="0 0 1000 900"
        className="h-auto w-full drop-shadow-[0_0_40px_rgba(0,212,255,0.15)]"
        role="img"
        aria-label={ar ? "خريطة المناطق الأربع" : "Four-region map"}
      >
        <defs>
          <radialGradient id="map-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#00D4FF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="500" cy="510" r="430" fill="url(#map-glow)" />
        {sectors.map((s) => {
          const active = s.id === regionId;
          const color = REGION_ACCENT_HEX[s.id];
          const sev = severityByRegion[s.id];
          const glow = sev === "critical" ? 0.55 : sev === "medium" ? 0.4 : 0.28;
          return (
            <path
              key={s.id}
              d={s.d}
              fill={color}
              fillOpacity={active ? glow + 0.25 : glow}
              stroke={color}
              strokeWidth={active ? 5 : 2}
              strokeOpacity={active ? 1 : 0.7}
              className={active ? "nx-hub-sector-active" : undefined}
              style={{
                cursor: "pointer",
                transformBox: "fill-box",
                transformOrigin: "center",
                filter: active
                  ? `drop-shadow(0 0 22px ${color})`
                  : `drop-shadow(0 0 8px ${color}88)`,
              }}
              onClick={() => setRegion(s.id)}
              role="button"
              aria-label={REGIONS.find((r) => r.id === s.id)?.[ar ? "shortAr" : "shortEn"]}
            />
          );
        })}
        {/* Center hex mark */}
        <g transform="translate(500 500)">
          <polygon
            points="0,-52 45,-26 45,26 0,52 -45,26 -45,-26"
            fill="#04070F"
            stroke="#00D4FF"
            strokeWidth="2.5"
            filter="drop-shadow(0 0 18px rgba(0,212,255,0.7))"
          />
          <polygon
            points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15"
            fill="none"
            stroke="#3AE8FF"
            strokeWidth="1.5"
            opacity="0.7"
          />
        </g>
      </svg>
    </div>
  );
}

// ── Bottom tab bar (module launchpad) ───────────────────────────────────────
const TABS: { ar: string; en: string; to: string; icon: typeof Home; active?: boolean }[] = [
  { ar: "الرئيسية", en: "Home", to: "/", icon: Home, active: true },
  { ar: "الأداء", en: "Performance", to: "/analytics", icon: BarChart3 },
  { ar: "المشاريع", en: "Projects", to: "/mission-control", icon: FolderKanban },
  { ar: "الموارد", en: "Resources", to: "/boardroom", icon: Users },
  { ar: "المخاطر", en: "Risks", to: "/risk", icon: ShieldAlert },
  { ar: "التقارير", en: "Reports", to: "/analytics", icon: FileText },
  { ar: "الذكاء الاصطناعي", en: "AI", to: "/agents", icon: Brain },
  { ar: "الإعدادات", en: "Settings", to: "/settings", icon: Cog },
];

function ModuleTabBar({ ar }: { ar: boolean }) {
  return (
    <nav
      aria-label={ar ? "الوحدات" : "Modules"}
      className="relative overflow-x-auto rounded-2xl border border-white/10 bg-gradient-to-r from-[#04111f]/80 via-[#061A2E]/80 to-[#04111f]/80 backdrop-blur-md"
    >
      <ul className="flex min-w-max items-stretch justify-between gap-1 px-2 py-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <li key={t.ar} className="flex-1">
              <Link
                to={t.to}
                className={
                  "group flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] transition " +
                  (t.active
                    ? "bg-[#00D4FF]/12 text-[#3AE8FF] shadow-[inset_0_-2px_0_0_#00D4FF]"
                    : "text-white/60 hover:bg-white/5 hover:text-white")
                }
              >
                <Icon className="size-4" aria-hidden />
                <span className="whitespace-nowrap font-medium">{ar ? t.ar : t.en}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ── Main hub ────────────────────────────────────────────────────────────────
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

  // Region view-models sourced from regions.ts (the single geographic
  // source of truth) — every region in REGIONS is covered, colour and live
  // performance keyed by its id. No hardcoded region list.
  const regionVM = Object.fromEntries(
    REGIONS.map((r) => [
      r.id,
      {
        panel: CC_REGIONS[r.id],
        color: REGION_ACCENT_HEX[r.id],
        livePerformance: livePerf[r.id] ?? null,
      },
    ]),
  ) as Record<RegionId, { panel: CCRegionPanel; color: string; livePerformance: number | null }>;

  return (
    <section
      aria-label={ar ? "مركز القيادة — القطاعات الأربعة" : "Command center — four regions"}
      dir={ar ? "rtl" : "ltr"}
      className="relative overflow-hidden rounded-3xl border border-[#00D4FF]/25 bg-gradient-to-br from-[#04070F] via-[#050F1E] to-[#04070F] p-3 sm:p-5"
      style={{
        boxShadow: "0 40px 120px -40px rgba(0,212,255,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Ambient background grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.35) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, #000 40%, transparent 75%)",
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="relative mb-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <div className="rounded-xl border border-[#00D4FF]/25 bg-[#04111f]/70 px-2.5 py-1.5">
            <LiveClock ar={ar} />
          </div>
          <span className="hidden items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-[11px] text-emerald-300 md:inline-flex">
            <Activity className="size-3.5" aria-hidden />
            <span className="flex flex-col leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-emerald-200/70">
                {ar ? "النظام" : "System"}
              </span>
              <span className="font-semibold">{ar ? "مستقر" : "Stable"}</span>
            </span>
          </span>
          <span className="hidden items-center gap-1.5 rounded-xl border border-[#00D4FF]/30 bg-[#00D4FF]/10 px-2.5 py-1.5 text-[11px] text-[#3AE8FF] md:inline-flex">
            <Wifi className="size-3.5" aria-hidden />
            <span className="flex flex-col leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-[#3AE8FF]/70">
                {ar ? "الاتصالات" : "Comms"}
              </span>
              <span className="font-semibold">{ar ? "متصلة" : "Online"}</span>
            </span>
          </span>
        </div>
        <div className="flex flex-col items-center">
          <NexiosWordmark />
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.35em] text-white/50">
            Executive Intelligence OS
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 text-white/60">
          <button
            type="button"
            className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] hover:text-white"
            aria-label={ar ? "بحث" : "Search"}
          >
            <Search className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className="relative grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] hover:text-white"
            aria-label={ar ? "التنبيهات" : "Alerts"}
          >
            <Bell className="size-4" aria-hidden />
            {alerts.length > 0 && (
              <span className="absolute -end-1 -top-1 grid min-w-[16px] place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {alerts.length}
              </span>
            )}
          </button>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] hover:text-white"
            aria-label={ar ? "الإعدادات" : "Settings"}
          >
            <Settings className="size-4" aria-hidden />
          </button>
          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1 ps-2 pe-3 md:flex">
            <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#00D4FF] to-[#3AE8FF] text-[11px] font-black text-[#04070F]">
              MD
            </div>
            <div className="text-end leading-tight">
              <div className="text-[11px] font-semibold text-white">
                {ar ? "أطلال بك" : "Executive"}
              </div>
              <div className="text-[9px] text-white/50">{ar ? "المدير التنفيذي" : "Director"}</div>
            </div>
          </div>
        </div>
      </header>

      {simulation && (
        <div className="relative mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-200">
          <FlaskConical className="size-3.5" aria-hidden />
          {ar ? "عرض توضيحي · محاكاة مرجعية" : "Reference simulation"}
        </div>
      )}

      {/* ── Executive grid ─────────────────────────────────────────────── */}
      <div className="relative grid gap-3 lg:grid-cols-[1.05fr_1.2fr_1.05fr]">
        {/* Row 1 */}
        <RegionCard
          {...regionVM.western}
          active={regionId === "western"}
          ar={ar}
          onSelect={() => setRegion("western")}
        />
        <RegionCard
          {...regionVM.central}
          active={regionId === "central"}
          ar={ar}
          onSelect={() => setRegion("central")}
        />
        <RegionCard
          {...regionVM.eastern}
          active={regionId === "eastern"}
          ar={ar}
          onSelect={() => setRegion("eastern")}
        />

        {/* Row 2 — FINN · MAP · System+Alerts */}
        <FinnPersonaCard ar={ar} />

        <div className="relative flex flex-col gap-3">
          <div className="relative rounded-2xl border border-[#00D4FF]/15 bg-gradient-to-b from-[#04111f]/50 to-[#04070F]/70 p-3">
            <CentralMap
              ar={ar}
              sectors={sectors}
              regionId={regionId}
              setRegion={setRegion}
              severityByRegion={severityByRegion}
            />
          </div>
          {/* Southern region under the map (matches poster) */}
          <RegionCard
            {...regionVM.southern}
            active={regionId === "southern"}
            ar={ar}
            onSelect={() => setRegion("southern")}
          />
        </div>

        <div className="flex h-full flex-col gap-3">
          {/* System status */}
          <div className="rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 via-[#04111f]/70 to-[#04070F]/80 p-4 backdrop-blur-md">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <Activity className="size-4" aria-hidden />
              {ar ? "حالة النظام" : "System status"}
              <span className="ms-auto text-[10px] font-normal text-white/50">
                {ar ? "جميع الأنظمة بكفاءة" : "All systems nominal"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {systemRings.map((s) => (
                <div key={s.en} className="flex flex-col items-center gap-1.5">
                  <Ring pct={s.pct} color="#22C55E" size={62} />
                  <span className="text-[10px] leading-tight text-white/65">
                    {ar ? s.ar : s.en}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Smart alerts */}
          <div className="relative flex-1 rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-500/8 via-[#04111f]/70 to-[#04070F]/80 p-4 backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-white/85">
                <Bell className="size-4 text-rose-300" aria-hidden />
                {ar ? "التنبيهات الذكية" : "Smart alerts"}
              </span>
              <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                {alerts.length} {ar ? "جديد" : "new"}
              </span>
            </div>
            <ul className="grid gap-1.5">
              {(alerts.length ? alerts.slice(0, 3) : []).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5 text-[12px]"
                >
                  <span className="flex min-w-0 items-center gap-2 truncate text-white/80">
                    <TrendingUp className="size-3.5 shrink-0 text-[#3AE8FF]" aria-hidden />
                    <span className="truncate">{a.title_ar}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-white/45">{a.department}</span>
                </li>
              ))}
              {alerts.length === 0 && (
                <li className="rounded-lg border border-white/5 bg-white/[0.02] px-2 py-3 text-center text-[12px] text-white/50">
                  {ar ? "لا تنبيهات نشطة" : "No active alerts"}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Bottom module tab bar ──────────────────────────────────────── */}
      <div className="relative mt-4">
        <ModuleTabBar ar={ar} />
      </div>

      <style>{`
        .nx-hub-sector-active { animation: nxHubPulse 2.6s ease-in-out infinite; will-change: transform, opacity; }
        @keyframes nxHubPulse {
          0%,100% { opacity: 0.9; transform: scale(1); }
          50%     { opacity: 1;   transform: scale(1.02); }
        }
        @media (prefers-reduced-motion: reduce) { .nx-hub-sector-active { animation: none !important; } }
        [data-nx-frozen="true"] .nx-hub-sector-active { animation-play-state: paused !important; }
      `}</style>
    </section>
  );
}

export default FourRegionHub;
