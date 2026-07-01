// Deterministic operational timeline.
import type {
  Alert,
  ApprovalRecord,
  CommandRecord,
  EscalationRecord,
  NormalizedSignal,
  OperatorAction,
  TimelineEvent,
} from "./types";

let seq = 0;

function push(
  out: TimelineEvent[],
  at: string,
  kind: TimelineEvent["kind"],
  subject: string,
  detail: string,
  evidence: TimelineEvent["evidence"],
) {
  seq += 1;
  out.push({ id: `ev_${seq}`, at, kind, subject, detail, evidence });
}

export function buildTimeline(input: {
  signals: ReadonlyArray<NormalizedSignal>;
  alerts: ReadonlyArray<Alert>;
  escalations: ReadonlyArray<EscalationRecord>;
  actions: ReadonlyArray<OperatorAction>;
  approvals: ReadonlyArray<ApprovalRecord>;
  commands: ReadonlyArray<CommandRecord>;
}): ReadonlyArray<TimelineEvent> {
  const out: TimelineEvent[] = [];
  for (const s of input.signals)
    push(out, s.capturedAt, "signal", s.subject, `${s.domain}:${s.severity}`, s.evidence);
  for (const a of input.alerts)
    push(out, a.openedAt, "alert", a.subject, `${a.severity}/${a.priority}`, a.evidence);
  for (const e of input.escalations)
    for (const h of e.hops)
      push(out, h.at, "escalation", e.alertId, `${h.toRole}:${h.reason}`, e.evidence);
  for (const a of input.actions)
    push(out, a.requestedAt, "action", a.target, `${a.command} by ${a.requestedBy}`, a.evidence);
  for (const a of input.approvals)
    push(out, a.decidedAt, "approval", a.actionId, `${a.decision} by ${a.approverId}`, a.evidence);
  for (const c of input.commands)
    push(out, c.at, "command", c.actionId, `${c.status}:${c.detail}`, c.evidence);
  out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return out;
}
