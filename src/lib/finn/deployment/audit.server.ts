// Append-only in-memory deployment audit trail.
import type { DeploymentAuditEntry, EvidenceRef, TriState } from "./types";

let seq = 0;

export function createAuditLog(): {
  append: (e: {
    at: string;
    stage: string;
    status: TriState;
    detail: string;
    evidence?: ReadonlyArray<EvidenceRef>;
  }) => DeploymentAuditEntry;
  entries: () => ReadonlyArray<DeploymentAuditEntry>;
} {
  const log: DeploymentAuditEntry[] = [];
  return {
    append(e) {
      seq += 1;
      const entry: DeploymentAuditEntry = {
        id: `audit_${seq}`,
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
