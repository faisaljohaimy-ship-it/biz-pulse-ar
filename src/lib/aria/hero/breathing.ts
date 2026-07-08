// Breathing Engine — smooth chest/shoulder expansion driven by a slow sine.
// Rate accelerates slightly under "attentive" or "focused" emotion.

import type { HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";

export class BreathingEngine {
  private reduced = false;
  constructor(private readonly sync: HeroStateSynchronizer) {}

  setReducedMotion(r: boolean): void {
    this.reduced = r;
  }

  tick(tick: HeroTick): void {
    if (this.reduced) {
      this.sync.patch({ breath: 0.15 });
      return;
    }
    const emotion = this.sync.get().emotion;
    const period = emotion === "attentive" || emotion === "focused" ? 3400 : 4200;
    // 0..1 with a rest bias so idle never fully collapses
    const s = 0.5 + Math.sin((tick.t / period) * (Math.PI * 2)) * 0.5;
    this.sync.patch({ breath: 0.25 + s * 0.55 });
  }
}
