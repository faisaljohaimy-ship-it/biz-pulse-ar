/**
 * Phase 8.5 — Rollback engine.
 *
 * Rollback is metadata-only: the Director annotates the session,
 * records which checkpoint it rewinds to, and lets subsequent
 * `resumeMission` / `retryMission` decide what work re-runs. The
 * Task Bus is authoritative for actual task state.
 */
import type { ExecutionCheckpoint } from "./types";
import { findCheckpoint, latestCheckpoint } from "./checkpoint.server";
import { appendDecision, getSession, setState } from "./session.server";
import { emitExecutionEvent } from "./events";

export interface RollbackReport {
  session_id: string;
  target_checkpoint: ExecutionCheckpoint | null;
  removed_completed_agent_ids: string[];
  reason: string;
  ok: boolean;
}

function newDecisionId(): string {
  return `dec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function performRollback(
  sessionId: string,
  toCheckpointId: string | null,
  reason: string,
): RollbackReport {
  const session = getSession(sessionId);
  if (!session) {
    return {
      session_id: sessionId,
      target_checkpoint: null,
      removed_completed_agent_ids: [],
      reason: "session missing",
      ok: false,
    };
  }
  const target = toCheckpointId
    ? findCheckpoint(sessionId, toCheckpointId)
    : latestCheckpoint(sessionId);

  emitExecutionEvent("RollbackStarted", sessionId, session.mission_id, {
    to_checkpoint: target?.id ?? null,
    reason,
  });
  setState(sessionId, "rolling_back", reason);

  const keptAgents = new Set(target?.completed_agent_ids ?? []);
  const previouslyCompleted =
    session.outcome?.results.filter((r) => r.ok).map((r) => String(r.agent_id)) ?? [];
  const removed = previouslyCompleted.filter((id) => !keptAgents.has(id));

  session.metrics.rollback_count += 1;
  appendDecision(sessionId, {
    id: newDecisionId(),
    session_id: sessionId,
    kind: "rollback",
    reason,
    ts: new Date().toISOString(),
    detail: { to_checkpoint: target?.id ?? null, removed_agent_ids: removed },
  });
  emitExecutionEvent("RollbackCompleted", sessionId, session.mission_id, {
    to_checkpoint: target?.id ?? null,
    removed_agent_ids: removed,
  });

  return {
    session_id: sessionId,
    target_checkpoint: target,
    removed_completed_agent_ids: removed,
    reason,
    ok: true,
  };
}
