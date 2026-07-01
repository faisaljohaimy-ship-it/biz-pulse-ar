/**
 * Phase 8.5 — Runtime decision engine. Given the latest failure /
 * policy signals / approval state, pick the next execution action.
 */
import type { ExecutionDecision, ExecutionDecisionKind, ExecutionFailure } from "./types";
import { appendDecision, getSession } from "./session.server";
import { evaluatePolicies } from "./policy.server";
import { pendingApprovals } from "./approval.server";
import { decideRetry } from "./retry.server";

function newDecisionId(): string {
  return `dec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export interface DecisionInput {
  sessionId: string;
  failure?: ExecutionFailure | null;
  attempt?: number;
}

export function decideNext(input: DecisionInput): ExecutionDecision {
  const now = new Date().toISOString();
  const s = getSession(input.sessionId);
  const base: ExecutionDecision = {
    id: newDecisionId(),
    session_id: input.sessionId,
    kind: "continue",
    reason: "no signals",
    ts: now,
  };
  if (!s) return base;

  // Policy violations trump everything.
  const violations = evaluatePolicies(input.sessionId);
  const hardViolation = violations.find((v) => v.hard);
  if (hardViolation) {
    return commit(input.sessionId, {
      ...base,
      kind: "abort",
      reason: `policy ${hardViolation.policy_id}: ${hardViolation.message}`,
      detail: { violation: hardViolation },
    });
  }

  // Awaiting approvals block progress.
  const pending = pendingApprovals(input.sessionId);
  if (pending.length) {
    return commit(input.sessionId, {
      ...base,
      kind: "await_approval",
      reason: `${pending.length} approval(s) pending`,
      detail: { approval_ids: pending.map((p) => p.id) },
    });
  }

  // React to the latest failure.
  if (input.failure) {
    const attempt = input.attempt ?? 0;
    const retry = decideRetry(input.sessionId, input.failure, attempt);
    if (retry.retry) {
      return commit(input.sessionId, {
        ...base,
        kind: "retry",
        reason: retry.reason,
        detail: { attempt: retry.attempt, delay_ms: retry.delay_ms, failure_id: input.failure.id },
      });
    }
    let kind: ExecutionDecisionKind = "skip";
    switch (input.failure.kind) {
      case "policy":
      case "permission":
        kind = "escalate";
        break;
      case "capability":
      case "dependency":
        kind = "rollback";
        break;
      case "permanent":
        kind = "abort";
        break;
      default:
        kind = "skip";
    }
    return commit(input.sessionId, {
      ...base,
      kind,
      reason: `${input.failure.kind}: ${input.failure.message}`,
      detail: { failure_id: input.failure.id },
    });
  }

  return commit(input.sessionId, base);
}

function commit(sessionId: string, decision: ExecutionDecision): ExecutionDecision {
  appendDecision(sessionId, decision);
  return decision;
}
