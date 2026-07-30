/**
 * Relationship resolution.
 *
 * Deduplicates edges on (workspace, kind, from_id, to_id). When a
 * duplicate exists, reinforces recurrence + evidence; otherwise
 * inserts. Never fabricates a relationship.
 */

import { listRelationships, putRelationship, replaceRelationship } from "./graph-store.server";
import type { EvidenceRef, RelationshipRecord } from "./types";

export interface ResolveRelationshipResult {
  readonly record: RelationshipRecord;
  readonly reused: boolean;
}

export function findExistingRelationship(
  candidate: RelationshipRecord,
): RelationshipRecord | undefined {
  return listRelationships(candidate.workspace_id).find(
    (r) =>
      r.kind === candidate.kind && r.from_id === candidate.from_id && r.to_id === candidate.to_id,
  );
}

export function resolveRelationship(candidate: RelationshipRecord): ResolveRelationshipResult {
  const existing = findExistingRelationship(candidate);
  if (!existing) {
    putRelationship(candidate);
    return Object.freeze({ record: candidate, reused: false });
  }
  const evidenceMap = new Map<string, EvidenceRef>();
  for (const ref of [...existing.evidence, ...candidate.evidence]) {
    evidenceMap.set(`${ref.kind}:${ref.id}`, ref);
  }
  const merged: RelationshipRecord = {
    ...existing,
    evidence: [...evidenceMap.values()].sort((a, b) => a.taken_at.localeCompare(b.taken_at)),
    recurrence: existing.recurrence + 1,
    attributes: { ...candidate.attributes, ...existing.attributes },
    updated_at: new Date().toISOString(),
  };
  replaceRelationship(merged);
  return Object.freeze({ record: merged, reused: true });
}
