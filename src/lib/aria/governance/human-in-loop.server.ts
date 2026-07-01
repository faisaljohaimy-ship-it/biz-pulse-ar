/**
 * Human-in-the-loop — helpers for surfacing pending approvals to operators.
 */
import type { ApprovalRequest, AuthorityLevel } from "./types";
import { decideApproval, listPendingFor, getApproval } from "./approval.server";

export interface HilResolveInput {
  readonly approval_id: string;
  readonly operator_id: string;
  readonly operator_authority: AuthorityLevel;
  readonly decision: "approved" | "rejected";
  readonly reason?: string;
}

export interface HilResolveResult {
  readonly ok: boolean;
  readonly reason?: string;
  readonly approval?: ApprovalRequest;
}

import { rankOf } from "./authority.server";

export function resolveApproval(input: HilResolveInput): HilResolveResult {
  const current = getApproval(input.approval_id);
  if (!current) return { ok: false, reason: "approval not found" };
  if (current.status !== "pending") {
    return { ok: false, reason: `approval already ${current.status}`, approval: current };
  }
  if (rankOf(input.operator_authority) < rankOf(current.required_from)) {
    return {
      ok: false,
      reason: `operator authority ${input.operator_authority} < required ${current.required_from}`,
      approval: current,
    };
  }
  const updated = decideApproval(
    input.approval_id,
    input.decision,
    input.operator_id,
    input.reason,
  );
  if (!updated) return { ok: false, reason: "decision failed" };
  return { ok: true, approval: updated };
}

export function listQueue(level: AuthorityLevel): readonly ApprovalRequest[] {
  return listPendingFor(level);
}
