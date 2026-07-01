/**
 * Phase 10.0 — Dependency review summarizer.
 */
import type {
  EvidenceRef,
  GateStatus,
  ReviewFinding,
  ReviewReport,
} from "./types";

export interface DependencyInput {
  readonly audit_completed: boolean;
  readonly critical_vulns: number;
  readonly high_vulns: number;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export function summarizeDependencies(input: DependencyInput): ReviewReport {
  const findings: ReviewFinding[] = [];
  let status: GateStatus = "unknown";

  if (input.audit_completed) {
    if (input.critical_vulns > 0) {
      findings.push({
        id: "dep-critical",
        severity: "critical",
        title: `${input.critical_vulns} critical vulnerabilities`,
        detail: "Resolve before releasing.",
      });
    }
    if (input.high_vulns > 0) {
      findings.push({
        id: "dep-high",
        severity: "high",
        title: `${input.high_vulns} high vulnerabilities`,
        detail: "Plan remediation before pilot expansion.",
      });
    }
    status = findings.length === 0 ? "pass" : "fail";
  }

  return {
    domain: "dependency",
    status,
    findings,
    evidence: input.evidence,
  };
}
