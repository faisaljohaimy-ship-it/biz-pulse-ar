// Expression Engine — modulates subtle facial + body cues based on emotion.
// Emits patches through the synchronizer; deterministic, allocation-free.

import type { Emotion, ExpressionIntensity, HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";

interface Profile {
  readonly glowBase: number;
  readonly headSway: number;
  readonly intensity: ExpressionIntensity;
}

const PROFILES: Record<Emotion, Profile> = {
  neutral: { glowBase: 0.18, headSway: 0.04, intensity: "subtle" },
  attentive: { glowBase: 0.32, headSway: 0.06, intensity: "gentle" },
  warm: { glowBase: 0.42, headSway: 0.05, intensity: "gentle" },
  focused: { glowBase: 0.28, headSway: 0.03, intensity: "subtle" },
  concerned: { glowBase: 0.24, headSway: 0.08, intensity: "gentle" },
  confident: { glowBase: 0.38, headSway: 0.05, intensity: "assertive" },
};

export class ExpressionEngine {
  constructor(private readonly sync: HeroStateSynchronizer) {}

  tick(tick: HeroTick): void {
    const s = this.sync.get();
    const p = PROFILES[s.emotion];
    // Very gentle sinusoidal glow modulation — never pulses like a game HUD.
    const glow = p.glowBase + Math.sin(tick.t / 2200) * 0.04;
    this.sync.patch({ glow });
  }
}
