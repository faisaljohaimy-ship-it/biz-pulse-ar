/**
 * Phase 8.5 — Runtime policy enforcement. Evaluates the current
 * session against registered runtime policies (budget / compliance /
 * security / permission). Policies never mutate state — they surface
 * violations to the Director, which decides how to react.
 */
import type { ExecutionSession } from "./types";
import { getSession } from "./session.server";

export interface ExecutionRuntimePolicy {
  id: string;
  kind: "budget" | "compliance" | "security" | "permission";
  reason: string;
  evaluate: (session: ExecutionSession) => PolicyViolation | null;
}

export interface PolicyViolation {
  policy_id: string;
  kind: ExecutionRuntimePolicy["kind"];
  message: string;
  hard: boolean;
  ts: string;
}

const registry = new Map<string, ExecutionRuntimePolicy>();

export function registerPolicy(policy: ExecutionRuntimePolicy): void {
  registry.set(policy.id, policy);
}

export function listPolicies(): ExecutionRuntimePolicy[] {
  return Array.from(registry.values());
}

export function evaluatePolicies(sessionId: string): PolicyViolation[] {
  const s = getSession(sessionId);
  if (!s) return [];
  const violations: PolicyViolation[] = [];
  for (const p of registry.values()) {
    try {
      const v = p.evaluate(s);
      if (v) violations.push(v);
    } catch (e) {
      violations.push({
        policy_id: p.id,
        kind: p.kind,
        message: `policy evaluation error: ${e instanceof Error ? e.message : String(e)}`,
        hard: false,
        ts: new Date().toISOString(),
      });
    }
  }
  return violations;
}

// --- Built-in baseline policies ----------------------------------------

registerPolicy({
  id: "budget.mission_retry_ceiling",
  kind: "budget",
  reason: "prevent runaway retry storms",
  evaluate: (s) =>
    s.metrics.retry_count > 32
      ? {
          policy_id: "budget.mission_retry_ceiling",
          kind: "budget",
          message: `retry count ${s.metrics.retry_count} exceeds ceiling`,
          hard: true,
          ts: new Date().toISOString(),
        }
      : null,
});

registerPolicy({
  id: "compliance.failure_saturation",
  kind: "compliance",
  reason: "abort when >50% of tasks fail",
  evaluate: (s) => {
    const total = s.progress.total;
    if (total < 4) return null;
    if (s.progress.failed / total > 0.5) {
      return {
        policy_id: "compliance.failure_saturation",
        kind: "compliance",
        message: `failure ratio ${(s.progress.failed / total).toFixed(2)} above threshold`,
        hard: true,
        ts: new Date().toISOString(),
      };
    }
    return null;
  },
});
