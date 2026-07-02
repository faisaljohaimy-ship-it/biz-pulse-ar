// Append-only pilot audit log.
import type { EvidenceRef, PilotAuditEntry, TriState } from "./types";

let seq = 0;

export function createPilotAudit(): {
  append: (e: {
    at: string;
    stage: string;
    status: TriState;
    detail: string;
    evidence?: ReadonlyArray<EvidenceRef>;
  }) => PilotAuditEntry;
  entries: () => ReadonlyArray<PilotAuditEntry>;
} {
  const log: PilotAuditEntry[] = [];
  return {
    append(e) {
      seq += 1;
      const entry: PilotAuditEntry = {
        id: `pilot_audit_${seq}`,
        at: e.at,
        stage: e.stage,
        status: e.status,
        detail: e.detail,
        evidence: e.evidence ?? [],
      };
      log.push(entry);
      return entry;
    },
    entries: () => log.slice(),
  };
}
