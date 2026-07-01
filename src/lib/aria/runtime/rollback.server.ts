/**
 * Phase 9.2 — Rollback registry.
 */

import type { RollbackEntry } from "./types";

const rollbacks: RollbackEntry[] = [];

function newId(): string {
  return `rb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface RecordRollbackInput {
  agent_id: string;
  reason: string;
  restored_checkpoint_id?: string | null;
  restored_snapshot_id?: string | null;
}

export function recordRollback(input: RecordRollbackInput): RollbackEntry {
  const entry: RollbackEntry = {
    id: newId(),
    agent_id: input.agent_id,
    reason: input.reason,
    restored_checkpoint_id: input.restored_checkpoint_id ?? null,
    restored_snapshot_id: input.restored_snapshot_id ?? null,
    at: new Date().toISOString(),
  };
  rollbacks.push(entry);
  if (rollbacks.length > 2000) rollbacks.splice(0, rollbacks.length - 2000);
  return entry;
}

export function listRollbacks(agentId?: string): RollbackEntry[] {
  return agentId ? rollbacks.filter((r) => r.agent_id === agentId) : [...rollbacks];
}

export function clearRollbacks(): void {
  rollbacks.length = 0;
}
