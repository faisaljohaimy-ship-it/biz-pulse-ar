/**
 * ActivityRing — the console's central stage: a region-coloured radar with a
 * large activity percentage. Stage-1 stand-in for the glowing region map
 * (Stage 3 replaces the inner disc with the live map). Pure SVG/CSS.
 */
const SIZE = 260;
const R = 108;
const C = 2 * Math.PI * R;

export function ActivityRing({
  ar,
  accent,
  value,
  label,
  regionLabel,
}: {
  ar: boolean;
  accent: string;
  value: number;
  label: string;
  regionLabel: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * C;

  return (
    <div
      className="nx-hud-corner relative grid aspect-square w-full max-w-[300px] place-items-center rounded-2xl"
      style={{
        background: `radial-gradient(circle at 50% 45%, ${accent}1a, transparent 62%)`,
      }}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-full w-full"
        role="img"
        aria-label={`${label}: ${pct}%`}
      >
        {/* concentric radar rings */}
        {[R, R - 26, R - 52, R - 78].map((r, i) => (
          <circle
            key={r}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth="1"
            opacity={0.1 + i * 0.03}
          />
        ))}
        {/* cross hairs */}
        <line
          x1={SIZE / 2}
          y1="26"
          x2={SIZE / 2}
          y2={SIZE - 26}
          stroke={accent}
          strokeWidth="0.5"
          opacity="0.14"
        />
        <line
          x1="26"
          y1={SIZE / 2}
          x2={SIZE - 26}
          y2={SIZE / 2}
          stroke={accent}
          strokeWidth="0.5"
          opacity="0.14"
        />

        {/* rotating sweep beam */}
        <g className="nx-radar-sweep" style={{ transformBox: "fill-box" }}>
          <defs>
            <linearGradient id="nx-sweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={accent} stopOpacity="0" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path
            d={`M ${SIZE / 2} ${SIZE / 2} L ${SIZE / 2} ${SIZE / 2 - R} A ${R} ${R} 0 0 1 ${SIZE / 2 + R * 0.5} ${SIZE / 2 - R * 0.866} Z`}
            fill="url(#nx-sweep)"
            opacity="0.5"
          />
        </g>

        {/* progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={accent}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C - dash}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
        />
      </svg>

      {/* center readout */}
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">
            {label}
          </div>
          <div
            className="font-mono text-4xl font-black tabular-nums text-white sm:text-5xl"
            style={{ textShadow: `0 0 22px ${accent}88` }}
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

export default ActivityRing;
