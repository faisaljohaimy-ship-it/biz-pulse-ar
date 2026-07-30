/**
 * Append-only audit log.
 *
 * Every recommendation or proposal reference is written here with the
 * evidence IDs used to support it. Deletion is not supported.
 */

import type { AuditEntry } from "./types";

const ENTRIES: AuditEntry[] = [];

function auditId(action: string, ts: string, seq: number): string {
  let h = 5381;
  const seed = `aud|${action}|${ts}|${seq}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `aud_${(h >>> 0).toString(16)}`;
}

export function audit(
  action: string,
  subject_id: string,
  evidence_ids: readonly string[],
): AuditEntry {
  const ts = new Date().toISOString();
  const entry: AuditEntry = Object.freeze({
    id: auditId(action, ts, ENTRIES.length),
    ts,
    actor: "self-evolution",
    action,
    subject_id,
    evidence_ids: Object.freeze([...evidence_ids]) as readonly string[],
  });
  ENTRIES.push(entry);
  return entry;
}

export function listAudit(): readonly AuditEntry[] {
  return ENTRIES.slice();
}
