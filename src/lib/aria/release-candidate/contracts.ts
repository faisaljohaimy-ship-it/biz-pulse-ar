/**
 * Phase 10.0 — Zod contracts.
 */
import { z } from "zod";

export const GateIdSchema = z.enum([
  "architecture",
  "type_safety",
  "build",
  "runtime",
  "security",
  "governance",
  "memory",
  "knowledge_graph",
  "world_model",
  "agent_runtime",
  "tool_engine",
  "integration",
  "simulation",
  "executive_demo",
  "aria_conversation",
  "approval_workflow",
  "audit_trail",
  "performance",
  "error_handling",
  "fallback",
]);

export const GateStatusSchema = z.enum(["pass", "warn", "fail", "unknown"]);
export const CriticalitySchema = z.enum(["critical", "high", "medium", "low"]);
export const ReleaseDecisionSchema = z.enum(["GO", "NO-GO", "CONDITIONAL-GO"]);

export const EvidenceRefSchema = z.object({
  source_id: z.string().min(1),
  kind: z.enum([
    "audit",
    "metric",
    "log",
    "artifact",
    "policy",
    "test",
    "config",
    "signal",
  ]),
  locator: z.string().min(1),
  captured_at: z.string().min(1),
});

export const GateResultSchema = z.object({
  id: GateIdSchema,
  title: z.string().min(1),
  status: GateStatusSchema,
  criticality: CriticalitySchema,
  score: z.number().min(0).max(1),
  summary: z.string(),
  findings: z.array(z.string()).readonly(),
  evidence: z.array(EvidenceRefSchema).readonly(),
  unknown_reason: z.string().optional(),
  checked_at: z.string().min(1),
});

export const KnownLimitationSchema = z.object({
  id: z.string().min(1),
  area: z.string().min(1),
  description: z.string().min(1),
  severity: CriticalitySchema,
  workaround: z.string().optional(),
  evidence: z.array(EvidenceRefSchema).readonly(),
});

export const RequirementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  blocker: z.boolean(),
});

export const RcInputsSchema = z.object({
  version: z.string().optional(),
  build_ok: z.boolean().optional(),
  typecheck_ok: z.boolean().optional(),
  runtime_ok: z.boolean().optional(),
  external_credentials: z.record(z.string(), z.boolean()).optional(),
  performance_p95_ms: z.number().finite().nonnegative().optional(),
  notes: z.array(z.string()).optional(),
});
