/**
 * Phase 10.0 — Zod contracts for Release Candidate RC1.
 */
import { z } from "zod";

export const GateIdSchema = z.enum([
  "build",
  "typecheck",
  "lint",
  "core_runtime",
  "aria_os",
  "planning",
  "execution",
  "marketplace",
  "task_bus",
  "runtime",
  "tools",
  "memory",
  "knowledge_graph",
  "world_model",
  "governance",
  "security",
  "performance",
  "accessibility",
  "observability",
  "error_handling",
  "release_notes",
]);

export const SeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export const StatusSchema = z.enum(["pass", "fail", "warn", "unknown"]);
export const DecisionSchema = z.enum(["GO", "NO-GO", "GO_WITH_KNOWN_LIMITATIONS"]);

export const EvidenceRefSchema = z.object({
  kind: z.enum([
    "typecheck",
    "build",
    "lint",
    "smoke",
    "integration",
    "e2e",
    "regression",
    "security",
    "performance",
    "accessibility",
    "observability",
    "dependency",
    "audit",
    "metric",
    "manual",
  ]),
  source: z.string().min(1),
  ref: z.string().optional(),
  captured_at: z.string().min(1),
});

export const GateResultSchema = z.object({
  gate: GateIdSchema,
  severity: SeveritySchema,
  status: StatusSchema,
  summary: z.string().min(1),
  evidence: z.array(EvidenceRefSchema).readonly(),
  blockers: z.array(z.string()).readonly(),
  notes: z.array(z.string()).readonly(),
});

export const TestCaseSchema = z.object({
  id: z.string().min(1),
  gate: GateIdSchema,
  kind: z.enum(["smoke", "integration", "e2e", "regression"]),
  title: z.string().min(1),
  required: z.boolean(),
});

export const TestOutcomeSchema = z.object({
  case_id: z.string().min(1),
  status: StatusSchema,
  evidence: EvidenceRefSchema.optional(),
  detail: z.string().optional(),
});

export const TestReportSchema = z.object({
  kind: z.enum(["smoke", "integration", "e2e", "regression"]),
  outcomes: z.array(TestOutcomeSchema).readonly(),
  executed_at: z.string().min(1),
});

export const ReviewFindingSchema = z.object({
  id: z.string().min(1),
  severity: SeveritySchema,
  title: z.string().min(1),
  detail: z.string().min(1),
  evidence: EvidenceRefSchema.optional(),
});

export const ReviewReportSchema = z.object({
  domain: z.enum(["security", "performance", "accessibility", "observability", "dependency"]),
  status: StatusSchema,
  findings: z.array(ReviewFindingSchema).readonly(),
  evidence: z.array(EvidenceRefSchema).readonly(),
});

export const RiskEntrySchema = z.object({
  id: z.string().min(1),
  gate: GateIdSchema,
  severity: SeveritySchema,
  likelihood: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  description: z.string().min(1),
  mitigation: z.string().min(1),
  owner: z.string().optional(),
});

export const BlockerSchema = z.object({
  id: z.string().min(1),
  gate: GateIdSchema,
  severity: z.enum(["critical", "high"]),
  reason: z.string().min(1),
  requirement: z.string().min(1),
  evidence: EvidenceRefSchema.optional(),
});

export const Rc1SignalsSchema = z.object({
  typecheck_ok: z.boolean().optional(),
  build_ok: z.boolean().optional(),
  lint_ok: z.boolean().optional(),
  runtime_ok: z.boolean().optional(),
  smoke: TestReportSchema.optional(),
  integration: TestReportSchema.optional(),
  e2e: TestReportSchema.optional(),
  regression: TestReportSchema.optional(),
  security: ReviewReportSchema.optional(),
  performance: ReviewReportSchema.optional(),
  accessibility: ReviewReportSchema.optional(),
  observability: ReviewReportSchema.optional(),
  dependency: ReviewReportSchema.optional(),
  evidence: z.array(EvidenceRefSchema).readonly(),
});

export function validateSignals(input: unknown) {
  return Rc1SignalsSchema.parse(input);
}
