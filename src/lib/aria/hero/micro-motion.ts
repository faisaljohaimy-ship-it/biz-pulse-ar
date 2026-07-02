// Micro Motion System — small deterministic perturbations layered on top of
// idle/gesture channels to add human "unrest". Everything below ±3%.

import type { HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";

export class MicroMotionSystem {
  private reduced = false;
  constructor(private readonly sync: HeroStateSynchronizer) {}

  setReducedMotion(r: boolean): void { this.reduced = r; }

  tick(tick: HeroTick): void {
    if (this.reduced) return;
    const s = this.sync.get();
    // Only add micro-motion during calm presence modes.
    if (s.presence === "speaking") return;
    const jitterX = Math.sin(tick.t / 1450) * 0.006 + Math.sin(tick.t / 730) * 0.003;
    const jitterY = Math.cos(tick.t / 1700) * 0.005;
    this.sync.patch({
      head: { x: s.head.x + jitterX, y: s.head.y + jitterY },
    });
  }
}
