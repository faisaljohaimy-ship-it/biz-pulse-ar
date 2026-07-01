/**
 * Phase 8.1 — Agent Orchestrator public surface (server-only).
 *
 * Import from callers:
 *   import { runAgentMission } from "@/lib/aria/orchestrator";
 *
 * Additive layer — never replaces `runExecutiveBrain`. The Chief
 * (executive_brain) still owns the final natural response.
 */
// Phase 8.3 — boot the Marketplace so plug-in agents self-register
// into the orchestrator registry before the first mission executes.
import { bootMarketplace } from "../marketplace";
bootMarketplace();

export { runAgentMission } from "./orchestrator.server";
export type { RunAgentMissionOptions } from "./orchestrator.server";
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
