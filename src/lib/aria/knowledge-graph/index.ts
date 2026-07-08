/**
 * Phase 9.6 — Enterprise Knowledge Graph.
 *
 * Public surface. Strictly additive; consumers use only what is
 * re-exported here.
 */

export * from "./types";
export * from "./contracts";

export { ONTOLOGY, describeEntity, describeRelationship, allowsEdge } from "./ontology.server";
export { checkEntityAttributes } from "./schema.server";

export {
  putEntity,
  replaceEntity,
  getEntity,
  listEntities,
  putRelationship,
  replaceRelationship,
  getRelationship,
  listRelationships,
  entityCount,
  relationshipCount,
} from "./graph-store.server";

export { linkEvidence } from "./evidence-linking.server";
export { normalizeName, normalizeAliases, normalizeAttributes } from "./normalization.server";
export { findDuplicateEntity, mergeEntities, keyOfEntity } from "./deduplication.server";

export { buildEntity } from "./entity.server";
export { buildRelationship } from "./relationship.server";
export { resolveByName, resolveEntity } from "./entity-resolution.server";
export { findExistingRelationship, resolveRelationship } from "./relationship-resolution.server";

export { extract } from "./extraction.server";
export { ingest } from "./ingestion.server";

export { rankEntity, relevanceOf } from "./ranking.server";
export { query } from "./query.server";
export { traverse } from "./traversal.server";
export { reason, markInferred } from "./reasoning.server";
export { detectContradictions } from "./contradiction.server";

export { entityFreshness, relationshipFreshness, toFreshnessState } from "./freshness.server";
export { deriveConfidence, provenanceScore } from "./confidence.server";

export { verifyGraph } from "./verification.server";
export { recordMetric, listMetrics, metricSummary } from "./metrics.server";
export { emitTelemetry, listTelemetry } from "./telemetry.server";
export { audit, listAudit } from "./audit.server";
