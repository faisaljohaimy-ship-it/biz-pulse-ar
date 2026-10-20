/**
 * Phase 8.1 — Agent Orchestrator types (internal, server-only).
 *
 * Additive layer on top of the Executive Brain. Introduces the
 * vocabulary for specialist agents, mission planning, execution
 * policies, and orchestration events. NO existing types are modified.
 */

import type { SadeedIntent } from "../executive-reasoning.server";
import type {
  BrainRequest,
  ExecutiveBrainAnswer,
  Priority,
  Recommendation,
  DecisionProposal,
  RiskSignal,
  ConfidenceBreakdown,
} from "../executive-brain/types";

export type AgentId =
  | "executive_brain"
  | "planning"
  | "risk"
  | "recommendation"
  | "inspection"
  | "incident"
  | "patrol"
  | "compliance"
  | "operations"
  | "analytics"
  | "briefing"
  | "memory"
  | "context"
  | "presence"
  | "simulation"
  | "reports"
  | "knowledge"
  | (string & { readonly __agentId?: unique symbol });

export type ExecutionPolicy =
  "sequential" | "parallel" | "conditional" | "fallback" | "retry" | "skip" | "human_approval";

export interface RetryPolicy {
  max_attempts: number;
  backoff_ms: number;
}

export interface AgentCapability {
  key: string;
  description: string;
}

export interface AgentContract {
  id: AgentId;
  name_en: string;
  name_ar: string;
  description: string;
  capabilities: AgentCapability[];
  intents: SadeedIntent[];
  input_contract: string;
  output_contract: string;
  priority: Priority;
  estimated_cost: "low" | "medium" | "high";
  estimated_latency_ms: number;
  requires_human_approval: boolean;
  dependencies: AgentId[];
  execution_policy: ExecutionPolicy;
  retry_policy: RetryPolicy;
  supports_streaming: boolean;
  supports_cancellation: boolean;
  supports_confidence: boolean;
  supports_evidence: boolean;
  /** Billing classification. `free` agents must never invoke a model or paid provider. */
  billing?: "free" | "metered";
  /** Explicit linkage boundary for routing and audit displays. */
  linked_scopes?: readonly string[];
  /** Declares which registered agents may receive this agent's automation plan. */
  linked_agent_ids?: readonly string[];
}

/** Result contract every specialist returns. Merge-friendly. */
export interface AgentResult {
  agent_id: AgentId;
  ok: boolean;
  /** Human-readable status, never surfaced verbatim to end users. */
  status: "completed" | "skipped" | "failed" | "timeout" | "cancelled";
  /** Partial contribution to the final ExecutiveBrainAnswer, all optional. */
  contribution: {
    text_ar?: string;
    text_en?: string;
    evidence?: string[];
    reasoning?: string;
    assumptions?: string[];
    risks?: RiskSignal[];
    recommendation?: Recommendation | null;
    decision?: DecisionProposal | null;
    confidence?: ConfidenceBreakdown;
    sources?: string[];
    /** Structured output from a deterministic, no-model automation agent. */
    automation?: {
      workflow: string;
      trigger: "manual" | "scheduled" | "event";
      side_effects: "none" | "approval_required";
      linked_scopes: string[];
      /** Planning only; these steps have not been executed. */
      steps?: string[];
      linked_agent_ids?: string[];
    };
    /** Optional full brain answer (from the Chief Agent). */
    answer?: ExecutiveBrainAnswer;
  };
  /** Evidence gap flags — orchestrator downgrades confidence when set. */
  unavailable?: boolean;
  error?: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
}

export interface MissionRequest extends BrainRequest {
  /** Optional pre-declared mission id (else generated). */
  missionId?: string;
  /** Force-select agents (overrides router). */
  agents?: AgentId[];
  /** Global cancellation signal. */
  signal?: AbortSignal;
  /** Per-mission timeout (ms). Default 60_000. */
  timeoutMs?: number;
}

export interface MissionPlanNode {
  agent_id: AgentId;
  policy: ExecutionPolicy;
  depends_on: AgentId[];
  reason: string;
}

export interface MissionPlan {
  mission_id: string;
  intent: SadeedIntent;
  nodes: MissionPlanNode[];
  /** Topologically-ordered execution layers (agents in the same layer run in parallel). */
  layers: AgentId[][];
}

export interface MissionOutcome {
  mission_id: string;
  plan: MissionPlan;
  results: AgentResult[];
  answer: ExecutiveBrainAnswer;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  cancelled: boolean;
}

export type OrchestrationEventName =
  | "MissionStarted"
  | "MissionCompleted"
  | "MissionCancelled"
  | "AgentStarted"
  | "AgentCompleted"
  | "AgentFailed"
  | "AgentSkipped"
  | "AgentTimeout";

export interface OrchestrationEvent {
  name: OrchestrationEventName;
  mission_id: string;
  agent_id?: AgentId;
  ts: string;
  detail?: Record<string, unknown>;
}
