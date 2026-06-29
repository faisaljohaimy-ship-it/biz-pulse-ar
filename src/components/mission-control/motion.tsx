/**
 * Executive Motion Primitives — Mission Control vocabulary.
 *
 * Tiny, reusable Framer Motion wrappers used across the Executive Command Center.
 * All primitives honor `prefers-reduced-motion` (Phase 11) and use design tokens —
 * never hardcoded colors. Pure presentation; zero business logic.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ── FadeIn ────────────────────────────────────────────────── */
export function FadeIn({
  children,
  delay = 0,
  y = 8,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 0.8, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── SlidePanel ────────────────────────────────────────────── */
export function SlidePanel({
  children,
  from = "right",
  className,
}: {
  children: ReactNode;
  from?: "right" | "left" | "top" | "bottom";
  className?: string;
}) {
  const reduced = useReducedMotion();
  const offset = { x: 0, y: 0 } as { x: number; y: number };
  if (from === "right") offset.x = 32;
  if (from === "left") offset.x = -32;
  if (from === "top") offset.y = -32;
  if (from === "bottom") offset.y = 32;
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...offset }}
      transition={{ duration: 0.5, ease: [0.22, 0.8, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── PulseOnChange ─────────────────────────────────────────── */
/** Adds a quick cyan glow pulse to children whenever `value` changes. */
export function PulseOnChange({
  value,
  children,
  className,
}: {
  value: string | number | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [pulse, setPulse] = useState(0);
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current !== value) {
      previous.current = value;
      setPulse((p) => p + 1);
    }
  }, [value]);
  return (
    <motion.div
      key={pulse}
      initial={reduced ? false : { boxShadow: "0 0 0 0 rgba(0,212,255,0.55)" }}
      animate={{ boxShadow: "0 0 0 0 rgba(0,212,255,0)" }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className={cn("rounded-[inherit]", className)}
    >
      {children}
    </motion.div>
  );
}

/* ── NumberFlow ───────────────────────────────────────────── */
/** Animates a numeric value smoothly to its new target. */
export function NumberFlow({
  value,
  duration = 0.8,
  format = (n) => Math.round(n).toLocaleString(),
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const startValue = from.current;
    const delta = value - startValue;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(startValue + delta * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);
  return <span className={cn("tabular-nums", className)}>{format(display)}</span>;
}

/* ── StatusRing ───────────────────────────────────────────── */
/**
 * Animated agent status ring — Phase 2 vocabulary.
 *  active        → solid cyan
 *  thinking      → rotating gradient
 *  waiting       → soft pulse
 *  collaborating → rotating violet
 *  error         → rose pulse
 *  idle          → static dim
 */
export type AgentState = "active" | "thinking" | "waiting" | "collaborating" | "error" | "idle";

const RING_TONE: Record<AgentState, string> = {
  active: "from-emerald-400/80 to-cyan-300/80",
  thinking: "from-amber-300/80 to-cyan-300/80",
  waiting: "from-sky-300/60 to-cyan-200/60",
  collaborating: "from-violet-300/80 to-cyan-300/80",
  error: "from-rose-400/90 to-amber-300/70",
  idle: "from-slate-400/30 to-slate-200/20",
};

export function StatusRing({
  state,
  size = 44,
  children,
}: {
  state: AgentState;
  size?: number;
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const spinning = state === "thinking" || state === "collaborating";
  const pulsing = state === "waiting" || state === "error";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <motion.span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full bg-gradient-to-tr",
          RING_TONE[state],
        )}
        style={{ padding: 2, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }}
        animate={
          reduced
            ? undefined
            : spinning
            ? { rotate: 360 }
            : pulsing
            ? { opacity: [0.55, 1, 0.55] }
            : { opacity: 1 }
        }
        transition={
          spinning
            ? { repeat: Infinity, duration: 2.4, ease: "linear" }
            : pulsing
            ? { repeat: Infinity, duration: 1.6, ease: "easeInOut" }
            : { duration: 0.3 }
        }
      />
      <div className="relative z-10 grid place-items-center text-[11px] font-semibold text-white/90">
        {children}
      </div>
    </div>
  );
}

/* ── ChevronConnector ─────────────────────────────────────── */
export function ChevronConnector({ active = false }: { active?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="mx-auto h-6 w-px bg-gradient-to-b from-cyan-300/60 to-transparent"
      animate={reduced || !active ? { opacity: 0.5 } : { opacity: [0.3, 1, 0.3] }}
      transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
    />
  );
}

/* Re-export common motion utilities for downstream rounds. */
export { AnimatePresence, motion, useReducedMotion };
