// Thinking Animation Engine — ambient halo + slow drift while presence=thinking.
// Never blocks UI. Zero-cost when inactive.

import type { HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";

export class ThinkingAnimationEngine {
  private reduced = false;
  constructor(private readonly sync: HeroStateSynchronizer) {}

  setReducedMotion(r: boolean): void {
    this.reduced = r;
  }

  tick(tick: HeroTick): void {
    const s = this.sync.get();
    if (s.presence !== "thinking") {
      if (s.thinkingHalo > 0) this.sync.patch({ thinkingHalo: s.thinkingHalo * 0.85 });
      return;
    }
    if (this.reduced) {
      this.sync.patch({ thinkingHalo: 0.35 });
      return;
    }
    // Slow, calm sinusoid — never a "loading spinner" vibe.
    const halo = 0.35 + (Math.sin(tick.t / 900) + 1) * 0.5 * 0.35;
    this.sync.patch({ thinkingHalo: halo });
  }
}
