/**
 * Constraint engine — validates a plan against declared constraints.
 * Constraints are additive to marketplace permissions and policy rules;
 * this file only checks feasibility, never mutates the plan.
 */
import type { CapabilityBinding, Estimation, MissionConstraint, VerificationIssue } from "./types";

export function validateConstraints(
  constraints: MissionConstraint[],
  estimation: Estimation,
  bindings: CapabilityBinding[],
): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  for (const c of constraints) {
    switch (c.kind) {
      case "budget": {
        const cap = Number(c.value);
        if (Number.isFinite(cap) && estimation.cost_units > cap) {
          issues.push({
            code: "CONSTRAINT_BUDGET_EXCEEDED",
            message: `estimated cost ${estimation.cost_units} exceeds cap ${cap}`,
            fatal: c.hard,
          });
        }
        break;
      }
      case "tokens": {
        const cap = Number(c.value);
        if (Number.isFinite(cap) && estimation.tokens > cap) {
          issues.push({
            code: "CONSTRAINT_TOKENS_EXCEEDED",
            message: `estimated tokens ${estimation.tokens} exceeds cap ${cap}`,
            fatal: c.hard,
          });
        }
        break;
      }
      case "time":
      case "deadline": {
        const cap = Number(c.value);
        if (Number.isFinite(cap) && estimation.duration_ms > cap) {
          issues.push({
            code: "CONSTRAINT_DEADLINE_MISS",
            message: `estimated duration ${estimation.duration_ms}ms exceeds ${cap}ms`,
            fatal: c.hard,
          });
        }
        break;
      }
      case "permission":
      case "policy":
      case "compliance": {
        // Enforced by policy.server.ts; recorded here for traceability.
        break;
      }
      case "cpu":
      case "memory":
      case "priority":
      case "human_approval":
        break;
    }
  }
  const unresolved = bindings.filter((b) => b.match_kind === "unresolved");
  if (unresolved.length) {
    issues.push({
      code: "CONSTRAINT_UNRESOLVED_BINDINGS",
      message: `${unresolved.length} atomic node(s) have no capability match`,
      fatal: false,
    });
  }
  return issues;
}
