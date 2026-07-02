// Idle Motion Engine — very small head + gesture drift so ARIA is never frozen.
// Layered on top of Eye Contact / Gesture channels through additive nudges.

import type { HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";

export class IdleMotionEngine {
  private reduced = false;
  constructor(private readonly sync: HeroStateSynchronizer) {}

  setReducedMotion(r: boolean): void { this.reduced = r; }

  tick(tick: HeroTick): void {
    const s = this.sync.get();
    if (s.presence !== "idle" && s.presence !== "welcome") return;
    if (this.reduced) return;
    // Tiny body-balance sway (adds < 3% to head channel).
    const sway = Math.sin(tick.t / 2600) * 0.012;
    const nod = Math.sin(tick.t / 3300) * 0.008;
    this.sync.patch({
      head: { x: s.head.x + sway, y: s.head.y + nod },
      // Finger/hand micro rest motion — held to 4% of gesture channel.
      gesture: Math.max(s.gesture, 0.02 + Math.abs(Math.sin(tick.t / 2900)) * 0.03),
    });
  }
}
