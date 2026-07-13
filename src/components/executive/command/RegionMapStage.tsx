/**
 * RegionMapStage — the console's central stage: a glowing, region-coloured
 * silhouette of the Arabian Peninsula overlaid with an intelligence mesh
 * (nodes + links), the four sector hubs, a radar progress ring and the live
 * activity readout. Pure SVG/CSS — no 3D, no network, tiny cost.
 *
 * The ACTIVE sector's hub pulses in the region colour; the whole stage
 * re-tints on region switch via the `accent` prop.
 */
import type { RegionId } from "@/lib/regions";

const BOX = 300;
const CENTER = BOX / 2;
const R = 128; // radar ring radius
const C = 2 * Math.PI * R;

// Peninsula silhouette in its native 1000×900 space (shared with the backdrop).
const PENINSULA =
  "M 360 150 C 470 112, 590 120, 662 170 C 702 150, 744 176, 730 222 " +
  "C 802 272, 838 362, 800 452 C 776 542, 720 642, 620 722 " +
  "C 520 784, 398 772, 330 700 C 270 640, 246 540, 252 452 " +
  "C 236 372, 252 282, 302 222 C 316 186, 336 166, 360 150 Z";

// Fit the native peninsula into the square box (centred, scaled).
const MAP_TRANSFORM = `translate(${CENTER} ${CENTER}) scale(0.33) translate(-542 -448)`;

// Sector hubs (native coords). id matches RegionId so we can pulse the active one.
const HUBS: { id: RegionId; x: number; y: number }[] = [
  { id: "western", x: 310, y: 584 },
  { id: "central", x: 551, y: 445 },
  { id: "eastern", x: 660, y: 372 },
  { id: "southern", x: 417, y: 723 },
];

// A few extra mesh nodes (native coords) for the intelligence network look.
const MESH = [
  { x: 480, y: 300 },
  { x: 620, y: 560 },
  { x: 400, y: 470 },
  { x: 560, y: 650 },
  { x: 700, y: 480 },
  { x: 360, y: 660 },
];

const HUB_BY_ID = Object.fromEntries(HUBS.map((h) => [h.id, h])) as Record<
  RegionId,
  { id: RegionId; x: number; y: number }
>;

// Hub-and-spoke links from the central hub + a couple of cross links.
const HUB = HUB_BY_ID.central;
const LINKS: [{ x: number; y: number }, { x: number; y: number }][] = [
  ...HUBS.filter((h) => h.id !== "central").map(
    (h) => [HUB, h] as [{ x: number; y: number }, { x: number; y: number }],
  ),
  ...MESH.map((m) => [HUB, m] as [{ x: number; y: number }, { x: number; y: number }]),
  [HUB_BY_ID.western, HUB_BY_ID.southern],
  [HUB_BY_ID.eastern, { x: 700, y: 480 }],
];

export function RegionMapStage({
  ar,
  accent,
  value,
  activeId,
  label,
  regionLabel,
}: {
  ar: boolean;
  accent: string;
  value: number;
  activeId: RegionId;
  label: string;
  regionLabel: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * C;

  return (
    <div
      className="nx-hud-corner relative grid aspect-square w-full max-w-[320px] place-items-center rounded-2xl"
      style={{ background: `radial-gradient(circle at 50% 45%, ${accent}1a, transparent 64%)` }}
    >
      <svg
        viewBox={`0 0 ${BOX} ${BOX}`}
        className="h-full w-full"
        role="img"
        aria-label={`${label}: ${pct}% — ${regionLabel}`}
      >
        <defs>
          <radialGradient id="nx-map-fill" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
            <stop offset="70%" stopColor={accent} stopOpacity="0.08" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <filter id="nx-map-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* concentric radar rings */}
        {[R, R - 30, R - 60, R - 90].map((r, i) => (
          <circle
            key={r}
            cx={CENTER}
            cy={CENTER}
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth="1"
            opacity={0.08 + i * 0.03}
          />
        ))}

        {/* rotating sweep beam */}
        <g
          className="nx-radar-sweep"
          style={{ transformBox: "view-box", transformOrigin: "150px 150px" }}
        >
          <path
            d={`M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - R} A ${R} ${R} 0 0 1 ${CENTER + R * 0.5} ${CENTER - R * 0.866} Z`}
            fill={accent}
            opacity="0.12"
          />
        </g>

        {/* peninsula + intelligence mesh (shared transform) */}
        <g transform={MAP_TRANSFORM}>
          <path
            d={PENINSULA}
            fill="url(#nx-map-fill)"
            stroke={accent}
            strokeOpacity="0.55"
            strokeWidth="4"
            style={{ filter: "url(#nx-map-glow)" }}
          />
          {LINKS.map(([a, b], i) => (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={accent}
              strokeWidth="2"
              strokeOpacity="0.28"
            />
          ))}
          {MESH.map((m, i) => (
            <circle key={i} cx={m.x} cy={m.y} r="5" fill={accent} opacity="0.6" />
          ))}
          {HUBS.map((h) => {
            const active = h.id === activeId;
            return (
              <g key={h.id}>
                {active && (
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r="20"
                    fill="none"
                    stroke={accent}
                    strokeWidth="3"
                    className="nx-hub-ping"
                  />
                )}
                <circle
                  cx={h.x}
                  cy={h.y}
                  r={active ? 11 : 7}
                  fill={accent}
                  opacity={active ? 1 : 0.75}
                  style={active ? { filter: "url(#nx-map-glow)" } : undefined}
                />
              </g>
            );
          })}
        </g>

        {/* progress arc */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={R}
          fill="none"
          stroke={accent}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C - dash}`}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
        />
      </svg>

      {/* center readout */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div style={{ transform: "translateY(-6px)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">
            {label}
          </div>
          <div
            className="font-mono text-4xl font-black tabular-nums text-white sm:text-5xl"
            style={{ textShadow: `0 0 24px ${accent}, 0 2px 6px rgba(0,0,0,0.6)` }}
          >
            {pct}%
          </div>
          <div className="text-xs font-bold" style={{ color: accent }}>
            {ar ? `منطقة ${regionLabel}` : regionLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegionMapStage;
