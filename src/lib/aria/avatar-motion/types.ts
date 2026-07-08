// Phase 11.3 — ARIA Avatar Motion types.
// Strictly additive. Consumes Phase 11.2 identity, never modifies it.

export type MotionState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "greeting"
  | "explaining"
  | "warning"
  | "success"
  | "error";

export type MotionEmotion = "confident" | "warm" | "focused" | "alert";

export interface MotionSample {
  readonly state: MotionState;
  readonly emotion: MotionEmotion;
  readonly breath: number; // 0..1
  readonly blink: number; // 0..1 (1 = fully closed)
  readonly gazeX: number; // -1..1
  readonly gazeY: number; // -1..1
  readonly headYaw: number; // -1..1
  readonly headPitch: number; // -1..1
  readonly gesture: number; // 0..1
  readonly gestureId: string | null;
  readonly lip: number; // 0..1
  readonly glow: number; // 0..1
  readonly ts: number;
}

export interface MotionTick {
  readonly nowMs: number;
  readonly dtMs: number;
  readonly reducedMotion: boolean;
}

export interface SpeechChunkInput {
  readonly turnId: string;
  readonly seq: number;
  readonly text: string;
  readonly durationMs: number;
  readonly amplitude?: number; // 0..1 average
}

export interface EmotionCue {
  readonly emotion: MotionEmotion;
  readonly intensity: number; // 0..1
  readonly ts: number;
}
