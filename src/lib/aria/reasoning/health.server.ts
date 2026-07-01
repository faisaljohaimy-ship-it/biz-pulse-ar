/**
 * Phase 8.6 — Reasoning engine health probe.
 */
import type { ReasoningHealth } from "./types";
import { REASONER_VERSION, reasoningMetrics } from "./metrics.server";

const activeSet = new Set<string>();
let lastFailureAt: string | null = null;
let lastFailureReason: string | null = null;

export function markActive(contextId: string): void {
  activeSet.add(contextId);
}

export function markInactive(contextId: string): void {
  activeSet.delete(contextId);
}

export function recordHealthFailure(reason: string): void {
  lastFailureAt = new Date().toISOString();
  lastFailureReason = reason.slice(0, 400);
}

export function reasoningHealth(): ReasoningHealth {
  const m = reasoningMetrics();
  const ok =
    (m.reasonings_produced === 0 && m.reasonings_failed === 0) ||
    m.reasonings_produced > m.reasonings_failed * 4;
  return {
    ok,
    reasoner_version: REASONER_VERSION,
    active_reasonings: activeSet.size,
    last_failure_at: lastFailureAt,
    last_failure_reason: lastFailureReason,
  };
}
