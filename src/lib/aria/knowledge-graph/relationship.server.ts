/**
 * Relationship module.
 *
 * Constructs frozen RelationshipRecord values from validated raw
 * assertions once both endpoint entities exist. Ontology enforcement
 * happens here — invalid edges are rejected, never coerced.
 */

import { linkEvidence } from "./evidence-linking.server";
import { normalizeAttributes } from "./normalization.server";
import { allowsEdge, describeRelationship } from "./ontology.server";
import { deriveConfidence, provenanceScore } from "./confidence.server";
import { relationshipFreshness, toFreshnessState } from "./freshness.server";
import type {
  EvidenceRef,
  Provenance,
  RelationshipKind,
  RelationshipRecord,
} from "./types";

function relId(
  workspace_id: string,
  kind: RelationshipKind,
  from_id: string,
  to_id: string,
  ts: string,
): string {
  let h = 5381;
  const seed = `rel|${workspace_id}|${kind}|${from_id}|${to_id}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `rel_${kind}_${(h >>> 0).toString(16)}`;
}

export interface BuildRelationshipInput {
  readonly workspace_id: string;
  readonly provenance: Provenance;
  readonly evidence: readonly EvidenceRef[];
  readonly kind: RelationshipKind;
  readonly from_id: string;
  readonly to_id: string;
  readonly from_kind: import("./types").EntityKind;
  readonly to_kind: import("./types").EntityKind;
  readonly attributes?: Readonly<Record<string, string | number | boolean | null>>;
  readonly created_at?: string;
}

export interface BuildRelationshipResult {
  readonly ok: boolean;
  readonly record?: RelationshipRecord;
  readonly reason?: string;
}

export function buildRelationship(input: BuildRelationshipInput): BuildRelationshipResult {
  if (!allowsEdge(input.kind, input.from_kind, input.to_kind)) {
    return Object.freeze({
      ok: false,
      reason: `ontology denies ${input.from_kind} -[${input.kind}]-> ${input.to_kind}`,
    });
  }
  const descriptor = describeRelationship(input.kind);
  if (!descriptor.symmetric && input.from_id === input.to_id) {
    return Object.freeze({ ok: false, reason: `self-loop denied for non-symmetric ${input.kind}` });
  }

  const linked = linkEvidence(input.evidence);
  const attributes = normalizeAttributes(input.attributes);
  const now = input.created_at ?? new Date().toISOString();
  const freshness_score = relationshipFreshness(input.kind, now);
  const confidence = deriveConfidence({
    evidence: linked.evidence,
    recurrence: 1 + linked.duplicates,
    freshness_score,
    provenance_score: provenanceScore(input.provenance),
    schema_score: 1,
  });

  const record: RelationshipRecord = {
    id: relId(input.workspace_id, input.kind, input.from_id, input.to_id, now),
    kind: input.kind,
    workspace_id: input.workspace_id,
    from_id: input.from_id,
    to_id: input.to_id,
    attributes,
    evidence: linked.evidence,
    provenance: input.provenance,
    confidence,
    freshness: toFreshnessState(freshness_score),
    created_at: now,
    updated_at: now,
    recurrence: 1 + linked.duplicates,
    contradiction_status: "none",
    contradiction_partner_ids: [],
  };
  return Object.freeze({ ok: true, record });
}
