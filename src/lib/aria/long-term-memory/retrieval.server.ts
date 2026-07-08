/**
 * Retrieval.
 *
 * Rules:
 *   - Return memory only when evidence exists (records that lost
 *     evidence are excluded).
 *   - Rank by relevance, freshness, confidence, source quality,
 *     recurrence, business impact (delegated to ranking).
 *   - Expose uncertainty via `RetrievalReport.uncertainty`.
 *   - Never invent missing memory.
 *   - Respect privacy ceiling and confidence floor.
 *   - Skip records whose status is `forgotten`, `decayed`, or `conflict`.
 */

import { RetrievalQuerySchema, type RetrievalQueryInput } from "./contracts";
import { listRecords, replaceRecord } from "./memory-store.server";
import { rankRecord } from "./ranking.server";
import { ceilingAllows } from "./privacy.server";
import { audit } from "./audit.server";
import { emitTelemetry } from "./telemetry.server";
import type { Confidence, MemoryRecord, RankedMemory, RetrievalReport } from "./types";

const CONFIDENCE_ORDER: Record<Confidence, number> = {
  unknown: -1,
  low: 0,
  medium: 1,
  high: 2,
};

function reportId(ts: string, text: string): string {
  let h = 5381;
  const seed = `ret|${ts}|${text}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `ret_${(h >>> 0).toString(16)}`;
}

function passesFilters(record: MemoryRecord, q: RetrievalQueryInput): boolean {
  if (record.workspace_id !== q.workspace_id) return false;
  if (record.status !== "active" && record.status !== "compressed") return false;
  if (record.evidence.length === 0) return false;
  if (q.kinds && !q.kinds.includes(record.kind)) return false;
  if (q.tags && q.tags.length > 0 && !q.tags.some((t) => record.tags.includes(t))) return false;
  if (q.min_confidence) {
    const min = CONFIDENCE_ORDER[q.min_confidence];
    if (min < 0 || CONFIDENCE_ORDER[record.confidence] < min) return false;
  }
  if (q.max_sensitivity && !ceilingAllows(record.sensitivity, q.max_sensitivity)) return false;
  return true;
}

function bucketUncertainty(results: readonly RankedMemory[]): Confidence {
  const scored = results.map((r) => r.composite).filter((v) => v >= 0);
  if (scored.length === 0) return "unknown";
  const top = Math.max(...scored);
  if (top >= 0.7) return "high";
  if (top >= 0.45) return "medium";
  if (top >= 0.2) return "low";
  return "unknown";
}

export function retrieve(raw: RetrievalQueryInput): RetrievalReport {
  const query = RetrievalQuerySchema.parse(raw);
  const now = new Date();
  const created_at = now.toISOString();

  const candidates = listRecords(query.workspace_id).filter((r) => passesFilters(r, query));
  const ranked = candidates
    .map((r) => rankRecord(r, query.text, now))
    .filter((r) => r.composite >= 0 || r.relevance > 0)
    .sort((a, b) => b.composite - a.composite)
    .slice(0, query.limit ?? 20);

  // Access tracking is a status-preserving replacement (immutable append pattern).
  for (const rr of ranked) {
    replaceRecord({
      ...rr.record,
      last_accessed_at: created_at,
      access_count: rr.record.access_count + 1,
    });
  }

  const uncertainty = bucketUncertainty(ranked);
  audit(
    "retrieve",
    `q:${query.workspace_id}`,
    ranked.map((r) => r.record.id),
  );
  emitTelemetry(
    "retrieve.ok",
    "info",
    `workspace=${query.workspace_id} results=${ranked.length} uncertainty=${uncertainty}`,
  );

  return Object.freeze({
    id: reportId(created_at, query.text),
    created_at,
    query,
    results: Object.freeze(ranked) as readonly RankedMemory[],
    uncertainty,
    explanation:
      ranked.length === 0
        ? "no evidence-backed memory matched the query"
        : `ranked by relevance + freshness + confidence + source quality + recurrence + impact; top composite=${ranked[0]!.composite.toFixed(3)}`,
  });
}
