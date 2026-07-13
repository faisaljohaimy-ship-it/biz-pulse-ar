/**
 * PerformanceChart — a compact region-coloured area chart («تحليل الأداء»)
 * beneath the map. Deterministic (seeded, SSR-stable), gradient-filled.
 */
const W = 260;
const H = 64;
const N = 28;

export function PerformanceChart({
  ar,
  accent,
  seed,
}: {
  ar: boolean;
  accent: string;
  seed: number;
}) {
  const ys = Array.from({ length: N }, (_, i) => {
    const wave = Math.sin(seed + i * 0.5) * 0.28 + Math.sin(seed * 1.7 + i * 0.19) * 0.16;
    const rise = (i / (N - 1)) * 0.34;
    return H - 8 - (0.34 + wave + rise) * (H - 18);
  });
  const line = ys.map((y, i) => `${(i / (N - 1)) * W},${y.toFixed(1)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  const gid = `nx-perf-${seed.toString().replace(".", "")}`;

  return (
    <div className="nx-cmd-surface rounded-2xl p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-bold text-white/75">
          {ar ? "تحليل الأداء العام" : "Performance trend"}
        </span>
        <span className="text-[9px] text-white/40">{ar ? "٣٠ يوماً" : "30 days"}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gid})`} />
        <polyline
          points={line}
          fill="none"
          stroke={accent}
          strokeWidth="1.8"
          style={{ filter: `drop-shadow(0 0 3px ${accent})` }}
        />
      </svg>
    </div>
  );
}

export default PerformanceChart;
