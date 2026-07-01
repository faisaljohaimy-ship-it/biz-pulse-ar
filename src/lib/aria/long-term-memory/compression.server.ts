/**
 * Compression.
 *
 * Merges N related records into a single compressed record. Original
 * evidence refs are unioned onto the new record and original records
 * are marked "compressed" (never deleted). The new record tracks its
 * source ids in `compressed_from`.
 */

import { getRecord, putRecord, replaceRecord } from "./memory-store.server";
import { audit } from "./audit.server";
import { emitTelemetry } from "./telemetry.server";
import type { EvidenceRef, MemoryRecord, Severity, Confidence } from "./types";

function compressedId(ids: readonly string[], ts: string): string {
  let h = 5381;
  const seed = `cmp|${ids.join(",")}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `mem_cmp_${(h >>> 0).toString(16)}`;
}

const CONFIDENCE_RANK: Record<Confidence, number> = {
  unknown: -1,
  low: 0,
  medium: 1,
  high: 2,
};

const SEVERITY_RANK: Record<Severity, number> = {
  info: 0,
  notice: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

function pickConfidence(list: readonly Confidence[]): Confidence {
  const known = list.filter((c) => c !== "unknown");
  if (known.length === 0) return "unknown";
  const min = known.reduce((a, b) => (CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b));
  return min;
}

function pickImpact(list: readonly Severity[]): Severity {
  return list.reduce((a, b) => (SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b), "info" as Severity);
}

export function compressRecords(ids: readonly string[]): MemoryRecord {
  if (ids.length < 2) throw new Error("compression: at least two ids required");
  const records = ids.map((id) => {
    const r = getRecord(id);
    if (!r) throw new Error(`compression: unknown id ${id}`);
    return r;
  });
  const kinds = new Set(records.map((r) => r.kind));
  if (kinds.size !== 1) throw new Error("compression: mixed kinds not allowed");
  const workspaces = new Set(records.map((r) => r.workspace_id));
  if (workspaces.size !== 1) throw new Error("compression: mixed workspaces not allowed");

  const evidenceMap = new Map<string, EvidenceRef>();
  for (const r of records) for (const e of r.evidence) evidenceMap.set(`${e.kind}:${e.id}`, e);
  const tags = new Set<string>();
  for (const r of records) for (const t of r.tags) tags.add(t);

  const now = new Date().toISOString();
  const compressed: MemoryRecord = {
    id: compressedId(ids, now),
    kind: records[0]!.kind,
    workspace_id: records[0]!.workspace_id,
    created_at: now,
    updated_at: now,
    title: `${records[0]!.title} (compressed x${records.length})`,
    body: records.map((r) => `• ${r.title}: ${r.body}`).join("\n"),
    tags: [...tags].sort(),
    evidence: [...evidenceMap.values()].sort((a, b) => a.taken_at.localeCompare(b.taken_at)),
    confidence: pickConfidence(records.map((r) => r.confidence)),
    sensitivity: records.reduce(
      (acc, r) => (SEVERITY_RANK["info"], r.sensitivity > acc ? r.sensitivity : acc),
      records[0]!.sensitivity,
    ),
    recurrence: records.reduce((n, r) => n + r.recurrence, 0),
    business_impact: pickImpact(records.map((r) => r.business_impact)),
    source_quality: (() => {
      const known = records.map((r) => r.source_quality).filter((v) => v >= 0);
      return known.length === 0 ? -1 : known.reduce((a, b) => a + b, 0) / known.length;
    })(),
    last_accessed_at: now,
    access_count: records.reduce((n, r) => n + r.access_count, 0),
    compressed_from: ids,
    conflict_status: "none",
    conflict_partner_ids: [],
    status: "active",
  };

  const stored = putRecord(compressed);
  for (const r of records) {
    replaceRecord({ ...r, status: "compressed", updated_at: now });
  }
  audit("compress", stored.id, [...ids, ...stored.evidence.map((e) => e.id)]);
  emitTelemetry("compress.ok", "info", `new=${stored.id} sources=${ids.length}`);
  return stored;
}
