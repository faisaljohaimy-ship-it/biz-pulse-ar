import type { HeroListeningDirective, HeroState } from "./types";

export function computeListening(state: HeroState, voiceLevel = 0): HeroListeningDirective {
  if (state !== "listening") return { active: false, pulseHz: 0, pulseIntensity: 0 };
  const v = Math.max(0, Math.min(1, voiceLevel));
  return { active: true, pulseHz: 1.4, pulseIntensity: 0.35 + v * 0.5 };
}
