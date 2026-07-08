// Hand gesture — spring envelope for canonical Phase 11.2 gestures.
import { getGesture, getDefaultGesture } from "../avatar-identity/gesture-profile.server";
import type { MotionTick } from "./types";

type Phase = "hold" | "release" | "idle";

export class HandGestureEngine {
  private phase: Phase = "idle";
  private amplitude = 0;
  private elapsed = 0;
  private id: string | null = null;
  private holdMs = 0;
  private releaseMs = 0;
  private target = 0;

  trigger(gestureId: string): void {
    const rule = gestureId === "default" ? getDefaultGesture() : getGesture(gestureId as never);
    this.id = rule.id;
    this.target = rule.amplitude;
    this.holdMs = rule.hold_ms;
    this.releaseMs = rule.release_ms;
    this.phase = "hold";
    this.elapsed = 0;
  }

  cancel(): void {
    this.phase = "release";
    this.releaseMs = 250;
    this.elapsed = 0;
  }

  tick(tick: MotionTick): { amplitude: number; id: string | null } {
    if (this.phase === "idle") return { amplitude: 0, id: null };
    this.elapsed += tick.dtMs;
    const scale = tick.reducedMotion ? 0.5 : 1;
    if (this.phase === "hold") {
      const t = Math.min(1, this.elapsed / Math.max(1, this.holdMs));
      // ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      this.amplitude = this.target * eased * scale;
      if (t >= 1) {
        this.phase = "release";
        this.elapsed = 0;
      }
    } else {
      const t = Math.min(1, this.elapsed / Math.max(1, this.releaseMs));
      this.amplitude = this.target * (1 - t) * scale;
      if (t >= 1) {
        this.phase = "idle";
        this.id = null;
        this.amplitude = 0;
      }
    }
    return { amplitude: this.amplitude, id: this.id };
  }
}
