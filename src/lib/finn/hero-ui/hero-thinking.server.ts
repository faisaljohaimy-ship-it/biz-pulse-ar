import type { HeroThinkingDirective, HeroState } from "./types";

export function computeThinking(state: HeroState): HeroThinkingDirective {
  if (state !== "thinking") return { active: false, haloIntensity: 0, ringSpeed: 0 };
  return { active: true, haloIntensity: 0.6, ringSpeed: 0.35 };
}
