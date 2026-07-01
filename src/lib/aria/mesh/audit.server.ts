// Append-only mesh audit log.
import type { EvidenceRef, MeshAuditEntry, TriState } from "./types";

let seq = 0;

export function createAuditLog(): {
  append: (e: {
    at: string;
    stage: string;
    status: TriState;
    detail: string;
    evidence?: ReadonlyArray<EvidenceRef>;
  }) => MeshAuditEntry;
  entries: () => ReadonlyArray<MeshAuditEntry>;
} {
  const log: MeshAuditEntry[] = [];
  return {
    append(e) {
      seq += 1;
      const entry: MeshAuditEntry = {
        id: `mesh_audit_${seq}`,
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
