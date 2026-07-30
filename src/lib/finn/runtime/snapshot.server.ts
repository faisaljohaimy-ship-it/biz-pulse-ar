/**
 * Phase 9.2 — Snapshots of the full agent record for recovery.
 */

import { requireAgent, updateAgent } from "./registry.server";
import type { AgentRuntimeRecord, Snapshot } from "./types";

const snapshots = new Map<string, Snapshot>();
const byAgent = new Map<string, string[]>();

function newId(): string {
  return `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function deepFreeze<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function takeSnapshot(agentId: string): Snapshot {
  const rec = requireAgent(agentId);
  const snap: Snapshot = {
    id: newId(),
    agent_id: agentId,
    taken_at: new Date().toISOString(),
    record: deepFreeze(rec),
  };
  snapshots.set(snap.id, snap);
  const list = byAgent.get(agentId) ?? [];
  list.push(snap.id);
  byAgent.set(agentId, list);
  return snap;
}

export function getSnapshot(id: string): Snapshot | null {
  return snapshots.get(id) ?? null;
}

export function latestSnapshot(agentId: string): Snapshot | null {
  const list = byAgent.get(agentId);
  if (!list || list.length === 0) return null;
  return snapshots.get(list[list.length - 1]!) ?? null;
}

export function restoreSnapshot(snapshotId: string): AgentRuntimeRecord {
  const snap = snapshots.get(snapshotId);
  if (!snap) throw new Error(`runtime: snapshot not found ${snapshotId}`);
  return updateAgent(snap.agent_id, {
    state: snap.record.state,
    usage: snap.record.usage,
    health: snap.record.health,
    last_error: snap.record.last_error,
  });
}

export function clearSnapshots(): void {
  snapshots.clear();
  byAgent.clear();
}
