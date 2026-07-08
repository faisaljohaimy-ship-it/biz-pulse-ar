/**
 * Entity resolution.
 *
 * Attempts to match a candidate entity to an existing store record.
 * Returns the existing record when a duplicate is found; otherwise
 * inserts the candidate. Reinforces recurrence + evidence on match.
 */

import { findDuplicateEntity, mergeEntities } from "./deduplication.server";
import { getEntity, listEntities, putEntity, replaceEntity } from "./graph-store.server";
import { normalizeName } from "./normalization.server";
import type { EntityKind, EntityRecord } from "./types";

export interface ResolveEntityResult {
  readonly record: EntityRecord;
  readonly reused: boolean;
}

export function resolveByName(
  workspace_id: string,
  kind: EntityKind,
  name: string,
): EntityRecord | undefined {
  const key = normalizeName(name);
  return listEntities(workspace_id).find(
    (e) => e.kind === kind && (normalizeName(e.canonical_name) === key || e.aliases.includes(key)),
  );
}

export function resolveEntity(candidate: EntityRecord): ResolveEntityResult {
  const existing = findDuplicateEntity(candidate);
  if (!existing) {
    putEntity(candidate);
    return Object.freeze({ record: candidate, reused: false });
  }
  mergeEntities(existing, candidate);
  const refreshed = getEntity(existing.id);
  if (!refreshed) {
    // Impossible: mergeEntities never removes ids. Defensive fallback.
    return Object.freeze({ record: existing, reused: true });
  }
  replaceEntity({
    ...refreshed,
    updated_at: new Date().toISOString(),
  });
  return Object.freeze({ record: getEntity(existing.id) ?? existing, reused: true });
}
