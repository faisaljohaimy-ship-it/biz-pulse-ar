/**
 * Evidence linking.
 *
 * Ensures every capture carries at least one EvidenceRef and returns
 * a deterministic, deduplicated, ordered list. Duplicate evidence ids
 * are collapsed but never dropped silently — they raise recurrence.
 */

import type { EvidenceRef } from "./types";

export interface LinkResult {
  readonly evidence: readonly EvidenceRef[];
  readonly duplicates: number;
}

export function linkEvidence(refs: readonly EvidenceRef[]): LinkResult {
  if (refs.length === 0) {
    throw new Error("evidence-linking: at least one evidence reference required");
  }
  const seen = new Map<string, EvidenceRef>();
  let duplicates = 0;
  for (const ref of refs) {
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.set(key, ref);
  }
  const ordered = [...seen.values()].sort((a, b) =>
    a.taken_at.localeCompare(b.taken_at),
  );
  return Object.freeze({
    evidence: Object.freeze(ordered) as readonly EvidenceRef[],
    duplicates,
  });
}

export function hasEvidence(refs: readonly EvidenceRef[], id: string): boolean {
  return refs.some((r) => r.id === id);
}
