/**
 * Reasoning.
 *
 * Derives typed inferences from existing relationships. Every
 * inference is marked `marked_inferred: true` and cites the source
 * relationships that produced it. No inference is stored back into
 * the graph — this module returns candidates only; the Executive
 * Brain owns adoption.
 *
 * Currently supported rules:
 *   - Transitive closure over `depends_on` and `requires`.
 *   - Ontology-defined inverse edges (e.g. `owns` ⇄ `belongs_to`).
 *   - Same-object contradiction detection between `mitigates` and
 *     `violates` on the same policy target.
 */

import { describeRelationship } from "./ontology.server";
import { listRelationships } from "./graph-store.server";
import { deriveConfidence, provenanceScore } from "./confidence.server";
import type {
  Confidence,
  EvidenceRef,
  ReasoningInference,
  RelationshipKind,
  RelationshipRecord,
} from "./types";

function inferenceId(kind: RelationshipKind, from_id: string, to_id: string, ts: string): string {
  let h = 5381;
  const seed = `inf|${kind}|${from_id}|${to_id}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `inf_${(h >>> 0).toString(16)}`;
}

function combineEvidence(
  a: readonly EvidenceRef[],
  b: readonly EvidenceRef[],
): readonly EvidenceRef[] {
  const map = new Map<string, EvidenceRef>();
  for (const ref of [...a, ...b]) map.set(`${ref.kind}:${ref.id}`, ref);
  return Object.freeze([...map.values()].sort((x, y) => x.taken_at.localeCompare(y.taken_at)));
}

function combineConfidence(a: Confidence, b: Confidence): Confidence {
  // Take the weaker of the two (an inference is at most as certain as its weakest premise).
  const rank: Record<Confidence, number> = { unknown: -1, low: 0, medium: 1, high: 2 };
  if (rank[a] < 0 || rank[b] < 0) return "unknown";
  return rank[a] <= rank[b] ? a : b;
}

export interface ReasoningOptions {
  readonly workspace_id: string;
  readonly enable_transitive?: boolean;
  readonly enable_inverse?: boolean;
  readonly enable_contradiction?: boolean;
}

export function reason(opts: ReasoningOptions): readonly ReasoningInference[] {
  const now = new Date().toISOString();
  const relationships = listRelationships(opts.workspace_id);
  const inferences: ReasoningInference[] = [];

  // Transitive closure (single-hop; deeper chains handled by re-running).
  if (opts.enable_transitive ?? true) {
    const transitiveKinds: readonly RelationshipKind[] = ["depends_on", "requires"];
    for (const kind of transitiveKinds) {
      const edges = relationships.filter((r) => r.kind === kind);
      for (const a of edges) {
        for (const b of edges) {
          if (a.to_id !== b.from_id) continue;
          if (a.from_id === b.to_id) continue; // avoid trivial cycles
          const evidence = combineEvidence(a.evidence, b.evidence);
          const confidence = deriveConfidence({
            evidence,
            recurrence: 1,
            freshness_score: 0.5,
            provenance_score: provenanceScore("inferred"),
            schema_score: 1,
          });
          inferences.push(
            Object.freeze({
              id: inferenceId(kind, a.from_id, b.to_id, now),
              created_at: now,
              kind,
              from_id: a.from_id,
              to_id: b.to_id,
              derived_from: Object.freeze([a.id, b.id]) as readonly string[],
              evidence,
              confidence: combineConfidence(
                a.confidence,
                combineConfidence(b.confidence, confidence),
              ),
              marked_inferred: true,
            }),
          );
        }
      }
    }
  }

  // Ontology-defined inverse edges.
  if (opts.enable_inverse ?? true) {
    for (const rel of relationships) {
      const descriptor = describeRelationship(rel.kind);
      if (!descriptor.inverse) continue;
      const inverseKind = descriptor.inverse;
      const alreadyPresent = relationships.some(
        (r) => r.kind === inverseKind && r.from_id === rel.to_id && r.to_id === rel.from_id,
      );
      if (alreadyPresent) continue;
      const evidence = rel.evidence;
      const confidence = combineConfidence(rel.confidence, "medium");
      inferences.push(
        Object.freeze({
          id: inferenceId(inverseKind, rel.to_id, rel.from_id, now),
          created_at: now,
          kind: inverseKind,
          from_id: rel.to_id,
          to_id: rel.from_id,
          derived_from: Object.freeze([rel.id]) as readonly string[],
          evidence,
          confidence,
          marked_inferred: true,
        }),
      );
    }
  }

  // Contradiction candidates: same subject both mitigates and violates the same policy.
  if (opts.enable_contradiction ?? true) {
    const mitigates = relationships.filter((r) => r.kind === "mitigates");
    const violates = relationships.filter((r) => r.kind === "violates");
    for (const m of mitigates) {
      for (const v of violates) {
        if (m.from_id !== v.from_id) continue;
        if (m.to_id !== v.to_id) continue;
        const evidence = combineEvidence(m.evidence, v.evidence);
        inferences.push(
          Object.freeze({
            id: inferenceId("contradicts", m.from_id, m.to_id, now),
            created_at: now,
            kind: "contradicts",
            from_id: m.from_id,
            to_id: m.to_id,
            derived_from: Object.freeze([m.id, v.id]) as readonly string[],
            evidence,
            confidence: combineConfidence(m.confidence, v.confidence),
            marked_inferred: true,
          }),
        );
      }
    }
  }

  return Object.freeze(inferences) as readonly ReasoningInference[];
}

// Helper so downstream modules can create ad-hoc inferences with the correct discipline.
function markInferred(
  kind: RelationshipKind,
  from_id: string,
  to_id: string,
  derived_from: readonly string[],
  evidence: readonly EvidenceRef[],
  confidence: Confidence,
): ReasoningInference {
  const now = new Date().toISOString();
  return Object.freeze({
    id: inferenceId(kind, from_id, to_id, now),
    created_at: now,
    kind,
    from_id,
    to_id,
    derived_from,
    evidence,
    confidence,
    marked_inferred: true,
  });
}

export { markInferred };
