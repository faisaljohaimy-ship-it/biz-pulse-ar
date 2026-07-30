// Deterministic blink scheduler with natural intervals (3–6 s).
import type { MotionTick } from "./types";

export class BlinkEngine {
  private nextAt = 3000;
  private closing = false;
  private progress = 0;

  tick(tick: MotionTick): number {
    if (tick.reducedMotion) return 0;
    const t = tick.nowMs;
    if (!this.closing && t >= this.nextAt) {
      this.closing = true;
      this.progress = 0;
    }
    if (this.closing) {
      this.progress += tick.dtMs / 120; // ~120 ms full blink
      if (this.progress >= 1) {
        this.closing = false;
        this.progress = 0;
        this.nextAt = t + 3000 + Math.random() * 3000;
        return 0;
      }
      // triangle: 0→1→0
      return this.progress < 0.5 ? this.progress * 2 : (1 - this.progress) * 2;
    }
    return 0;
  }
}
