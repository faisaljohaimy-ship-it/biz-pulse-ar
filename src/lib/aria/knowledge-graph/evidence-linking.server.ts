/**
 * Evidence linking.
 *
 * Deduplicates evidence refs deterministically and preserves ordering
 * by taken_at. Requires ≥1 evidence reference — never fabricates.
 */

import type { EvidenceRef } from "./types";

export interface LinkResult {
  readonly evidence: readonly EvidenceRef[];
  readonly duplicates: number;
}

export function linkEvidence(refs: readonly EvidenceRef[]): LinkResult {
  if (refs.length === 0) {
    throw new Error("kg.evidence-linking: at least one evidence reference required");
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
  return Object.freeze({
    evidence: Object.freeze(
      [...seen.values()].sort((a, b) => a.taken_at.localeCompare(b.taken_at)),
    ) as readonly EvidenceRef[],
    duplicates,
  });
}
