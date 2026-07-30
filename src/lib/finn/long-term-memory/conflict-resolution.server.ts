/**
 * Conflict resolution.
 *
 * Conflicts are FLAGGED, never silently resolved. The module identifies
 * conflicting records (same kind + tag + workspace, contradictory
 * confidence/body signals) and marks them `conflict_status="flagged"`
 * with the partner ids. The Executive Brain owns final reconciliation.
 */

import { getRecord, listRecords, replaceRecord } from "./memory-store.server";
import { audit } from "./audit.server";
import { emitTelemetry } from "./telemetry.server";
import type { ConflictReport, MemoryRecord } from "./types";

function conflictId(ids: readonly string[], ts: string): string {
  let h = 5381;
  const seed = `conf|${ids.join(",")}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `conf_${(h >>> 0).toString(16)}`;
}

function keyOf(r: MemoryRecord): string {
  return `${r.workspace_id}|${r.kind}|${r.title.trim().toLowerCase()}`;
}

function contradicts(a: MemoryRecord, b: MemoryRecord): boolean {
  if (a.id === b.id) return false;
  if (a.body.trim() === b.body.trim()) return false;
  // Contradiction heuristic: same title/kind/workspace but different body.
  return true;
}

export function detectConflicts(): readonly ConflictReport[] {
  const groups = new Map<string, MemoryRecord[]>();
  for (const r of listRecords()) {
    if (r.status !== "active") continue;
    const key = keyOf(r);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  const reports: ConflictReport[] = [];
  const created_at = new Date().toISOString();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const contradictions = list.filter((r) => list.some((other) => contradicts(r, other)));
    if (contradictions.length < 2) continue;
    const ids = contradictions.map((r) => r.id);
    for (const r of contradictions) {
      const partners = ids.filter((id) => id !== r.id);
      replaceRecord({
        ...r,
        conflict_status: "flagged",
        conflict_partner_ids: partners,
        status: "conflict",
        updated_at: created_at,
      });
    }
    reports.push(
      Object.freeze({
        id: conflictId(ids, created_at),
        created_at,
        member_ids: Object.freeze(ids) as readonly string[],
        reason: "same kind + title + workspace with divergent body",
        status: "flagged",
      }),
    );
    audit("conflict.flag", ids.join(","), []);
  }
  emitTelemetry("conflict.scan", "info", `flagged=${reports.length}`);
  return Object.freeze(reports) as readonly ConflictReport[];
}

export function markReconciled(subject_id: string, kept_id: string): void {
  const record = getRecord(subject_id);
  if (!record) throw new Error(`conflict-resolution: unknown id ${subject_id}`);
  replaceRecord({
    ...record,
    conflict_status: "reconciled",
    status: record.id === kept_id ? "active" : "compressed",
    updated_at: new Date().toISOString(),
  });
  audit("conflict.reconcile", subject_id, [kept_id]);
}
