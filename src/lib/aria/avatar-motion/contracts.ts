// Zod contracts for Phase 11.3 motion inputs.
import { z } from "zod";

export const MotionStateSchema = z.enum([
  "idle",
  "listening",
  "thinking",
  "speaking",
  "interrupted",
  "greeting",
  "explaining",
  "warning",
  "success",
  "error",
]);

export const MotionEmotionSchema = z.enum(["confident", "warm", "focused", "alert"]);

export const MotionSampleSchema = z.object({
  state: MotionStateSchema,
  emotion: MotionEmotionSchema,
  breath: z.number().min(0).max(1),
  blink: z.number().min(0).max(1),
  gazeX: z.number().min(-1).max(1),
  gazeY: z.number().min(-1).max(1),
  headYaw: z.number().min(-1).max(1),
  headPitch: z.number().min(-1).max(1),
  gesture: z.number().min(0).max(1),
  gestureId: z.string().nullable(),
  lip: z.number().min(0).max(1),
  glow: z.number().min(0).max(1),
  ts: z.number().int().nonnegative(),
});

export const MotionTickSchema = z.object({
  nowMs: z.number().nonnegative(),
  dtMs: z.number().nonnegative(),
  reducedMotion: z.boolean(),
});

export const SpeechChunkInputSchema = z.object({
  turnId: z.string().min(1),
  seq: z.number().int().nonnegative(),
  text: z.string(),
  durationMs: z.number().nonnegative(),
  amplitude: z.number().min(0).max(1).optional(),
});

export const EmotionCueSchema = z.object({
  emotion: MotionEmotionSchema,
  intensity: z.number().min(0).max(1),
  ts: z.number().int().nonnegative(),
});
