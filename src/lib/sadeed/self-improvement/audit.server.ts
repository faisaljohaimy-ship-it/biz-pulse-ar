// Append-only self-improvement audit log.
import type { EvidenceRef, SelfImprovementAuditEntry, TriState } from "./types";

let seq = 0;

export function createAuditLog(): {
  append: (e: {
    at: string;
    stage: string;
    status: TriState;
    detail: string;
    evidence?: ReadonlyArray<EvidenceRef>;
  }) => SelfImprovementAuditEntry;
  entries: () => ReadonlyArray<SelfImprovementAuditEntry>;
} {
  const log: SelfImprovementAuditEntry[] = [];
  return {
    append(e) {
      seq += 1;
      const entry: SelfImprovementAuditEntry = {
        id: `si_audit_${seq}`,
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
