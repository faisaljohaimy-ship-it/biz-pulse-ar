/**
 * Verification.
 *
 * Structural + semantic checks over the graph. Refuses to declare OK
 * when any invariant is violated. All findings are append-only
 * observations. No mutation.
 */

import { listEntities, listRelationships } from "./graph-store.server";
import { allowsEdge } from "./ontology.server";
import type { VerificationIssue, VerificationReport } from "./types";

function verId(ts: string): string {
  let h = 5381;
  const seed = `ver-kg|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `ver_kg_${(h >>> 0).toString(16)}`;
}

export function verifyGraph(): VerificationReport {
  const issues: VerificationIssue[] = [];
  const entities = listEntities();
  const relationships = listRelationships();
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const seenEntityIds = new Set<string>();
  const seenRelationshipIds = new Set<string>();

  for (const e of entities) {
    if (seenEntityIds.has(e.id)) {
      issues.push({ code: "duplicate_id", detail: `duplicate entity ${e.id}`, subject_id: e.id });
    }
    seenEntityIds.add(e.id);

    if (e.evidence.length === 0) {
      issues.push({
        code: "missing_evidence",
        detail: `entity ${e.id} has no evidence`,
        subject_id: e.id,
      });
    }
    if (e.merged_from.includes(e.id) || e.contradiction_partner_ids.includes(e.id)) {
      issues.push({
        code: "circular_link",
        detail: `entity ${e.id} references itself`,
        subject_id: e.id,
      });
    }
  }

  for (const r of relationships) {
    if (seenRelationshipIds.has(r.id)) {
      issues.push({
        code: "duplicate_id",
        detail: `duplicate relationship ${r.id}`,
        subject_id: r.id,
      });
    }
    seenRelationshipIds.add(r.id);

    if (r.evidence.length === 0) {
      issues.push({
        code: "missing_evidence",
        detail: `relationship ${r.id} has no evidence`,
        subject_id: r.id,
      });
    }
    const from = entityMap.get(r.from_id);
    const to = entityMap.get(r.to_id);
    if (!from || !to) {
      issues.push({
        code: "dangling_edge",
        detail: `relationship ${r.id} references missing endpoint`,
        subject_id: r.id,
      });
      continue;
    }
    if (!allowsEdge(r.kind, from.kind, to.kind)) {
      issues.push({
        code: "ontology_violation",
        detail: `relationship ${r.id} violates ontology (${from.kind} -[${r.kind}]-> ${to.kind})`,
        subject_id: r.id,
      });
    }
    if (r.provenance === "inferred") {
      // Inferred edges MUST live in reasoning module output — the store must never receive them silently.
      issues.push({
        code: "unmarked_inference",
        detail: `relationship ${r.id} is inferred but stored in the append-only graph`,
        subject_id: r.id,
      });
    }
  }

  const created_at = new Date().toISOString();
  return Object.freeze({
    id: verId(created_at),
    created_at,
    ok: issues.length === 0,
    issues: Object.freeze(issues) as readonly VerificationIssue[],
    checked_entities: entities.length,
    checked_relationships: relationships.length,
  });
}
