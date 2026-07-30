/**
 * Immutable append-only audit trail.
 * Ring buffer in worker memory; production wire-up can persist externally.
 */
import type { AuditEntry, EvidenceRef } from "./types";

const RING = 1024;
const trail: AuditEntry[] = [];
let seq = 0;

export function record(entry: {
  action_id: string;
  stage: string;
  actor: string;
  ok: boolean;
  detail?: string;
  evidence?: readonly EvidenceRef[];
}): AuditEntry {
  const e: AuditEntry = {
    id: `gov_audit_${Date.now().toString(36)}_${(seq++).toString(36)}`,
    ts: new Date().toISOString(),
    action_id: entry.action_id,
    stage: entry.stage,
    actor: entry.actor,
    ok: entry.ok,
    detail: entry.detail,
    evidence: entry.evidence ?? [],
  };
  trail.push(e);
  if (trail.length > RING) trail.shift();
  return e;
}

export function recent(limit = 100): readonly AuditEntry[] {
  return trail.slice(-Math.max(1, limit));
}

export function forAction(action_id: string): readonly AuditEntry[] {
  return trail.filter((e) => e.action_id === action_id);
}
