/**
 * Evidence linking — attaches memory ids and graph entity refs to findings.
 * Pure function: caller supplies candidates; we never fabricate links.
 */
import type { MultimodalFinding } from "./types";

export interface LinkCandidates {
  readonly memory_ids?: readonly string[];
  readonly graph_entities?: readonly string[];
}

export function linkEvidence(
  finding: MultimodalFinding,
  candidates: LinkCandidates,
): MultimodalFinding {
  const mem = Array.from(new Set([...finding.linked_memory_ids, ...(candidates.memory_ids ?? [])]));
  const ent = Array.from(
    new Set([...finding.linked_graph_entities, ...(candidates.graph_entities ?? [])]),
  );
  return {
    ...finding,
    linked_memory_ids: mem,
    linked_graph_entities: ent,
  };
}

export function linkAll(
  findings: readonly MultimodalFinding[],
  candidates: LinkCandidates,
): readonly MultimodalFinding[] {
  return findings.map((f) => linkEvidence(f, candidates));
}
