/**
 * Entity module.
 *
 * Constructs frozen EntityRecord values from validated raw assertions.
 * Every entity requires evidence (validated upstream). Confidence and
 * freshness are derived, never invented.
 */

import { normalizeAliases, normalizeAttributes, normalizeName } from "./normalization.server";
import { linkEvidence } from "./evidence-linking.server";
import { deriveConfidence, provenanceScore } from "./confidence.server";
import { entityFreshness, toFreshnessState } from "./freshness.server";
import { checkEntityAttributes } from "./schema.server";
import type {
  EntityKind,
  EntityRecord,
  EvidenceRef,
  Provenance,
  RawEntityAssertion,
} from "./types";

function entityId(workspace_id: string, kind: EntityKind, name: string, ts: string): string {
  let h = 5381;
  const seed = `ent|${workspace_id}|${kind}|${normalizeName(name)}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `ent_${kind}_${(h >>> 0).toString(16)}`;
}

export interface BuildEntityInput {
  readonly workspace_id: string;
  readonly provenance: Provenance;
  readonly evidence: readonly EvidenceRef[];
  readonly assertion: RawEntityAssertion;
  readonly created_at?: string;
}

export interface BuildEntityResult {
  readonly ok: boolean;
  readonly record?: EntityRecord;
  readonly missing_required_attributes?: readonly string[];
}

export function buildEntity(input: BuildEntityInput): BuildEntityResult {
  const attributes = normalizeAttributes(input.assertion.attributes);
  const schema = checkEntityAttributes(input.assertion.kind, attributes);
  if (!schema.ok) {
    return Object.freeze({ ok: false, missing_required_attributes: schema.missing });
  }

  const linked = linkEvidence(input.evidence);
  const now = input.created_at ?? new Date().toISOString();
  const freshness_score = entityFreshness(input.assertion.kind, now);
  const confidence = deriveConfidence({
    evidence: linked.evidence,
    recurrence: 1 + linked.duplicates,
    freshness_score,
    provenance_score: provenanceScore(input.provenance),
    schema_score: 1,
  });

  const record: EntityRecord = {
    id: entityId(input.workspace_id, input.assertion.kind, input.assertion.name, now),
    kind: input.assertion.kind,
    workspace_id: input.workspace_id,
    canonical_name: input.assertion.name.trim(),
    aliases: normalizeAliases(input.assertion.aliases, input.assertion.name),
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
    merged_from: [],
  };

  return Object.freeze({ ok: true, record });
}
