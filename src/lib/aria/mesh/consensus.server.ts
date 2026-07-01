// Consensus tally. Deterministic, evidence-preserving.
import type { ConsensusResult, EvidenceRef } from "./types";
import { ConsensusInputZ } from "./contracts";

export function tallyConsensus(input: {
  proposalId: string;
  term: number;
  proposerNodeId: string;
  value: string;
  submittedAt: string;
  quorum: number;
  votes: Record<string, "accept" | "reject">;
  evidence?: ReadonlyArray<EvidenceRef>;
}): ConsensusResult {
  const parsed = ConsensusInputZ.parse({
    proposalId: input.proposalId,
    term: input.term,
    proposerNodeId: input.proposerNodeId,
    value: input.value,
    submittedAt: input.submittedAt,
    quorum: input.quorum,
    votes: input.votes,
    evidence: input.evidence ?? [],
  });

  const acceptances: string[] = [];
  const rejections: string[] = [];
  for (const [voter, vote] of Object.entries(parsed.votes)) {
    if (vote === "accept") acceptances.push(voter);
    else if (vote === "reject") rejections.push(voter);
  }

  let outcome: ConsensusResult["outcome"] = "pending";
  if (acceptances.length >= parsed.quorum) outcome = "committed";
  else if (rejections.length >= parsed.quorum) outcome = "rejected";

  return {
    proposalId: parsed.proposalId,
    outcome,
    acceptances,
    rejections,
    quorum: parsed.quorum,
    evidence: parsed.evidence,
  };
}
