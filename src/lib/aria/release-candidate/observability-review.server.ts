/**
 * Phase 10.0 — Observability review summarizer.
 */
import type {
  EvidenceRef,
  GateStatus,
  ReviewFinding,
  ReviewReport,
} from "./types";

export interface ObservabilityInput {
  readonly logs_enabled?: boolean;
  readonly metrics_enabled?: boolean;
  readonly audit_trail_enabled?: boolean;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export function summarizeObservability(
  input: ObservabilityInput,
): ReviewReport {
  const findings: ReviewFinding[] = [];
  const anyUnknown =
    input.logs_enabled === undefined ||
    input.metrics_enabled === undefined ||
    input.audit_trail_enabled === undefined;

  let status: GateStatus = "unknown";
  if (!anyUnknown) {
    if (!input.logs_enabled)
      findings.push({
        id: "obs-logs",
        severity: "high",
        title: "Structured logs disabled",
        detail: "Enable structured logging before pilot.",
      });
    if (!input.metrics_enabled)
      findings.push({
        id: "obs-metrics",
        severity: "high",
        title: "Metrics pipeline disabled",
        detail: "Enable metrics before pilot.",
      });
    if (!input.audit_trail_enabled)
      findings.push({
        id: "obs-audit",
        severity: "critical",
        title: "Audit trail disabled",
        detail: "Audit trail is mandatory for RC1.",
      });
    status = findings.length === 0 ? "pass" : "fail";
  }

  return {
    domain: "observability",
    status,
    findings,
    evidence: input.evidence,
  };
}
