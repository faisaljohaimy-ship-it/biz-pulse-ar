/**
 * Executive Agent interface. Every specialist implements this exact
 * shape. No agent may import another agent — collaboration flows
 * exclusively through the Orchestrator.
 */
import type { AgentContract, AgentResult, MissionRequest } from "./types";
import type { ExecutiveBrainMemory } from "../executive-brain/types";

export interface AgentRunContext {
  mission_id: string;
  request: MissionRequest;
  /** Snapshot of shared executive memory (read-only for agents). */
  memory: ExecutiveBrainMemory | null;
  /** Prior agent results already produced in this mission. */
  prior_results: AgentResult[];
  /** Cancellation signal aggregated from mission + per-agent timeouts. */
  signal: AbortSignal;
  /** Server-side Lovable AI Gateway key (may be undefined for pure agents). */
  apiKey?: string;
}

export interface ExecutiveAgent {
  readonly contract: AgentContract;
  run(ctx: AgentRunContext): Promise<AgentResult>;
}
