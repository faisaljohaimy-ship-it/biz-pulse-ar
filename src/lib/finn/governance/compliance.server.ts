/**
 * Compliance checks — link actions to policy sections (e.g. IS-###).
 * No fabricated compliance: if no rules match, status = requires_review.
 */
import type { ComplianceCheck, ProposedAction } from "./types";

export interface ComplianceRule {
  readonly id: string;
  readonly appliesTo: (action: ProposedAction) => boolean;
  readonly evaluate: (action: ProposedAction) => {
    status: "compliant" | "non_compliant" | "requires_review";
    notes?: string;
  };
}

const rules: ComplianceRule[] = [
  {
    id: "COMP-TENANT-REQUIRED",
    appliesTo: (a) => a.kind === "write" || a.kind === "security_change",
    evaluate: (a) =>
      a.tenant_id
        ? { status: "compliant", notes: "tenant scoped" }
        : { status: "non_compliant", notes: "write/security_change requires tenant_id" },
  },
  {
    id: "COMP-FINANCIAL-EVIDENCE",
    appliesTo: (a) => a.kind === "financial",
    evaluate: (a) =>
      a.evidence.length >= 1
        ? { status: "compliant", notes: "evidence present" }
        : { status: "non_compliant", notes: "financial action needs evidence" },
  },
];

export function checkCompliance(action: ProposedAction): ComplianceCheck {
  const applicable = rules.filter((r) => r.appliesTo(action));
  if (applicable.length === 0) {
    return {
      status: "requires_review",
      rule_ids: [],
      notes: "no compliance rule matched",
    };
  }
  const results = applicable.map((r) => ({ id: r.id, ...r.evaluate(action) }));
  const nonCompliant = results.filter((r) => r.status === "non_compliant");
  if (nonCompliant.length > 0) {
    return {
      status: "non_compliant",
      rule_ids: nonCompliant.map((r) => r.id),
      notes: nonCompliant.map((r) => `${r.id}:${r.notes ?? ""}`).join("; "),
    };
  }
  return {
    status: "compliant",
    rule_ids: results.map((r) => r.id),
    notes: results.map((r) => `${r.id}:${r.notes ?? ""}`).join("; "),
  };
}
