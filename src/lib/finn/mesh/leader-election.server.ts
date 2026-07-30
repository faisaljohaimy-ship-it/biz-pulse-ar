// Deterministic leader election. No duplicate leader. Requires quorum + unique top.
import type { EvidenceRef, LeaderElection } from "./types";
import { LeaderElectionInputZ } from "./contracts";

export function electLeader(input: {
  clusterId: string;
  candidateIds: ReadonlyArray<string>;
  quorum: number;
  term: number;
  votes: Record<string, string>;
  decidedAt: string;
  evidence?: ReadonlyArray<EvidenceRef>;
}): LeaderElection {
  const parsed = LeaderElectionInputZ.parse({
    clusterId: input.clusterId,
    candidateIds: [...input.candidateIds],
    quorum: input.quorum,
    term: input.term,
    votes: input.votes,
    decidedAt: input.decidedAt,
    evidence: input.evidence ?? [],
  });

  const tally: Record<string, number> = {};
  for (const [voter, candidate] of Object.entries(parsed.votes)) {
    if (!parsed.candidateIds.includes(candidate)) continue;
    if (!parsed.candidateIds.includes(voter)) continue;
    tally[candidate] = (tally[candidate] ?? 0) + 1;
  }

  const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = ranked[0];
  const runnerUp = ranked[1];

  let leaderId: string | null = null;
  if (top && top[1] >= parsed.quorum && (!runnerUp || runnerUp[1] < top[1])) {
    leaderId = top[0];
  }

  return {
    clusterId: parsed.clusterId,
    leaderId,
    term: parsed.term,
    quorum: parsed.quorum,
    participants: parsed.candidateIds,
    tally,
    decidedAt: parsed.decidedAt,
    evidence: parsed.evidence,
  };
}
