/**
 * Phase 9.3 — Execution policy. Deny/allow rules per side effect and
 * adapter category. Real decisions only — no synthetic allow.
 */

import type { AdapterKind, SideEffect } from "./types";

export interface PolicyRule {
  id: string;
  applies_to_adapter: AdapterKind | "*";
  max_side_effect: SideEffect;
  require_org_scope: boolean;
  description: string;
}

export interface PolicyDecision {
  allow: boolean;
  reason: string;
  rule_id: string | null;
}

const SEVERITY: Record<SideEffect, number> = {
  none: 0,
  read: 1,
  write: 2,
  delete: 3,
  admin: 4,
};

const rules = new Map<string, PolicyRule>();

export function addPolicy(rule: PolicyRule): PolicyRule {
  rules.set(rule.id, rule);
  return rule;
}

export function removePolicy(id: string): boolean {
  return rules.delete(id);
}

export function listPolicies(): PolicyRule[] {
  return Array.from(rules.values());
}

export function clearPolicies(): void {
  rules.clear();
}

export interface PolicyInput {
  adapter: AdapterKind;
  side_effect: SideEffect;
  org_id: string | null;
}

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const matches = Array.from(rules.values()).filter(
    (r) => r.applies_to_adapter === "*" || r.applies_to_adapter === input.adapter,
  );
  if (matches.length === 0) {
    return { allow: true, reason: "no matching rule (default allow)", rule_id: null };
  }
  for (const r of matches) {
    if (SEVERITY[input.side_effect] > SEVERITY[r.max_side_effect]) {
      return {
        allow: false,
        reason: `side_effect ${input.side_effect} exceeds rule max ${r.max_side_effect}`,
        rule_id: r.id,
      };
    }
    if (r.require_org_scope && !input.org_id) {
      return { allow: false, reason: "org scope required", rule_id: r.id };
    }
  }
  return { allow: true, reason: "all rules satisfied", rule_id: matches[0]!.id };
}
