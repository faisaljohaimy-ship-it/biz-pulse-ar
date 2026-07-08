/**
 * Phase 9.3 — Execution checkpoints (per pipeline stage).
 */

import type { ExecutionCheckpoint, ToolTelemetryEvent } from "./types";

const store = new Map<string, ExecutionCheckpoint[]>();

function newId(): string {
  return `ck_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function checkpoint(
  executionId: string,
  stage: ToolTelemetryEvent["stage"],
): ExecutionCheckpoint {
  const cp: ExecutionCheckpoint = {
    id: newId(),
    execution_id: executionId,
    stage,
    taken_at: new Date().toISOString(),
  };
  const list = store.get(executionId) ?? [];
  list.push(cp);
  store.set(executionId, list);
  return cp;
}

export function listCheckpoints(executionId: string): ExecutionCheckpoint[] {
  return store.get(executionId)?.slice() ?? [];
}

export function clearCheckpoints(executionId?: string): void {
  if (executionId) store.delete(executionId);
  else store.clear();
}
