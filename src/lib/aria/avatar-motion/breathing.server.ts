// Breathing — steady sinusoid, slower in idle, slightly faster while speaking.
import type { MotionState, MotionTick } from "./types";

export class BreathingEngine {
  private phase = 0;

  tick(tick: MotionTick, state: MotionState): number {
    const bpm =
      state === "speaking"
        ? 16
        : state === "thinking"
          ? 14
          : state === "warning" || state === "error"
            ? 18
            : state === "listening"
              ? 13
              : 12;
    const scale = tick.reducedMotion ? 0.5 : 1;
    this.phase += (tick.dtMs / 1000) * (bpm / 60) * Math.PI * 2;
    return (0.5 + 0.5 * Math.sin(this.phase)) * scale;
  }
}
