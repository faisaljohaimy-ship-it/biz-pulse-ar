import type { CommercializationAuditEntry, EvidenceRef, TriState } from "./types";

let seq = 0;

export function createCommercializationAudit(): {
  append: (e: {
    at: string;
    stage: string;
    status: TriState;
    detail: string;
    evidence?: ReadonlyArray<EvidenceRef>;
  }) => CommercializationAuditEntry;
  entries: () => ReadonlyArray<CommercializationAuditEntry>;
} {
  const log: CommercializationAuditEntry[] = [];
  return {
    append(e) {
      seq += 1;
      const entry: CommercializationAuditEntry = {
        id: `com_audit_${seq}`,
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
