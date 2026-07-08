/**
 * KpiCard — executive KPI tile for the /os dashboard.
 * All numeric claims render via <EvidenceBadge> (FR-19 evidence gate).
 * Bilingual, mobile-first, dark-locked, semantic-token safe.
 */
import type { LucideIcon } from "lucide-react";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import type { Evidence } from "@/lib/evidence/gate";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  readonly icon: LucideIcon;
  readonly labelPrimary: string;
  readonly labelSecondary: string;
  readonly value: number | null | undefined;
  readonly evidence: Evidence | null | undefined;
  readonly liveLabel: string;
  readonly tone?: "cyan" | "emerald" | "amber" | "rose";
  readonly hint?: string;
  readonly className?: string;
}

const TONE_RING: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  cyan: "from-[#00D4FF]/25 via-[#00D4FF]/5 to-transparent border-[#00D4FF]/35",
  emerald: "from-emerald-400/25 via-emerald-400/5 to-transparent border-emerald-400/35",
  amber: "from-amber-400/25 via-amber-400/5 to-transparent border-amber-400/35",
  rose: "from-rose-400/25 via-rose-400/5 to-transparent border-rose-400/35",
};

const TONE_ICON: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  cyan: "text-[#3AE8FF] bg-[#00D4FF]/15 shadow-[0_0_22px_rgba(0,212,255,0.55)]",
  emerald: "text-emerald-300 bg-emerald-400/15 shadow-[0_0_22px_rgba(52,211,153,0.55)]",
  amber: "text-amber-300 bg-amber-400/15 shadow-[0_0_22px_rgba(251,191,36,0.55)]",
  rose: "text-rose-300 bg-rose-400/15 shadow-[0_0_22px_rgba(251,113,133,0.55)]",
};

function formatValue(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-US").format(v);
}

export function KpiCard({
  icon: Icon,
  labelPrimary,
  labelSecondary,
  value,
  evidence,
  liveLabel,
  tone = "cyan",
  hint,
  className,
}: KpiCardProps) {
  const display = formatValue(value);
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 backdrop-blur-xl transition-transform duration-300 will-change-transform hover:-translate-y-0.5 sm:p-5",
        TONE_RING[tone],
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(200px 100px at 90% 0%, rgba(58,232,255,0.18), transparent 60%)",
        }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl motion-safe:animate-pulse",
              TONE_ICON[tone],
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-white sm:text-sm">
              {labelPrimary}
            </div>
            <div className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">
              {labelSecondary}
            </div>
          </div>
        </div>
        <EvidenceBadge evidence={evidence} label={liveLabel} tone={tone} />
      </div>
      <div className="relative mt-4 flex items-baseline gap-2">
        <span
          className="font-semibold tabular-nums tracking-tight text-white"
          style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)" }}
        >
          {display}
        </span>
        {hint ? (
          <span className="truncate text-[11px] font-medium text-white/50">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
