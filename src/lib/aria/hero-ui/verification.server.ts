import type { HeroFrame } from "./hero-runtime.server";
import { HERO_CONTRACTS } from "./contracts";

export interface HeroVerification {
  readonly ok: boolean;
  readonly violations: readonly string[];
  readonly checkedAt: number;
}

export function verifyHeroFrame(frame: HeroFrame): HeroVerification {
  const v: string[] = [];
  if (frame.presence.presenceOpacity < 0 || frame.presence.presenceOpacity > 1) v.push("presence out of range");
  if (frame.entrance.progress < 0 || frame.entrance.progress > 1) v.push("entrance out of range");
  if (frame.particles.count > frame.budget.maxParticles) v.push("particle budget exceeded");
  if (frame.camera.zoom < 0.9 || frame.camera.zoom > 1.1) v.push("camera zoom out of executive range");
  if (frame.caption.language === "ar" && frame.caption.dir !== "rtl") v.push("Arabic caption not RTL");
  if (frame.caption.language === "en" && frame.caption.dir !== "ltr") v.push("English caption not LTR");
  if (frame.depth.blurBackgroundPx > HERO_CONTRACTS.MAX_BACKDROP_BLUR_PX) v.push("background blur exceeds budget");
  if (frame.tick.fps > 0 && frame.tick.fps < 30) v.push("frame under 30fps");
  return { ok: v.length === 0, violations: v, checkedAt: Date.now() };
}
