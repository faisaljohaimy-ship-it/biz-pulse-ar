// Verification for the Self-Improvement pipeline. Never authorizes autonomous
// production mutations. Unknown remains UNKNOWN.
import type {
  ApprovalRecord,
  EngineDecision,
  ImprovementProposal,
  Recommendation,
  SelfImprovementReport,
} from "./types";

export interface VerificationInput {
  readonly proposals: ReadonlyArray<ImprovementProposal>;
  readonly recommendations: ReadonlyArray<Recommendation>;
  readonly approvals: ReadonlyArray<ApprovalRecord>;
}

export interface VerificationOutput {
  readonly decision: EngineDecision;
  readonly reasons: ReadonlyArray<string>;
}

export function verifyPipeline(input: VerificationInput): VerificationOutput {
  const reasons: string[] = [];

  // No proposal without evidence.
  for (const p of input.proposals) {
    if (p.evidence.length === 0) reasons.push(`proposal_no_evidence:${p.id}`);
  }
  // No recommendation without confidence bucket.
  for (const r of input.recommendations) {
    if (r.confidence === "unknown") reasons.push(`rec_unknown_confidence:${r.id}`);
    if (r.requiredApprovals.length === 0) reasons.push(`rec_missing_approvers:${r.id}`);
    if (r.evidence.length === 0) reasons.push(`rec_no_evidence:${r.id}`);
  }
  // Recommendation must reference an existing proposal.
  const proposalIds = new Set(input.proposals.map((p) => p.id));
  for (const r of input.recommendations) {
    if (!proposalIds.has(r.proposalId)) reasons.push(`rec_orphan:${r.id}`);
  }
  // Approvals must reference an existing proposal.
  for (const a of input.approvals) {
    if (!proposalIds.has(a.proposalId)) reasons.push(`approval_orphan:${a.proposalId}`);
  }

  const anyApproved = input.proposals.some((p) => p.status === "approved");
  const anyUnknown =
    input.proposals.some((p) => p.score.confidence === "unknown") ||
    input.recommendations.length === 0;

  let decision: EngineDecision;
  if (reasons.length > 0) decision = "NO_GO";
  else if (input.proposals.length === 0) {
    decision = "UNKNOWN";
    reasons.push("no_proposals");
  } else if (anyUnknown) {
    decision = "GO_WITH_KNOWN_LIMITATIONS";
    reasons.push("unknown_confidence_or_no_recommendations");
  } else if (!anyApproved) {
    decision = "GO_WITH_KNOWN_LIMITATIONS";
    reasons.push("awaiting_human_approval");
  } else {
    decision = "GO";
    reasons.push("all_invariants_satisfied");
  }
  return { decision, reasons };
}

export function assembleReport(input: {
  report: Omit<SelfImprovementReport, "decision" | "reasons">;
}): SelfImprovementReport {
  const { decision, reasons } = verifyPipeline({
    proposals: input.report.proposals,
    recommendations: input.report.recommendations,
    approvals: input.report.approvals,
  });
  return { ...input.report, decision, reasons };
}
