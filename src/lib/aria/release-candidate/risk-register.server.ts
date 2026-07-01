/**
 * Phase 10.0 — Risk register derived from gate results and reviews.
 */
import type { GateResult, ReviewReport, RiskEntry } from "./types";

export function buildRiskRegister(
  gates: ReadonlyArray<GateResult>,
  reviews: ReadonlyArray<ReviewReport>,
): ReadonlyArray<RiskEntry> {
  const risks: RiskEntry[] = [];

  for (const g of gates) {
    if (g.status === "fail") {
      risks.push({
        id: `risk-${g.gate}-fail`,
        gate: g.gate,
        severity: g.severity,
        likelihood: "high",
        impact: g.severity === "critical" ? "high" : "medium",
        description: `Gate ${g.gate} failed: ${g.summary}`,
        mitigation: `Resolve blockers listed for ${g.gate} and re-run RC1.`,
      });
    } else if (g.status === "unknown") {
      risks.push({
        id: `risk-${g.gate}-unknown`,
        gate: g.gate,
        severity: g.severity,
        likelihood: "medium",
        impact: g.severity === "critical" ? "high" : "medium",
        description: `Gate ${g.gate} lacks evidence.`,
        mitigation: `Supply required evidence for ${g.gate}.`,
      });
    } else if (g.status === "warn") {
      risks.push({
        id: `risk-${g.gate}-warn`,
        gate: g.gate,
        severity: g.severity,
        likelihood: "medium",
        impact: "low",
        description: `Gate ${g.gate} reported warnings.`,
        mitigation: `Review warnings and mitigate before broad rollout.`,
      });
    }
  }

  for (const r of reviews) {
    for (const f of r.findings) {
      risks.push({
        id: `risk-${r.domain}-${f.id}`,
        gate: reviewGate(r.domain),
        severity: f.severity,
        likelihood: f.severity === "critical" ? "high" : "medium",
        impact: f.severity === "critical" ? "high" : "medium",
        description: `${r.domain}: ${f.title}`,
        mitigation: f.detail,
      });
    }
  }

  return risks;
}

function reviewGate(
  domain: ReviewReport["domain"],
): RiskEntry["gate"] {
  switch (domain) {
    case "security":
      return "security";
    case "performance":
      return "performance";
    case "accessibility":
      return "accessibility";
    case "observability":
      return "observability";
    case "dependency":
      return "security";
  }
}
