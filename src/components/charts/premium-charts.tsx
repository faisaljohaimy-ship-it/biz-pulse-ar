/**
 * Premium Chart Kit — SADEED
 * Pure SVG + GPU-friendly CSS motion (transform / opacity / stroke-dashoffset).
 * No chart library, no runtime data invention: every component renders only
 * the values it is handed. Honest visuals, luxury execution.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";

/* ---------------------------------------------------------------- utils */

function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

/** Catmull-Rom → cubic Bézier: silky curves instead of polyline corners. */
function smoothPath(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  }
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const MOTION_CSS = `
@keyframes pc-draw { from { stroke-dashoffset: var(--pc-len); } to { stroke-dashoffset: 0; } }
@keyframes pc-rise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes pc-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes pc-sheen { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
@keyframes pc-pulse { 0%,100% { opacity:.55; transform: scale(1); } 50% { opacity:1; transform: scale(1.35); } }
.pc-draw { animation: pc-draw 1100ms cubic-bezier(.16,1,.3,1) both; }
.pc-area { animation: pc-fade 900ms cubic-bezier(.16,1,.3,1) both; }
.pc-bar { transform-origin: bottom; animation: pc-rise 780ms cubic-bezier(.16,1,.3,1) both; }
.pc-dot { animation: pc-pulse 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.pc-sheen { animation: pc-sheen 5.5s cubic-bezier(.4,0,.2,1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .pc-draw, .pc-area, .pc-bar, .pc-dot, .pc-sheen { animation: none !important; stroke-dashoffset: 0 !important; transform: none !important; opacity: 1 !important; }
}
`;

function ChartMotionStyles() {
  return <style>{MOTION_CSS}</style>;
}

/* --------------------------------------------------------- SparkArea */

export interface SparkAreaProps {
  values: readonly number[];
  /** rgb triplet, e.g. "34, 211, 238" */
  accent?: string;
  height?: number;
  className?: string;
  label?: string;
}

/** Glowing gradient area sparkline with a drawing stroke and a live head dot. */
export function SparkArea({
  values,
  accent = "34, 211, 238",
  height = 40,
  className = "",
  label,
}: SparkAreaProps) {
  const id = useId().replace(/:/g, "");
  const [ref, seen] = useInView<HTMLDivElement>();
  const W = 120;
  const H = height;

  const { line, area, head } = useMemo(() => {
    if (values.length === 0) return { line: "", area: "", head: null as null | { x: number; y: number } };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const step = values.length > 1 ? W / (values.length - 1) : W;
    const pts = values.map((v, i) => ({
      x: +(i * step).toFixed(2),
      y: +(H - 4 - ((v - min) / span) * (H - 10)).toFixed(2),
    }));
    const d = smoothPath(pts);
    return {
      line: d,
      area: `${d} L${W} ${H} L0 ${H} Z`,
      head: pts[pts.length - 1],
    };
  }, [values, H]);

  if (!line) return null;

  return (
    <div ref={ref} className={className} aria-hidden={!label} role={label ? "img" : undefined} aria-label={label}>
      <ChartMotionStyles />
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`rgba(${accent}, .42)`} />
            <stop offset="60%" stopColor={`rgba(${accent}, .12)`} />
            <stop offset="100%" stopColor={`rgba(${accent}, 0)`} />
          </linearGradient>
          <linearGradient id={`stroke-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={`rgba(${accent}, .55)`} />
            <stop offset="100%" stopColor={`rgb(${accent})`} />
          </linearGradient>
        </defs>
        {seen && (
          <>
            <path className="pc-area" d={area} fill={`url(#fill-${id})`} />
            <path
              className="pc-draw"
              d={line}
              fill="none"
              stroke={`url(#stroke-${id})`}
              strokeWidth={2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ ["--pc-len" as string]: 400, strokeDasharray: 400 }}
            />
            {head && <circle className="pc-dot" cx={head.x} cy={head.y} r={2.4} fill={`rgb(${accent})`} />}
          </>
        )}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------- MicroMeter */

export interface MicroMeterProps {
  /** 0..1 share of the row maximum. */
  ratio: number;
  accent?: string;
  className?: string;
}

/** Ultra-thin proportional meter for KPI tiles — encodes a real share only. */
export function MicroMeter({ ratio, accent = "34, 211, 238", className = "" }: MicroMeterProps) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0)) * 100;
  return (
    <div
      className={`relative h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--hairline-soft,rgba(148,163,184,.25))] ${className}`}
      aria-hidden
    >
      <ChartMotionStyles />
      <div
        className="relative h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, rgba(${accent}, .45), rgb(${accent}))`,
          boxShadow: `0 0 12px rgba(${accent}, .55)`,
        }}
      >
        <span
          className="pc-sheen absolute inset-y-0 w-1/3"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent)" }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------- RadialGauge */

export interface RadialGaugeProps {
  /** 0..100 */
  value: number;
  size?: number;
  accent?: string;
  label?: string;
  caption?: string;
}

/** Precision-machined ring gauge with a drawing arc and inner glass core. */
export function RadialGauge({
  value,
  size = 108,
  accent = "37, 99, 235",
  label,
  caption,
}: RadialGaugeProps) {
  const id = useId().replace(/:/g, "");
  const [ref, seen] = useInView<HTMLDivElement>();
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const r = 46;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1.5" style={{ width: size }}>
      <ChartMotionStyles />
      <svg viewBox="0 0 110 110" width={size} height={size} role="img" aria-label={`${label ?? ""} ${pct}%`}>
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={`rgb(${accent})`} />
            <stop offset="100%" stopColor="rgb(6, 182, 212)" />
          </linearGradient>
        </defs>
        <circle cx="55" cy="55" r={r} fill="none" stroke={`rgba(${accent}, .14)`} strokeWidth="8" />
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke={`url(#g-${id})`}
          strokeWidth="8"
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
          strokeDasharray={c}
          strokeDashoffset={seen ? offset : c}
          style={{
            transition: "stroke-dashoffset 1200ms cubic-bezier(.16,1,.3,1)",
            filter: `drop-shadow(0 0 6px rgba(${accent}, .5))`,
          }}
        />
        <text
          x="55"
          y="59"
          textAnchor="middle"
          className="fill-[color:var(--ink,#111827)] font-black"
          style={{ fontSize: 22 }}
        >
          {Math.round(pct)}%
        </text>
      </svg>
      {caption && <span className="text-center text-[12px] text-muted-foreground">{caption}</span>}
    </div>
  );
}

/* ---------------------------------------------------------- BarSeries */

export interface BarDatum {
  label: string;
  value: number;
  accent?: string;
}

/** Staggered rising bars with glass caps. Values shown as-is. */
export function BarSeries({
  data,
  height = 140,
  accent = "37, 99, 235",
}: {
  data: readonly BarDatum[];
  height?: number;
  accent?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div ref={ref} className="w-full">
      <ChartMotionStyles />
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => {
          const a = d.accent ?? accent;
          const h = Math.max(4, (d.value / max) * (height - 26));
          return (
            <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[12px] font-bold tabular-nums text-[color:var(--ink,#111827)]">
                {d.value}
              </span>
              <div
                className={seen ? "pc-bar relative w-full overflow-hidden rounded-t-lg" : "relative w-full rounded-t-lg"}
                style={{
                  height: seen ? h : 0,
                  animationDelay: `${i * 70}ms`,
                  background: `linear-gradient(180deg, rgb(${a}), rgba(${a}, .35))`,
                  boxShadow: `0 0 18px -4px rgba(${a}, .7), inset 0 1px 0 rgba(255,255,255,.6)`,
                }}
              >
                <span
                  className="pc-sheen absolute inset-y-0 w-1/2"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent)",
                    animationDelay: `${i * 200}ms`,
                  }}
                />
              </div>
              <span className="w-full truncate text-center text-[12px] text-muted-foreground">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Donut */

export interface DonutSlice {
  label: string;
  value: number;
  accent: string;
}

/** Segmented donut with sequential arc reveal and a legend. */
export function DonutChart({
  slices,
  size = 132,
  centerLabel,
}: {
  slices: readonly DonutSlice[];
  size?: number;
  centerLabel?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 44;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div ref={ref} className="flex items-center gap-4">
      <ChartMotionStyles />
      <svg viewBox="0 0 110 110" width={size} height={size} role="img" aria-label={centerLabel ?? "distribution"}>
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(148,163,184,.18)" strokeWidth="11" />
        {total > 0 &&
          slices.map((s, i) => {
            const frac = s.value / total;
            const dash = c * frac;
            const rotation = (acc / total) * 360 - 90;
            acc += s.value;
            return (
              <circle
                key={s.label}
                cx="55"
                cy="55"
                r={r}
                fill="none"
                stroke={`rgb(${s.accent})`}
                strokeWidth="11"
                strokeLinecap="butt"
                transform={`rotate(${rotation} 55 55)`}
                strokeDasharray={`${dash} ${c}`}
                strokeDashoffset={seen ? 0 : dash}
                style={{
                  transition: `stroke-dashoffset 900ms cubic-bezier(.16,1,.3,1) ${i * 140}ms`,
                  filter: `drop-shadow(0 0 6px rgba(${s.accent}, .45))`,
                }}
              />
            );
          })}
        <text
          x="55"
          y="53"
          textAnchor="middle"
          className="fill-[color:var(--ink,#111827)] font-black"
          style={{ fontSize: 20 }}
        >
          {total}
        </text>
        {centerLabel && (
          <text x="55" y="68" textAnchor="middle" className="fill-current opacity-60" style={{ fontSize: 9 }}>
            {centerLabel}
          </text>
        )}
      </svg>
      <ul className="min-w-0 space-y-1.5">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[12px]">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: `rgb(${s.accent})`, boxShadow: `0 0 8px rgba(${s.accent}, .8)` }}
            />
            <span className="truncate text-muted-foreground">{s.label}</span>
            <span className="font-bold tabular-nums text-[color:var(--ink,#111827)]">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
