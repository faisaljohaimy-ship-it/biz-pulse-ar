/**
 * Policy engine — deterministic rule checks.
 * Rules are declarative; new rules can be registered at boot time.
 */
import type { PolicyCheck, ProposedAction } from "./types";
import type { ImpactAssessment } from "./types";

export interface PolicyRule {
  readonly id: string;
  readonly description: string;
  readonly check: (
    action: ProposedAction,
    impact: ImpactAssessment,
  ) => { ok: boolean; reason: string };
}

const rules = new Map<string, PolicyRule>();

export function registerPolicy(rule: PolicyRule): void {
  rules.set(rule.id, rule);
}

export function listPolicies(): readonly PolicyRule[] {
  return Array.from(rules.values());
}

export function evaluatePolicies(
  action: ProposedAction,
  impact: ImpactAssessment,
): readonly PolicyCheck[] {
  const out: PolicyCheck[] = [];
  for (const r of rules.values()) {
    const res = r.check(action, impact);
    out.push({ policy_id: r.id, ok: res.ok, reason: res.reason });
  }
  return out;
}

// --- Default policies -----------------------------------------------------

registerPolicy({
  id: "POL-EVIDENCE-REQUIRED",
  description: "Non-read actions require at least one evidence ref.",
  check: (action) =>
    action.kind === "read" || action.evidence.length > 0
      ? { ok: true, reason: "evidence present or read-only" }
      : { ok: false, reason: "missing evidence for non-read action" },
});

registerPolicy({
  id: "POL-UNKNOWN-KIND-BLOCK",
  description: "Unknown action kinds are blocked.",
  check: (action) =>
    action.kind === "unknown"
      ? { ok: false, reason: "action kind is unknown" }
      : { ok: true, reason: "kind classified" },
});

registerPolicy({
  id: "POL-CRITICAL-REQUIRES-EVIDENCE-2",
  description: "Critical-impact actions require ≥2 evidence refs.",
  check: (action, impact) =>
    impact.level === "critical" && action.evidence.length < 2
      ? { ok: false, reason: "critical action needs ≥2 evidence refs" }
      : { ok: true, reason: "evidence sufficient for impact" },
});

registerPolicy({
  id: "POL-AGENT-CANNOT-POLICY-CHANGE",
  description: "Agents cannot request policy changes.",
  check: (action) =>
    action.kind === "policy_change" &&
    (action.requested_authority ?? "agent") === "agent"
      ? { ok: false, reason: "agent authority insufficient for policy change" }
      : { ok: true, reason: "authority level acceptable" },
});
