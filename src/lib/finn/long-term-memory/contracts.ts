/**
 * Phase 9.5 — Zod contracts for Long-Term Memory.
 *
 * Every capture entry point validates through these contracts. No
 * defaults that fabricate provenance: at least one evidence reference
 * is required for any capture.
 */

import { z } from "zod";

export const MemoryKindSchema = z.enum([
  "episodic",
  "semantic",
  "procedural",
  "decision",
  "experience",
]);

export const ConfidenceSchema = z.enum(["low", "medium", "high", "unknown"]);
export const SensitivitySchema = z.enum(["public", "internal", "restricted", "secret"]);
export const SeveritySchema = z.enum(["info", "notice", "warn", "error", "critical"]);

export const EvidenceRefSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "execution",
    "telemetry",
    "audit",
    "benchmark",
    "pattern",
    "experience",
    "reflection",
    "table",
    "document",
    "conversation",
    "workflow",
    "decision",
  ]),
  source: z.string().min(1),
  taken_at: z.string().min(1),
});

export const CaptureInputSchema = z.object({
  kind: MemoryKindSchema,
  workspace_id: z.string().min(1),
  title: z.string().min(1).max(240),
  body: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  evidence: z.array(EvidenceRefSchema).min(1),
  confidence: ConfidenceSchema.default("unknown"),
  sensitivity: SensitivitySchema.default("internal"),
  business_impact: SeveritySchema.default("info"),
  source_quality: z.number().min(-1).max(1).default(-1),
});

export const RetrievalQuerySchema = z.object({
  workspace_id: z.string().min(1),
  text: z.string().min(1),
  kinds: z.array(MemoryKindSchema).optional(),
  tags: z.array(z.string().min(1)).optional(),
  min_confidence: ConfidenceSchema.optional(),
  max_sensitivity: SensitivitySchema.optional(),
  limit: z.number().int().positive().max(200).optional(),
});

export type CaptureInput = z.infer<typeof CaptureInputSchema>;
export type RetrievalQueryInput = z.infer<typeof RetrievalQuerySchema>;
