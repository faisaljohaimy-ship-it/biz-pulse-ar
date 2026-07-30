import type { HeroSpeakingDirective, HeroState } from "./types";

export function computeSpeaking(state: HeroState, lipAmplitude = 0): HeroSpeakingDirective {
  if (state !== "speaking") return { active: false, lipAmplitude: 0, gestureBias: 0 };
  const amp = Math.max(0, Math.min(1, lipAmplitude));
  return { active: true, lipAmplitude: amp, gestureBias: amp > 0.6 ? 0.3 : 0 };
}
