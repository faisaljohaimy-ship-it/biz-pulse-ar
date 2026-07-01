/**
 * Internal planner telemetry — no dashboards, no UI. Feeds health.
 */
import type { PlanningHealth, PlanningMetrics } from "./types";

interface Sample {
  latency_ms: number;
  depth: number;
  optimization_gain: number;
  risk_score: number;
  confidence: number;
  cost: number;
  duration_ms: number;
}

const samples: Sample[] = [];
let produced = 0;
let failed = 0;
let lastFailureAt: string | null = null;
let lastFailureReason: string | undefined;
let active = 0;

export const PLANNER_VERSION = "8.4.0";

export function noteActive(delta: number): void {
  active = Math.max(0, active + delta);
}

export function notePlanSuccess(s: Sample): void {
  produced += 1;
  samples.push(s);
  if (samples.length > 500) samples.shift();
}

export function notePlanFailure(reason: string): void {
  failed += 1;
  lastFailureAt = new Date().toISOString();
  lastFailureReason = reason;
}

function avg(pick: (s: Sample) => number): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (const s of samples) sum += pick(s);
  return sum / samples.length;
}

export function planningMetrics(): PlanningMetrics {
  return {
    plans_produced: produced,
    plans_failed: failed,
    average_latency_ms: avg((s) => s.latency_ms),
    average_tree_depth: avg((s) => s.depth),
    average_optimization_gain: avg((s) => s.optimization_gain),
    average_risk_score: avg((s) => s.risk_score),
    average_confidence: avg((s) => s.confidence),
    average_estimated_cost: avg((s) => s.cost),
    average_estimated_duration_ms: avg((s) => s.duration_ms),
  };
}

export function planningHealth(): PlanningHealth {
  return {
    ok: failed === 0 || produced > failed,
    planner_version: PLANNER_VERSION,
    active_plans: active,
    last_failure_at: lastFailureAt,
    last_failure_reason: lastFailureReason,
  };
}
