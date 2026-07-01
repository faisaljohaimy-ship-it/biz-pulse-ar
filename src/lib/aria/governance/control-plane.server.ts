/**
 * Control Plane — end-to-end governance pipeline.
 */
import type {
  AuthorityLevel,
  ControlPlaneOutcome,
  EscalationEntry,
  ExecutionPermission,
  ProposedAction,
  ApprovalRequest,
} from "./types";
import { ProposedActionSchema } from "./contracts";
import { evaluateRisk } from "./risk-gate.server";
import { withinBoundary } from "./permission-boundary.server";
import { requestApproval, getApproval } from "./approval.server";
import { escalate } from "./escalation.server";
import { record } from "./audit-trail.server";
import { verifyOutcome } from "./verification.server";
import { finishRun, markStage, startRun } from "./telemetry.server";
import { incr, observe } from "./metrics.server";

export interface ControlPlaneInput {
  readonly action: ProposedAction;
  readonly granted_authority: AuthorityLevel | null;
  readonly tenant_context: string | null;
  readonly approval_ttl_ms?: number;
  readonly approval_id?: string;
}

function permissionFrom(
  action_id: string,
  approval?: ApprovalRequest,
  ttl_ms?: number,
): ExecutionPermission {
  const now = new Date();
  const ok =
    !!approval &&
    (approval.status === "approved" ||
      approval.status === "auto_approved" ||
      approval.status === "overridden");
  return {
    ok,
    action_id,
    approval_id: approval?.id,
    authority: approval?.required_from ?? null,
    reason: ok
      ? `permitted via approval ${approval?.id ?? ""} (${approval?.status})`
      : `not permitted (${approval?.status ?? "no approval"})`,
    issued_at: now.toISOString(),
    expires_at: ttl_ms ? new Date(now.getTime() + ttl_ms).toISOString() : undefined,
  };
}

export function submitAction(input: ControlPlaneInput): ControlPlaneOutcome {
  const runId = `gov_run_${Date.now().toString(36)}`;
  startRun(runId);
  const audit_ids: string[] = [];

  const parsed = ProposedActionSchema.safeParse(input.action);
  if (!parsed.success) {
    const e = record({
      action_id: input.action?.id ?? "?",
      stage: "validate",
      actor: "control_plane",
      ok: false,
      detail: parsed.error.message,
    });
    audit_ids.push(e.id);
    finishRun(runId, "blocked");
    incr("gov.blocked.invalid");
    return {
      ok: false,
      action_id: input.action?.id ?? "?",
      impact: { level: "unknown", score: 0, factors: ["invalid_input"] },
      gate: {
        ok: false,
        impact: { level: "unknown", score: 0, factors: [] },
        policy: [],
        authority: {
          required: "executive",
          granted: input.granted_authority,
          ok: false,
          reason: "invalid input",
        },
        compliance: { status: "unknown", rule_ids: [] },
        ethics: { ok: false, principles: [], reason: "invalid input" },
        blocked_reasons: ["invalid_input"],
      },
      audit_ids,
      telemetry_id: runId,
    };
  }
  const action = parsed.data as ProposedAction;

  const t0 = Date.now();
  const gate = evaluateRisk(action, input.granted_authority);
  markStage(runId, "risk_gate", Date.now() - t0);
  observe("gov.impact.score", gate.impact.score);
  incr(`gov.impact.${gate.impact.level}`);

  const t1 = Date.now();
  const boundary = withinBoundary(action, input.granted_authority, input.tenant_context);
  markStage(runId, "boundary", Date.now() - t1);

  const blocked: string[] = [...gate.blocked_reasons];
  if (!boundary.ok) blocked.push(...boundary.reasons.map((r) => `boundary:${r}`));

  if (blocked.length > 0) {
    const e = record({
      action_id: action.id,
      stage: "blocked",
      actor: action.agent_id,
      ok: false,
      detail: blocked.join("|"),
      evidence: action.evidence,
    });
    audit_ids.push(e.id);
    let escalation: EscalationEntry | undefined;
    if (gate.impact.level === "critical" || gate.impact.level === "unknown") {
      escalation = escalate({
        action_id: action.id,
        level: gate.authority.required,
        reason: `blocked: ${blocked.join("|")}`,
      });
      audit_ids.push(escalation.id);
    }
    finishRun(runId, escalation ? "escalated" : "blocked");
    incr("gov.blocked");
    return {
      ok: false,
      action_id: action.id,
      impact: gate.impact,
      gate,
      escalation,
      audit_ids,
      telemetry_id: runId,
    };
  }

  const t2 = Date.now();
  let approval: ApprovalRequest | undefined;
  if (input.approval_id) approval = getApproval(input.approval_id) ?? undefined;
  if (!approval) {
    if (gate.impact.level === "low") {
      approval = requestApproval({
        action_id: action.id,
        required_from: gate.authority.required,
        auto: true,
      });
    } else {
      approval = requestApproval({
        action_id: action.id,
        required_from: gate.authority.required,
        ttl_ms: input.approval_ttl_ms ?? 15 * 60_000,
      });
    }
  }
  markStage(runId, "approval", Date.now() - t2);

  let escalation: EscalationEntry | undefined;
  if (gate.impact.level === "critical") {
    escalation = escalate({
      action_id: action.id,
      level: "executive",
      reason: "critical_impact_awareness",
    });
    audit_ids.push(escalation.id);
  }

  const permission = permissionFrom(action.id, approval, input.approval_ttl_ms);
  const permAudit = record({
    action_id: action.id,
    stage: permission.ok ? "permission.granted" : "permission.deferred",
    actor: "control_plane",
    ok: permission.ok,
    detail: permission.reason,
    evidence: action.evidence,
  });
  audit_ids.push(permAudit.id);

  const outcome: ControlPlaneOutcome = {
    ok: permission.ok,
    action_id: action.id,
    impact: gate.impact,
    gate,
    approval,
    escalation,
    permission,
    audit_ids,
    telemetry_id: runId,
  };
  const v = verifyOutcome(outcome);
  if (!v.ok) {
    const e = record({
      action_id: action.id,
      stage: "verify.fail",
      actor: "control_plane",
      ok: false,
      detail: v.reasons.join("|"),
    });
    audit_ids.push(e.id);
    finishRun(runId, "blocked");
    incr("gov.blocked.verify");
    return {
      ...outcome,
      ok: false,
      permission: { ...permission, ok: false, reason: `verify_failed:${v.reasons.join("|")}` },
    };
  }

  finishRun(runId, permission.ok ? "allowed" : "pending");
  incr(permission.ok ? "gov.allowed" : "gov.pending");
  return outcome;
}
