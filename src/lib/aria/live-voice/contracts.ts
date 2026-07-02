import { z } from "zod";

export const VoiceLangSchema = z.enum(["ar", "en", "unknown"]);
export const AudioStateSchema = z.enum([
  "idle","listening","capturing","transcribing","thinking",
  "speaking","interrupted","error",
]);

export const SttResultSchema = z.object({
  text: z.string(),
  lang: VoiceLangSchema,
  confidence: z.number().min(0).max(1),
  durationMs: z.number().nonnegative(),
});

export const TtsChunkSchema = z.object({
  seq: z.number().int().nonnegative(),
  base64: z.string(),
  mime: z.string().min(1),
  final: z.boolean(),
});

export const TtsRequestSchema = z.object({
  text: z.string().min(1).max(4000),
  lang: VoiceLangSchema,
  voice: z.string().optional(),
  speed: z.number().min(0.5).max(2).optional(),
});

export const VadFrameSchema = z.object({
  rms: z.number().min(0).max(1),
  ts: z.number().int().nonnegative(),
});
