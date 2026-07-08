// Expression — resolves canonical mood values from identity and holds them.
import { getExpression } from "../avatar-identity/expression-profile.server";
import type { MotionEmotion } from "./types";

export interface ExpressionSample {
  readonly browLift: number;
  readonly mouthCurve: number;
  readonly eyeOpenness: number;
  readonly headTiltDeg: number;
}

export class ExpressionEngine {
  private current: MotionEmotion = "confident";
  private sample: ExpressionSample = {
    browLift: 0.05,
    mouthCurve: 0.35,
    eyeOpenness: 0.85,
    headTiltDeg: 0,
  };

  set(emotion: MotionEmotion): void {
    if (this.current === emotion) return;
    this.current = emotion;
    const rule = getExpression(emotion);
    this.sample = {
      browLift: rule.brow_lift,
      mouthCurve: rule.mouth_curve,
      eyeOpenness: rule.eye_openness,
      headTiltDeg: rule.head_tilt_deg,
    };
  }

  get emotion(): MotionEmotion {
    return this.current;
  }
  get(): ExpressionSample {
    return this.sample;
  }
}
