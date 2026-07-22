/**
 * FourRegionHub — the official NEXIOS executive command surface.
 *
 * Four octagonal region panels with the FINN persona and system-status +
 * smart-alerts, plus a module tab-bar. The central animated map stage was
 * removed per directive; the panels are static SVG. Live figures come from
 * getCommandCenterState (open read wrapped in resilient()); reference
 * simulation is labelled with the amber محاكاة badge.
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

// ── Region panel — octagonal cinematic frame ────────────────────────────────
/** Chamfered-octagon outline in the 0-100 space (non-scaling stroke). */
const OCTAGON = "13,1 87,1 99,13 99,87 87,99 13,99 1,87 1,13";

/** Small Islamic 8-point star motif for the panel's top-centre. */
function StarMotif({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" className="h-6 w-6" aria-hidden>
      <g fill="none" stroke={color} strokeWidth="1.4" opacity="0.85">
        <rect x="9" y="9" width="22" height="22" transform="rotate(45 20 20)" />
        <rect x="9" y="9" width="22" height="22" />
      </g>
    </svg>
  );
}

/** Outlined stat badge (decorative ring + centred value/label). */
function StatRing({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative grid size-14 place-items-center">
        <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full -rotate-90">
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="3"
          />
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 24}
            strokeDashoffset={2 * Math.PI * 24 * 0.28}
            opacity="0.9"
          />
        </svg>
        <span className="relative text-[13px] font-black tabular-nums text-white">{value}</span>
      </div>
      <span className="max-w-[72px] truncate text-center text-[9px] text-white/55">{label}</span>
    </div>
  );
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
  const projects = panel.kpis[0];
  const resource = panel.kpis[2];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="group/region relative flex h-full w-full flex-col gap-3 p-4 text-start"
    >
      {/* Octagonal frame (fill + glowing edge) */}
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <polygon
          points={OCTAGON}
          fill={`${color}14`}
          stroke={color}
          strokeWidth={active ? 2.4 : 1.3}
          strokeOpacity={active ? 1 : 0.6}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Ornamental corner star + title */}
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
          <div className="mt-0.5 truncate text-[11px] text-white/55">
            {ar ? panel.subtitleAr : panel.subtitleEn}
          </div>
        </div>
        <StarMotif color={color} />
      </div>

      {/* Three-ring cluster: projects · performance · resource */}
      <div className="relative flex items-center justify-between gap-2">
        <StatRing value={projects.value} label={ar ? projects.ar : projects.en} color={color} />
        <div className="relative grid place-items-center">
          <Ring pct={perfPct} color={color} size={92} />
          <span className="pointer-events-none absolute -bottom-1 text-[9px] font-semibold text-white/55">
            {ar ? "الأداء" : "Perf."}
          </span>
        </div>
        <StatRing value={resource.value} label={ar ? resource.ar : resource.en} color={color} />
      </div>

      {/* Module icons — activated links, ≥44px touch targets */}
      <div className="relative mt-auto flex flex-wrap justify-center gap-1.5">
        {panel.modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.en}
              to={m.to}
              onClick={(e) => e.stopPropagation()}
              title={ar ? m.ar : m.en}
              aria-label={ar ? m.ar : m.en}
              className="grid size-11 min-h-11 min-w-11 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-white/30 hover:bg-white/[0.09] hover:text-white"
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

  const livePerf = useMemo(() => {
    const map: Partial<Record<RegionId, number>> = {};
    for (const r of data?.regions ?? []) {
      if (r.compliance_pct > 0) map[r.region_id] = r.compliance_pct;
    }
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

        {/* Southern region (central column; map stage removed per directive) */}
        <RegionCard
          {...regionVM.southern}
          active={regionId === "southern"}
          ar={ar}
          onSelect={() => setRegion("southern")}
        />

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
