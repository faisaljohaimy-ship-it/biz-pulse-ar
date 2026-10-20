/**
 * Phase 8.1 — Agent Orchestrator public surface (server-only).
 *
 * Import from callers:
 *   import { runAgentMission } from "@/lib/sadeed/orchestrator";
 *
 * Additive layer — never replaces `runExecutiveBrain`. The Chief
 * (executive_brain) still owns the final natural response.
 */
// Phase 8.3 — سوق الإضافات (`../marketplace`) حُذف: منظومة كاملة بلا
// مستورد حيّ واحد. لا وكيل إضافي يسجّل نفسه، فسقط نداء التشغيل معه.

// Ensure the ten specialist agents linked to SADEED are always registered
// (Constitution, Article 30 — SADEED Council of Ten).
import "./agents";
import { assertCouncilOfTen } from "./council";
assertCouncilOfTen();

export {
  SADEED_COUNCIL_OF_TEN,
  SADEED_COUNCIL_OF_NINE,
  SADEED_COUNCIL_LABELS_AR,
  assertCouncilOfTen,
  assertCouncilOfNine,
} from "./council";

export { runAgentMission } from "./orchestrator.server";
export type { RunAgentMissionOptions } from "./orchestrator.server";
export { FNN_LINKED_SCOPES, getFnnContract } from "./fnn";
export { planMission } from "./router.server";
export { registerAgent, getAgent, listAgents, listAgentContracts, hasAgent } from "./registry";
export { subscribeOrchestration, emitOrchestrationEvent } from "./events";
export { MissionRequestSchema } from "./contracts";
export type { MissionRequestInput } from "./contracts";
export type {
  AgentId,
  AgentContract,
  AgentResult,
  AgentCapability,
  ExecutionPolicy,
  RetryPolicy,
  MissionRequest,
  MissionPlan,
  MissionPlanNode,
  MissionOutcome,
  OrchestrationEvent,
  OrchestrationEventName,
} from "./types";
export type { ExecutiveAgent, AgentRunContext } from "./agent.interface";
