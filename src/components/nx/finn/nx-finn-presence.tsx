/**
 * NxFinnPresence · حضور FINN — spec: docs/motion/05 (FINN Motion) +
 * docs/components/07 (iconography: presence ring + mode glyph).
 *
 * FINN's body is the presence ring; every state is a ring behavior with a
 * static co-signal (Arabic label) for reduced-motion parity. Per the frozen
 * advisory architecture, "executing" renders as the awaiting-approved-
 * execution state (gold link) — FINN himself never executes.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type NxFinnState =
  | "idle"
  | "listening"
  | "thinking"
  | "retrieving"
  | "reasoning"
  | "speaking"
  | "executing"
  | "completed"
  | "error"
  | "offline";

export const FINN_STATE_LABEL: Record<NxFinnState, string> = {
  idle: "جاهز",
  listening: "يستمع",
  thinking: "يفكر…",
  retrieving: "يراجع المصادر",
  reasoning: "يرتب الاستدلال",
  speaking: "يتحدث",
  executing: "بانتظار التنفيذ المعتمد",
  completed: "اكتمل",
  error: "تعذّر الإكمال",
  offline: "غير متصل",
};

const RING_CLASS: Record<NxFinnState, string> = {
  idle: "border-nx-layer-agent/60 nx-anim-breathe",
  listening: "border-nx-layer-agent shadow-[var(--nx-glow-agent)] nx-anim-breathe",
  thinking: "border-nx-layer-agent/80",
  retrieving: "border-nx-layer-knowledge/80",
  reasoning: "border-nx-layer-agent/80",
  speaking: "border-nx-layer-agent shadow-[var(--nx-glow-agent)]",
  executing: "border-nx-gold/60 shadow-[var(--nx-glow-authority)]",
  completed: "border-nx-success/70",
  error: "border-nx-warning/60 opacity-[var(--nx-opacity-38)]",
  offline: "border-white/24 opacity-[var(--nx-opacity-24)]",
};

const THINKING_STATES: readonly NxFinnState[] = ["thinking", "retrieving", "reasoning"];

export interface NxFinnPresenceProps extends React.HTMLAttributes<HTMLDivElement> {
  state?: NxFinnState;
  /** Agent authority mode — always visible (constitution: mode glyph law). */
  mode?: "advisory" | "supervised" | "gated";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const SIZE_CLASS = { sm: "size-10", md: "size-14", lg: "size-20" } as const;
const MODE_GLYPH = { advisory: "💬", supervised: "👁", gated: "🔒" } as const;

export const NxFinnPresence = React.forwardRef<HTMLDivElement, NxFinnPresenceProps>(
  (
    { className, state = "idle", mode = "advisory", size = "md", showLabel = true, ...props },
    ref,
  ) => {
    const thinking = THINKING_STATES.includes(state);
    return (
      <div
        ref={ref}
        role="status"
        aria-label={`FINN: ${FINN_STATE_LABEL[state]}`}
        data-finn-state={state}
        className={cn("inline-flex flex-col items-center gap-2", className)}
        {...props}
      >
        <span className={cn("relative inline-flex items-center justify-center", SIZE_CLASS[size])}>
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-full border-2 transition-[border-color,box-shadow,opacity] duration-[var(--nx-anim-slow)] ease-[var(--nx-ease-out)]",
              RING_CLASS[state],
            )}
          />
          <span className="text-sm font-bold text-nx-pearl" aria-hidden>
            FINN
          </span>
          <span
            aria-hidden
            title={mode}
            className="absolute -bottom-1 -end-1 text-[10px] leading-none"
          >
            {MODE_GLYPH[mode]}
          </span>
        </span>
        {thinking ? (
          <span aria-hidden className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                data-nx-loop=""
                className="size-1.5 rounded-full bg-nx-layer-agent"
                style={{
                  animation: "nx-dot-wave var(--nx-loop-dots) var(--nx-ease-inout) infinite",
                  animationDelay: `${i * 200}ms`,
                }}
              />
            ))}
          </span>
        ) : null}
        {showLabel ? (
          <span className="text-xs text-nx-pearl/72">{FINN_STATE_LABEL[state]}</span>
        ) : null}
      </div>
    );
  },
);
NxFinnPresence.displayName = "NxFinnPresence";

/** NxWaveform — real-signal amplitude bars; never a canned fake waveform. */
export interface NxWaveformProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Amplitude levels 0..1, newest last (driven by the real audio signal). */
  levels: readonly number[];
  height?: number;
}

export const NxWaveform = React.forwardRef<HTMLDivElement, NxWaveformProps>(
  ({ className, levels, height = 24, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden
      className={cn("flex items-center gap-1", className)}
      style={{ height }}
      {...props}
    >
      {levels.map((level, i) => (
        <span
          key={i}
          className="w-[3px] rounded-nx-8 bg-nx-layer-agent transition-[height] duration-[var(--nx-anim-micro)] ease-[var(--nx-ease-out)]"
          style={{ height: Math.max(2, Math.min(1, level) * height) }}
        />
      ))}
    </div>
  ),
);
NxWaveform.displayName = "NxWaveform";
