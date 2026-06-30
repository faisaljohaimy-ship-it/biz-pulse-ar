import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type KpiTone = "cyan" | "emerald" | "amber" | "rose" | "violet";

const TONE_RING: Record<KpiTone, string> = {
  cyan:    "border-[color:var(--nx-cyan)]/35 shadow-[0_0_24px_-6px_color-mix(in_oklab,var(--nx-cyan)_55%,transparent)]",
  emerald: "border-[color:var(--nx-success)]/40 shadow-[0_0_24px_-6px_color-mix(in_oklab,var(--nx-success)_55%,transparent)]",
  amber:   "border-[color:var(--nx-warning)]/45 shadow-[0_0_24px_-6px_color-mix(in_oklab,var(--nx-warning)_55%,transparent)]",
  rose:    "border-[color:var(--nx-critical)]/50 shadow-[0_0_24px_-6px_color-mix(in_oklab,var(--nx-critical)_55%,transparent)]",
  violet:  "border-violet-400/40 shadow-[0_0_24px_-6px_rgba(167,139,250,0.5)]",
};

const TONE_DOT: Record<KpiTone, string> = {
  cyan:    "bg-[color:var(--nx-cyan)]",
  emerald: "bg-[color:var(--nx-success)]",
  amber:   "bg-[color:var(--nx-warning)]",
  rose:    "bg-[color:var(--nx-critical)]",
  violet:  "bg-violet-400",
};

export interface KpiTileProps {
  labelAr: string;
  labelEn: string;
  value: ReactNode;
  hint?: string;
  tone?: KpiTone;
  loading?: boolean;
  /** Optional inline trend, e.g. "+3%" or "▾ 12m". */
  delta?: string;
  className?: string;
}

/**
 * Executive glass KPI tile. Used in the hero floating panels and the
 * Mission Control Strip. Pure presentational — data is owned by the parent.
 */
export function KpiTile({
  labelAr, labelEn, value, hint, tone = "cyan", loading, delta, className,
}: KpiTileProps) {
  const displayValue = loading ? "—" : value;
  return (
    <div
      className={cn(
        "executive-glass relative overflow-hidden rounded-2xl border px-4 py-3 transition-transform duration-300 motion-safe:hover:-translate-y-0.5",
        TONE_RING[tone],
        className,
      )}
      role="group"
      aria-label={`${labelEn} — ${typeof value === "string" || typeof value === "number" ? value : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-medium text-[color:var(--nx-text-soft)]/85">
            {labelAr}
          </div>
          <div className="truncate text-[9px] uppercase tracking-[0.18em] text-[color:var(--nx-text-muted)]">
            {labelEn}
          </div>
        </div>
        <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[tone], "motion-safe:animate-pulse")} aria-hidden />
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div
          aria-live="polite"
          className="font-mono text-2xl font-semibold leading-none text-white tabular-nums"
        >
          {displayValue}
        </div>
        {delta ? (
          <div className="text-[10px] font-medium text-[color:var(--nx-text-muted)]">{delta}</div>
        ) : null}
      </div>
      {hint ? (
        <div className="mt-1 truncate text-[10px] text-[color:var(--nx-text-muted)]">{hint}</div>
      ) : null}
    </div>
  );
}

export default KpiTile;
