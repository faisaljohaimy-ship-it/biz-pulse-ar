/**
 * Deduplication.
 *
 * Two entities are duplicates when they share workspace + kind and one
 * of the following holds:
 *   - identical normalized canonical name, OR
 *   - one's canonical name is present in the other's alias set.
 *
 * Duplicate detection is deterministic. Merging is a status-preserving
 * replacement that unions aliases + evidence and records `merged_from`.
 */

import { normalizeName } from "./normalization.server";
import { listEntities, replaceEntity } from "./graph-store.server";
import type { EntityRecord, EvidenceRef } from "./types";

export interface DuplicatePair {
  readonly kept_id: string;
  readonly merged_id: string;
}

function keyFor(e: EntityRecord): string {
  return `${e.workspace_id}|${e.kind}|${normalizeName(e.canonical_name)}`;
}

export function findDuplicateEntity(candidate: EntityRecord): EntityRecord | undefined {
  const normalizedCanonical = normalizeName(candidate.canonical_name);
  return listEntities(candidate.workspace_id).find((e) => {
    if (e.id === candidate.id) return false;
    if (e.kind !== candidate.kind) return false;
    if (normalizeName(e.canonical_name) === normalizedCanonical) return true;
    if (e.aliases.includes(normalizedCanonical)) return true;
    for (const alias of candidate.aliases) {
      if (normalizeName(e.canonical_name) === alias) return true;
      if (e.aliases.includes(alias)) return true;
    }
    return false;
  });
}

export function mergeEntities(keep: EntityRecord, merged: EntityRecord): DuplicatePair {
  const now = new Date().toISOString();
  const aliasSet = new Set<string>([
    ...keep.aliases,
    ...merged.aliases,
    normalizeName(merged.canonical_name),
  ]);
  aliasSet.delete(normalizeName(keep.canonical_name));

  const evidenceMap = new Map<string, EvidenceRef>();
  for (const ref of [...keep.evidence, ...merged.evidence]) {
    evidenceMap.set(`${ref.kind}:${ref.id}`, ref);
  }

  const combinedAttributes = { ...merged.attributes, ...keep.attributes };

  replaceEntity({
    ...keep,
    aliases: [...aliasSet].sort(),
    attributes: combinedAttributes,
    evidence: [...evidenceMap.values()].sort((a, b) => a.taken_at.localeCompare(b.taken_at)),
    recurrence: keep.recurrence + merged.recurrence,
    merged_from: [...keep.merged_from, merged.id],
    updated_at: now,
  });

  replaceEntity({
    ...merged,
    // Preserve original evidence but mark as merged into keep.
    merged_from: [...merged.merged_from, keep.id],
    updated_at: now,
  });

  return Object.freeze({ kept_id: keep.id, merged_id: merged.id });
}

export function keyOfEntity(e: EntityRecord): string {
  return keyFor(e);
}
