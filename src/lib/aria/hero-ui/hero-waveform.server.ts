import type { HeroWaveformDirective, HeroState } from "./types";

export function computeWaveform(state: HeroState, amplitude = 0): HeroWaveformDirective {
  const active = state === "speaking" || state === "listening";
  const amp = active ? Math.max(0, Math.min(1, amplitude)) : 0;
  return { active, amplitude: amp, bars: 32, smoothing: 0.6 };
}
