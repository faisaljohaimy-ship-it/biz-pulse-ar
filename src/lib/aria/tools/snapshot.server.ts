/**
 * Phase 9.3 — Execution snapshots for recovery/reproduction.
 */

import type { ExecutionSnapshot, ExecutionStatus, ToolExecutionRequest } from "./types";

const snaps = new Map<string, ExecutionSnapshot>();
const byExec = new Map<string, string[]>();

function newId(): string {
  return `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function takeSnapshot(
  request: ToolExecutionRequest,
  status: ExecutionStatus,
  attempts: number,
): ExecutionSnapshot {
  const s: ExecutionSnapshot = {
    id: newId(),
    execution_id: request.context.execution_id,
    taken_at: new Date().toISOString(),
    request,
    status,
    attempts,
  };
  snaps.set(s.id, s);
  const list = byExec.get(s.execution_id) ?? [];
  list.push(s.id);
  byExec.set(s.execution_id, list);
  return s;
}

export function getSnapshot(id: string): ExecutionSnapshot | null {
  return snaps.get(id) ?? null;
}

export function latestSnapshot(executionId: string): ExecutionSnapshot | null {
  const ids = byExec.get(executionId);
  if (!ids || ids.length === 0) return null;
  return snaps.get(ids[ids.length - 1]!) ?? null;
}

export function clearSnapshots(executionId?: string): void {
  if (!executionId) {
    snaps.clear();
    byExec.clear();
    return;
  }
  const ids = byExec.get(executionId) ?? [];
  for (const id of ids) snaps.delete(id);
  byExec.delete(executionId);
}
