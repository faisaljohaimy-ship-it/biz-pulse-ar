/**
 * Phase 9.2 — Lifecycle state machine.
 * Guards agent transitions to declared valid edges only.
 */

import { updateAgent, requireAgent } from "./registry.server";
import type { AgentLifecycleState, LifecycleTransition } from "./types";

const EDGES: Record<AgentLifecycleState, readonly AgentLifecycleState[]> = {
  Create: ["Idle", "Registered", "Cancelled"],
  Idle: ["Registered", "Cancelled", "Archived"],
  Registered: ["Waiting", "Ready", "Cancelled"],
  Waiting: ["Ready", "Blocked", "Cancelled"],
  Ready: ["Scheduled", "Cancelled"],
  Scheduled: ["Running", "Cancelled"],
  Running: [
    "Paused",
    "Blocked",
    "WaitingApproval",
    "Retrying",
    "Recovering",
    "Completed",
    "Failed",
    "Cancelled",
  ],
  Paused: ["Running", "Cancelled"],
  Blocked: ["Waiting", "Ready", "Cancelled", "Failed"],
  WaitingApproval: ["Running", "Cancelled", "Failed"],
  Retrying: ["Running", "Failed", "Cancelled"],
  Recovering: ["Running", "RolledBack", "Failed", "Cancelled"],
  Completed: ["Archived"],
  Cancelled: ["Archived"],
  Failed: ["Retrying", "Recovering", "RolledBack", "Archived"],
  RolledBack: ["Archived", "Ready"],
  Archived: [],
};

const transitions: LifecycleTransition[] = [];

export function canTransition(from: AgentLifecycleState, to: AgentLifecycleState): boolean {
  return EDGES[from].includes(to);
}

export function transition(
  agentId: string,
  to: AgentLifecycleState,
  reason: string,
  actor: string,
): LifecycleTransition {
  const rec = requireAgent(agentId);
  if (!canTransition(rec.state, to)) {
    throw new Error(`runtime: invalid transition ${rec.state} -> ${to} for ${agentId}`);
  }
  const now = new Date().toISOString();
  const patch: Partial<import("./types").AgentRuntimeRecord> = { state: to };
  if (to === "Scheduled") patch.scheduled_at = now;
  if (to === "Running" && !rec.started_at) patch.started_at = now;
  if (to === "Completed" || to === "Failed" || to === "Cancelled" || to === "RolledBack") {
    patch.finished_at = now;
  }
  updateAgent(agentId, patch);
  const evt: LifecycleTransition = {
    agent_id: agentId,
    from: rec.state,
    to,
    reason,
    at: now,
    actor,
  };
  transitions.push(evt);
  if (transitions.length > 5000) transitions.splice(0, transitions.length - 5000);
  return evt;
}

export function listTransitions(agentId?: string): LifecycleTransition[] {
  return agentId ? transitions.filter((t) => t.agent_id === agentId) : [...transitions];
}

export function clearTransitions(): void {
  transitions.length = 0;
}
