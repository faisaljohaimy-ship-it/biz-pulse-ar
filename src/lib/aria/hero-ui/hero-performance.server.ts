import type { HeroEnvironment, HeroPerformanceBudget } from "./types";
import { HERO_CONTRACTS } from "./contracts";

export function computePerformanceBudget(env: HeroEnvironment): HeroPerformanceBudget {
  const mobile = env.device === "mobile";
  const reduced = env.motion === "reduced";
  return {
    targetFps: HERO_CONTRACTS.MIN_TARGET_FPS,
    maxParticles: reduced
      ? 0
      : mobile
        ? HERO_CONTRACTS.MAX_PARTICLES_MOBILE
        : HERO_CONTRACTS.MAX_PARTICLES_DESKTOP,
    maxBackdropBlurPx: mobile ? 20 : HERO_CONTRACTS.MAX_BACKDROP_BLUR_PX,
    allowAurora: !reduced,
    allowParticles: !reduced,
  };
}

const FPS = new Map<string, number[]>();
export function noteFrame(id: string, fps: number): void {
  const arr = FPS.get(id) ?? [];
  arr.push(fps);
  if (arr.length > 120) arr.shift();
  FPS.set(id, arr);
}
export function averageFps(id: string): number | null {
  const arr = FPS.get(id);
  if (!arr || arr.length === 0) return null;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}
