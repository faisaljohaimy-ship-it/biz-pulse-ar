/**
 * Append-only audit log for multimodal pipeline events.
 * In-memory ring buffer; safe under worker runtime.
 */
export interface AuditEntry {
  readonly id: string;
  readonly ts: string;
  readonly stage: string;
  readonly source_id: string;
  readonly ok: boolean;
  readonly detail?: string;
}

const RING_SIZE = 512;
const ring: AuditEntry[] = [];

export function audit(entry: Omit<AuditEntry, "id" | "ts">): AuditEntry {
  const e: AuditEntry = {
    id: `mm_audit_${Date.now().toString(36)}_${ring.length.toString(36)}`,
    ts: new Date().toISOString(),
    ...entry,
  };
  ring.push(e);
  if (ring.length > RING_SIZE) ring.shift();
  return e;
}

export function recent(limit = 50): readonly AuditEntry[] {
  return ring.slice(-Math.max(1, limit));
}
