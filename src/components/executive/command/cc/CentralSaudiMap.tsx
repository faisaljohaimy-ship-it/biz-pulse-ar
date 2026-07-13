/**
 * CentralSaudiMap — the command center's core: a glowing peninsula silhouette
 * split west-blue / east-green with an intelligence mesh and a NEXIOS core
 * emblem. Pure SVG/CSS. Decorative — recognisable, not a survey map.
 */
import { Hexagon } from "lucide-react";

const PENINSULA =
  "M 360 150 C 470 112, 590 120, 662 170 C 702 150, 744 176, 730 222 " +
  "C 802 272, 838 362, 800 452 C 776 542, 720 642, 620 722 " +
  "C 520 784, 398 772, 330 700 C 270 640, 246 540, 252 452 " +
  "C 236 372, 252 282, 302 222 C 316 186, 336 166, 360 150 Z";

// Deterministic mesh nodes across the silhouette (native 1000×900 coords).
const NODES = [
  [551, 445],
  [420, 360],
  [470, 560],
  [640, 400],
  [600, 600],
  [360, 470],
  [700, 500],
  [520, 660],
  [430, 250],
  [680, 300],
] as const;

export function CentralSaudiMap({ blue, green }: { blue: string; green: string }) {
  return (
    <div className="relative grid aspect-square w-full max-w-[360px] place-items-center">
      <svg
        viewBox="240 120 620 680"
        className="h-full w-full"
        role="img"
        aria-label="NEXIOS command map"
      >
        <defs>
          <linearGradient id="cc-map-split" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={blue} stopOpacity="0.42" />
            <stop offset="46%" stopColor={blue} stopOpacity="0.30" />
            <stop offset="54%" stopColor={green} stopOpacity="0.30" />
            <stop offset="100%" stopColor={green} stopOpacity="0.42" />
          </linearGradient>
          <linearGradient id="cc-map-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={blue} />
            <stop offset="50%" stopColor={blue} />
            <stop offset="50%" stopColor={green} />
            <stop offset="100%" stopColor={green} />
          </linearGradient>
          <filter id="cc-map-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={PENINSULA}
          fill="url(#cc-map-split)"
          stroke="url(#cc-map-stroke)"
          strokeWidth="3.5"
          strokeOpacity="0.8"
          style={{ filter: "url(#cc-map-glow)" }}
        />

        {/* mesh links to centre + a few cross links */}
        {NODES.slice(1).map(([x, y], i) => (
          <line
            key={`l${i}`}
            x1={551}
            y1={445}
            x2={x}
            y2={y}
            stroke={x < 551 ? blue : green}
            strokeWidth="1.6"
            strokeOpacity="0.3"
          />
        ))}
        {NODES.map(([x, y], i) => (
          <circle
            key={`n${i}`}
            cx={x}
            cy={y}
            r={i === 0 ? 0 : 5}
            fill={x < 551 ? blue : green}
            opacity="0.6"
          />
        ))}
      </svg>

      {/* glowing core emblem */}
      <div
        className="animate-aria-breathe absolute grid h-16 w-16 place-items-center rounded-2xl border"
        style={{
          borderColor: `${blue}66`,
          background: `radial-gradient(circle at 50% 40%, ${blue}44, ${green}22 60%, transparent 74%)`,
          boxShadow: `0 0 30px -6px ${blue}`,
        }}
      >
        <Hexagon className="h-8 w-8" style={{ color: "#dbeafe" }} aria-hidden />
      </div>
    </div>
  );
}

export default CentralSaudiMap;
