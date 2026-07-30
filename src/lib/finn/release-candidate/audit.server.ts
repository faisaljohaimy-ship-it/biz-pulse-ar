/**
 * Phase 10.0 — Append-only RC1 audit trail (in-memory per run).
 */
import type { AuditRecord, EvidenceRef, GateStatus } from "./types";

export class RcAuditTrail {
  private readonly records: AuditRecord[] = [];

  record(
    stage: string,
    status: GateStatus | "info",
    summary: string,
    evidence: ReadonlyArray<EvidenceRef> = [],
  ): void {
    this.records.push({
      id: `AUD-${this.records.length + 1}`,
      stage,
      status,
      summary,
      evidence,
      recorded_at: new Date().toISOString(),
    });
  }

  entries(): ReadonlyArray<AuditRecord> {
    return this.records.slice();
  }
}
