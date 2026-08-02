/**
 * SADEED Motion Presets — the single source of truth for the Motion layer.
 * Spring physics only (no duration-based easing) so every interaction shares
 * the same physical character across the operating system.
 */
import type { Transition, Variants } from "motion/react";

/** Executive spring: fast settle, no visible overshoot wobble. */
export const springExec: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 };

/** Soft spring for surfaces (cards, panels, sheets). */
export const springSurface: Transition = { type: "spring", stiffness: 260, damping: 28, mass: 1 };

/** Snappy spring for pressable controls. */
export const springPress: Transition = { type: "spring", stiffness: 620, damping: 26, mass: 0.6 };

/** Cinematic glide for large layout moves. */
export const glide: Transition = { duration: 0.55, ease: [0.16, 1, 0.3, 1] };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: springSurface },
};

export const staggerParent = (stagger = 0.05, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/** Standard hover contract: 3px lift, subtle depth gain. */
export const hoverLift = { y: -3, scale: 1.012, transition: springSurface } as const;
export const pressDown = { scale: 0.985, transition: springPress } as const;

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: glide },
  exit: { opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.22 } },
};
