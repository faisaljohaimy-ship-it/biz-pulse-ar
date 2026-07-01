// Command router — authorizes commands only through the approval gate.
// Never executes anything by itself; returns intent + status transitions.
import type { ApprovalRecord, CommandRecord, OperatorAction } from "./types";

let seq = 0;

export function routeCommand(input: {
  action: OperatorAction;
  approvals: ReadonlyArray<ApprovalRecord>;
  at: string;
}): CommandRecord {
  seq += 1;
  const approvals = input.approvals.filter((a) => a.actionId === input.action.id);
  const approved = approvals.some((a) => a.decision === "approve");
  const rejected = approvals.some((a) => a.decision === "reject");
  let status: CommandRecord["status"];
  let detail: string;
  if (rejected) {
    status = "rejected";
    detail = "explicit_rejection";
  } else if (approved) {
    status = "authorized";
    detail = "approval_present";
  } else {
    status = "pending_authorization";
    detail = "awaiting_human_approval";
  }
  return {
    id: `cmd_${seq}_${input.action.id}`,
    actionId: input.action.id,
    status,
    detail,
    at: input.at,
    evidence: input.action.evidence,
  };
}

/** Command router NEVER auto-executes. This helper only marks executed once an
 * external caller has performed the action outside ARIA. */
export function markExecuted(cmd: CommandRecord, at: string, note: string): CommandRecord {
  if (cmd.status !== "authorized") {
    return { ...cmd, status: "blocked", detail: `cannot_execute:${cmd.status}`, at };
  }
  return { ...cmd, status: "executed", detail: note, at };
}
