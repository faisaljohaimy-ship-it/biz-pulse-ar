/**
 * Phase 9.2 — Scheduler. Selects next agents from the registry using
 * declared policies. Runtime coordinates; it does not execute.
 */

import { listAgents } from "./registry.server";
import type { AgentRuntimeRecord, SchedulingPolicy } from "./types";

export interface SchedulingRequest {
  policy: SchedulingPolicy;
  limit: number;
  now_iso?: string;
}

export interface SchedulingDecision {
  policy: SchedulingPolicy;
  taken_at: string;
  selected: readonly string[]; // agent ids
  deferred: readonly string[];
  reason: string;
}

function eligible(rec: AgentRuntimeRecord): boolean {
  return rec.state === "Ready" || rec.state === "Registered" || rec.state === "Waiting";
}

function depsSatisfied(rec: AgentRuntimeRecord, byId: Map<string, AgentRuntimeRecord>): boolean {
  for (const d of rec.spec.depends_on) {
    const dep = byId.get(d);
    if (!dep || dep.state !== "Completed") return false;
  }
  return true;
}

function byPriority(a: AgentRuntimeRecord, b: AgentRuntimeRecord): number {
  return b.spec.priority - a.spec.priority;
}

function byWeight(a: AgentRuntimeRecord, b: AgentRuntimeRecord): number {
  return b.spec.weight - a.spec.weight;
}

function byDeadline(a: AgentRuntimeRecord, b: AgentRuntimeRecord): number {
  const ad = a.spec.deadline_at ? Date.parse(a.spec.deadline_at) : Number.POSITIVE_INFINITY;
  const bd = b.spec.deadline_at ? Date.parse(b.spec.deadline_at) : Number.POSITIVE_INFINITY;
  return ad - bd;
}

function budgetFits(rec: AgentRuntimeRecord): boolean {
  const b = rec.spec.budget;
  const u = rec.usage;
  if (b.max_tokens !== null && u.tokens_used >= b.max_tokens) return false;
  if (b.max_ms !== null && u.ms_used >= b.max_ms) return false;
  if (b.max_memory_mb !== null && u.memory_mb_peak >= b.max_memory_mb) return false;
  if (u.retries_used > b.max_retries) return false;
  return true;
}

let rrCursor = 0;

export function schedule(req: SchedulingRequest): SchedulingDecision {
  const all = listAgents();
  const byId = new Map(all.map((a) => [a.spec.identity.agent_id, a] as const));
  const pool = all.filter(eligible);
  let selected: AgentRuntimeRecord[] = [];
  let reason = "";
  const now = req.now_iso ?? new Date().toISOString();

  switch (req.policy) {
    case "sequential":
      selected = pool.slice(0, 1);
      reason = "first eligible";
      break;
    case "parallel":
      selected = pool.slice(0, req.limit);
      reason = "parallel fan-out";
      break;
    case "priority":
      selected = pool.slice().sort(byPriority).slice(0, req.limit);
      reason = "priority order";
      break;
    case "dependency":
    case "dag":
      selected = pool.filter((r) => depsSatisfied(r, byId)).slice(0, req.limit);
      reason = "dependencies satisfied";
      break;
    case "recursive":
      selected = pool
        .filter((r) => depsSatisfied(r, byId))
        .sort(byPriority)
        .slice(0, req.limit);
      reason = "recursive expansion (dep+priority)";
      break;
    case "round_robin": {
      const eligibleIds = pool.map((r) => r.spec.identity.agent_id);
      if (eligibleIds.length === 0) break;
      const start = rrCursor % eligibleIds.length;
      const rotated = eligibleIds.slice(start).concat(eligibleIds.slice(0, start));
      selected = rotated
        .slice(0, req.limit)
        .map((id) => byId.get(id)!)
        .filter(Boolean);
      rrCursor = (rrCursor + req.limit) % eligibleIds.length;
      reason = "round robin";
      break;
    }
    case "fair_queue":
      selected = pool
        .slice()
        .sort((a, b) => a.usage.ms_used - b.usage.ms_used)
        .slice(0, req.limit);
      reason = "least-consumed first";
      break;
    case "weighted_queue":
      selected = pool.slice().sort(byWeight).slice(0, req.limit);
      reason = "weight order";
      break;
    case "budget_aware":
      selected = pool.filter(budgetFits).sort(byPriority).slice(0, req.limit);
      reason = "budget-fit + priority";
      break;
    case "deadline_aware":
      selected = pool.slice().sort(byDeadline).slice(0, req.limit);
      reason = "earliest deadline first";
      break;
  }

  const selectedIds = selected.map((r) => r.spec.identity.agent_id);
  const deferred = pool
    .map((r) => r.spec.identity.agent_id)
    .filter((id) => !selectedIds.includes(id));

  return {
    policy: req.policy,
    taken_at: now,
    selected: selectedIds,
    deferred,
    reason,
  };
}
