/**
 * Phase 8.5 — Recovery strategies. Given a classified failure, pick
 * the best recovery path. Alternative-capability resolution queries
 * the Marketplace's registry read surface — it never mutates any
 * registry state.
 */
import type { ExecutionFailure, ExecutionRecovery } from "./types";
import { appendRecovery, getSession } from "./session.server";
import { listAgents } from "../orchestrator";

function newRecoveryId(): string {
  return `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function planRecovery(
  sessionId: string,
  failure: ExecutionFailure,
): ExecutionRecovery | null {
  const s = getSession(sessionId);
  if (!s) return null;
  const strategy = pickStrategy(failure);
  const alternative =
    strategy === "alternative_capability" && failure.agent_id
      ? findAlternativeAgent(failure.agent_id)
      : null;

  const recovery: ExecutionRecovery = {
    id: newRecoveryId(),
    session_id: sessionId,
    failure_id: failure.id,
    strategy,
    target_task_id: failure.task_id,
    reasoning: reasoningFor(failure, strategy, alternative ?? undefined),
    applied_at: new Date().toISOString(),
  };
  appendRecovery(sessionId, recovery);
  return recovery;
}

function pickStrategy(failure: ExecutionFailure): ExecutionRecovery["strategy"] {
  switch (failure.kind) {
    case "transient":
    case "timeout":
      return "retry";
    case "capability":
      return "alternative_capability";
    case "dependency":
      return "alternative_route";
    case "policy":
    case "permission":
      return "human_takeover";
    case "permanent":
      return "graceful_degradation";
    default:
      return "partial_completion";
  }
}

function reasoningFor(
  failure: ExecutionFailure,
  strategy: ExecutionRecovery["strategy"],
  alternative?: string,
): string {
  const base = `Failure ${failure.kind} on ${failure.agent_id ?? "unknown"}: ${failure.message}`;
  switch (strategy) {
    case "retry":
      return `${base}. Transient signature — schedule adaptive retry.`;
    case "alternative_capability":
      return `${base}. Route to alternative capability${alternative ? ` (${alternative})` : ""}.`;
    case "alternative_route":
      return `${base}. Rebuild dependency route.`;
    case "human_takeover":
      return `${base}. Policy/permission fault — escalate for human decision.`;
    case "graceful_degradation":
      return `${base}. Continue with partial evidence; downgrade confidence.`;
    default:
      return `${base}. Accept partial completion.`;
  }
}

function findAlternativeAgent(currentAgentId: string): string | null {
  const current = listAgents().find((a) => String(a.contract.id) === currentAgentId);
  if (!current) return null;
  const requiredCaps = new Set(current.contract.capabilities.map((c) => c.key));
  for (const candidate of listAgents()) {
    if (String(candidate.contract.id) === currentAgentId) continue;
    for (const cap of candidate.contract.capabilities) {
      if (requiredCaps.has(cap.key)) return String(candidate.contract.id);
    }
  }
  return null;
}
