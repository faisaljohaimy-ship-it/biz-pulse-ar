// Idle motion — subtle body-balance sway, never freezes.
import type { MotionTick } from "./types";

export class IdleEngine {
  private phase = 0;
  tick(tick: MotionTick): { headYaw: number; headPitch: number } {
    const scale = tick.reducedMotion ? 0.25 : 1;
    this.phase += (tick.dtMs / 1000) * 0.35;
    const yaw = Math.sin(this.phase) * 0.05 * scale;
    const pitch = Math.sin(this.phase * 0.6) * 0.03 * scale;
    return { headYaw: yaw, headPitch: pitch };
  }
  reset(): void {
    this.phase = 0;
  }
}
