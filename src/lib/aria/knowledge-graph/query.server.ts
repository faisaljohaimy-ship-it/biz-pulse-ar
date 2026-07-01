/**
 * Query the graph.
 *
 * Filters entities and relationships by workspace, kind, confidence
 * floor, and freshness. Ranks entities. Returns typed report with
 * uncertainty bucket.
 */

import { GraphQuerySchema, type GraphQueryInput } from "./contracts";
import { listEntities, listRelationships } from "./graph-store.server";
import { rankEntity } from "./ranking.server";
import { audit } from "./audit.server";
import { emitTelemetry } from "./telemetry.server";
import type {
  Confidence,
  EntityRecord,
  QueryReport,
  RankedEntity,
  RelationshipRecord,
} from "./types";

const CONFIDENCE_ORDER: Record<Confidence, number> = {
  unknown: -1,
  low: 0,
  medium: 1,
  high: 2,
};

function reportId(ts: string, workspace_id: string): string {
  let h = 5381;
  const seed = `qry|${workspace_id}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `qry_${(h >>> 0).toString(16)}`;
}

function passesEntity(record: EntityRecord, q: GraphQueryInput): boolean {
  if (q.entity_kinds && !q.entity_kinds.includes(record.kind)) return false;
  if (!q.include_stale && record.freshness === "stale") return false;
  if (q.min_confidence) {
    const floor = CONFIDENCE_ORDER[q.min_confidence];
    if (floor < 0 || CONFIDENCE_ORDER[record.confidence] < floor) return false;
  }
  if (record.evidence.length === 0) return false;
  return true;
}

function passesRelationship(rel: RelationshipRecord, q: GraphQueryInput): boolean {
  if (q.relationship_kinds && !q.relationship_kinds.includes(rel.kind)) return false;
  if (!q.include_stale && rel.freshness === "stale") return false;
  if (q.min_confidence) {
    const floor = CONFIDENCE_ORDER[q.min_confidence];
    if (floor < 0 || CONFIDENCE_ORDER[rel.confidence] < floor) return false;
  }
  if (rel.evidence.length === 0) return false;
  return true;
}

function bucketUncertainty(results: readonly RankedEntity[]): Confidence {
  const scored = results.map((r) => r.composite).filter((v) => v >= 0);
  if (scored.length === 0) return "unknown";
  const top = Math.max(...scored);
  if (top >= 0.7) return "high";
  if (top >= 0.45) return "medium";
  if (top >= 0.2) return "low";
  return "unknown";
}

export function query(raw: GraphQueryInput): QueryReport {
  const q = GraphQuerySchema.parse(raw);
  const now = new Date();
  const created_at = now.toISOString();

  const entities = listEntities(q.workspace_id)
    .filter((e) => passesEntity(e, q))
    .map((e) => rankEntity(e, q.text, now))
    .sort((a, b) => b.composite - a.composite)
    .slice(0, q.limit ?? 50);

  const entityIds = new Set(entities.map((e) => e.record.id));
  const relationships = listRelationships(q.workspace_id)
    .filter((r) => passesRelationship(r, q))
    .filter((r) => entityIds.has(r.from_id) || entityIds.has(r.to_id))
    .slice(0, q.limit ?? 50);

  const uncertainty = bucketUncertainty(entities);
  audit("query", `q:${q.workspace_id}`, entities.map((e) => e.record.id));
  emitTelemetry(
    "query.ok",
    "info",
    `workspace=${q.workspace_id} entities=${entities.length} rels=${relationships.length} uncertainty=${uncertainty}`,
  );

  return Object.freeze({
    id: reportId(created_at, q.workspace_id),
    created_at,
    query: q,
    entities: Object.freeze(entities) as readonly RankedEntity[],
    relationships: Object.freeze(relationships) as readonly RelationshipRecord[],
    uncertainty,
    explanation:
      entities.length === 0
        ? "no evidence-backed entities matched the query"
        : `ranked ${entities.length} entities; top composite=${entities[0]!.composite.toFixed(3)}`,
  });
}
