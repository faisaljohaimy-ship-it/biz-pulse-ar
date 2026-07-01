/**
 * Phase 9.2 — Budget tracker for tokens, time, memory, retries, children.
 */

import { requireAgent, updateAgent } from "./registry.server";
import type { AgentRuntimeBudget, BudgetUsage } from "./types";

export interface BudgetStatus {
  ok: boolean;
  remaining: {
    tokens: number | null;
    ms: number | null;
    memory_mb: number | null;
    retries: number;
    children: number;
  };
  violations: readonly string[];
}

function evaluate(u: BudgetUsage, b: AgentRuntimeBudget): BudgetStatus {
  const violations: string[] = [];
  if (b.max_tokens !== null && u.tokens_used > b.max_tokens) violations.push("tokens");
  if (b.max_ms !== null && u.ms_used > b.max_ms) violations.push("time");
  if (b.max_memory_mb !== null && u.memory_mb_peak > b.max_memory_mb) violations.push("memory");
  if (u.retries_used > b.max_retries) violations.push("retries");
  if (u.children_spawned > b.max_children) violations.push("children");
  return {
    ok: violations.length === 0,
    remaining: {
      tokens: b.max_tokens === null ? null : Math.max(0, b.max_tokens - u.tokens_used),
      ms: b.max_ms === null ? null : Math.max(0, b.max_ms - u.ms_used),
      memory_mb:
        b.max_memory_mb === null ? null : Math.max(0, b.max_memory_mb - u.memory_mb_peak),
      retries: Math.max(0, b.max_retries - u.retries_used),
      children: Math.max(0, b.max_children - u.children_spawned),
    },
    violations,
  };
}

export function chargeBudget(
  agentId: string,
  delta: Partial<BudgetUsage>,
): BudgetStatus {
  const rec = requireAgent(agentId);
  const usage: BudgetUsage = {
    tokens_used: rec.usage.tokens_used + (delta.tokens_used ?? 0),
    ms_used: rec.usage.ms_used + (delta.ms_used ?? 0),
    memory_mb_peak: Math.max(rec.usage.memory_mb_peak, delta.memory_mb_peak ?? 0),
    retries_used: rec.usage.retries_used + (delta.retries_used ?? 0),
    children_spawned: rec.usage.children_spawned + (delta.children_spawned ?? 0),
  };
  updateAgent(agentId, { usage });
  return evaluate(usage, rec.spec.budget);
}

export function budgetStatus(agentId: string): BudgetStatus {
  const rec = requireAgent(agentId);
  return evaluate(rec.usage, rec.spec.budget);
}
