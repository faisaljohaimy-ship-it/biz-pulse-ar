/**
 * AuditTrail — session-only ring buffer of audit records for every
 * prepared execution envelope. Phase 3: no persistent storage.
 */
import type { AuditRecord } from "./execution-envelope";

const TRAIL: AuditRecord[] = [];
const MAX = 500;

export const auditTrail = {
  record(entry: AuditRecord): AuditRecord {
    TRAIL.unshift(entry);
    if (TRAIL.length > MAX) TRAIL.length = MAX;
    return entry;
  },
  list(): readonly AuditRecord[] {
    return [...TRAIL];
  },
  findByRequest(requestId: string): AuditRecord | undefined {
    return TRAIL.find((e) => e.requestId === requestId);
  },
  clear(): void {
    TRAIL.length = 0;
  },
  size(): number {
    return TRAIL.length;
  },
};
