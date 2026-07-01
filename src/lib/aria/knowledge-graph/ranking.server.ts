/**
 * Ranking of entities against a text query.
 *
 * Deterministic weighted composite of relevance + freshness + confidence
 * + recurrence. Unknowns are excluded, never defaulted upwards.
 */

import { entityFreshness } from "./freshness.server";
import type { Confidence, EntityRecord, RankedEntity } from "./types";

const CONFIDENCE_SCORE: Record<Confidence, number> = {
  unknown: -1,
  low: 0.25,
  medium: 0.6,
  high: 0.9,
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1);
}

export function relevanceOf(record: EntityRecord, query: string | undefined): number {
  if (!query) return -1;
  const q = new Set(tokenize(query));
  if (q.size === 0) return -1;
  const doc = new Set(
    tokenize(
      `${record.canonical_name} ${record.aliases.join(" ")} ${Object.keys(record.attributes).join(" ")}`,
    ),
  );
  if (doc.size === 0) return 0;
  let overlap = 0;
  for (const t of q) if (doc.has(t)) overlap += 1;
  return overlap / q.size;
}

export function rankEntity(
  record: EntityRecord,
  query: string | undefined,
  now: Date = new Date(),
): RankedEntity {
  const relevance = relevanceOf(record, query);
  const freshness_score = entityFreshness(record.kind, record.updated_at, now);
  const confidence_score = CONFIDENCE_SCORE[record.confidence];
  const recurrence_score = record.recurrence <= 1 ? 0 : Math.min(1, Math.log10(record.recurrence));

  const components = [
    { v: relevance, w: 0.4 },
    { v: freshness_score, w: 0.25 },
    { v: confidence_score, w: 0.2 },
    { v: recurrence_score, w: 0.15 },
  ].filter((c) => c.v >= 0);

  const composite =
    components.length === 0
      ? -1
      : components.reduce((a, c) => a + c.v * c.w, 0) /
        components.reduce((a, c) => a + c.w, 0);

  return Object.freeze({
    record,
    relevance,
    freshness_score,
    confidence_score,
    recurrence_score,
    composite,
  });
}
