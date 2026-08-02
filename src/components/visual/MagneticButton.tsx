/**
 * MagneticButton — premium press physics for the Motion layer.
 * The control drifts toward the cursor (magnetic response), reflects light on
 * hover and compresses on press. Reduced motion collapses it to a plain button.
 */
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { springExec, springPress } from "@/lib/visual/motion-presets";
import { cn } from "@/lib/utils";

export interface MagneticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** magnetic travel in px */
  strength?: number;
  accent?: string;
}

export function MagneticButton({
  children,
  className,
  strength = 6,
  accent = "34, 211, 238",
  ...rest
}: MagneticButtonProps) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 320, damping: 22 });
  const sy = useSpring(y, { stiffness: 320, damping: 22 });

  return (
    <motion.button
      {...(rest as Record<string, unknown>)}
      style={{ x: reduce ? 0 : sx, y: reduce ? 0 : sy, ["--gs-accent" as string]: accent }}
      onPointerMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set(((e.clientX - r.left) / r.width - 0.5) * strength * 2);
        y.set(((e.clientY - r.top) / r.height - 0.5) * strength * 2);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileHover={reduce ? undefined : { scale: 1.03, transition: springExec }}
      whileTap={reduce ? undefined : { scale: 0.96, transition: springPress }}
      className={cn("sd-magnetic relative isolate overflow-hidden", className)}
    >
      <span aria-hidden className="sd-glass-sweep" />
      {children}
    </motion.button>
  );
}
