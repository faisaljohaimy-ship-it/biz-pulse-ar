// Animated Executive KPI card — reusable, opt-in.
// Count animation + status transition. GPU-only transforms.
import * as React from "react";
import { useAnimatedNumber } from "./useAnimatedNumber";

export interface AnimatedKpiProps {
  label: string;
  value: number;
  unit?: string;
  status?: "ok" | "warn" | "critical";
  widgetId?: string;
  precision?: number;
}

const STATUS_TONE: Record<NonNullable<AnimatedKpiProps["status"]>, string> = {
  ok: "border-[#3AE8FF]/40 text-white",
  warn: "border-[#F5C86B]/50 text-[#FBE29A]",
  critical: "border-[#FF6A9A]/60 text-[#FFB0C7]",
};

export function AnimatedKpi({
  label,
  value,
  unit,
  status = "ok",
  widgetId,
  precision = 0,
}: AnimatedKpiProps) {
  const v = useAnimatedNumber(value);
  const display = precision > 0 ? v.toFixed(precision) : Math.round(v).toLocaleString();
  return (
    <div
      data-aria-widget-id={widgetId}
      className={`group relative overflow-hidden rounded-2xl border bg-[#061A2E]/70 p-4 backdrop-blur-md transition-transform duration-500 hover:-translate-y-0.5 ${STATUS_TONE[status]}`}
    >
      <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tabular-nums" style={{ willChange: "contents" }}>
          {display}
        </span>
        {unit ? <span className="text-xs text-white/50">{unit}</span> : null}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-[#3AE8FF]/0 to-[#3AE8FF]/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </div>
  );
}
