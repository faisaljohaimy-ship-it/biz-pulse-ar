/**
 * Phase 10.0 — Accessibility review summarizer.
 */
import type { EvidenceRef, GateStatus, ReviewFinding, ReviewReport } from "./types";

export interface AccessibilityInput {
  readonly axe_completed: boolean;
  readonly findings: ReadonlyArray<ReviewFinding>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export function summarizeAccessibility(input: AccessibilityInput): ReviewReport {
  let status: GateStatus = "unknown";
  if (input.axe_completed) {
    const serious = input.findings.some((f) => f.severity === "critical" || f.severity === "high");
    status = serious ? "fail" : "pass";
  }
  return {
    domain: "accessibility",
    status,
    findings: input.findings,
    evidence: input.evidence,
  };
}
