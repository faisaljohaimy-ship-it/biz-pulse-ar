/**
 * Strategy comparison.
 *
 * Compares a previous vs current strategy and any alternatives.
 * Produces a StrategyComparison with expected gain/risk and a
 * confidence bucket. It never replaces strategies — the Executive
 * Brain is the sole adopter.
 */

import type {
  EvidenceRef,
  Severity,
  StrategyComparison,
  StrategyDescriptor,
} from "./types";
import { deriveConfidence } from "./confidence.server";

function id(prev: string, cur: string, ts: string): string {
  let h = 5381;
  const seed = `strat|${prev}|${cur}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `strat_${(h >>> 0).toString(16)}`;
}

export interface StrategyCompareInput {
  readonly previous: StrategyDescriptor;
  readonly current: StrategyDescriptor;
  readonly alternatives: readonly StrategyDescriptor[];
  readonly previous_success_rate: number;
  readonly current_success_rate: number;
  readonly evidence: readonly EvidenceRef[];
}

function riskOfGain(gain: number): Severity {
  if (gain <= -0.25) return "error";
  if (gain < 0) return "warn";
  if (gain < 0.1) return "notice";
  return "info";
}

export function compareStrategies(
  input: StrategyCompareInput,
): StrategyComparison {
  const created_at = new Date().toISOString();
  const gain =
    input.previous_success_rate < 0 || input.current_success_rate < 0
      ? 0
      : input.current_success_rate - input.previous_success_rate;
  const conf = deriveConfidence({
    subject_id: `strat:${input.current.id}`,
    evidence_quality: Math.min(1, input.evidence.length / 5),
    execution_success_rate: input.current_success_rate,
    historical_alignment: input.previous_success_rate,
    benchmark_alignment: -1,
    pattern_consistency: -1,
    coverage: Math.min(1, input.alternatives.length / 3),
    evidence: input.evidence,
  });

  return Object.freeze({
    id: id(input.previous.id, input.current.id, created_at),
    created_at,
    previous: input.previous,
    current: input.current,
    alternatives: Object.freeze([
      ...input.alternatives,
    ]) as readonly StrategyDescriptor[],
    expected_gain: gain,
    expected_risk: riskOfGain(gain),
    confidence: conf.confidence,
    evidence: Object.freeze([...input.evidence]) as readonly EvidenceRef[],
  });
}
