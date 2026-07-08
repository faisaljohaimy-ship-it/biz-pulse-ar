/**
 * Phase 9.9 — Zod contracts.
 */
import { z } from "zod";

export const ImpactLevelSchema = z.enum(["low", "medium", "high", "critical", "unknown"]);

export const AuthorityLevelSchema = z.enum([
  "agent",
  "supervisor",
  "manager",
  "director",
  "executive",
  "board",
]);

export const DecisionKindSchema = z.enum([
  "read",
  "notify",
  "recommend",
  "write",
  "external_call",
  "financial",
  "security_change",
  "policy_change",
  "user_facing",
  "unknown",
]);

export const ApprovalStatusSchema = z.enum([
  "pending",
  "auto_approved",
  "approved",
  "rejected",
  "expired",
  "escalated",
  "overridden",
]);

export const ComplianceStatusSchema = z.enum([
  "compliant",
  "non_compliant",
  "requires_review",
  "unknown",
]);

export const EvidenceRefSchema = z.object({
  source_id: z.string().min(1),
  kind: z.enum(["policy", "audit", "memory", "graph", "artifact", "signal"]),
  locator: z.string().min(1),
  captured_at: z.string().min(1),
});

export const ProposedActionSchema = z.object({
  id: z.string().min(1),
  agent_id: z.string().min(1),
  kind: DecisionKindSchema,
  summary: z.string().min(1),
  target: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  tenant_id: z.string().optional(),
  requested_authority: AuthorityLevelSchema.optional(),
  evidence: z.array(EvidenceRefSchema).readonly(),
  created_at: z.string().min(1),
});

export const ImpactAssessmentSchema = z.object({
  level: ImpactLevelSchema,
  score: z.number().min(0).max(1),
  factors: z.array(z.string()).readonly(),
  unknown_reason: z.string().optional(),
});

export const ApprovalRequestSchema = z.object({
  id: z.string().min(1),
  action_id: z.string().min(1),
  required_from: AuthorityLevelSchema,
  status: ApprovalStatusSchema,
  requested_at: z.string().min(1),
  resolved_at: z.string().optional(),
  decided_by: z.string().optional(),
  decision_reason: z.string().optional(),
  expires_at: z.string().optional(),
});

export const ExecutionPermissionSchema = z.object({
  ok: z.boolean(),
  action_id: z.string().min(1),
  approval_id: z.string().optional(),
  authority: AuthorityLevelSchema.nullable(),
  reason: z.string(),
  issued_at: z.string().min(1),
  expires_at: z.string().optional(),
});
