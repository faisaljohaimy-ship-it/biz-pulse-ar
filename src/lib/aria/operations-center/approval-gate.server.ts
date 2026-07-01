// Approval gate — requires human decision. Deterministic, non-bypassable.
import type { ApprovalRecord, OperatorAction, OperatorRole } from "./types";
import { ApprovalRecordZ } from "./contracts";

const RANK: Record<OperatorRole, number> = {
  operator: 1,
  supervisor: 2,
  director: 3,
  executive: 4,
  board: 5,
  unknown: 0,
};

export function submitApproval(a: ApprovalRecord): ApprovalRecord {
  return ApprovalRecordZ.parse(a);
}

/** An action is authorized only when at least one approve exists at the
 * required role rank AND no explicit reject exists. Approver cannot approve
 * their own action. */
export function isAuthorized(input: {
  action: OperatorAction;
  approvals: ReadonlyArray<ApprovalRecord>;
  minRole: OperatorRole;
}): { authorized: boolean; reason: string } {
  const own = input.approvals.find(
    (a) => a.actionId === input.action.id && a.approverId === input.action.requestedBy,
  );
  if (own && own.decision === "approve") {
    return { authorized: false, reason: "self_approval_forbidden" };
  }
  const rejected = input.approvals.some(
    (a) => a.actionId === input.action.id && a.decision === "reject",
  );
  if (rejected) return { authorized: false, reason: "explicit_rejection" };
  const minRank = RANK[input.minRole] ?? 0;
  const okApprover = input.approvals.find(
    (a) =>
      a.actionId === input.action.id &&
      a.decision === "approve" &&
      RANK[a.role] >= minRank &&
      a.approverId !== input.action.requestedBy,
  );
  if (!okApprover) return { authorized: false, reason: "awaiting_authorized_approver" };
  return { authorized: true, reason: `approved_by:${okApprover.approverId}` };
}
