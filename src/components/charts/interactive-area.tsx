/**
 * InteractiveArea — the chart experience layer.
 *
 * Progressive draw-in, gradient stroke, hover inspection with a glass tooltip,
 * animated value interpolation and a crosshair. Renders only the values it is
 * handed — no synthesised data points.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface InteractivePoint {
  label: string;
  value: number;
}

export interface InteractiveAreaProps {
  points: readonly InteractivePoint[];
  accent?: string;
  height?: number;
  className?: string;
  valueSuffix?: string;
  title?: string;
}

function smoothPath(pts: readonly { x: number; y: number }[]) {
  if (pts.length === 0) return "";
  if (pts.length < 3) return pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${
      p2.y - (p3.y - p1.y) / 6
    }, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Smoothly interpolates a displayed number toward its target. */
function useAnimatedNumber(target: number, reduce: boolean | null) {
  const [shown, setShown] = useState(target);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (reduce) {
      setShown(target);
      return;
    }
    let from = shown;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 320);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(from + (target - from) * eased);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      from = target;
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduce]);
  return shown;
}

export function InteractiveArea({
  points,
  accent = "37, 99, 235",
  height = 160,
  className,
  valueSuffix = "",
  title,
}: InteractiveAreaProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const W = 320;
  const H = height;

  const geo = useMemo(() => {
    if (points.length === 0) return null;
    const values = points.map((p) => p.value);
    const max = Math.max(...values, 1);
    const step = points.length > 1 ? W / (points.length - 1) : W;
    const pts = points.map((p, i) => ({
      x: +(i * step).toFixed(2),
      y: +(H - 12 - (p.value / max) * (H - 30)).toFixed(2),
    }));
    const line = smoothPath(pts);
    return { pts, line, area: `${line} L${W} ${H} L0 ${H} Z`, max, step };
  }, [points, H]);

  const active = hover != null && geo ? points[hover] : null;
  const shownValue = useAnimatedNumber(active?.value ?? points[points.length - 1]?.value ?? 0, reduce);

  if (!geo) return null;

  return (
    <div className={cn("relative w-full", className)}>
      {title && (
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="text-xs font-bold text-[color:var(--ink-2,#6B7280)]">{title}</span>
          <span className="text-lg font-black tabular-nums" style={{ color: `rgb(${accent})` }}>
            {Math.round(shownValue)}
            {valueSuffix}
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-auto w-full touch-none"
        style={{ height }}
        role="img"
        aria-label={title}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const rel = ((e.clientX - r.left) / r.width) * W;
          const idx = Math.max(0, Math.min(points.length - 1, Math.round(rel / geo.step)));
          setHover(idx);
        }}
      >
        <defs>
          <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`rgba(${accent}, .42)`} />
            <stop offset="100%" stopColor={`rgba(${accent}, 0)`} />
          </linearGradient>
          <linearGradient id={`stroke-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={`rgba(${accent}, .55)`} />
            <stop offset="55%" stopColor="rgba(6,182,212,.95)" />
            <stop offset="100%" stopColor={`rgba(${accent}, .95)`} />
          </linearGradient>
        </defs>

        <motion.path
          d={geo.area}
          fill={`url(#fill-${uid})`}
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.path
          d={geo.line}
          fill="none"
          stroke={`url(#stroke-${uid})`}
          strokeWidth="2.4"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />

        {hover != null && (
          <g>
            <line
              x1={geo.pts[hover].x}
              x2={geo.pts[hover].x}
              y1={6}
              y2={H}
              stroke={`rgba(${accent}, .35)`}
              strokeWidth="1"
              strokeDasharray="3 4"
            />
            <circle cx={geo.pts[hover].x} cy={geo.pts[hover].y} r="7" fill={`rgba(${accent}, .18)`} />
            <circle cx={geo.pts[hover].x} cy={geo.pts[hover].y} r="3.4" fill={`rgb(${accent})`} />
          </g>
        )}
      </svg>

      {active && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="pointer-events-none absolute top-1 rounded-xl border border-[rgba(37,99,235,.22)] bg-white/75 px-2.5 py-1.5 text-[12px] font-bold shadow-[0_8px_24px_rgba(15,23,42,.12)] backdrop-blur-xl"
          style={{
            left: `calc(${(geo.pts[hover!].x / W) * 100}% - 40px)`,
          }}
        >
          <div className="text-[color:var(--ink-2,#6B7280)]">{active.label}</div>
          <div className="tabular-nums" style={{ color: `rgb(${accent})` }}>
            {active.value}
            {valueSuffix}
          </div>
        </motion.div>
      )}
    </div>
  );
}
