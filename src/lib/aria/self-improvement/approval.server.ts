// Human approval gate. Never auto-approves. Never mutates production.
import type {
  ApprovalRecord,
  ImprovementProposal,
  ImprovementStatus,
} from "./types";
import { ApprovalInputZ } from "./contracts";

export function submitApproval(input: {
  proposalId: string;
  approverId: string;
  decision: ApprovalRecord["decision"];
  justification: string;
  decidedAt: string;
  evidence?: ApprovalRecord["evidence"];
}): ApprovalRecord {
  return ApprovalInputZ.parse({
    proposalId: input.proposalId,
    approverId: input.approverId,
    decision: input.decision,
    justification: input.justification,
    decidedAt: input.decidedAt,
    evidence: input.evidence ?? [],
  });
}

export function applyApproval(
  proposal: ImprovementProposal,
  approval: ApprovalRecord,
): ImprovementProposal {
  if (proposal.id !== approval.proposalId) return proposal;
  let status: ImprovementStatus = proposal.status;
  if (approval.decision === "approve") status = "approved";
  else if (approval.decision === "reject") status = "rejected";
  else if (approval.decision === "defer") status = "under_review";
  else status = "unknown";
  return { ...proposal, status };
}
