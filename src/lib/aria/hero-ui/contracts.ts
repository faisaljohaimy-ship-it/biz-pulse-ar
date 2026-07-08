// Phase 11.8 — Hero UI invariants.
import type {
  HeroPresenceDirective,
  HeroEntranceDirective,
  HeroCaptionDirective,
  HeroCameraDirective,
  HeroParticleDirective,
  HeroPerformanceBudget,
} from "./types";

export const HERO_CONTRACTS = {
  MAX_PARTICLES_MOBILE: 24,
  MAX_PARTICLES_DESKTOP: 80,
  MIN_TARGET_FPS: 60,
  MAX_BACKDROP_BLUR_PX: 40,
  CAPTION_MIN_FADE_MS: 120,
  CAPTION_MAX_FADE_MS: 480,
  ENTRANCE_MAX_MS: 1600,
} as const;

export function assertPresence(p: HeroPresenceDirective): void {
  if (p.presenceOpacity < 0 || p.presenceOpacity > 1)
    throw new Error("presenceOpacity out of range");
}
export function assertEntrance(e: HeroEntranceDirective): void {
  if (e.progress < 0 || e.progress > 1) throw new Error("entrance progress out of range");
  if (e.durationMs > HERO_CONTRACTS.ENTRANCE_MAX_MS) throw new Error("entrance too long");
}
export function assertCaption(c: HeroCaptionDirective): void {
  if (
    c.fadeMs < HERO_CONTRACTS.CAPTION_MIN_FADE_MS ||
    c.fadeMs > HERO_CONTRACTS.CAPTION_MAX_FADE_MS
  ) {
    throw new Error("caption fade out of range");
  }
  if (c.language === "ar" && c.dir !== "rtl") throw new Error("Arabic must be RTL");
  if (c.language === "en" && c.dir !== "ltr") throw new Error("English must be LTR");
}
export function assertCamera(c: HeroCameraDirective): void {
  if (c.zoom < 0.9 || c.zoom > 1.1) throw new Error("camera zoom out of executive range");
}
export function assertParticles(p: HeroParticleDirective, budget: HeroPerformanceBudget): void {
  if (p.count > budget.maxParticles) throw new Error("particle count exceeds budget");
}
