// Prioritization — deterministic sort by composite then confidence then id.
import type { ConfidenceBucket, ImprovementProposal } from "./types";

const CONF_WEIGHT: Record<ConfidenceBucket, number> = {
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

export function prioritizeProposals(
  proposals: ReadonlyArray<ImprovementProposal>,
): ReadonlyArray<ImprovementProposal> {
  return [...proposals].sort((a, b) => {
    if (b.score.composite !== a.score.composite) {
      return b.score.composite - a.score.composite;
    }
    const cw = CONF_WEIGHT[b.score.confidence] - CONF_WEIGHT[a.score.confidence];
    if (cw !== 0) return cw;
    return a.id.localeCompare(b.id);
  });
}
