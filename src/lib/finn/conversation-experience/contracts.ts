// Zod contracts for Phase 11.1 Human Conversation Engine.
import { z } from "zod";

export const LangSchema = z.enum(["ar", "en"]);
export const ConversationStateSchema = z.enum([
  "idle",
  "greeting",
  "listening",
  "thinking",
  "speaking",
  "interrupted",
  "resuming",
]);
export const ConfidenceSchema = z.enum(["unknown", "low", "medium", "high"]);

export const EvidenceRefSchema = z.object({
  kind: z.string().min(1),
  id: z.string().min(1),
  label: z.string().optional(),
});

export const ConversationTurnSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  text: z.string(),
  lang: LangSchema,
  ts: z.number().int().nonnegative(),
  interrupted: z.boolean().optional(),
  evidence: z.array(EvidenceRefSchema).optional(),
  confidence: ConfidenceSchema.optional(),
});

export const StreamChunkSchema = z.object({
  turnId: z.string().min(1),
  seq: z.number().int().nonnegative(),
  text: z.string(),
  final: z.boolean(),
});

export const SpeechEventSchema = z.object({
  kind: z.enum([
    "voice_start",
    "voice_end",
    "partial_transcript",
    "final_transcript",
    "tts_start",
    "tts_chunk",
    "tts_end",
    "tts_abort",
    "error",
  ]),
  ts: z.number().int().nonnegative(),
  detail: z.string().optional(),
  text: z.string().optional(),
});

export const PageContextSchema = z.object({
  route: z.string().min(1),
  title: z.string().optional(),
  anchors: z.array(z.string()).optional(),
  widgets: z
    .array(z.object({ id: z.string(), kind: z.string(), summary: z.string().optional() }))
    .optional(),
});

export const ResponseStyleSchema = z.object({
  length: z.enum(["brief", "detailed"]),
  tone: z.enum(["executive", "warm", "urgent"]),
  lang: LangSchema,
});

export const FallbackDecisionSchema = z.object({
  kind: z.enum(["unavailable", "clarify", "escalate", "none"]),
  reason_ar: z.string().optional(),
  reason_en: z.string().optional(),
});
