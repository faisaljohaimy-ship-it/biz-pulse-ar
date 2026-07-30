/**
 * Phase 9.3 — Execution budget. Validates request budgets prior to
 * dispatch and computes bytes usage after.
 */

import type { ToolExecutionBudget } from "./types";

export interface BudgetCheck {
  ok: boolean;
  reason: string;
  effective_deadline_ms: number | null;
}

export function validateBudget(
  budget: ToolExecutionBudget,
  toolTimeoutMs: number,
  deadline_at: string | null,
): BudgetCheck {
  if (budget.max_ms !== null && budget.max_ms <= 0) {
    return { ok: false, reason: "max_ms must be positive", effective_deadline_ms: null };
  }
  const deadlineRemaining = deadline_at
    ? Math.max(0, Date.parse(deadline_at) - Date.now())
    : Number.POSITIVE_INFINITY;
  const candidates = [toolTimeoutMs, budget.max_ms ?? Number.POSITIVE_INFINITY, deadlineRemaining];
  const effective = Math.min(...candidates);
  if (!Number.isFinite(effective) || effective <= 0) {
    return { ok: false, reason: "no time budget remaining", effective_deadline_ms: 0 };
  }
  return { ok: true, reason: "within budget", effective_deadline_ms: effective };
}

export function measureBytes(value: unknown): number {
  if (value === undefined || value === null) return 0;
  try {
    if (typeof value === "string") return new TextEncoder().encode(value).byteLength;
    if (value instanceof Uint8Array) return value.byteLength;
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return 0;
  }
}

export function enforceBytes(
  budget: ToolExecutionBudget,
  bytesIn: number,
  bytesOut: number,
): { ok: boolean; reason: string } {
  if (budget.max_bytes_in !== null && bytesIn > budget.max_bytes_in) {
    return { ok: false, reason: `input ${bytesIn}b exceeds max_bytes_in ${budget.max_bytes_in}` };
  }
  if (budget.max_bytes_out !== null && bytesOut > budget.max_bytes_out) {
    return {
      ok: false,
      reason: `output ${bytesOut}b exceeds max_bytes_out ${budget.max_bytes_out}`,
    };
  }
  return { ok: true, reason: "bytes within budget" };
}
