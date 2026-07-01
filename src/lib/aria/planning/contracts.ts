/**
 * Zod contracts for planner inputs and produced ExecutionPlans.
 * Strict — no unknown keys, no optional-by-default mission fields.
 */
import { z } from "zod";

export const PrioritySchema = z.enum(["critical", "high", "medium", "low"]);
export const LanguageSchema = z.enum(["ar", "en", "mixed"]);

export const PlanMissionInputSchema = z
  .object({
    utterance: z.string().min(1),
    language: LanguageSchema,
    priority: PrioritySchema,
    domain: z.string().min(1),
    intent: z.string().min(1),
    requested_by: z.string().optional(),
    deadline_ms: z.number().int().positive().optional(),
    constraints: z
      .array(
        z.object({
          kind: z.enum([
            "budget",
            "permission",
            "policy",
            "deadline",
            "time",
            "cpu",
            "tokens",
            "memory",
            "priority",
            "human_approval",
            "compliance",
          ]),
          value: z.union([z.string(), z.number()]),
          hard: z.boolean(),
          reasoning: z.string().min(1),
        }),
      )
      .default([]),
    hints: z
      .object({
        objectives: z.array(z.string().min(1)).optional(),
        deliverables: z.array(z.string().min(1)).optional(),
      })
      .optional(),
  })
  .strict();

export type PlanMissionInput = z.infer<typeof PlanMissionInputSchema>;

export const GoalNodeSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["goal", "objective", "task", "subtask", "atomic"]),
    title: z.string().min(1),
    description: z.string().min(1),
    parent_id: z.string().nullable(),
    children_ids: z.array(z.string()),
    depth: z.number().int().nonnegative(),
    capability: z.string().nullable(),
    reasoning: z.string().min(1),
  })
  .strict();

export const CapabilityBindingSchema = z
  .object({
    node_id: z.string(),
    capability: z.string(),
    resolved_agent: z.string().nullable(),
    score: z.number().min(0).max(1),
    match_kind: z.enum([
      "exact",
      "synonym",
      "tag",
      "semantic",
      "unresolved",
    ]),
    reasoning: z.string().min(1),
  })
  .strict();

export const ExecutionPlanSchema = z
  .object({
    mission_id: z.string().min(1),
    goal: z.object({}).passthrough(),
    objectives: z.array(z.object({}).passthrough()),
    constraints: z.array(z.object({}).passthrough()),
    tree: z.object({}).passthrough(),
    graph: z.object({}).passthrough(),
    stages: z.array(z.object({}).passthrough()),
    bindings: z.array(CapabilityBindingSchema),
    strategy: z.enum([
      "sequential",
      "parallel",
      "hybrid",
      "iterative",
      "approval_based",
      "exploration",
      "optimization",
      "recovery",
    ]),
    success_criteria: z.array(z.object({}).passthrough()),
    approvals: z.array(z.object({}).passthrough()),
    risks: z.array(z.object({}).passthrough()),
    recovery: z.array(z.object({}).passthrough()),
    rollback: z.array(z.object({}).passthrough()),
    estimation: z.object({}).passthrough(),
    verification: z.object({}).passthrough(),
    decisions: z.array(z.object({}).passthrough()),
    created_at: z.string(),
    planner_version: z.string(),
  })
  .strict();
