/**
 * Enterprise policy engine. Declarative rules restrict capabilities,
 * agents, and execution modes. Policies are additive to marketplace
 * permissions — a plan violating any active policy is rejected.
 */
import type {
  CapabilityBinding,
  MissionConstraint,
  MissionGoal,
  VerificationIssue,
} from "./types";
import type { AgentId } from "../orchestrator/types";
import type { CapabilityKey } from "../marketplace/types";

export interface EnterprisePolicy {
  id: string;
  description: string;
  forbidden_capabilities?: CapabilityKey[];
  restricted_agents?: AgentId[];
  requires_compliance_domains?: string[];
  forbidden_domains?: string[];
}

const policies: EnterprisePolicy[] = [];

export function registerPolicy(p: EnterprisePolicy): void {
  if (!policies.some((x) => x.id === p.id)) policies.push(p);
}

export function listPolicies(): readonly EnterprisePolicy[] {
  return policies;
}

export function clearPoliciesForTests(): void {
  policies.length = 0;
}

export function evaluatePolicies(
  goal: MissionGoal,
  bindings: CapabilityBinding[],
  constraints: MissionConstraint[],
): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  for (const p of policies) {
    if (p.forbidden_domains?.includes(goal.domain)) {
      issues.push({
        code: "POLICY_FORBIDDEN_DOMAIN",
        message: `${p.id}: domain "${goal.domain}" forbidden`,
        fatal: true,
      });
    }
    if (
      p.requires_compliance_domains?.includes(goal.domain) &&
      !constraints.some((c) => c.kind === "compliance")
    ) {
      issues.push({
        code: "POLICY_COMPLIANCE_MISSING",
        message: `${p.id}: domain "${goal.domain}" requires a compliance constraint`,
        fatal: true,
      });
    }
    for (const b of bindings) {
      if (p.forbidden_capabilities?.includes(b.capability)) {
        issues.push({
          code: "POLICY_FORBIDDEN_CAPABILITY",
          message: `${p.id}: capability "${b.capability}" forbidden`,
          node_id: b.node_id,
          fatal: true,
        });
      }
      if (
        b.resolved_agent &&
        p.restricted_agents?.includes(b.resolved_agent)
      ) {
        issues.push({
          code: "POLICY_RESTRICTED_AGENT",
          message: `${p.id}: agent "${b.resolved_agent}" restricted`,
          node_id: b.node_id,
          fatal: true,
        });
      }
    }
  }
  return issues;
}
