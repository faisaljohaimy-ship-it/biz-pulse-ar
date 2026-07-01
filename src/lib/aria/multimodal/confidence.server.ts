/**
 * Confidence calculation — deterministic, evidence-based.
 * Never invents scores. Missing evidence → UNKNOWN bucket.
 */
import type { ConfidenceBucket, Signal } from "./types";

export function bucketOf(confidence: number): ConfidenceBucket {
  if (!Number.isFinite(confidence) || confidence <= 0) return "unknown";
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.6) return "medium";
  if (confidence > 0) return "low";
  return "unknown";
}

export function aggregateConfidence(signals: readonly Signal[]): number {
  if (signals.length === 0) return 0;
  let weighted = 0;
  let weight = 0;
  for (const s of signals) {
    const w = s.confidence <= 0 ? 0.01 : s.confidence;
    weighted += s.confidence * w;
    weight += w;
  }
  return weight === 0 ? 0 : Number((weighted / weight).toFixed(4));
}

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
