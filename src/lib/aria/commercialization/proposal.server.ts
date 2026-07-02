import type { Proposal } from "./types";
import { ProposalInputZ } from "./contracts";

export function buildProposal(p: Proposal): Proposal {
  const parsed = ProposalInputZ.parse(p);
  if (Date.parse(parsed.validUntil) < Date.parse(parsed.createdAt)) {
    throw new Error("proposal validUntil must be after createdAt");
  }
  return parsed;
}
