/**
 * Phase 9.2 — Recovery orchestration. Composes retry, checkpoint,
 * snapshot, and rollback into an advisory sequence. Never invents an
 * alternative agent; it only proposes candidates from the registry.
 */

import { listAgents, requireAgent } from "./registry.server";
import { planRetry } from "./retry.server";
import { latestCheckpoint } from "./checkpoint.server";
import { latestSnapshot, restoreSnapshot } from "./snapshot.server";
import { recordRollback } from "./rollback.server";
import { transition } from "./lifecycle.server";
import type { AgentRuntimeRecord } from "./types";

export interface RecoveryStep {
  kind: "retry" | "checkpoint_restore" | "snapshot_restore" | "rollback" | "degrade" | "reassign";
  detail: string;
  target_agent_id?: string;
}

export interface RecoveryPlan {
  agent_id: string;
  steps: readonly RecoveryStep[];
  can_recover: boolean;
}

function alternativeCandidates(rec: AgentRuntimeRecord): AgentRuntimeRecord[] {
  const needed = new Set(rec.spec.capabilities.map((c) => c.capability_id));
  return listAgents().filter(
    (r) =>
      r.spec.identity.agent_id !== rec.spec.identity.agent_id &&
      r.spec.identity.org_id === rec.spec.identity.org_id &&
      (r.state === "Ready" || r.state === "Registered" || r.state === "Idle") &&
      r.spec.capabilities.some((c) => needed.has(c.capability_id)),
  );
}

export function planRecovery(agentId: string): RecoveryPlan {
  const rec = requireAgent(agentId);
  const steps: RecoveryStep[] = [];

  const retry = planRetry(agentId);
  if (retry.should_retry) {
    steps.push({
      kind: "retry",
      detail: `attempt ${retry.attempt}/${retry.max_retries}, backoff ${retry.backoff_ms}ms`,
    });
  }

  const cp = latestCheckpoint(agentId);
  if (cp) steps.push({ kind: "checkpoint_restore", detail: `checkpoint ${cp.id} (${cp.label})` });

  const snap = latestSnapshot(agentId);
  if (snap) steps.push({ kind: "snapshot_restore", detail: `snapshot ${snap.id}` });

  const alts = alternativeCandidates(rec);
  if (alts.length > 0) {
    steps.push({
      kind: "reassign",
      detail: `alternative agent ${alts[0]!.spec.identity.agent_id}`,
      target_agent_id: alts[0]!.spec.identity.agent_id,
    });
  } else {
    steps.push({ kind: "degrade", detail: "no alternative capability holder" });
  }

  if (!retry.should_retry && !cp && !snap) {
    steps.push({ kind: "rollback", detail: "no checkpoint or snapshot; rollback advised" });
  }

  return {
    agent_id: agentId,
    steps,
    can_recover: steps.some((s) => s.kind !== "rollback" && s.kind !== "degrade"),
  };
}

export function executeRollback(agentId: string, reason: string): void {
  const snap = latestSnapshot(agentId);
  if (snap) restoreSnapshot(snap.id);
  recordRollback({
    agent_id: agentId,
    reason,
    restored_snapshot_id: snap?.id ?? null,
  });
  const rec = requireAgent(agentId);
  if (rec.state === "Failed" || rec.state === "Recovering") {
    transition(agentId, "RolledBack", reason, "runtime.recovery");
  }
}
