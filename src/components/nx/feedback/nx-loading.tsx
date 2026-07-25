/**
 * Loading system · نظام الانتظار — spec: docs/components/11-loading.md
 *
 * Skeletons shaped like the truth, inline spinners beside Arabic verbs,
 * determinate progress. Shimmer sweeps RTL; loops pause under reduced motion
 * via the token remap.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface NxSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Height on the 8pt rhythm: text 16 · title 24 · number 48 (default 16). */
  bar?: "text" | "title" | "number";
}

const BAR_CLASS = { text: "h-4", title: "h-6", number: "h-12 w-32" } as const;

export const NxSkeleton = React.forwardRef<HTMLDivElement, NxSkeletonProps>(
  ({ className, bar = "text", ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden
      className={cn("relative overflow-hidden rounded-nx-8 bg-white/6", BAR_CLASS[bar], className)}
      {...props}
    >
      <span
        className="absolute inset-0 bg-gradient-to-l from-transparent via-white/4 to-transparent"
        style={{ animation: "nx-shimmer var(--nx-loop-shimmer) linear infinite" }}
      />
    </div>
  ),
);
NxSkeleton.displayName = "NxSkeleton";

export interface NxSpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 16 | 20 | 24;
  /** Arabic verb shown beside spinners ≥ 20px (spec law). */
  label?: string;
}

export const NxSpinner = React.forwardRef<HTMLSpanElement, NxSpinnerProps>(
  ({ className, size = 16, label, ...props }, ref) => (
    <span
      ref={ref}
      role="status"
      className={cn("inline-flex items-center gap-2 text-xs text-nx-pearl/72", className)}
      {...props}
    >
      <span
        aria-hidden
        className="rounded-full border-2 border-nx-cyan/72 border-t-transparent nx-anim-spin"
        style={{ width: size, height: size }}
      />
      {label ?? <span className="sr-only">يحمّل</span>}
    </span>
  ),
);
NxSpinner.displayName = "NxSpinner";

export interface NxProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0..100; omit for indeterminate. */
  value?: number;
  label: string;
}

export const NxProgress = React.forwardRef<HTMLDivElement, NxProgressProps>(
  ({ className, value, label, ...props }, ref) => {
    const determinate = typeof value === "number";
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={determinate ? Math.round(value) : undefined}
        className={cn("flex items-center gap-3", className)}
        {...props}
      >
        <div className="relative h-1 flex-1 overflow-hidden rounded-nx-8 bg-white/8">
          {determinate ? (
            <div
              className="h-full rounded-nx-8 bg-nx-cyan transition-[width] duration-[var(--nx-anim-slow)] ease-[var(--nx-ease-out)]"
              style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
          ) : (
            <div
              className="absolute h-full w-[30%] rounded-nx-8 bg-nx-cyan"
              style={{ animation: "nx-indeterminate 1.5s var(--nx-ease-inout) infinite" }}
            />
          )}
        </div>
        {determinate ? (
          <span className="text-xs tabular-nums text-nx-pearl/56">{Math.round(value)}٪</span>
        ) : null}
      </div>
    );
  },
);
NxProgress.displayName = "NxProgress";
