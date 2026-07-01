/**
 * Phase 9.2 — Checkpoints. Named restore points within an agent's run.
 */

import { requireAgent } from "./registry.server";
import type { Checkpoint } from "./types";

const checkpoints = new Map<string, Checkpoint>();
const byAgent = new Map<string, string[]>();

function newId(): string {
  return `cp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function saveCheckpoint(agentId: string, label: string, payloadRef: string | null = null): Checkpoint {
  const rec = requireAgent(agentId);
  const cp: Checkpoint = {
    id: newId(),
    agent_id: agentId,
    label,
    state: rec.state,
    usage_snapshot: { ...rec.usage },
    taken_at: new Date().toISOString(),
    payload_ref: payloadRef,
  };
  checkpoints.set(cp.id, cp);
  const list = byAgent.get(agentId) ?? [];
  list.push(cp.id);
  byAgent.set(agentId, list);
  return cp;
}

export function getCheckpoint(id: string): Checkpoint | null {
  return checkpoints.get(id) ?? null;
}

export function latestCheckpoint(agentId: string): Checkpoint | null {
  const list = byAgent.get(agentId);
  if (!list || list.length === 0) return null;
  return checkpoints.get(list[list.length - 1]!) ?? null;
}

export function listCheckpoints(agentId: string): Checkpoint[] {
  const ids = byAgent.get(agentId) ?? [];
  return ids.map((id) => checkpoints.get(id)!).filter(Boolean);
}

export function clearCheckpoints(): void {
  checkpoints.clear();
  byAgent.clear();
}
