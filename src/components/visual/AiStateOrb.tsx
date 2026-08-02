/**
 * AiStateOrb — state-driven AI graphic for FINN.
 *
 * This is the interactive-intelligence layer. Rive is the intended runtime for
 * this slot, but no licensed .riv artboard exists in this project, so the orb
 * is authored as a state machine in SVG + Motion instead of shipping a
 * placeholder asset. The public contract (`state`) matches a Rive state
 * machine input, so swapping in a .riv later is a drop-in change.
 */
import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type AiOrbState = "idle" | "listening" | "thinking" | "speaking" | "processing";

const STATE = {
  idle: { scale: [1, 1.03, 1], dur: 5.2, ring: 0.35, spin: 26, bars: 0.25 },
  listening: { scale: [1, 1.07, 1], dur: 1.9, ring: 0.7, spin: 14, bars: 1 },
  thinking: { scale: [1, 1.02, 1], dur: 2.6, ring: 0.55, spin: 5, bars: 0.5 },
  speaking: { scale: [1, 1.1, 1], dur: 0.9, ring: 0.9, spin: 10, bars: 1 },
  processing: { scale: [1, 1.04, 1], dur: 1.4, ring: 0.8, spin: 3, bars: 0.7 },
} as const satisfies Record<AiOrbState, { scale: number[]; dur: number; ring: number; spin: number; bars: number }>;

export interface AiStateOrbProps {
  state?: AiOrbState;
  size?: number;
  className?: string;
  label?: string;
}

export function AiStateOrb({ state = "idle", size = 96, className, label }: AiStateOrbProps) {
  const reduce = useReducedMotion();
  const cfg = STATE[state];
  const bars = useMemo(() => [0.55, 0.85, 1, 0.75, 0.45], []);

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `FINN ${state}`}
      data-orb-state={state}
    >
      {/* ambient halo */}
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(6,182,212,.35), rgba(37,99,235,.16) 55%, transparent 72%)",
        }}
        animate={reduce ? undefined : { opacity: [cfg.ring * 0.6, cfg.ring, cfg.ring * 0.6] }}
        transition={{ duration: cfg.dur, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* rotating precision ring */}
      <motion.svg
        aria-hidden
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: cfg.spin, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="rgba(37,99,235,.45)"
          strokeWidth="1.2"
          strokeDasharray="6 10"
          strokeLinecap="round"
        />
        <circle cx="50" cy="6" r="2.4" fill="rgba(6,182,212,.95)" />
      </motion.svg>
      {/* core */}
      <motion.span
        aria-hidden
        className="relative rounded-full"
        style={{
          width: size * 0.56,
          height: size * 0.56,
          background:
            "radial-gradient(circle at 38% 32%, #ffffff, rgba(186,230,253,.95) 38%, rgba(37,99,235,.85) 100%)",
          boxShadow: "0 6px 24px rgba(37,99,235,.35), inset 0 1px 6px rgba(255,255,255,.9)",
        }}
        animate={reduce ? undefined : { scale: [...cfg.scale] }}
        transition={{ duration: cfg.dur, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* voice bars — only meaningful while listening / speaking */}
      <div className="absolute bottom-1 flex items-end gap-[3px]" aria-hidden>
        {bars.map((b, i) => (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-[rgba(6,182,212,.9)]"
            style={{ height: 4 }}
            animate={
              reduce
                ? { opacity: cfg.bars * 0.6 }
                : {
                    scaleY: [1, 1 + b * cfg.bars * 3.2, 1],
                    opacity: 0.35 + cfg.bars * 0.6,
                  }
            }
            transition={{
              duration: cfg.dur * 0.45,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.07,
            }}
          />
        ))}
      </div>
    </div>
  );
}
