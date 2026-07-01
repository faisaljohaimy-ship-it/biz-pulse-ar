/**
 * Phase 8.6 — Small pure helpers shared across reasoning modules.
 * Kept internal (no wildcard re-exports from `index.ts`).
 */
import type { ConfidenceBand, ConfidenceScore } from "./types";

export function bandFor(value: number): ConfidenceBand {
  if (value >= 0.85) return "very_high";
  if (value >= 0.7) return "high";
  if (value >= 0.5) return "medium";
  if (value >= 0.3) return "low";
  return "very_low";
}

export function confidence(
  value: number,
  reasoning: string,
  evidenceIds: string[] = [],
): ConfidenceScore {
  const clamped = Math.max(0, Math.min(1, value));
  return { value: clamped, band: bandFor(clamped), reasoning, evidence_ids: evidenceIds };
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function shortId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
