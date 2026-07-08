/**
 * Extraction.
 *
 * Wraps validated raw assertions into build inputs. This module does
 * not perform NLP or LLM extraction — extraction is the responsibility
 * of the caller (or an upstream connector). Here we only guarantee
 * that the assertions are structurally sound and evidence-linked.
 */

import type {
  EvidenceRef,
  RawEntityAssertion,
  RawIngestPayload,
  RawRelationshipAssertion,
} from "./types";

export interface ExtractedBundle {
  readonly workspace_id: string;
  readonly source: string;
  readonly evidence: readonly EvidenceRef[];
  readonly entities: readonly RawEntityAssertion[];
  readonly relationships: readonly RawRelationshipAssertion[];
}

export function extract(payload: RawIngestPayload): ExtractedBundle {
  return Object.freeze({
    workspace_id: payload.workspace_id,
    source: payload.source,
    evidence: Object.freeze([...payload.evidence]) as readonly EvidenceRef[],
    entities: Object.freeze([...payload.entities]) as readonly RawEntityAssertion[],
    relationships: Object.freeze([...payload.relationships]) as readonly RawRelationshipAssertion[],
  });
}
