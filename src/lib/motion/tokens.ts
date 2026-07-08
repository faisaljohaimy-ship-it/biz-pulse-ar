/**
 * Motion design tokens — Wave 5 published early so executive components
 * share one physics + easing language. Values map to Framer-Motion-compatible
 * shapes but are pure data and have no runtime dependency on framer-motion,
 * so they can be consumed by CSS classes or any animation library.
 */

export const SPRING = {
  /** Snap into place — buttons, hover lifts. */
  snap: { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.7 },
  /** Glide — panel reveals, layout transitions. */
  glide: { type: "spring" as const, stiffness: 180, damping: 26, mass: 0.9 },
  /** Float — ambient drift, KPI tile entrance. */
  float: { type: "spring" as const, stiffness: 90, damping: 18, mass: 1.1 },
} as const;

export const EASE = {
  /** Standard executive ease — for opacity, color, blur. */
  standard: [0.4, 0, 0.2, 1] as const,
  /** Decelerate — for content entering the screen. */
  out: [0.16, 1, 0.3, 1] as const,
  /** Accelerate — for content leaving the screen. */
  in: [0.7, 0, 0.84, 0] as const,
} as const;

export const DURATION = {
  micro: 0.12,
  fast: 0.2,
  base: 0.32,
  slow: 0.6,
  ambient: 6,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
