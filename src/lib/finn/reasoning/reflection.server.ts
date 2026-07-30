/**
 * Phase 8.6 — Reflection / self-review. Aggregates the results of the
 * critical-thinking pass, the uncertainty catalogue, and evidence
 * quality into a pass/fail reflection report.
 */
import type { Evidence, Hypothesis, ReflectionReport, Uncertainty } from "./types";
import type { CriticalReport } from "./critical-thinking.server";

export function reflect(
  critical: CriticalReport,
  uncertainties: Uncertainty[],
  hypotheses: Hypothesis[],
  evidence: Evidence[],
): ReflectionReport {
  const gaps: string[] = [];
  if (!evidence.length) gaps.push("no evidence collected");
  if (!hypotheses.length) gaps.push("no supported hypotheses generated");
  for (const u of uncertainties) {
    if (u.impact === "critical") gaps.push(`critical uncertainty: ${u.topic}`);
  }

  const ok =
    critical.logical_consistency &&
    critical.circular_flags.length === 0 &&
    critical.unsupported_claims.length === 0 &&
    gaps.length === 0;

  return {
    ok,
    logical_consistency: critical.logical_consistency,
    bias_flags: critical.bias_flags,
    circular_flags: critical.circular_flags,
    unsupported_claims: critical.unsupported_claims,
    gaps,
    reasoning: ok
      ? "Reflection pass clean: logically consistent, no critical gaps, evidence-backed conclusions."
      : `Reflection surfaced issues: bias=${critical.bias_flags.length}, ` +
        `circular=${critical.circular_flags.length}, unsupported=${critical.unsupported_claims.length}, gaps=${gaps.length}.`,
  };
}
