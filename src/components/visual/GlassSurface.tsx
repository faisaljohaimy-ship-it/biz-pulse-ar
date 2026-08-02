/**
 * GlassSurface — the Hover Engine + Glass Engine in one primitive.
 *
 * Combines: 3px spring lift, pointer-tracked specular highlight, edge
 * illumination, light sweep and depth gain. Motion is transform/opacity only
 * (GPU) and fully disabled under prefers-reduced-motion.
 */
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { ReactNode } from "react";
import { hoverLift, pressDown, springSurface } from "@/lib/visual/motion-presets";
import { cn } from "@/lib/utils";

export interface GlassSurfaceProps {
  children: ReactNode;
  className?: string;
  /** rgb triplet for the edge/specular accent, e.g. "34, 211, 238" */
  accent?: string;
  /** disable the lift (for surfaces that are not interactive) */
  interactive?: boolean;
  onClick?: () => void;
}

export function GlassSurface({
  children,
  className,
  accent = "34, 211, 238",
  interactive = true,
  onClick,
}: GlassSurfaceProps) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const sx = useSpring(mx, { stiffness: 220, damping: 30 });
  const sy = useSpring(my, { stiffness: 220, damping: 30 });

  return (
    <motion.div
      onClick={onClick}
      onPointerMove={(e) => {
        if (reduce || !interactive) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 100);
        my.set(((e.clientY - r.top) / r.height) * 100);
      }}
      whileHover={interactive && !reduce ? hoverLift : undefined}
      whileTap={interactive && !reduce ? pressDown : undefined}
      transition={springSurface}
      style={{
        ["--gs-accent" as string]: accent,
        ["--gs-x" as string]: sx as unknown as string,
        ["--gs-y" as string]: sy as unknown as string,
      }}
      className={cn("sd-glass-surface relative isolate overflow-hidden", className)}
    >
      <span aria-hidden className="sd-glass-specular" />
      <span aria-hidden className="sd-glass-sweep" />
      {children}
    </motion.div>
  );
}
