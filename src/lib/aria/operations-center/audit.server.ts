// Append-only operations audit log.
import type { EvidenceRef, OpsAuditEntry, TriState } from "./types";

let seq = 0;

export function createOpsAudit(): {
  append: (e: {
    at: string;
    stage: string;
    status: TriState;
    detail: string;
    evidence?: ReadonlyArray<EvidenceRef>;
  }) => OpsAuditEntry;
  entries: () => ReadonlyArray<OpsAuditEntry>;
} {
  const log: OpsAuditEntry[] = [];
  return {
    append(e) {
      seq += 1;
      const entry: OpsAuditEntry = {
        id: `ops_audit_${seq}`,
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
