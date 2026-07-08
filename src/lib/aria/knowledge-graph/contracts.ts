/**
 * Phase 9.6 — Zod contracts for the Knowledge Graph.
 *
 * Every ingest entry point validates through these contracts. No
 * defaults that fabricate provenance: at least one evidence reference
 * is required for any assertion.
 */

import { z } from "zod";

export const EntityKindSchema = z.enum([
  "person",
  "department",
  "site",
  "asset",
  "incident",
  "risk",
  "inspection",
  "task",
  "report",
  "policy",
  "sop",
  "decision",
  "recommendation",
  "system",
  "connector",
  "tool",
  "agent",
  "capability",
  "objective",
  "project",
  "evidence",
]);

export const RelationshipKindSchema = z.enum([
  "owns",
  "belongs_to",
  "located_at",
  "caused_by",
  "related_to",
  "depends_on",
  "assigned_to",
  "reported_by",
  "approved_by",
  "violates",
  "mitigates",
  "supports",
  "contradicts",
  "replaces",
  "references",
  "requires",
]);

export const ConfidenceSchema = z.enum(["low", "medium", "high", "unknown"]);
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
    "memory",
    "external",
  ]),
  source: z.string().min(1),
  taken_at: z.string().min(1),
});

export const AttributeValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const AttributesSchema = z.record(z.string().min(1), AttributeValueSchema);

export const RawEntityAssertionSchema = z.object({
  kind: EntityKindSchema,
  name: z.string().min(1).max(240),
  aliases: z.array(z.string().min(1)).optional(),
  attributes: AttributesSchema.optional(),
});

export const RawRelationshipAssertionSchema = z.object({
  kind: RelationshipKindSchema,
  from_name: z.string().min(1),
  from_kind: EntityKindSchema,
  to_name: z.string().min(1),
  to_kind: EntityKindSchema,
  attributes: AttributesSchema.optional(),
});

export const RawIngestPayloadSchema = z.object({
  workspace_id: z.string().min(1),
  source: z.string().min(1),
  taken_at: z.string().min(1),
  evidence: z.array(EvidenceRefSchema).min(1),
  entities: z.array(RawEntityAssertionSchema),
  relationships: z.array(RawRelationshipAssertionSchema),
});

export const GraphQuerySchema = z.object({
  workspace_id: z.string().min(1),
  entity_kinds: z.array(EntityKindSchema).optional(),
  relationship_kinds: z.array(RelationshipKindSchema).optional(),
  text: z.string().optional(),
  min_confidence: ConfidenceSchema.optional(),
  include_stale: z.boolean().optional(),
  limit: z.number().int().positive().max(500).optional(),
});

export type RawIngestPayloadInput = z.infer<typeof RawIngestPayloadSchema>;
export type GraphQueryInput = z.infer<typeof GraphQuerySchema>;
