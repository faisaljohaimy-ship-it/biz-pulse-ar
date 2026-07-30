/**
 * Phase 10.1 — Append-only audit trail for production runtime.
 */
import type { AuditEntry, EvidenceRef } from "./types";

export class RuntimeAuditTrail {
  private readonly entries: AuditEntry[] = [];

  record(stage: string, summary: string, evidence: ReadonlyArray<EvidenceRef> = []): AuditEntry {
    const entry: AuditEntry = {
      id: `AUD-${this.entries.length + 1}`,
      stage,
      summary,
      recorded_at: new Date().toISOString(),
      evidence,
    };
    this.entries.push(entry);
    return entry;
  }

  list(): ReadonlyArray<AuditEntry> {
    return this.entries.slice();
  }
}
