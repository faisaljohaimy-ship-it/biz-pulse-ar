/**
 * Append-only audit log.
 *
 * Records every capture, retrieval, consolidation, decay, and
 * forgetting decision with the evidence IDs that supported it.
 * Deletion is not supported — forgetting is a status transition
 * with the original id retained.
 */

import type { AuditEntry } from "./types";

const ENTRIES: AuditEntry[] = [];

function auditId(action: string, ts: string, seq: number): string {
  let h = 5381;
  const seed = `ltm-aud|${action}|${ts}|${seq}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `ltm_aud_${(h >>> 0).toString(16)}`;
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
    actor: "long-term-memory",
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
