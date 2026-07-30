/**
 * Phase 8.5 — Automatic checkpointing. Per-stage and per-atomic-task.
 * Checkpoints are pure snapshots — they never mutate the underlying
 * Task Bus or agent state.
 */
import type { ExecutionCheckpoint } from "./types";
import { appendCheckpoint, getSession } from "./session.server";

function newCheckpointId(): string {
  return `ckpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createCheckpoint(
  sessionId: string,
  stage: string,
  reasoning: string,
  extra?: { completedTaskIds?: string[]; completedAgentIds?: string[] },
): ExecutionCheckpoint | null {
  const s = getSession(sessionId);
  if (!s) return null;
  const cp: ExecutionCheckpoint = {
    id: newCheckpointId(),
    session_id: sessionId,
    stage,
    taken_at: new Date().toISOString(),
    completed_task_ids: extra?.completedTaskIds ?? [],
    completed_agent_ids:
      extra?.completedAgentIds ??
      s.outcome?.results.filter((r) => r.ok).map((r) => String(r.agent_id)) ??
      [],
    reasoning,
  };
  appendCheckpoint(sessionId, cp);
  return cp;
}

export function findCheckpoint(
  sessionId: string,
  checkpointId: string,
): ExecutionCheckpoint | null {
  const s = getSession(sessionId);
  if (!s) return null;
  return s.checkpoints.find((c) => c.id === checkpointId) ?? null;
}

export function latestCheckpoint(sessionId: string): ExecutionCheckpoint | null {
  const s = getSession(sessionId);
  if (!s || !s.checkpoints.length) return null;
  return s.checkpoints[s.checkpoints.length - 1] ?? null;
}
