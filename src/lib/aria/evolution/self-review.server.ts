/**
 * Self-review.
 *
 * Applies structural checks to a candidate proposal without asserting
 * anything about correctness. Its output is a set of observations,
 * not a verdict.
 */

import type { ImprovementProposal } from "./types";

export interface SelfReviewObservation {
  readonly code: "missing_evidence" | "vague_summary" | "risk_unassessed" | "ok";
  readonly detail: string;
}

export function reviewProposal(proposal: ImprovementProposal): readonly SelfReviewObservation[] {
  const out: SelfReviewObservation[] = [];
  if (proposal.evidence.length === 0) {
    out.push({ code: "missing_evidence", detail: "Proposal has no evidence." });
  }
  if (proposal.summary.length < 12) {
    out.push({ code: "vague_summary", detail: "Summary is too short." });
  }
  if (proposal.expected_risk === "info" && proposal.expected_gain > 0.25) {
    out.push({
      code: "risk_unassessed",
      detail: "High expected gain without acknowledged risk.",
    });
  }
  if (out.length === 0) out.push({ code: "ok", detail: "No structural issues." });
  return Object.freeze(out) as readonly SelfReviewObservation[];
}
