/**
 * Phase 9.2 — Runtime Zod contracts.
 *
 * Validate every value entering the runtime. Strict, no passthrough.
 */

import { z } from "zod";

export const AgentLifecycleStateSchema = z.enum([
  "Create",
  "Idle",
  "Registered",
  "Waiting",
  "Ready",
  "Scheduled",
  "Running",
  "Paused",
  "Blocked",
  "WaitingApproval",
  "Retrying",
  "Recovering",
  "Completed",
  "Cancelled",
  "Failed",
  "RolledBack",
  "Archived",
]);

export const SchedulingPolicySchema = z.enum([
  "sequential",
  "parallel",
  "priority",
  "dependency",
  "dag",
  "recursive",
  "round_robin",
  "fair_queue",
  "weighted_queue",
  "budget_aware",
  "deadline_aware",
]);

export const RuntimeSeveritySchema = z.enum(["info", "notice", "warn", "error", "critical"]);

export const AgentIdentitySchema = z.object({
  agent_id: z.string().min(1),
  display_name: z.string().min(1),
  org_id: z.string().nullable(),
  parent_agent_id: z.string().nullable(),
  created_at: z.string().min(1),
  issued_by: z.string().min(1),
  fingerprint: z.string().min(1),
});

export const CapabilityScopeSchema = z.object({
  capability_id: z.string().min(1),
  source: z.literal("marketplace"),
  scopes: z.array(z.string().min(1)).readonly(),
});

export const PermissionScopeSchema = z.object({
  scope: z.string().min(1),
  granted_by: z.string().min(1),
  expires_at: z.string().nullable(),
});

export const AgentRuntimeBudgetSchema = z.object({
  max_tokens: z.number().int().nonnegative().nullable(),
  max_ms: z.number().int().nonnegative().nullable(),
  max_memory_mb: z.number().int().nonnegative().nullable(),
  max_retries: z.number().int().nonnegative(),
  max_children: z.number().int().nonnegative(),
});

export const AgentRuntimeSpecSchema = z.object({
  identity: AgentIdentitySchema,
  capabilities: z.array(CapabilityScopeSchema).readonly(),
  permissions: z.array(PermissionScopeSchema).readonly(),
  budget: AgentRuntimeBudgetSchema,
  priority: z.number().int(),
  weight: z.number().nonnegative(),
  deadline_at: z.string().nullable(),
  depends_on: z.array(z.string().min(1)).readonly(),
  scheduling: SchedulingPolicySchema,
  metadata: z.record(z.string(), z.unknown()),
});

export const RuntimeMessageSchema = z.object({
  id: z.string().min(1),
  from_agent_id: z.string().min(1),
  to_agent_id: z.union([z.string().min(1), z.literal("broadcast")]),
  topic: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  sent_at: z.string().min(1),
  correlation_id: z.string().nullable(),
});

export const ConsensusProposalSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  proposer_agent_id: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).readonly(),
  quorum: z.number().int().positive(),
  created_at: z.string().min(1),
});

export const ConsensusVoteSchema = z.object({
  proposal_id: z.string().min(1),
  voter_agent_id: z.string().min(1),
  option: z.string().min(1),
  weight: z.number().nonnegative(),
  at: z.string().min(1),
});

export const PolicyRuleSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  applies_to: z.enum([
    "lifecycle",
    "scheduling",
    "capability",
    "permission",
    "budget",
    "collaboration",
  ]),
  effect: z.enum(["allow", "deny", "require_approval"]),
  matcher: z.record(z.string(), z.unknown()),
});

export const NegotiationOfferSchema = z.object({
  from_agent_id: z.string().min(1),
  to_agent_id: z.string().min(1),
  capability_id: z.string().min(1),
  terms: z.record(z.string(), z.unknown()),
  status: z.enum(["offered", "accepted", "rejected", "counter", "expired"]),
  at: z.string().min(1),
});
