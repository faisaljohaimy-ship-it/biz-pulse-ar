/**
 * Phase 9.7 — Zod contracts for multimodal inputs and outputs.
 * Strict schemas; refuse fabricated fields.
 */
import { z } from "zod";

export const EvidenceRefSchema = z.object({
  source_id: z.string().min(1),
  kind: z.enum([
    "image",
    "screenshot",
    "pdf",
    "video",
    "audio",
    "transcript",
    "artifact",
  ]),
  locator: z.string().min(1),
  hash: z.string().optional(),
  captured_at: z.string().min(1),
});

export const BoundingBoxSchema = z.object({
  x: z.number().finite().min(0),
  y: z.number().finite().min(0),
  w: z.number().finite().min(0),
  h: z.number().finite().min(0),
  page: z.number().int().nonnegative().optional(),
  frame: z.number().int().nonnegative().optional(),
});

export const ModalitySchema = z.enum([
  "image",
  "screenshot",
  "pdf_page",
  "chart",
  "table",
  "diagram",
  "video_frame",
  "audio_transcript",
  "unknown",
]);

export const SignalKindSchema = z.enum([
  "ocr_text",
  "layout_region",
  "table_cell",
  "chart_series",
  "chart_axis",
  "diagram_node",
  "diagram_edge",
  "audio_utterance",
  "audio_segment",
  "video_scene",
  "caption",
  "detected_object",
  "unknown_region",
]);

export const ConfidenceBucketSchema = z.enum([
  "high",
  "medium",
  "low",
  "unknown",
]);

export const SignalSchema = z.object({
  id: z.string().min(1),
  kind: SignalKindSchema,
  modality: ModalitySchema,
  text: z.string().optional(),
  value: z.union([z.number(), z.string(), z.null()]).optional(),
  bbox: BoundingBoxSchema.optional(),
  time_range: z
    .object({ start: z.number().finite(), end: z.number().finite() })
    .nullable()
    .optional(),
  confidence: z.number().min(0).max(1),
  bucket: ConfidenceBucketSchema,
  evidence: EvidenceRefSchema,
  notes: z.string().optional(),
});

export const MultimodalInputSchema = z.object({
  source_id: z.string().min(1),
  declared_modality: ModalitySchema.optional(),
  mime: z.string().optional(),
  bytes_size: z.number().int().nonnegative().optional(),
  text_hint: z.string().optional(),
  evidence: EvidenceRefSchema,
});

export const MultimodalFindingSchema = z.object({
  id: z.string().min(1),
  modality: ModalitySchema,
  summary: z.string(),
  signals: z.array(SignalSchema).readonly(),
  confidence: z.number().min(0).max(1),
  bucket: ConfidenceBucketSchema,
  unknown_reason: z.string().optional(),
  evidence: z.array(EvidenceRefSchema).readonly(),
  linked_memory_ids: z.array(z.string()).readonly(),
  linked_graph_entities: z.array(z.string()).readonly(),
  created_at: z.string().min(1),
});

export const PipelineOutcomeSchema = z.object({
  ok: z.boolean(),
  findings: z.array(MultimodalFindingSchema).readonly(),
  rejected: z
    .array(z.object({ reason: z.string(), input_id: z.string() }))
    .readonly(),
  telemetry_id: z.string(),
});
