/**
 * Ingestion orchestrator.
 *
 * Runs the pipeline: ingest → extract → normalize → resolve entities
 * → resolve relationships → link evidence → derive confidence → store
 * → audit. Rejected items are recorded — never silently dropped.
 */

import { RawIngestPayloadSchema, type RawIngestPayloadInput } from "./contracts";
import { extract } from "./extraction.server";
import { buildEntity } from "./entity.server";
import { buildRelationship } from "./relationship.server";
import { resolveEntity, resolveByName } from "./entity-resolution.server";
import { resolveRelationship } from "./relationship-resolution.server";
import { audit } from "./audit.server";
import { emitTelemetry } from "./telemetry.server";
import type { EntityRecord, IngestionReport } from "./types";

function reportId(source: string, ts: string): string {
  let h = 5381;
  const seed = `ing|${source}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `ing_${(h >>> 0).toString(16)}`;
}

export function ingest(raw: RawIngestPayloadInput): IngestionReport {
  const payload = RawIngestPayloadSchema.parse(raw);
  const bundle = extract(payload);
  const created_at = new Date().toISOString();

  const ingestedEntities: string[] = [];
  const rejected: { reason: string; item: string }[] = [];
  const entityByName = new Map<string, EntityRecord>();

  for (const assertion of bundle.entities) {
    const built = buildEntity({
      workspace_id: bundle.workspace_id,
      provenance: "ingested",
      evidence: bundle.evidence,
      assertion,
    });
    if (!built.ok || !built.record) {
      rejected.push({
        reason: `entity schema — missing ${(built.missing_required_attributes ?? []).join(", ") || "unknown"}`,
        item: `${assertion.kind}:${assertion.name}`,
      });
      continue;
    }
    const resolved = resolveEntity(built.record);
    ingestedEntities.push(resolved.record.id);
    entityByName.set(`${assertion.kind}|${assertion.name.trim().toLowerCase()}`, resolved.record);
    audit(resolved.reused ? "entity.reuse" : "entity.insert", resolved.record.id, resolved.record.evidence.map((e) => e.id));
  }

  const ingestedRelationships: string[] = [];
  for (const assertion of bundle.relationships) {
    const from =
      entityByName.get(`${assertion.from_kind}|${assertion.from_name.trim().toLowerCase()}`) ??
      resolveByName(bundle.workspace_id, assertion.from_kind, assertion.from_name);
    const to =
      entityByName.get(`${assertion.to_kind}|${assertion.to_name.trim().toLowerCase()}`) ??
      resolveByName(bundle.workspace_id, assertion.to_kind, assertion.to_name);
    if (!from || !to) {
      rejected.push({
        reason: "relationship references unresolved endpoint",
        item: `${assertion.from_name} -[${assertion.kind}]-> ${assertion.to_name}`,
      });
      continue;
    }
    const built = buildRelationship({
      workspace_id: bundle.workspace_id,
      provenance: "ingested",
      evidence: bundle.evidence,
      kind: assertion.kind,
      from_id: from.id,
      to_id: to.id,
      from_kind: from.kind,
      to_kind: to.kind,
      attributes: assertion.attributes,
    });
    if (!built.ok || !built.record) {
      rejected.push({
        reason: `relationship rejected — ${built.reason ?? "unknown"}`,
        item: `${assertion.from_name} -[${assertion.kind}]-> ${assertion.to_name}`,
      });
      continue;
    }
    const resolved = resolveRelationship(built.record);
    ingestedRelationships.push(resolved.record.id);
    audit(
      resolved.reused ? "relationship.reuse" : "relationship.insert",
      resolved.record.id,
      resolved.record.evidence.map((e) => e.id),
    );
  }

  emitTelemetry(
    "ingest.ok",
    rejected.length === 0 ? "info" : "warn",
    `source=${bundle.source} entities=${ingestedEntities.length} rels=${ingestedRelationships.length} rejected=${rejected.length}`,
  );

  return Object.freeze({
    id: reportId(bundle.source, created_at),
    created_at,
    source: bundle.source,
    ingested_entities: Object.freeze(ingestedEntities) as readonly string[],
    ingested_relationships: Object.freeze(ingestedRelationships) as readonly string[],
    rejected: Object.freeze(rejected.map((r) => Object.freeze(r))) as IngestionReport["rejected"],
  });
}
