/**
 * Risk gate — orchestrates impact + policy + authority + compliance + ethics.
 */
import type { AuthorityLevel, ProposedAction, RiskGateResult } from "./types";
import { classifyImpact } from "./impact-classification.server";
import { evaluatePolicies } from "./policy.server";
import { checkAuthority } from "./authority.server";
import { checkCompliance } from "./compliance.server";
import { checkEthics } from "./ethics.server";

export function evaluateRisk(
  action: ProposedAction,
  granted_authority: AuthorityLevel | null,
): RiskGateResult {
  const impact = classifyImpact(action);
  const policy = evaluatePolicies(action, impact);
  const authority = checkAuthority(granted_authority, impact.level);
  const compliance = checkCompliance(action);
  const ethics = checkEthics(action);

  const blocked: string[] = [];
  policy.filter((p) => !p.ok).forEach((p) => blocked.push(`policy:${p.policy_id}`));
  if (!authority.ok) blocked.push(`authority:${authority.reason}`);
  if (compliance.status === "non_compliant") blocked.push("compliance:non_compliant");
  if (!ethics.ok) blocked.push(`ethics:${ethics.reason ?? "violation"}`);
  if (impact.level === "unknown") blocked.push("impact:unknown");

  return {
    ok: blocked.length === 0,
    impact,
    policy,
    authority,
    compliance,
    ethics,
    blocked_reasons: blocked,
  };
}
