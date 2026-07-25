/**
 * KPI components · مكوّنات المؤشرات — spec: docs/components/05-kpi.md
 *
 * Numbers with the four truths. Deltas are direction-aware (an increase can
 * be bad). NxAnimatedKpi counts up ONLY on data change (motion law:
 * data moves when data changes) and swaps instantly under reduced motion.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

// ── NxKpiNumber ─────────────────────────────────────────────────────────────

const KPI_SIZE: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "text-base font-bold",
  md: "text-2xl font-bold",
  lg: "text-5xl font-bold leading-none",
  xl: "text-7xl font-bold leading-none",
};

export interface NxKpiNumberProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: string | number;
  unit?: string;
  size?: keyof typeof KPI_SIZE;
}

export const NxKpiNumber = React.forwardRef<HTMLSpanElement, NxKpiNumberProps>(
  ({ className, value, unit, size = "md", ...props }, ref) => (
    <span ref={ref} className={cn("inline-flex items-baseline gap-1", className)} {...props}>
      <bdi className={cn("tabular-nums font-sans text-nx-pearl", KPI_SIZE[size])}>{value}</bdi>
      {unit ? <span className="text-xs font-medium text-nx-pearl/56">{unit}</span> : null}
    </span>
  ),
);
NxKpiNumber.displayName = "NxKpiNumber";

// ── NxDelta — direction-aware change chip ───────────────────────────────────

export interface NxDeltaProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  /** Which direction is GOOD for this metric (required — spec law). */
  goodDirection: "up" | "down";
  /** Below this absolute value the delta renders neutral (anti tick-noise). */
  noiseThreshold?: number;
  unit?: string;
}

export function deltaTone(
  value: number,
  goodDirection: "up" | "down",
  noiseThreshold = 0,
): "positive" | "negative" | "neutral" {
  if (Math.abs(value) <= noiseThreshold) return "neutral";
  const isUp = value > 0;
  return (isUp && goodDirection === "up") || (!isUp && goodDirection === "down")
    ? "positive"
    : "negative";
}

const DELTA_TONE_CLASS = {
  positive: "text-nx-success border-nx-success/40",
  negative: "text-nx-critical border-nx-critical/40",
  neutral: "text-nx-pearl/56 border-white/14",
} as const;

export const NxDelta = React.forwardRef<HTMLSpanElement, NxDeltaProps>(
  ({ className, value, goodDirection, noiseThreshold = 0, unit, ...props }, ref) => {
    const tone = deltaTone(value, goodDirection, noiseThreshold);
    const arrow = tone === "neutral" ? "◆" : value > 0 ? "▲" : "▼";
    const label = tone === "neutral" ? "مستقر" : `${arrow} ${Math.abs(value)}${unit ?? ""}`;
    return (
      <span
        ref={ref}
        data-tone={tone}
        className={cn(
          "inline-flex items-center gap-1 rounded-nx-8 border px-2 py-0.5 text-xs font-medium tabular-nums",
          DELTA_TONE_CLASS[tone],
          className,
        )}
        {...props}
      >
        {label}
      </span>
    );
  },
);
NxDelta.displayName = "NxDelta";

// ── NxStatusIndicator ───────────────────────────────────────────────────────

export type NxStatus = "success" | "warning" | "critical" | "info";

const STATUS_META: Record<NxStatus, { dot: string; word: string }> = {
  success: { dot: "bg-nx-success", word: "سليم" },
  warning: { dot: "bg-nx-warning", word: "تحذير" },
  critical: { dot: "bg-nx-critical", word: "حرج" },
  info: { dot: "bg-nx-info", word: "معلومة" },
};

export interface NxStatusIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: NxStatus;
  /** Override the default Arabic word (color never carries meaning alone). */
  label?: string;
  /** Pulsing dot ONLY for live/receiving state (licensed 2s loop). */
  live?: boolean;
}

export const NxStatusIndicator = React.forwardRef<HTMLSpanElement, NxStatusIndicatorProps>(
  ({ className, status, label, live = false, ...props }, ref) => (
    <span
      ref={ref}
      data-status={status}
      className={cn("inline-flex items-center gap-2 text-xs text-nx-pearl/72", className)}
      {...props}
    >
      <span
        aria-hidden
        className={cn("size-2 rounded-full", STATUS_META[status].dot, live && "nx-anim-breathe")}
      />
      {label ?? STATUS_META[status].word}
    </span>
  ),
);
NxStatusIndicator.displayName = "NxStatusIndicator";

// ── NxAnimatedKpi — count-up on data change only ────────────────────────────

export interface NxAnimatedKpiProps extends Omit<NxKpiNumberProps, "value"> {
  value: number;
  fractionDigits?: number;
}

export function NxAnimatedKpi({ value, fractionDigits = 0, ...rest }: NxAnimatedKpiProps) {
  const [display, setDisplay] = React.useState(value);
  const previous = React.useRef(value);

  React.useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const tokenValue = getComputedStyle(document.documentElement)
      .getPropertyValue("--nx-anim-count")
      .trim();
    const durationMs = tokenValue.endsWith("ms") ? parseFloat(tokenValue) : 400;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out, no overshoot
      setDisplay(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <NxKpiNumber value={display.toFixed(fractionDigits)} {...rest} />;
}

// ── NxSparkline — shape of recent history (static draw, data-truthful) ──────

export interface NxSparklineProps extends Omit<React.SVGAttributes<SVGSVGElement>, "points"> {
  points: readonly number[];
  width?: number;
  height?: number;
  /** Accessible summary, e.g. "اتجاه صاعد خلال ٣٠ يومًا". */
  label: string;
}

export function NxSparkline({
  points,
  width = 120,
  height = 32,
  label,
  className,
  ...props
}: NxSparklineProps) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - ((p - min) / span) * (height - 4) - 2).toFixed(1)}`,
    )
    .join(" ");
  const last = points[points.length - 1];
  const lastY = height - ((last - min) / span) * (height - 4) - 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("text-nx-cyan/72", className)}
      {...props}
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} />
      <circle cx={width} cy={lastY} r={2.5} fill="currentColor" />
    </svg>
  );
}
