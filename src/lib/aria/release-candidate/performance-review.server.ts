/**
 * Phase 10.0 — Performance review summarizer.
 */
import type {
  EvidenceRef,
  GateStatus,
  ReviewFinding,
  ReviewReport,
} from "./types";

export interface PerformanceInput {
  readonly p95_ms?: number;
  readonly error_rate?: number;
  readonly baseline_p95_ms: number;
  readonly baseline_error_rate: number;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export function summarizePerformance(input: PerformanceInput): ReviewReport {
  const findings: ReviewFinding[] = [];
  let status: GateStatus = "unknown";

  if (input.p95_ms !== undefined && input.error_rate !== undefined) {
    const p95Bad = input.p95_ms > input.baseline_p95_ms;
    const errBad = input.error_rate > input.baseline_error_rate;
    if (p95Bad) {
      findings.push({
        id: "perf-p95",
        severity: "high",
        title: "p95 above baseline",
        detail: `Observed ${input.p95_ms}ms vs baseline ${input.baseline_p95_ms}ms.`,
      });
    }
    if (errBad) {
      findings.push({
        id: "perf-err",
        severity: "high",
        title: "Error rate above baseline",
        detail: `Observed ${input.error_rate} vs baseline ${input.baseline_error_rate}.`,
      });
    }
    status = p95Bad || errBad ? "fail" : "pass";
  }

  return {
    domain: "performance",
    status,
    findings,
    evidence: input.evidence,
  };
}
