/**
 * Phase 9.4 — Zod contracts for the Self-Evolution Engine.
 *
 * Every public entry point validates its input through these contracts.
 * Contracts intentionally accept "unknown" fields where evidence is
 * absent so the engine never fabricates a value to satisfy the schema.
 */

import { z } from "zod";

export const OutcomeSchema = z.enum(["success", "partial", "failure", "unknown"]);
export const SeveritySchema = z.enum([
  "info",
  "notice",
  "warn",
  "error",
  "critical",
]);
export const ConfidenceSchema = z.enum(["low", "medium", "high", "unknown"]);

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
  ]),
  source: z.string().min(1),
  taken_at: z.string().min(1),
});

export const ExecutionEvidenceSchema = z.object({
  execution_id: z.string().min(1),
  workspace_id: z.string().min(1),
  started_at: z.string().min(1),
  finished_at: z.string().min(1),
  duration_ms: z.number().finite().nonnegative(),
  outcome: OutcomeSchema,
  cost_tokens: z.number().finite().nonnegative(),
  cost_ms: z.number().finite().nonnegative(),
  tool_calls: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative(),
  errors: z.array(z.string()).readonly(),
  tags: z.array(z.string()).readonly(),
});

export const StrategyDescriptorSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  summary: z.string().min(1),
});

export const ImprovementTargetSchema = z.enum([
  "prompt",
  "policy",
  "workflow",
  "planner",
  "runtime",
  "tool",
  "memory",
]);

export const RecommendationInputSchema = z.object({
  proposal_id: z.string().min(1),
  headline: z.string().min(1),
  body: z.string().min(1),
  severity: SeveritySchema,
  confidence: ConfidenceSchema,
  evidence: z.array(EvidenceRefSchema).min(1),
});

export const ExperienceInputSchema = z.object({
  problem: z.string().min(1),
  context: z.string().min(1),
  goal: z.string().min(1),
  actions: z.array(z.string()).min(1),
  evidence: z.array(EvidenceRefSchema).min(1),
  outcome: OutcomeSchema,
  failures: z.array(z.string()).readonly(),
  successes: z.array(z.string()).readonly(),
  metrics: z.record(z.string(), z.number().finite()),
  duration_ms: z.number().finite().nonnegative(),
  cost_tokens: z.number().finite().nonnegative(),
  risk: SeveritySchema,
  lessons: z.array(z.string()).readonly(),
  recommendations: z.array(z.string()).readonly(),
});

export type RecommendationInput = z.infer<typeof RecommendationInputSchema>;
export type ExperienceInput = z.infer<typeof ExperienceInputSchema>;
export type ExecutionEvidenceInput = z.infer<typeof ExecutionEvidenceSchema>;
