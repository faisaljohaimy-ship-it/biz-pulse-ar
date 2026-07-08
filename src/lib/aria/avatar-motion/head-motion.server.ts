// Head motion — layered small yaw/pitch on top of idle sway.
import type { MotionState, MotionTick } from "./types";

export class HeadMotionEngine {
  private phase = 0;

  tick(tick: MotionTick, state: MotionState): { yaw: number; pitch: number } {
    const scale = tick.reducedMotion ? 0.3 : 1;
    const speed =
      state === "explaining" ? 0.9 : state === "speaking" ? 0.6 : state === "listening" ? 0.4 : 0.3;
    this.phase += (tick.dtMs / 1000) * speed;
    const yaw = Math.sin(this.phase * 0.7) * 0.08 * scale;
    const pitch = Math.sin(this.phase * 0.5 + 1.1) * 0.05 * scale;
    return { yaw, pitch };
  }
}
