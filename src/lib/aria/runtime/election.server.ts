/**
 * Phase 9.2 — Leader election per group.
 */

import type { LeaderElection } from "./types";
import { requireAgent } from "./registry.server";

const groups = new Map<string, LeaderElection>();

export function nominate(group: string, agentId: string): LeaderElection {
  requireAgent(agentId);
  const cur = groups.get(group) ?? {
    group,
    leader_agent_id: null,
    epoch: 0,
    elected_at: null,
    candidates: [],
  };
  if (cur.candidates.includes(agentId)) return cur;
  const next: LeaderElection = { ...cur, candidates: [...cur.candidates, agentId] };
  groups.set(group, next);
  return next;
}

export function elect(group: string): LeaderElection {
  const cur = groups.get(group);
  if (!cur || cur.candidates.length === 0) {
    throw new Error(`runtime: no candidates for group ${group}`);
  }
  const leader = cur.candidates.slice().sort()[0]!;
  const next: LeaderElection = {
    ...cur,
    leader_agent_id: leader,
    epoch: cur.epoch + 1,
    elected_at: new Date().toISOString(),
  };
  groups.set(group, next);
  return next;
}

export function stepDown(group: string, agentId: string): LeaderElection {
  const cur = groups.get(group);
  if (!cur) throw new Error(`runtime: group not found ${group}`);
  if (cur.leader_agent_id !== agentId) return cur;
  const remaining = cur.candidates.filter((c) => c !== agentId);
  const next: LeaderElection = {
    ...cur,
    leader_agent_id: null,
    candidates: remaining,
    epoch: cur.epoch + 1,
    elected_at: null,
  };
  groups.set(group, next);
  return next;
}

export function getElection(group: string): LeaderElection | null {
  return groups.get(group) ?? null;
}
