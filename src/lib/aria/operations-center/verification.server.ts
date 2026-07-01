// Operations Center verification. Enforces "no command without authorization".
import type {
  Alert,
  ApprovalRecord,
  CommandRecord,
  EngineDecision,
  OperatorAction,
} from "./types";

export interface VerificationOutput {
  readonly decision: EngineDecision;
  readonly reasons: ReadonlyArray<string>;
}

export function verifyOps(input: {
  alerts: ReadonlyArray<Alert>;
  actions: ReadonlyArray<OperatorAction>;
  approvals: ReadonlyArray<ApprovalRecord>;
  commands: ReadonlyArray<CommandRecord>;
}): VerificationOutput {
  const reasons: string[] = [];

  const actionIds = new Set(input.actions.map((a) => a.id));

  // Every command must reference a known action.
  for (const c of input.commands) {
    if (!actionIds.has(c.actionId)) reasons.push(`command_orphan:${c.id}`);
  }
  // No executed command without an approve.
  for (const c of input.commands) {
    if (c.status !== "executed") continue;
    const approved = input.approvals.some(
      (a) => a.actionId === c.actionId && a.decision === "approve",
    );
    if (!approved) reasons.push(`executed_without_approval:${c.id}`);
  }
  // No self-approval.
  for (const a of input.approvals) {
    const action = input.actions.find((x) => x.id === a.actionId);
    if (action && action.requestedBy === a.approverId && a.decision === "approve") {
      reasons.push(`self_approval:${a.actionId}`);
    }
  }
  // Alerts must be evidence-linked.
  for (const al of input.alerts) {
    if (al.evidence.length === 0) reasons.push(`alert_no_evidence:${al.id}`);
  }

  let decision: EngineDecision;
  if (reasons.length > 0) decision = "NO_GO";
  else if (input.alerts.length === 0 && input.actions.length === 0) {
    decision = "UNKNOWN";
    reasons.push("no_signals_no_actions");
  } else if (input.commands.some((c) => c.status === "pending_authorization")) {
    decision = "GO_WITH_KNOWN_LIMITATIONS";
    reasons.push("pending_authorization");
  } else {
    decision = "GO";
    reasons.push("all_invariants_satisfied");
  }
  return { decision, reasons };
}
