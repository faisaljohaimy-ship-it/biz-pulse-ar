/**
 * Ranking.
 *
 * Composite score combines relevance, freshness, confidence, source
 * quality, recurrence, and business impact. Any unknown component is
 * excluded from the mean, never defaulted to a favourable value. If
 * every component is unknown the composite stays -1.
 */

import type { Confidence, MemoryRecord, RankedMemory, Severity } from "./types";
import { freshnessOf } from "./freshness.server";

const CONFIDENCE_SCORE: Record<Confidence, number> = {
  unknown: -1,
  low: 0.25,
  medium: 0.6,
  high: 0.9,
};

const IMPACT_SCORE: Record<Severity, number> = {
  info: 0.2,
  notice: 0.4,
  warn: 0.6,
  error: 0.8,
  critical: 1,
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1);
}

export function relevanceOf(record: MemoryRecord, query: string): number {
  const q = new Set(tokenize(query));
  if (q.size === 0) return 0;
  const doc = new Set(tokenize(`${record.title} ${record.body} ${record.tags.join(" ")}`));
  if (doc.size === 0) return 0;
  let overlap = 0;
  for (const t of q) if (doc.has(t)) overlap += 1;
  return overlap / q.size;
}

export function recurrenceScore(record: MemoryRecord): number {
  // Sub-linear: 1 → 0, 10 → ~0.83, 100 → ~1
  if (record.recurrence <= 1) return 0;
  return Math.min(1, Math.log10(record.recurrence));
}

export function rankRecord(
  record: MemoryRecord,
  query: string,
  now: Date = new Date(),
): RankedMemory {
  const relevance = relevanceOf(record, query);
  const freshness = freshnessOf(record.kind, record.updated_at, now);
  const confidence_score = CONFIDENCE_SCORE[record.confidence];
  const source_quality = record.source_quality;
  const recurrence_score = recurrenceScore(record);
  const impact_score = IMPACT_SCORE[record.business_impact];

  const components = [
    { v: relevance, w: 0.35 },
    { v: freshness, w: 0.2 },
    { v: confidence_score, w: 0.15 },
    { v: source_quality, w: 0.1 },
    { v: recurrence_score, w: 0.1 },
    { v: impact_score, w: 0.1 },
  ].filter((c) => c.v >= 0);

  const composite =
    components.length === 0
      ? -1
      : components.reduce((a, c) => a + c.v * c.w, 0) / components.reduce((a, c) => a + c.w, 0);

  return Object.freeze({
    record,
    relevance,
    freshness,
    confidence_score,
    source_quality,
    recurrence_score,
    impact_score,
    composite,
  });
}
