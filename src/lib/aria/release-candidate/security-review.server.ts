/**
 * Phase 10.0 — Security review summarizer.
 * Findings come from caller-supplied audit inputs; nothing fabricated.
 */
import type {
  EvidenceRef,
  GateStatus,
  ReviewFinding,
  ReviewReport,
} from "./types";

export interface SecurityInput {
  readonly findings: ReadonlyArray<ReviewFinding>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
  readonly scan_completed: boolean;
}

export function summarizeSecurity(input: SecurityInput): ReviewReport {
  let status: GateStatus = "unknown";
  if (input.scan_completed) {
    const hasCriticalOrHigh = input.findings.some(
      (f) => f.severity === "critical" || f.severity === "high",
    );
    status = hasCriticalOrHigh ? "fail" : "pass";
  }
  return {
    domain: "security",
    status,
    findings: input.findings,
    evidence: input.evidence,
  };
}
