/**
 * Consolidation.
 *
 * 1. Merge near-duplicates (identical title + body within a kind).
 * 2. Flag conflicts (delegated to conflict-resolution).
 * 3. Compress low-freshness clusters (delegated to compression).
 *
 * Nothing is deleted; nothing is silently reconciled. Evidence is
 * preserved via EvidenceRef union.
 */

import { listRecords, replaceRecord } from "./memory-store.server";
import { detectConflicts } from "./conflict-resolution.server";
import { compressRecords } from "./compression.server";
import { audit } from "./audit.server";
import { emitTelemetry } from "./telemetry.server";
import type { ConsolidationReport, MemoryRecord } from "./types";

function reportId(ts: string): string {
  let h = 5381;
  const seed = `consol|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `consol_${(h >>> 0).toString(16)}`;
}

function dupKey(r: MemoryRecord): string {
  return `${r.workspace_id}|${r.kind}|${r.title.trim().toLowerCase()}|${r.body.trim()}`;
}

export function consolidate(): ConsolidationReport {
  const created_at = new Date().toISOString();

  // 1) merge duplicates
  const groups = new Map<string, MemoryRecord[]>();
  for (const r of listRecords()) {
    if (r.status !== "active") continue;
    const key = dupKey(r);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const merged: { kept_id: string; merged_ids: string[] }[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const kept = sorted[0]!;
    const others = sorted.slice(1);
    replaceRecord({
      ...kept,
      recurrence: kept.recurrence + others.reduce((n, r) => n + r.recurrence, 0),
      access_count: kept.access_count + others.reduce((n, r) => n + r.access_count, 0),
      updated_at: created_at,
    });
    for (const other of others) {
      replaceRecord({ ...other, status: "compressed", updated_at: created_at });
    }
    merged.push({ kept_id: kept.id, merged_ids: others.map((r) => r.id) });
    audit(
      "consolidate.merge",
      kept.id,
      others.map((r) => r.id),
    );
  }

  // 2) conflicts
  const conflicts = detectConflicts();

  // 3) compress low-freshness clusters (records already flagged compressed by decay)
  const compressible = new Map<string, MemoryRecord[]>();
  for (const r of listRecords()) {
    if (r.status !== "compressed") continue;
    if (r.compressed_from) continue; // already a compression result
    const key = `${r.workspace_id}|${r.kind}`;
    const list = compressible.get(key) ?? [];
    list.push(r);
    compressible.set(key, list);
  }
  const compressed: { new_id: string; source_ids: string[] }[] = [];
  for (const list of compressible.values()) {
    if (list.length < 2) continue;
    const ids = list.map((r) => r.id);
    const result = compressRecords(ids);
    compressed.push({ new_id: result.id, source_ids: ids });
  }

  emitTelemetry(
    "consolidate.run",
    "info",
    `merged=${merged.length} conflicts=${conflicts.length} compressed=${compressed.length}`,
  );

  return Object.freeze({
    id: reportId(created_at),
    created_at,
    merged: Object.freeze(
      merged.map((m) =>
        Object.freeze({
          kept_id: m.kept_id,
          merged_ids: Object.freeze(m.merged_ids) as readonly string[],
        }),
      ),
    ) as ConsolidationReport["merged"],
    compressed: Object.freeze(
      compressed.map((c) =>
        Object.freeze({
          new_id: c.new_id,
          source_ids: Object.freeze(c.source_ids) as readonly string[],
        }),
      ),
    ) as ConsolidationReport["compressed"],
    conflicts,
  });
}
