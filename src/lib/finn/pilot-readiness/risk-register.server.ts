// Risk register — severity derived from likelihood × impact when not provided.
import type { RiskEntry, Severity } from "./types";
import { RiskEntryZ } from "./contracts";

export function deriveSeverity(l: number, i: number): Severity {
  const s = l * i;
  if (s >= 0.7) return "critical";
  if (s >= 0.5) return "high";
  if (s >= 0.3) return "medium";
  if (s > 0) return "low";
  return "unknown";
}

export function registerRisk(r: RiskEntry): RiskEntry {
  return RiskEntryZ.parse(r);
}

export function summarizeRisks(risks: ReadonlyArray<RiskEntry>): {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
} {
  return {
    total: risks.length,
    critical: risks.filter((r) => r.severity === "critical").length,
    high: risks.filter((r) => r.severity === "high").length,
    medium: risks.filter((r) => r.severity === "medium").length,
    low: risks.filter((r) => r.severity === "low").length,
  };
}
