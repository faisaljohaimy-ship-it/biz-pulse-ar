/**
 * Append-only audit log for the Knowledge Graph.
 */

import type { AuditEntry } from "./types";

const ENTRIES: AuditEntry[] = [];

function auditId(action: string, ts: string, seq: number): string {
  let h = 5381;
  const seed = `kg-aud|${action}|${ts}|${seq}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `kg_aud_${(h >>> 0).toString(16)}`;
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
    actor: "knowledge-graph",
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
