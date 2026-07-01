/**
 * Append-only graph store.
 *
 * Entities and Relationships are immutable. "Updates" replace the
 * record with a new frozen version; the id is preserved and the audit
 * log records the predecessor. No hard deletion.
 */

import type { EntityRecord, RelationshipRecord } from "./types";

const ENTITIES = new Map<string, EntityRecord>();
const RELATIONSHIPS = new Map<string, RelationshipRecord>();

function freezeEntity(e: EntityRecord): EntityRecord {
  return Object.freeze({
    ...e,
    aliases: Object.freeze([...e.aliases]) as readonly string[],
    attributes: Object.freeze({ ...e.attributes }),
    evidence: Object.freeze([...e.evidence]) as EntityRecord["evidence"],
    contradiction_partner_ids: Object.freeze([
      ...e.contradiction_partner_ids,
    ]) as readonly string[],
    merged_from: Object.freeze([...e.merged_from]) as readonly string[],
  });
}

function freezeRelationship(r: RelationshipRecord): RelationshipRecord {
  return Object.freeze({
    ...r,
    attributes: Object.freeze({ ...r.attributes }),
    evidence: Object.freeze([...r.evidence]) as RelationshipRecord["evidence"],
    contradiction_partner_ids: Object.freeze([
      ...r.contradiction_partner_ids,
    ]) as readonly string[],
  });
}

export function putEntity(entity: EntityRecord): EntityRecord {
  if (ENTITIES.has(entity.id)) throw new Error(`graph-store: duplicate entity ${entity.id}`);
  const frozen = freezeEntity(entity);
  ENTITIES.set(frozen.id, frozen);
  return frozen;
}

export function replaceEntity(entity: EntityRecord): EntityRecord {
  if (!ENTITIES.has(entity.id)) throw new Error(`graph-store: unknown entity ${entity.id}`);
  const frozen = freezeEntity(entity);
  ENTITIES.set(frozen.id, frozen);
  return frozen;
}

export function getEntity(id: string): EntityRecord | undefined {
  return ENTITIES.get(id);
}

export function listEntities(workspace_id?: string): readonly EntityRecord[] {
  const all = [...ENTITIES.values()];
  return workspace_id ? all.filter((e) => e.workspace_id === workspace_id) : all;
}

export function putRelationship(rel: RelationshipRecord): RelationshipRecord {
  if (RELATIONSHIPS.has(rel.id))
    throw new Error(`graph-store: duplicate relationship ${rel.id}`);
  const frozen = freezeRelationship(rel);
  RELATIONSHIPS.set(frozen.id, frozen);
  return frozen;
}

export function replaceRelationship(rel: RelationshipRecord): RelationshipRecord {
  if (!RELATIONSHIPS.has(rel.id))
    throw new Error(`graph-store: unknown relationship ${rel.id}`);
  const frozen = freezeRelationship(rel);
  RELATIONSHIPS.set(frozen.id, frozen);
  return frozen;
}

export function getRelationship(id: string): RelationshipRecord | undefined {
  return RELATIONSHIPS.get(id);
}

export function listRelationships(workspace_id?: string): readonly RelationshipRecord[] {
  const all = [...RELATIONSHIPS.values()];
  return workspace_id ? all.filter((r) => r.workspace_id === workspace_id) : all;
}

export function entityCount(): number {
  return ENTITIES.size;
}

export function relationshipCount(): number {
  return RELATIONSHIPS.size;
}
