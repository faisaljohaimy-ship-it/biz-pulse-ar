/**
 * Phase 8.6 — Reasoning contracts (Zod). Validates the public input
 * surface of the reasoning engine.
 */
import { z } from "zod";

export const ReasoningModeSchema = z.enum([
  "strategic",
  "analytical",
  "critical",
  "creative",
  "systems",
  "root_cause",
  "first_principles",
  "scenario",
  "risk",
  "opportunity",
  "executive_advisory",
]);

export const LanguageSchema = z.enum(["ar", "en", "mixed"]);

const SeedEvidenceSchema = z.object({
  claim: z.string().min(1).max(2_000),
  source: z.string().min(1).max(400),
  source_kind: z.enum([
    "context_snapshot",
    "memory_summary",
    "policy",
    "metric",
    "incident",
    "external_reference",
    "domain_knowledge",
  ]),
  reliability: z.number().min(0).max(1),
  freshness_ms: z.number().int().nullable(),
});

const SeedAssumptionSchema = z.object({
  statement: z.string().min(1).max(1_000),
  necessity: z.enum(["must_hold", "should_hold", "nice_to_hold"]),
  risk_if_wrong: z.enum(["low", "medium", "high", "critical"]),
});

export const ReasonInputSchema = z.object({
  question: z.string().min(1).max(4_000),
  language: LanguageSchema,
  mode: ReasoningModeSchema,
  domain: z.string().min(1).max(120),
  goals: z.array(z.string().min(1).max(400)).max(16),
  constraints: z.array(z.string().min(1).max(400)).max(16),
  seed_evidence: z.array(SeedEvidenceSchema).max(64),
  seed_assumptions: z.array(SeedAssumptionSchema).max(32),
});

export type ReasonInputParsed = z.infer<typeof ReasonInputSchema>;

export const MultiPerspectiveInputSchema = ReasonInputSchema.extend({
  perspectives: z.array(ReasoningModeSchema).min(2).max(6),
});

export type MultiPerspectiveInputParsed = z.infer<typeof MultiPerspectiveInputSchema>;
