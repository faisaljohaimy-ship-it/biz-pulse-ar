/**
 * Recommendation Generator — coerces the model's recommendation payload
 * into the canonical `Recommendation` shape and injects sensible defaults
 * for missing fields. Never invents facts; only fills structural gaps.
 */
import type { Priority, Recommendation } from "./types";
import type { ModelEnvelope } from "./contracts";
import type { AriaIntent } from "../executive-reasoning.server";

function defaultDepartment(intent: AriaIntent): string {
  switch (intent) {
    case "incident_review":
    case "root_cause":
    case "investigation":
    case "risk_assessment":
      return "Industrial Security Operations";
    case "kpi_explanation":
    case "trend_analysis":
    case "comparison":
    case "analysis":
    case "prediction":
      return "Executive Performance Office";
    case "operational_status":
    case "executive_summary":
    case "meeting_brief":
    case "decision_support":
    case "recommendation":
      return "Chief Security Office";
    default:
      return "Industrial Security Operations";
  }
}

function priorityFromRisk(topRiskScore: number): Priority {
  if (topRiskScore >= 0.7) return "critical";
  if (topRiskScore >= 0.45) return "high";
  if (topRiskScore >= 0.2) return "medium";
  return "low";
}

export function normalizeRecommendation(
  raw: ModelEnvelope["recommendation"],
  intent: AriaIntent,
  topRiskScore: number,
): Recommendation | null {
  if (!raw) return null;
  const priority = raw.priority ?? priorityFromRisk(topRiskScore);
  return {
    why_en: raw.why_en,
    why_ar: raw.why_ar,
    evidence: raw.evidence.slice(0, 8),
    expected_impact_en: raw.expected_impact_en,
    expected_impact_ar: raw.expected_impact_ar,
    priority,
    confidence: Math.max(0, Math.min(1, raw.confidence)),
    responsible_department: raw.responsible_department || defaultDepartment(intent),
    deadline: raw.deadline || "this week",
  };
}
