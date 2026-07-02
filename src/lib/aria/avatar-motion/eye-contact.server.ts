// Eye contact — biases gaze toward target, occasional soft look-away.
import type { MotionState, MotionTick } from "./types";

export class EyeContactEngine {
  private gazeX = 0;
  private gazeY = 0;
  private awayUntil = 0;
  private targetX = 0;
  private targetY = 0;

  setTarget(x: number, y: number): void {
    this.targetX = Math.max(-1, Math.min(1, x));
    this.targetY = Math.max(-1, Math.min(1, y));
  }

  tick(tick: MotionTick, state: MotionState): { gazeX: number; gazeY: number } {
    if (tick.nowMs > this.awayUntil && Math.random() < 0.0015) {
      this.awayUntil = tick.nowMs + 500 + Math.random() * 700;
    }
    const away = tick.nowMs < this.awayUntil;
    const tx = away ? 0.15 : this.targetX;
    const ty = away ? 0.05 : this.targetY;
    const attention = state === "listening" ? 0.25 : state === "speaking" ? 0.18 : 0.12;
    const speed = tick.reducedMotion ? attention * 0.4 : attention;
    this.gazeX += (tx - this.gazeX) * speed;
    this.gazeY += (ty - this.gazeY) * speed;
    return { gazeX: this.gazeX, gazeY: this.gazeY };
  }
}
