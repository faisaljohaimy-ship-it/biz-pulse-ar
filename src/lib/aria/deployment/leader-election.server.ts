// Deterministic leader election. No duplicate leaders.
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
    evidence: input.evidence ?? [],
  });

  const tally = new Map<string, number>();
  for (const [voter, candidate] of Object.entries(parsed.votes)) {
    if (!parsed.candidateIds.includes(candidate)) continue;
    if (!parsed.candidateIds.includes(voter)) continue;
    tally.set(candidate, (tally.get(candidate) ?? 0) + 1);
  }

  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = ranked[0];
  const runnerUp = ranked[1];

  let leaderId: string | null = null;
  if (top && top[1] >= parsed.quorum) {
    if (!runnerUp || runnerUp[1] < top[1]) {
      leaderId = top[0];
    }
  }

  return {
    clusterId: parsed.clusterId,
    leaderId,
    term: parsed.term,
    quorum: parsed.quorum,
    participants: parsed.candidateIds,
    decidedAt: input.decidedAt,
    evidence: parsed.evidence,
  };
}
