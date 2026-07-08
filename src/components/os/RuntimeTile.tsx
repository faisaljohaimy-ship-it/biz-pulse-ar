/**
 * RuntimeTile — bilingual, dark-locked, mobile-first module tile for the
 * Enterprise Operating System hub. Reusable across every stage.
 */
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RuntimeTileProps {
  icon: LucideIcon;
  labelPrimary: string;
  labelSecondary: string;
  status: string;
  to: string;
  featured?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function RuntimeTile({
  icon: Icon,
  labelPrimary,
  labelSecondary,
  status,
  to,
  featured = false,
  className,
  ariaLabel,
}: RuntimeTileProps) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel ?? `${labelPrimary} — ${labelSecondary}`}
      className={cn(
        "group relative flex min-h-[92px] w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border px-4 py-4 text-start transition-transform duration-300 will-change-transform sm:min-h-[104px] sm:px-5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e1a]",
        "active:scale-[0.985]",
        featured
          ? "border-[#3AE8FF]/70 bg-gradient-to-br from-[#00D4FF]/25 to-[#3AE8FF]/10 shadow-[0_0_40px_rgba(58,232,255,0.45)] hover:shadow-[0_0_70px_rgba(58,232,255,0.75)] sm:min-h-[140px]"
          : "border-[#00D4FF]/30 bg-[#00D4FF]/[0.06] shadow-[0_0_20px_rgba(0,212,255,0.15)] hover:-translate-y-0.5 hover:border-[#3AE8FF]/70 hover:bg-[#3AE8FF]/10 hover:shadow-[0_0_30px_rgba(58,232,255,0.35)]",
        className,
      )}
    >
      {featured && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl border border-[#3AE8FF]/40 motion-safe:animate-ping"
        />
      )}
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl text-[#3AE8FF]",
            featured
              ? "h-14 w-14 bg-[#3AE8FF]/15 shadow-[0_0_30px_rgba(58,232,255,0.7)]"
              : "h-11 w-11 bg-[#00D4FF]/20 shadow-[0_0_18px_rgba(0,212,255,0.5)] motion-safe:animate-pulse",
          )}
        >
          <Icon
            className={featured ? "h-7 w-7 drop-shadow-[0_0_12px_rgba(58,232,255,0.9)]" : "h-5 w-5"}
            strokeWidth={1.75}
          />
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate font-semibold text-white",
              featured ? "text-base sm:text-lg" : "text-sm sm:text-[15px]",
            )}
          >
            {labelPrimary}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-medium uppercase tracking-[0.22em] text-white/45 sm:text-[11px]">
            {labelSecondary}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#3AE8FF]/30 bg-[#3AE8FF]/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3AE8FF] sm:text-[11px]">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-[#3AE8FF] shadow-[0_0_8px_#3AE8FF] motion-safe:animate-pulse"
        />
        {status}
      </span>
    </Link>
  );
}
