// Risk severity derivation from likelihood × impact.
import type { RiskRecord, Severity } from "./types";
import { RiskRecordZ } from "./contracts";

export function deriveRiskSeverity(likelihood: number, impact: number): Severity {
  const score = likelihood * impact;
  if (score >= 0.7) return "critical";
  if (score >= 0.5) return "high";
  if (score >= 0.3) return "medium";
  if (score > 0) return "low";
  return "unknown";
}

export function validateRisk(r: RiskRecord): RiskRecord {
  return RiskRecordZ.parse(r);
}

export function summarizeRisks(risks: ReadonlyArray<RiskRecord>): {
  critical: number;
  high: number;
  medium: number;
  low: number;
} {
  return {
    critical: risks.filter((r) => r.severity === "critical").length,
    high: risks.filter((r) => r.severity === "high").length,
    medium: risks.filter((r) => r.severity === "medium").length,
    low: risks.filter((r) => r.severity === "low").length,
  };
}
