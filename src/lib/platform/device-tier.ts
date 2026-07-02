/**
 * Device capability tier — feature-detected, additive.
 * The full experience runs everywhere; only density scales.
 */
export type DeviceTier = "HIGH" | "MID" | "LOW";

interface NavigatorEx extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
}

export function detectDeviceTier(): DeviceTier {
  if (typeof window === "undefined") return "MID";
  const n = navigator as NavigatorEx;
  const cores = n.hardwareConcurrency ?? 4;
  const mem = n.deviceMemory ?? 4;
  const saveData = n.connection?.saveData === true;
  const slowNet = n.connection?.effectiveType === "2g" || n.connection?.effectiveType === "slow-2g";
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const smallViewport = Math.min(window.innerWidth, window.innerHeight) < 640;

  if (saveData || slowNet || cores <= 4 || mem <= 4) return "LOW";
  if (coarse || smallViewport || cores <= 8 || mem <= 8) return "MID";
  return "HIGH";
}

export interface TierProfile {
  tier: DeviceTier;
  particles: number;   // background particle count
  parallax: 1 | 0.5 | 0;
  grain: boolean;
  blurPx: number;      // recommended backdrop blur radius
}

export function tierProfile(t: DeviceTier = detectDeviceTier()): TierProfile {
  switch (t) {
    case "HIGH": return { tier: t, particles: 200, parallax: 1,   grain: true,  blurPx: 24 };
    case "MID":  return { tier: t, particles: 120, parallax: 0.5, grain: true,  blurPx: 16 };
    case "LOW":  return { tier: t, particles: 60,  parallax: 0,   grain: false, blurPx: 10 };
  }
}
