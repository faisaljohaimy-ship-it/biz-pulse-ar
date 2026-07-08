// Blink Engine — natural random blinks with occasional double-blink pairs.
// Uses a fast triangular envelope (~140ms). Fully paused in reduced-motion.

import type { HeroTick } from "./types";
import type { HeroStateSynchronizer } from "./state-synchronizer";

const OPEN_MS = 2600;
const OPEN_JITTER = 3800;
const BLINK_MS = 140;

export class BlinkEngine {
  private nextAt = 0;
  private blinkStart = -1;
  private doubleQueued = false;
  private reduced = false;

  constructor(private readonly sync: HeroStateSynchronizer) {}

  setReducedMotion(r: boolean): void {
    this.reduced = r;
  }

  tick(tick: HeroTick): void {
    if (this.reduced) {
      this.sync.patch({ blink: 0 });
      return;
    }
    if (this.nextAt === 0) this.nextAt = tick.t + OPEN_MS + Math.random() * OPEN_JITTER;
    if (this.blinkStart < 0 && tick.t >= this.nextAt) {
      this.blinkStart = tick.t;
      // ~15% chance of a double-blink
      this.doubleQueued = Math.random() < 0.15;
    }
    let v = 0;
    if (this.blinkStart >= 0) {
      const dt = tick.t - this.blinkStart;
      if (dt < BLINK_MS) {
        // triangular open→closed→open envelope
        const half = BLINK_MS / 2;
        v = dt < half ? dt / half : 1 - (dt - half) / half;
      } else {
        this.blinkStart = -1;
        if (this.doubleQueued) {
          this.doubleQueued = false;
          this.nextAt = tick.t + 90; // quick second blink
        } else {
          this.nextAt = tick.t + OPEN_MS + Math.random() * OPEN_JITTER;
        }
      }
    }
    this.sync.patch({ blink: v });
  }
}
