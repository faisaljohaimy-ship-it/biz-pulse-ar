/**
 * Phase 8.4 — Autonomous Planning & Mission Engine (public surface).
 * Server-only. Import from callers:
 *   import { planMission } from "@/lib/aria/planning";
 *
 * Planner is strictly additive. It never executes agents, never
 * dispatches tasks, and never mutates memory or context.
 */
export { planMission } from "./planner.server";
export { PLANNER_VERSION } from "./metrics.server";
export { PlanMissionInputSchema, ExecutionPlanSchema, type PlanMissionInput } from "./contracts";

export { subscribePlanning } from "./events";
export { planningMetrics, planningHealth } from "./metrics.server";
export { registerPolicy, listPolicies, type EnterprisePolicy } from "./policy.server";

export type {
  ApprovalGate,
  ApprovalMode,
  CapabilityBinding,
  Estimation,
  ExecutionEdge,
  ExecutionGraph,
  ExecutionPlan,
  GoalNode,
  MissionConstraint,
  MissionGoal,
  MissionObjective,
  MissionStage,
  MissionStrategy,
  MissionTree,
  PlanningDecision,
  PlanningEvent,
  PlanningEventName,
  PlanningHealth,
  PlanningMetrics,
  Priority,
  RecoveryOption,
  RiskFactor,
  RollbackStep,
  SuccessCriterion,
  VerificationIssue,
  VerificationReport,
} from "./types";

// -----------------------------------------------------------------------
// Convenience wrappers
// -----------------------------------------------------------------------
import type { ExecutionPlan } from "./types";
import { ExecutionPlanSchema } from "./contracts";
import { planMission as _plan } from "./planner.server";
import { PlanMissionInputSchema, type PlanMissionInput } from "./contracts";

/** Structural validation of a plan produced elsewhere (e.g. persisted). */
export function validatePlan(plan: unknown): { ok: boolean; error?: string } {
  const res = ExecutionPlanSchema.safeParse(plan);
  if (res.success) return { ok: true };
  return { ok: false, error: res.error.message };
}

/**
 * Cheap estimation: runs the full planner but returns only the estimation
 * envelope. Callers who need the plan itself should use `planMission`.
 */
export async function estimateMission(
  input: PlanMissionInput,
): Promise<ExecutionPlan["estimation"]> {
  const parsed = PlanMissionInputSchema.parse(input);
  const plan = await _plan(parsed);
  return plan.estimation;
}
