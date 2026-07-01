/**
 * Phase 9.3 — Rollback recorder.
 */

import type { ExecutionRollbackEntry } from "./types";

const entries: ExecutionRollbackEntry[] = [];

function newId(): string {
  return `rb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface RecordRollbackInput {
  execution_id: string;
  reason: string;
  restored_snapshot_id?: string | null;
}

export function recordRollback(input: RecordRollbackInput): ExecutionRollbackEntry {
  const e: ExecutionRollbackEntry = {
    id: newId(),
    execution_id: input.execution_id,
    reason: input.reason,
    restored_snapshot_id: input.restored_snapshot_id ?? null,
    at: new Date().toISOString(),
  };
  entries.push(e);
  if (entries.length > 2000) entries.splice(0, entries.length - 2000);
  return e;
}

export function listRollbacks(executionId?: string): ExecutionRollbackEntry[] {
  return executionId ? entries.filter((e) => e.execution_id === executionId) : [...entries];
}

export function clearRollbacks(): void {
  entries.length = 0;
}
