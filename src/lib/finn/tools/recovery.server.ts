/**
 * Phase 9.3 — Recovery advisor. Composes snapshot + rollback advisories.
 */

import { latestSnapshot } from "./snapshot.server";
import { recordRollback } from "./rollback.server";

export interface RecoveryStep {
  kind: "snapshot_restore" | "rollback" | "give_up";
  detail: string;
}

export interface RecoveryPlan {
  execution_id: string;
  steps: readonly RecoveryStep[];
}

export function planRecovery(executionId: string): RecoveryPlan {
  const snap = latestSnapshot(executionId);
  const steps: RecoveryStep[] = [];
  if (snap) steps.push({ kind: "snapshot_restore", detail: `snapshot ${snap.id}` });
  steps.push({ kind: "rollback", detail: "record rollback entry" });
  if (!snap) steps.push({ kind: "give_up", detail: "no snapshot to restore from" });
  return { execution_id: executionId, steps };
}

export function executeRollback(executionId: string, reason: string): void {
  const snap = latestSnapshot(executionId);
  recordRollback({
    execution_id: executionId,
    reason,
    restored_snapshot_id: snap?.id ?? null,
  });
}
