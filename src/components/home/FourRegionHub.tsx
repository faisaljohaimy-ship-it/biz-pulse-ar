/**
 * FourRegionHub — the official NEXIOS executive command surface.
 *
 * Layout mirrors the approved executive poster: four corner region panels
 * around a central interactive Saudi map, with FINN persona bottom-left and
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
import { FinnDailySummary } from "@/components/aria/FinnDailySummary";
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
          className="nx-panel-frame"
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

/**
 * RegionCardRect — compact rectangular variant used in the right-column
 * stack. Region name is centered as the hero text of the card, with the
 * live performance ring on the trailing edge and the module glyphs as a
 * single row of touch targets underneath.
 */
function RegionCardRect({
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
      className="group/region relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border p-3 text-start transition"
      style={{
        borderColor: active ? color : `${color}55`,
        background: `linear-gradient(135deg, ${color}18 0%, rgba(4,17,31,0.65) 55%, rgba(4,7,15,0.85) 100%)`,
        boxShadow: active
          ? `0 0 0 1px ${color}66, 0 18px 44px -22px ${color}80`
          : `0 12px 32px -22px ${color}55`,
      }}
    >
      {/* Performance ring — trailing edge (leading in RTL) */}
      <div className="shrink-0">
        <Ring pct={perfPct} color={color} size={54} />
      </div>

      {/* Region name — the hero text, centered vertically, filling the card */}
      <div className="min-w-0 flex-1 text-center">
        <div
          className="truncate text-[15px] font-black tracking-tight sm:text-base"
          style={{ color, textShadow: `0 0 18px ${color}66` }}
        >
          {ar ? region.shortAr : region.shortEn}
        </div>
        <div className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
          {ar ? "المنطقة" : "Region"}
        </div>
      </div>

      {/* Compact module strip */}
      <div className="hidden shrink-0 items-center gap-1 sm:flex">
        {panel.modules.slice(0, 3).map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.en}
              to={m.to}
              onClick={(e) => e.stopPropagation()}
              title={ar ? m.ar : m.en}
              aria-label={ar ? m.ar : m.en}
              className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-white/30 hover:bg-white/[0.09] hover:text-white"
            >
              <Icon className="size-3.5" aria-hidden />
            </Link>
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

// ── Central cinematic map + southern column ─────────────────────────────────
type SectorWithPath = (typeof SECTORS)[number] & { d: string };

/** Stylised Arabian-Peninsula silhouette (recognisable, not a survey map) —
 *  the crystalline core of the command stage. Shared geometry with the
 *  ambient ArabianPeninsulaBackdrop. */
const PENINSULA =
  "M 360 150 C 470 112, 590 120, 662 170 C 702 150, 744 176, 730 222 " +
  "C 802 272, 838 362, 800 452 C 776 542, 720 642, 620 722 " +
  "C 520 784, 398 772, 330 700 C 270 640, 246 540, 252 452 " +
  "C 236 372, 252 282, 302 222 C 316 186, 336 166, 360 150 Z";

/** Four radial connection spokes from the core toward each panel corner. */
const SPOKES: { id: RegionId; x2: number; y2: number }[] = [
  { id: "central", x2: 500, y2: 70 },
  { id: "western", x2: 120, y2: 300 },
  { id: "eastern", x2: 880, y2: 300 },
  { id: "southern", x2: 500, y2: 850 },
];

/** Holographic power-transmission grid over the Kingdom — stylised substation
 *  nodes (approx. major-city positions in the 1000×900 map space) linked by
 *  interconnect lines. Decorative; glows + pulses only via opacity. */
const POWER_NODES: { x: number; y: number }[] = [
  { x: 560, y: 460 }, // 0 Riyadh (central)
  { x: 340, y: 560 }, // 1 Jeddah/Makkah (west)
  { x: 690, y: 380 }, // 2 Dammam (east)
  { x: 380, y: 260 }, // 3 Tabuk (north-west)
  { x: 500, y: 340 }, // 4 Qassim (central-north)
  { x: 410, y: 700 }, // 5 Abha (south)
  { x: 400, y: 430 }, // 6 Madinah (west-centre)
  { x: 620, y: 620 }, // 7 southern interconnect
];
const POWER_EDGES: [number, number][] = [
  [0, 4],
  [4, 3],
  [3, 6],
  [6, 1],
  [1, 0],
  [0, 2],
  [2, 4],
  [0, 7],
  [7, 5],
  [5, 1],
  [0, 6],
];

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
    <div className="nx-stage relative mx-auto w-full max-w-[560px]">
      <svg
        viewBox="0 0 1000 900"
        className="h-auto w-full"
        role="img"
        aria-label={ar ? "خريطة المملكة والمناطق الأربع" : "Kingdom map — four regions"}
      >
        <defs>
          <radialGradient id="stage-glow" cx="50%" cy="46%" r="60%">
            <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#00D4FF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ksa-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.42" />
            <stop offset="55%" stopColor="#0891b2" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#04111f" stopOpacity="0.5" />
          </linearGradient>
          {/* Low-poly holographic mesh, clipped to the peninsula. */}
          <pattern id="ksa-mesh" width="30" height="26" patternUnits="userSpaceOnUse">
            <path
              d="M0 26 L15 0 L30 26 M15 0 L15 26 M0 13 L30 13"
              stroke="#7EF9FF"
              strokeWidth="0.7"
              fill="none"
              opacity="0.45"
            />
          </pattern>
          {/* Faint holo dot-grid backdrop. */}
          <pattern id="holo-grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <circle cx="1.4" cy="1.4" r="1.4" fill="#1e6f8c" opacity="0.5" />
          </pattern>
          <clipPath id="ksa-clip">
            <path d={PENINSULA} />
          </clipPath>
          {/* Static soft glow rendered ONCE — never animated (const. Art. 13). */}
          <filter id="ksa-glow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* Radiant holo-grid + pulse (single animated layer) */}
        <rect x="0" y="0" width="1000" height="900" fill="url(#holo-grid)" opacity="0.35" />
        <circle cx="500" cy="470" r="440" fill="url(#stage-glow)" className="nx-stage-pulse" />

        {/* Connection spokes linking the core to the four regions (gentle
            opacity pulse — transform/opacity only, iOS-safe). */}
        <g className="nx-spokes" stroke="#00D4FF" strokeWidth="1.4" strokeOpacity="0.3">
          {SPOKES.map((s) => (
            <line key={s.id} x1="500" y1="470" x2={s.x2} y2={s.y2} />
          ))}
        </g>

        {/* Rotating command dais under the map (one element) */}
        <g className="nx-dais" style={{ transformOrigin: "500px 700px" }}>
          {[210, 168, 126].map((rr, i) => (
            <ellipse
              key={rr}
              cx="500"
              cy="700"
              rx={rr}
              ry={rr * 0.34}
              fill="none"
              stroke="#00D4FF"
              strokeWidth={i === 0 ? 2 : 1}
              strokeOpacity={0.22 - i * 0.04}
              strokeDasharray={i === 1 ? "5 12" : undefined}
            />
          ))}
        </g>

        {/* Peninsula — static blurred glow, then crisp crystalline body */}
        <path d={PENINSULA} fill="#22D3EE" opacity="0.28" filter="url(#ksa-glow)" />
        <path
          d={PENINSULA}
          fill="url(#ksa-fill)"
          stroke="#7EF9FF"
          strokeWidth="2"
          strokeOpacity="0.85"
        />
        <g clipPath="url(#ksa-clip)">
          <rect x="0" y="0" width="1000" height="900" fill="url(#ksa-mesh)" />
          {/* Region territories tinted by regions.ts, clipped inside the map.
              ALL four radiate + pulse (staggered) — the active one brighter. */}
          {sectors.map((s, i) => {
            const active = s.id === regionId;
            const color = REGION_ACCENT_HEX[s.id];
            const sev = severityByRegion[s.id];
            const base = sev === "critical" ? 0.42 : sev === "medium" ? 0.3 : 0.2;
            return (
              <path
                key={s.id}
                d={s.d}
                fill={color}
                fillOpacity={active ? base + 0.3 : base}
                stroke={color}
                strokeWidth={active ? 4 : 1.5}
                strokeOpacity={active ? 1 : 0.6}
                className={active ? "nx-territory nx-territory-active" : "nx-territory"}
                style={{
                  cursor: "pointer",
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  animationDelay: `${i * 0.6}s`,
                }}
                onClick={() => setRegion(s.id)}
                role="button"
                aria-label={REGIONS.find((r) => r.id === s.id)?.[ar ? "shortAr" : "shortEn"]}
              />
            );
          })}
        </g>

        {/* Holographic power-transmission grid over the Kingdom (glow + pulse) */}
        <g clipPath="url(#ksa-clip)">
          <g className="nx-power-lines" filter="url(#ksa-glow)" stroke="#7EF9FF" strokeWidth="1.6">
            {POWER_EDGES.map(([a, b], i) => (
              <line
                key={i}
                x1={POWER_NODES[a].x}
                y1={POWER_NODES[a].y}
                x2={POWER_NODES[b].x}
                y2={POWER_NODES[b].y}
              />
            ))}
          </g>
          <g className="nx-power-nodes">
            {POWER_NODES.map((n, i) => (
              <g key={i}>
                <circle cx={n.x} cy={n.y} r="9" fill="#00D4FF" opacity="0.25" />
                <circle cx={n.x} cy={n.y} r="4" fill="#BFFcff" />
              </g>
            ))}
          </g>
        </g>

        <style>{`
          .nx-stage-pulse { transform-box: view-box; transform-origin: 500px 470px; animation: nxStagePulse 6.5s ease-in-out infinite; }
          .nx-dais { animation: nxDaisSpin 46s linear infinite; }
          .nx-spokes { animation: nxSpokes 4s steps(16, jump-none) infinite; }
          .nx-territory { animation: nxTerritory 3.4s steps(16, jump-none) infinite; }
          .nx-territory-active { animation: nxTerritoryActive 2.6s steps(14, jump-none) infinite; }
          .nx-power-lines { animation: nxPower 3.2s ease-in-out infinite; }
          .nx-power-nodes { animation: nxNodes 2.2s ease-in-out infinite; }
          @keyframes nxStagePulse { 0%,100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
          @keyframes nxDaisSpin { to { transform: rotate(360deg); } }
          @keyframes nxSpokes { 0%,100% { stroke-opacity: 0.18; } 50% { stroke-opacity: 0.5; } }
          @keyframes nxTerritory { 0%,100% { fill-opacity: 0.28; } 50% { fill-opacity: 0.5; } }
          @keyframes nxTerritoryActive { 0%,100% { fill-opacity: 0.5; } 50% { fill-opacity: 0.72; } }
          @keyframes nxPower { 0%,100% { stroke-opacity: 0.28; } 50% { stroke-opacity: 0.85; } }
          @keyframes nxNodes { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
          @media (prefers-reduced-motion: reduce) {
            .nx-stage-pulse, .nx-dais, .nx-spokes, .nx-territory, .nx-territory-active,
            .nx-power-lines, .nx-power-nodes { animation: none !important; }
          }
          [data-nx-frozen="true"] .nx-stage-pulse,
          [data-nx-frozen="true"] .nx-dais,
          [data-nx-frozen="true"] .nx-spokes,
          [data-nx-frozen="true"] .nx-territory,
          [data-nx-frozen="true"] .nx-territory-active,
          [data-nx-frozen="true"] .nx-power-lines,
          [data-nx-frozen="true"] .nx-power-nodes { animation-play-state: paused !important; }
        `}</style>
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
      {/* Live radiance for every sector panel frame (opacity only) */}
      <style>{`
        .nx-panel-frame { animation: nxPanelFrame 3.6s ease-in-out infinite; }
        @keyframes nxPanelFrame { 0%,100% { stroke-opacity: 0.55; } 50% { stroke-opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .nx-panel-frame { animation: none !important; } }
        [data-nx-frozen="true"] .nx-panel-frame { animation-play-state: paused !important; }
      `}</style>

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
      {/* Owner directive: three columns —
          Right (RTL first) → stacked rectangular region cards with the
          region name centered as the hero text.
          Center → FINN as the holographic persona filling the column,
          with the Kingdom map anchored beneath as her command stage.
          Left → FINN daily summary on top, smart alerts below. */}
      <div className="relative grid gap-3 lg:grid-cols-[1fr_1.25fr_1fr]">
        {/* Right column — 4 stacked rectangular region cards */}
        <div className="flex flex-col gap-3">
          <RegionCardRect
            {...regionVM.eastern}
            active={regionId === "eastern"}
            ar={ar}
            onSelect={() => setRegion("eastern")}
          />
          <RegionCardRect
            {...regionVM.central}
            active={regionId === "central"}
            ar={ar}
            onSelect={() => setRegion("central")}
          />
          <RegionCardRect
            {...regionVM.western}
            active={regionId === "western"}
            ar={ar}
            onSelect={() => setRegion("western")}
          />
          <RegionCardRect
            {...regionVM.southern}
            active={regionId === "southern"}
            ar={ar}
            onSelect={() => setRegion("southern")}
          />
        </div>

        {/* Center column — FINN holographic persona + Kingdom map stage */}
        <div className="relative flex flex-col gap-3">
          <div className="min-h-[280px] flex-1">
            <FinnPersonaCard ar={ar} />
          </div>
          <div className="relative rounded-2xl border border-[#00D4FF]/15 bg-gradient-to-b from-[#04111f]/50 to-[#04070F]/70 p-3">
            <CentralMap
              ar={ar}
              sectors={sectors}
              regionId={regionId}
              setRegion={setRegion}
              severityByRegion={severityByRegion}
            />
          </div>
        </div>

        {/* Left column — FINN daily summary + smart alerts */}
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <FinnDailySummary />
          </div>
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
              {(alerts.length ? alerts.slice(0, 4) : []).map((a) => (
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
