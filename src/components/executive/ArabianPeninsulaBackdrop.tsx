/**
 * ArabianPeninsulaBackdrop — a global, very-transparent, light-green pulsing
 * backdrop shaped as the Arabian Peninsula, with the four industrial-security
 * sectors drawn as territories bordered in sky-blue. The border of the ACTIVE
 * sector (bound to the shared region context) pulses to show which region the
 * system is currently operating on.
 *
 * • Pure SVG + CSS — no 3D, no network, tiny cost; safe as an always-on layer.
 * • `preserveAspectRatio="xMidYMid slice"` fills the viewport WIDE (landscape)
 *   on every device — phone, tablet, laptop, large screens.
 * • prefers-reduced-motion freezes every pulse.
 * • pointer-events-none, fixed, deep z — never blocks content or interaction.
 */
import { useMemo } from "react";
import { useRegion } from "@/lib/region-context";
import type { RegionId } from "@/lib/regions";

// Sector centres placed by their real coordinates, projected into the 1000×900
// viewBox: lng[34.5,55.7]→x[160,840], lat[16,32.5]→y[820,110] (north = up).
const SECTORS: {
  id: RegionId;
  cx: number;
  cy: number;
  radii: number[];
}[] = [
  { id: "western", cx: 310, cy: 584, radii: [112, 132, 120, 142, 116, 136, 124, 146] },
  { id: "central", cx: 551, cy: 445, radii: [150, 138, 162, 144, 156, 140, 150, 160] },
  { id: "eastern", cx: 660, cy: 372, radii: [120, 136, 114, 140, 126, 130, 120, 138] },
  { id: "southern", cx: 417, cy: 723, radii: [142, 120, 150, 130, 146, 124, 140, 132] },
];

/** Smooth closed blob path through 8 points around a centre. Deterministic. */
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

// Stylised Arabian-Peninsula silhouette (Red Sea coast west, Gulf north-east,
// Empty Quarter south). Decorative — recognisable, not a survey map.
const PENINSULA =
  "M 360 150 C 470 112, 590 120, 662 170 C 702 150, 744 176, 730 222 " +
  "C 802 272, 838 362, 800 452 C 776 542, 720 642, 620 722 " +
  "C 520 784, 398 772, 330 700 C 270 640, 246 540, 252 452 " +
  "C 236 372, 252 282, 302 222 C 316 186, 336 166, 360 150 Z";

export function ArabianPeninsulaBackdrop() {
  const { regionId } = useRegion();
  const sectors = useMemo(
    () => SECTORS.map((s) => ({ ...s, d: blobPath(s.cx, s.cy, s.radii) })),
    [],
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ opacity: 0.5 }}
    >
      <svg
        viewBox="0 0 1000 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        role="presentation"
      >
        <defs>
          <radialGradient id="apb-green" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="0.16" />
            <stop offset="60%" stopColor="#4ade80" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
          </radialGradient>
          <filter id="apb-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Peninsula body — the blurred glow lives on a STATIC path so the
            Gaussian filter renders once and stays cached; the breathing pulse
            animates a separate UNfiltered stroke overlay. Animating a
            filtered element re-runs the blur over ~600k px every frame —
            that single combination was measured to cost more than the whole
            rest of the page on GPU-less devices. */}
        <path
          d={PENINSULA}
          fill="url(#apb-green)"
          stroke="#86efac"
          strokeOpacity="0.22"
          strokeWidth="1.5"
          style={{ filter: "url(#apb-glow)" }}
        />
        <path
          d={PENINSULA}
          fill="none"
          stroke="#86efac"
          strokeOpacity="0.22"
          strokeWidth="1.5"
          className="apb-peninsula"
        />

        {/* Four sector territories, sky-blue borders; active one pulses.
            Same split: static filtered glow + animated unfiltered stroke. */}
        {sectors.map((s) => {
          const active = s.id === regionId;
          return (
            <g key={s.id}>
              {active && (
                <path
                  d={s.d}
                  fill="rgba(56,189,248,0.06)"
                  stroke="#7DD3FC"
                  strokeWidth={2.4}
                  strokeOpacity={0.7}
                  style={{ filter: "url(#apb-glow)" }}
                />
              )}
              <path
                d={s.d}
                fill={active ? "none" : "rgba(134,239,172,0.03)"}
                stroke={active ? "#7DD3FC" : "#38BDF8"}
                strokeWidth={active ? 2.4 : 1.4}
                strokeOpacity={active ? 0.9 : 0.4}
                className={active ? "apb-sector-active" : "apb-sector"}
              />
            </g>
          );
        })}

        <style>{`
          /* Ambient discipline (see styles.css severity scale): slow pulses
             run on steps() — a few opacity updates per second instead of 60.
             Invisible to the eye, ~20× less repaint damage per layer. */
          .apb-peninsula { animation: apbBreathe 6s steps(18, jump-none) infinite; transform-box: fill-box; transform-origin: center; }
          .apb-sector { animation: apbFaint 6s steps(18, jump-none) infinite; }
          .apb-sector-active { animation: apbPulse 2.4s steps(12, jump-none) infinite; transform-box: fill-box; transform-origin: center; }
          @keyframes apbBreathe {
            0%, 100% { opacity: 0.7; }
            50%      { opacity: 1; }
          }
          @keyframes apbFaint {
            0%, 100% { stroke-opacity: 0.32; }
            50%      { stroke-opacity: 0.5; }
          }
          @keyframes apbPulse {
            0%, 100% { stroke-opacity: 0.55; stroke-width: 2px; }
            50%      { stroke-opacity: 1; stroke-width: 3.4px; }
          }
          @media (prefers-reduced-motion: reduce) {
            .apb-peninsula, .apb-sector, .apb-sector-active { animation: none !important; }
          }
        `}</style>
      </svg>
    </div>
  );
}

export default ArabianPeninsulaBackdrop;
