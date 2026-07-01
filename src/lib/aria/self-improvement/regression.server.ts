// Regression classifier — severity from deltaPct thresholds.
import type { BenchmarkComparison, RegressionFinding } from "./types";

export interface RegressionThresholds {
  readonly warnPct: number; // >0
  readonly criticalPct: number; // > warnPct
}

let seq = 0;

export function detectRegression(input: {
  comparison: BenchmarkComparison;
  thresholds: RegressionThresholds;
  detectedAt: string;
}): RegressionFinding | null {
  const { comparison } = input;
  if (comparison.state === "unknown") {
    seq += 1;
    return {
      id: `reg_${seq}`,
      subject: comparison.subject,
      metric: comparison.metric,
      severity: "unknown",
      deltaPct: comparison.deltaPct,
      detectedAt: input.detectedAt,
      evidence: comparison.evidence,
    };
  }
  if (!comparison.regression || comparison.deltaPct === null) return null;
  const abs = Math.abs(comparison.deltaPct);
  let severity: RegressionFinding["severity"] = "low";
  if (abs >= input.thresholds.criticalPct) severity = "critical";
  else if (abs >= input.thresholds.warnPct) severity = "high";
  else if (abs >= input.thresholds.warnPct / 2) severity = "medium";
  seq += 1;
  return {
    id: `reg_${seq}`,
    subject: comparison.subject,
    metric: comparison.metric,
    severity,
    deltaPct: comparison.deltaPct,
    detectedAt: input.detectedAt,
    evidence: comparison.evidence,
  };
}
