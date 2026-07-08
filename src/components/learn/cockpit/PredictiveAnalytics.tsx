/**
 * PredictiveAnalytics — forecast strip with confidence band and ARIA insight.
 *
 * Pure SVG (no chart library). Renders actuals as a solid line + dots,
 * forecast as a dashed line, and lower/upper bounds as a translucent
 * band. Reusable via `cockpit-content.ts`.
 */
import type { CockpitForecastPoint } from "@/lib/learn/cockpit-content";

interface Props {
  title: string;
  unit: string;
  series: CockpitForecastPoint[];
  insight: string;
  lang: "ar" | "en";
}

const W = 560;
const H = 180;
const P = { l: 32, r: 12, t: 16, b: 28 };

export function PredictiveAnalytics({ title, unit, series, insight, lang }: Props) {
  const ar = lang === "ar";
  if (series.length === 0) return null;

  const innerW = W - P.l - P.r;
  const innerH = H - P.t - P.b;
  const maxY = Math.max(
    ...series.map((p) => Math.max(p.upper ?? 0, p.forecast, p.actual ?? 0)),
    0.5,
  );
  const stepX = innerW / (series.length - 1);
  const x = (i: number) => P.l + i * stepX;
  const y = (v: number) => P.t + innerH - (v / maxY) * innerH;

  // Actuals path (only points that have `actual`)
  const actualIdx = series.map((p, i) => ({ p, i })).filter((n) => typeof n.p.actual === "number");
  const actualsPath = actualIdx
    .map((n, k) => `${k === 0 ? "M" : "L"} ${x(n.i)} ${y(n.p.actual as number)}`)
    .join(" ");

  // Forecast path over the whole series
  const forecastPath = series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.forecast)}`)
    .join(" ");

  // Confidence band
  const bandTop = series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.upper ?? p.forecast)}`)
    .join(" ");
  const bandBottom = series
    .slice()
    .reverse()
    .map((p, i) => {
      const ii = series.length - 1 - i;
      return `L ${x(ii)} ${y(p.lower ?? p.forecast)}`;
    })
    .join(" ");
  const bandPath = `${bandTop} ${bandBottom} Z`;

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => f * maxY);

  return (
    <div className="space-y-3" dir={ar ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">{title}</div>
        <div className="text-[11px] text-white/50">{unit}</div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-[180px] w-full min-w-[420px]"
          role="img"
          aria-label={title}
        >
          {/* Grid */}
          {gridLines.map((v, i) => (
            <g key={i}>
              <line
                x1={P.l}
                x2={W - P.r}
                y1={y(v)}
                y2={y(v)}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="2 3"
              />
              <text
                x={P.l - 6}
                y={y(v) + 3}
                textAnchor="end"
                className="fill-white/50"
                style={{ fontSize: 9 }}
              >
                {v.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Confidence band */}
          <path d={bandPath} fill="rgba(0, 212, 255, 0.14)" />

          {/* Forecast (dashed) */}
          <path
            d={forecastPath}
            fill="none"
            stroke="rgba(0, 212, 255, 0.9)"
            strokeWidth={1.4}
            strokeDasharray="4 4"
          />

          {/* Actuals (solid) */}
          <path
            d={actualsPath}
            fill="none"
            stroke="rgb(56, 232, 255)"
            strokeWidth={1.8}
            strokeLinecap="round"
          />

          {/* Actual dots */}
          {actualIdx.map((n) => (
            <circle
              key={`a-${n.i}`}
              cx={x(n.i)}
              cy={y(n.p.actual as number)}
              r={2.4}
              fill="rgb(56, 232, 255)"
            />
          ))}

          {/* X labels */}
          {series.map((p, i) => (
            <text
              key={`xl-${i}`}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-white/60"
              style={{ fontSize: 9 }}
            >
              {p.label}
            </text>
          ))}
        </svg>
      </div>

      <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/[0.06] p-3 text-xs leading-relaxed text-cyan-100">
        <span className="me-2 font-semibold text-cyan-200">
          {ar ? "استنتاج آريا:" : "ARIA insight:"}
        </span>
        {insight}
      </div>
    </div>
  );
}
