/**
 * Phase 9.2 — Consensus voting between agents.
 */

import { ConsensusProposalSchema, ConsensusVoteSchema } from "./contracts";
import type { ConsensusProposal, ConsensusResult, ConsensusVote } from "./types";

const proposals = new Map<string, ConsensusProposal>();
const votes = new Map<string, ConsensusVote[]>();
const results = new Map<string, ConsensusResult>();

function newId(): string {
  return `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function propose(input: Omit<ConsensusProposal, "id" | "created_at">): ConsensusProposal {
  const p: ConsensusProposal = {
    ...input,
    id: newId(),
    created_at: new Date().toISOString(),
  };
  const parsed = ConsensusProposalSchema.parse(p) as ConsensusProposal;
  proposals.set(parsed.id, parsed);
  votes.set(parsed.id, []);
  results.set(parsed.id, {
    proposal_id: parsed.id,
    status: "pending",
    chosen_option: null,
    tallies: {},
    finalized_at: null,
  });
  return parsed;
}

export function castVote(vote: ConsensusVote): ConsensusResult {
  const parsed = ConsensusVoteSchema.parse(vote) as ConsensusVote;
  const proposal = proposals.get(parsed.proposal_id);
  if (!proposal) throw new Error(`runtime: proposal not found ${parsed.proposal_id}`);
  if (!proposal.options.includes(parsed.option)) {
    throw new Error(`runtime: option not in proposal ${parsed.option}`);
  }
  const list = votes.get(parsed.proposal_id) ?? [];
  const filtered = list.filter((v) => v.voter_agent_id !== parsed.voter_agent_id);
  filtered.push(parsed);
  votes.set(parsed.proposal_id, filtered);

  const tallies: Record<string, number> = {};
  for (const v of filtered) tallies[v.option] = (tallies[v.option] ?? 0) + v.weight;

  let winner: string | null = null;
  let top = 0;
  for (const [opt, val] of Object.entries(tallies)) {
    if (val > top) {
      top = val;
      winner = opt;
    }
  }
  const reached = winner !== null && top >= proposal.quorum;
  const result: ConsensusResult = {
    proposal_id: proposal.id,
    status: reached ? "reached" : "pending",
    chosen_option: reached ? winner : null,
    tallies,
    finalized_at: reached ? new Date().toISOString() : null,
  };
  results.set(proposal.id, result);
  return result;
}

export function getConsensusResult(proposalId: string): ConsensusResult | null {
  return results.get(proposalId) ?? null;
}

export function expireProposal(proposalId: string): void {
  const r = results.get(proposalId);
  if (!r || r.status !== "pending") return;
  results.set(proposalId, { ...r, status: "expired", finalized_at: new Date().toISOString() });
}
