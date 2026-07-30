/**
 * Append-only memory store.
 *
 * Records are immutable. "Updates" (access tracking, status transitions,
 * consolidation) are represented by replacing a record with a new frozen
 * version whose id is preserved and whose predecessor is tracked in the
 * audit log. No true mutation of prior evidence occurs.
 */

import type { MemoryRecord, MemoryStatus } from "./types";

const RECORDS = new Map<string, MemoryRecord>();

function freezeRecord(r: MemoryRecord): MemoryRecord {
  return Object.freeze({
    ...r,
    tags: Object.freeze([...r.tags]) as readonly string[],
    evidence: Object.freeze([...r.evidence]) as MemoryRecord["evidence"],
    compressed_from: r.compressed_from
      ? (Object.freeze([...r.compressed_from]) as readonly string[])
      : undefined,
    conflict_partner_ids: Object.freeze([...r.conflict_partner_ids]) as readonly string[],
  });
}

export function putRecord(record: MemoryRecord): MemoryRecord {
  if (RECORDS.has(record.id)) {
    throw new Error(`memory-store: duplicate id ${record.id}`);
  }
  const frozen = freezeRecord(record);
  RECORDS.set(frozen.id, frozen);
  return frozen;
}

export function replaceRecord(record: MemoryRecord): MemoryRecord {
  if (!RECORDS.has(record.id)) {
    throw new Error(`memory-store: unknown id ${record.id}`);
  }
  const frozen = freezeRecord(record);
  RECORDS.set(frozen.id, frozen);
  return frozen;
}

export function getRecord(id: string): MemoryRecord | undefined {
  return RECORDS.get(id);
}

export function listRecords(workspace_id?: string): readonly MemoryRecord[] {
  const all = [...RECORDS.values()];
  return workspace_id ? all.filter((r) => r.workspace_id === workspace_id) : all;
}

export function countByStatus(status: MemoryStatus): number {
  let n = 0;
  for (const r of RECORDS.values()) if (r.status === status) n += 1;
  return n;
}

export function totalCount(): number {
  return RECORDS.size;
}
