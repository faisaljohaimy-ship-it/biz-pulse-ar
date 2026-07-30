// Listening Animation Engine — ring pulse when presence=listening.
// Interruption-safe: decays to 0 on presence change.

import type { HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";

export class ListeningAnimationEngine {
  private reduced = false;
  constructor(private readonly sync: HeroStateSynchronizer) {}

  setReducedMotion(r: boolean): void {
    this.reduced = r;
  }

  tick(tick: HeroTick): void {
    const s = this.sync.get();
    if (s.presence !== "listening") {
      if (s.listeningRing > 0) this.sync.patch({ listeningRing: s.listeningRing * 0.8 });
      return;
    }
    if (this.reduced) {
      this.sync.patch({ listeningRing: 0.4 });
      return;
    }
    const v = 0.4 + (Math.sin(tick.t / 480) + 1) * 0.5 * 0.5;
    this.sync.patch({ listeningRing: v });
  }
}
