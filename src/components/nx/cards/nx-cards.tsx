/**
 * Nx cards · البطاقات — spec: docs/components/03-cards.md (base) built on
 * Constitution Ch. 08. NxGlassCard is the bare primitive; NxKpiCard is the
 * KPI assembly (value + delta + provenance).
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { NxKpiNumber, NxDelta, type NxDeltaProps } from "../kpi/nx-kpi";

export interface NxGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Elevation on hover per base spec (E1 → E2). */
  interactive?: boolean;
}

/** The bare glass container every card extends (Constitution Ch. 08 base). */
export const NxGlassCard = React.forwardRef<HTMLDivElement, NxGlassCardProps>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "nx-glass-e1 rounded-nx-16 p-6",
        interactive &&
          "transition-[box-shadow,border-color] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] hover:shadow-e2 hover:border-white/10 focus-within:ring-2 focus-within:ring-nx-cyan",
        className,
      )}
      {...props}
    />
  ),
);
NxGlassCard.displayName = "NxGlassCard";

export interface NxKpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  unit?: string;
  delta?: Omit<NxDeltaProps, "className">;
  /** Provenance (Standards §7): time reference + source class. */
  updatedAt: string;
  simulation?: boolean;
}

/** NxKpiCard · بطاقة مؤشر — one KPI with the four truths. */
export const NxKpiCard = React.forwardRef<HTMLDivElement, NxKpiCardProps>(
  ({ className, label, value, unit, delta, updatedAt, simulation = false, ...props }, ref) => (
    <NxGlassCard ref={ref} interactive className={cn("flex flex-col gap-2", className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-nx-pearl/56">{label}</span>
        {simulation ? (
          <span className="rounded-nx-8 border border-nx-warning/40 px-2 py-0.5 text-[11px] text-nx-warning">
            محاكاة
          </span>
        ) : null}
      </div>
      <div className="flex items-baseline gap-2">
        <NxKpiNumber value={value} unit={unit} size="lg" />
        {delta ? <NxDelta {...delta} /> : null}
      </div>
      <span className="text-[11px] text-nx-pearl/38">آخر تحديث: {updatedAt}</span>
    </NxGlassCard>
  ),
);
NxKpiCard.displayName = "NxKpiCard";
