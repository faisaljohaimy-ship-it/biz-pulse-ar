/**
 * Self-critique.
 *
 * Produces adversarial observations about a proposal — the strongest
 * arguments against adopting it, drawn from its own evidence.
 */

import type { ImprovementProposal } from "./types";

export interface CritiqueObservation {
  readonly code:
    | "low_confidence"
    | "narrow_evidence"
    | "high_risk"
    | "negative_gain"
    | "ok";
  readonly detail: string;
}

export function critiqueProposal(
  proposal: ImprovementProposal,
): readonly CritiqueObservation[] {
  const out: CritiqueObservation[] = [];
  if (proposal.confidence === "low" || proposal.confidence === "unknown") {
    out.push({
      code: "low_confidence",
      detail: `Confidence is ${proposal.confidence}; adoption is premature.`,
    });
  }
  if (proposal.evidence.length < 2) {
    out.push({
      code: "narrow_evidence",
      detail: "Fewer than two independent evidence references.",
    });
  }
  if (proposal.expected_risk === "error" || proposal.expected_risk === "critical") {
    out.push({
      code: "high_risk",
      detail: `Expected risk ${proposal.expected_risk} exceeds safe threshold.`,
    });
  }
  if (proposal.expected_gain < 0) {
    out.push({
      code: "negative_gain",
      detail: "Expected gain is negative.",
    });
  }
  if (out.length === 0) out.push({ code: "ok", detail: "No blocking critique." });
  return Object.freeze(out) as readonly CritiqueObservation[];
}
