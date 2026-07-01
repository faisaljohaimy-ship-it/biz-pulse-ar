/**
 * Phase 8.6 — Internal reasoning telemetry. In-memory counters.
 */
import type { ReasoningMetrics, ReasoningResult } from "./types";

export const REASONER_VERSION = "8.6.0";

const state = {
  produced: 0,
  failed: 0,
  latency_sum: 0,
  depth_sum: 0,
  evidence_quality_sum: 0,
  confidence_sum: 0,
  decision_quality_sum: 0,
  reflection_pass: 0,
};

export function recordSuccess(result: ReasoningResult, latencyMs: number): void {
  state.produced += 1;
  state.latency_sum += latencyMs;
  state.depth_sum += result.trace.depth;
  const evQuality = result.evidence.length
    ? result.evidence.reduce((s, e) => s + e.weight, 0) / result.evidence.length
    : 0;
  state.evidence_quality_sum += evQuality;
  state.confidence_sum += result.confidence.value;
  state.decision_quality_sum += result.options[0]?.weighted_score ?? 0;
  if (result.reflection.ok) state.reflection_pass += 1;
}

export function recordFailure(): void {
  state.failed += 1;
}

export function reasoningMetrics(): ReasoningMetrics {
  const n = state.produced || 1;
  return {
    reasonings_produced: state.produced,
    reasonings_failed: state.failed,
    average_latency_ms: Math.round(state.latency_sum / n),
    average_depth: round2(state.depth_sum / n),
    average_evidence_quality: round2(state.evidence_quality_sum / n),
    average_confidence: round2(state.confidence_sum / n),
    average_decision_quality: round2(state.decision_quality_sum / n),
    average_reflection_pass_rate: round2(state.reflection_pass / n),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
