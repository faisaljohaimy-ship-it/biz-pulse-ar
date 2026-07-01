// Recommendation issuer — every recommendation has a confidence bucket.
// Recommendations never mutate production; they surface for governance approval.
import type { ImprovementProposal, Recommendation } from "./types";
import { RecommendationInputZ } from "./contracts";

let seq = 0;

export function issueRecommendation(input: {
  proposal: ImprovementProposal;
  summary: string;
  requiredApprovals: ReadonlyArray<string>;
  issuedAt: string;
}): Recommendation | null {
  if (input.proposal.score.confidence === "unknown") {
    // Never issue a recommendation without confidence.
    return null;
  }
  if (input.requiredApprovals.length === 0) {
    throw new Error("recommendation requires at least one approver role");
  }
  seq += 1;
  const parsed = RecommendationInputZ.parse({
    id: `rec_${seq}_${input.proposal.id}`,
    proposalId: input.proposal.id,
    summary: input.summary,
    requiredApprovals: [...input.requiredApprovals],
    issuedAt: input.issuedAt,
    evidence: input.proposal.evidence,
  });
  return {
    id: parsed.id,
    proposalId: parsed.proposalId,
    summary: parsed.summary,
    confidence: input.proposal.score.confidence,
    requiredApprovals: parsed.requiredApprovals,
    issuedAt: parsed.issuedAt,
    evidence: parsed.evidence,
  };
}
