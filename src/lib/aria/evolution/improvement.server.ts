/**
 * Improvement proposals.
 *
 * Proposals are advisory only — they carry evidence, expected gain,
 * risk, and a confidence bucket. Adoption is the exclusive right of
 * the Executive Brain.
 */

import type { EvidenceRef, ImprovementProposal, Severity } from "./types";
import { deriveConfidence } from "./confidence.server";

const PROPOSALS: ImprovementProposal[] = [];

export interface ProposalInput {
  readonly target: ImprovementProposal["target"];
  readonly summary: string;
  readonly rationale: string;
  readonly expected_gain: number;
  readonly expected_risk: Severity;
  readonly evidence: readonly EvidenceRef[];
}

function proposalId(target: string, ts: string): string {
  let h = 5381;
  const seed = `prop|${target}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `prop_${(h >>> 0).toString(16)}`;
}

export function proposeImprovement(input: ProposalInput): ImprovementProposal {
  if (input.evidence.length === 0) {
    throw new Error("improvement: at least one evidence reference is required");
  }
  const created_at = new Date().toISOString();
  const conf = deriveConfidence({
    subject_id: `prop:${input.target}`,
    evidence_quality: Math.min(1, input.evidence.length / 5),
    execution_success_rate: -1,
    historical_alignment: -1,
    benchmark_alignment: -1,
    pattern_consistency: -1,
    coverage: -1,
    evidence: input.evidence,
  });

  const proposal: ImprovementProposal = Object.freeze({
    id: proposalId(input.target, created_at),
    created_at,
    target: input.target,
    summary: input.summary,
    rationale: input.rationale,
    expected_gain: input.expected_gain,
    expected_risk: input.expected_risk,
    confidence: conf.confidence,
    status: "proposed",
    evidence: Object.freeze([...input.evidence]) as readonly EvidenceRef[],
  });
  PROPOSALS.push(proposal);
  return proposal;
}

export function listProposals(): readonly ImprovementProposal[] {
  return PROPOSALS.slice();
}

export function findProposal(id: string): ImprovementProposal | undefined {
  return PROPOSALS.find((p) => p.id === id);
}
