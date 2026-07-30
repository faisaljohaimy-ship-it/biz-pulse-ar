/**
 * Phase 9.2 — Policy engine. Rules evaluated against a matcher object.
 */

import { PolicyRuleSchema } from "./contracts";
import type { PolicyDecision, PolicyRule } from "./types";

const rules = new Map<string, PolicyRule>();

export function addPolicy(rule: PolicyRule): PolicyRule {
  const parsed = PolicyRuleSchema.parse(rule) as PolicyRule;
  rules.set(parsed.id, parsed);
  return parsed;
}

export function removePolicy(id: string): boolean {
  return rules.delete(id);
}

export function listPolicies(): PolicyRule[] {
  return Array.from(rules.values());
}

function matches(
  ruleMatcher: Record<string, unknown>,
  candidate: Record<string, unknown>,
): boolean {
  for (const [k, v] of Object.entries(ruleMatcher)) {
    if (candidate[k] !== v) return false;
  }
  return true;
}

export interface PolicyEvaluationInput {
  applies_to: PolicyRule["applies_to"];
  candidate: Record<string, unknown>;
}

export function evaluatePolicy(input: PolicyEvaluationInput): PolicyDecision {
  for (const rule of rules.values()) {
    if (rule.applies_to !== input.applies_to) continue;
    if (matches(rule.matcher, input.candidate)) {
      return {
        rule_id: rule.id,
        decision: rule.effect,
        reason: `matched rule ${rule.id}`,
      };
    }
  }
  return { rule_id: null, decision: "no_rule", reason: "no matching rule" };
}

export function clearPolicies(): void {
  rules.clear();
}
