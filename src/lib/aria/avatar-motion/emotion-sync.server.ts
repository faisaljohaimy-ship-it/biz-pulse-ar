// Emotion sync — maps motion state + optional cue to a canonical emotion.
import type { EmotionCue, MotionEmotion, MotionState } from "./types";
import { ExpressionEngine } from "./expression.server";

const STATE_TO_EMOTION: Record<MotionState, MotionEmotion> = {
  idle: "confident",
  greeting: "warm",
  listening: "focused",
  thinking: "focused",
  speaking: "confident",
  explaining: "confident",
  interrupted: "alert",
  warning: "alert",
  success: "warm",
  error: "alert",
};

export class EmotionSync {
  private lastCue: EmotionCue | null = null;
  private cueUntil = 0;

  constructor(private readonly expression: ExpressionEngine) {}

  applyCue(cue: EmotionCue): void {
    this.lastCue = cue;
    this.cueUntil = cue.ts + 2000;
    this.expression.set(cue.emotion);
  }

  syncTo(state: MotionState, nowMs: number): void {
    if (this.lastCue && nowMs < this.cueUntil) return;
    this.expression.set(STATE_TO_EMOTION[state]);
  }
}
