/**
 * Phase 9.2 — Collaboration: shared artifacts, delegation, swarm links.
 */

import type { SharedArtifact } from "./types";
import { requireAgent } from "./registry.server";
import { assertSameOrg } from "./isolation.server";

const artifacts = new Map<string, SharedArtifact>();
const delegations: Array<{ from: string; to: string; task: string; at: string }> = [];
const swarms = new Map<string, Set<string>>();

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function shareArtifact(input: {
  owner_agent_id: string;
  kind: string;
  ref: string;
  metadata?: Record<string, unknown>;
}): SharedArtifact {
  requireAgent(input.owner_agent_id);
  const a: SharedArtifact = {
    id: newId("art"),
    owner_agent_id: input.owner_agent_id,
    kind: input.kind,
    ref: input.ref,
    created_at: new Date().toISOString(),
    metadata: input.metadata ?? {},
  };
  artifacts.set(a.id, a);
  return a;
}

export function listArtifacts(ownerAgentId?: string): SharedArtifact[] {
  const all = Array.from(artifacts.values());
  return ownerAgentId ? all.filter((a) => a.owner_agent_id === ownerAgentId) : all;
}

export function delegate(from: string, to: string, task: string): void {
  assertSameOrg(from, to);
  delegations.push({ from, to, task, at: new Date().toISOString() });
  if (delegations.length > 2000) delegations.splice(0, delegations.length - 2000);
}

export function listDelegations(): ReadonlyArray<{ from: string; to: string; task: string; at: string }> {
  return delegations.slice();
}

export function joinSwarm(swarmId: string, agentId: string): ReadonlySet<string> {
  requireAgent(agentId);
  const set = swarms.get(swarmId) ?? new Set<string>();
  set.add(agentId);
  swarms.set(swarmId, set);
  return set;
}

export function leaveSwarm(swarmId: string, agentId: string): void {
  const set = swarms.get(swarmId);
  if (!set) return;
  set.delete(agentId);
  if (set.size === 0) swarms.delete(swarmId);
}

export function listSwarmMembers(swarmId: string): string[] {
  return Array.from(swarms.get(swarmId) ?? []);
}

export interface Conflict {
  agent_a: string;
  agent_b: string;
  artifact_id: string;
  detail: string;
}

export function detectArtifactConflicts(): Conflict[] {
  const conflicts: Conflict[] = [];
  const byRef = new Map<string, SharedArtifact[]>();
  for (const a of artifacts.values()) {
    const list = byRef.get(a.ref) ?? [];
    list.push(a);
    byRef.set(a.ref, list);
  }
  for (const [ref, list] of byRef) {
    if (list.length < 2) continue;
    for (let i = 1; i < list.length; i++) {
      conflicts.push({
        agent_a: list[0]!.owner_agent_id,
        agent_b: list[i]!.owner_agent_id,
        artifact_id: list[i]!.id,
        detail: `multiple owners on ref ${ref}`,
      });
    }
  }
  return conflicts;
}

export function resolveConflict(artifactId: string, winnerAgentId: string): SharedArtifact {
  const a = artifacts.get(artifactId);
  if (!a) throw new Error(`runtime: artifact not found ${artifactId}`);
  requireAgent(winnerAgentId);
  const next: SharedArtifact = { ...a, owner_agent_id: winnerAgentId };
  artifacts.set(artifactId, next);
  return next;
}

export function clearCollaboration(): void {
  artifacts.clear();
  delegations.length = 0;
  swarms.clear();
}
