/**
 * Phase 8.6 — Executive recommendation composer. Selects the leading
 * option, explains selection and rejection, and attaches a confidence
 * envelope.
 */
import type {
  DecisionOption,
  ExecutiveRecommendation,
  ReflectionReport,
  Uncertainty,
} from "./types";
import { clamp01, confidence, shortId } from "./util";

export function composeRecommendation(
  options: DecisionOption[],
  reflection: ReflectionReport,
  uncertainties: Uncertainty[],
  traceId: string,
): ExecutiveRecommendation | null {
  if (options.length === 0) return null;
  const [top, ...rest] = options;
  if (!top) return null;

  const whyRejected: Record<string, string> = {};
  for (const o of rest) {
    const gap = (top.weighted_score - o.weighted_score).toFixed(2);
    whyRejected[o.id] =
      `Weighted score gap of ${gap} vs the leading option; risk=${o.risk}, reward=${o.reward}.`;
  }

  const criticalUncertainty = uncertainties.some((u) => u.impact === "critical");
  const conf = clamp01(
    0.7 * top.confidence.value +
      0.15 * (reflection.ok ? 1 : 0) +
      0.15 * (criticalUncertainty ? 0 : 1),
  );

  const requiresApproval =
    top.risk === "critical" || top.risk === "high" || criticalUncertainty || !reflection.ok;

  return {
    id: shortId("rec"),
    title: `Recommended: ${top.title}`,
    summary:
      `Selected option scored ${top.weighted_score.toFixed(2)} across weighted criteria with ` +
      `${top.reward} reward at ${top.risk} risk on a ${top.time_horizon} horizon.`,
    selected_option_id: top.id,
    rejected_option_ids: rest.map((o) => o.id),
    why_selected:
      `Highest weighted score with acceptable risk band; supported by ` +
      `${top.supporting_hypothesis_ids.length} hypothesis(es) and ${top.confidence.evidence_ids.length} evidence item(s).`,
    why_rejected: whyRejected,
    next_action: requiresApproval
      ? "Route to human executive approval before committing resources."
      : "Proceed to Planning Engine for mission construction.",
    confidence: confidence(
      conf,
      `top.confidence=${top.confidence.value.toFixed(2)}, reflection.ok=${reflection.ok}, critical_uncertainty=${criticalUncertainty}`,
      top.confidence.evidence_ids,
    ),
    business_impact: mapImpact(top.reward, top.risk),
    time_horizon: top.time_horizon,
    requires_human_approval: requiresApproval,
    reasoning_trace_id: traceId,
  };
}

function mapImpact(
  reward: DecisionOption["reward"],
  risk: DecisionOption["risk"],
): ExecutiveRecommendation["business_impact"] {
  if (risk === "critical") return "critical";
  if (reward === "high" && risk !== "high") return "high";
  if (reward === "medium") return "medium";
  return "low";
}
