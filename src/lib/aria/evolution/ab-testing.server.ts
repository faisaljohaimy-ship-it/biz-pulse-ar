/**
 * Pairwise benchmark comparison (A/B).
 *
 * The winner is decided only when reliability is known on both sides
 * and the margin exceeds a fixed threshold. Otherwise "unknown".
 */

import type { ABTestResult, BenchmarkSample } from "./types";
import { deriveConfidence } from "./confidence.server";

const MARGIN_THRESHOLD = 0.05;

function abId(a: string, b: string, ts: string): string {
  let h = 5381;
  const seed = `ab|${a}|${b}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `ab_${(h >>> 0).toString(16)}`;
}

export function abTest(a: BenchmarkSample, b: BenchmarkSample): ABTestResult {
  const created_at = new Date().toISOString();
  const knownA = a.reliability >= 0;
  const knownB = b.reliability >= 0;
  let winner: ABTestResult["winner"] = "unknown";
  let margin = 0;
  if (knownA && knownB) {
    margin = a.reliability - b.reliability;
    if (Math.abs(margin) < MARGIN_THRESHOLD) winner = "tie";
    else winner = margin > 0 ? "a" : "b";
  }
  const conf = deriveConfidence({
    subject_id: `ab:${a.id}:${b.id}`,
    evidence_quality: Math.min(1, (a.evidence.length + b.evidence.length) / 6),
    execution_success_rate: knownA && knownB ? Math.max(a.reliability, b.reliability) : -1,
    historical_alignment: -1,
    benchmark_alignment: knownA && knownB ? 1 : -1,
    pattern_consistency: -1,
    coverage: knownA && knownB ? 1 : 0,
    evidence: [...a.evidence, ...b.evidence],
  });
  return Object.freeze({
    id: abId(a.id, b.id, created_at),
    created_at,
    a,
    b,
    winner,
    margin,
    confidence: conf.confidence,
  });
}
