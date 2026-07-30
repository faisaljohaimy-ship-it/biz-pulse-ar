/**
 * Phase 8.6 — Uncertainty catalogue. Surfaces unknowns, information
 * gaps, and confidence intervals derived from the reasoning artifacts.
 */
import type { Assumption, DecisionOption, Evidence, Hypothesis, Uncertainty } from "./types";
import { shortId } from "./util";

export interface UncertaintyReport {
  uncertainties: Uncertainty[];
  overall_confidence_interval: { lower: number; upper: number };
  reasoning: string;
}

export function catalogueUncertainty(
  hypotheses: Hypothesis[],
  evidence: Evidence[],
  options: DecisionOption[],
  assumptions: Assumption[],
): UncertaintyReport {
  const list: Uncertainty[] = [];

  if (evidence.length === 0) {
    list.push({
      id: shortId("un"),
      topic: "evidence",
      kind: "missing_evidence",
      impact: "critical",
      mitigation: "Seed evidence via Context Engine or defer decision.",
      reasoning: "No evidence was supplied — every conclusion has minimal support.",
    });
  }

  for (const h of hypotheses) {
    if (h.opposing_evidence_ids.length > 0 && h.supporting_evidence_ids.length > 0) {
      list.push({
        id: shortId("un"),
        topic: h.statement.slice(0, 80),
        kind: "conflicting_evidence",
        impact: "medium",
        mitigation: "Reconcile via freshness/reliability weighting or gather targeted evidence.",
        reasoning: `Hypothesis has ${h.supporting_evidence_ids.length} supporting vs ${h.opposing_evidence_ids.length} opposing items.`,
      });
    }
  }

  for (const a of assumptions) {
    if (a.challenged && (a.necessity === "must_hold" || a.risk_if_wrong === "critical")) {
      list.push({
        id: shortId("un"),
        topic: a.statement.slice(0, 80),
        kind: "external_dependency",
        impact: a.risk_if_wrong === "critical" ? "critical" : "high",
        mitigation: "Add explicit verification step before committing to this option.",
        reasoning: "Challenged critical assumption remains load-bearing for the decision.",
      });
    }
  }

  const top = options[0];
  const runnerUp = options[1];
  if (top && runnerUp && top.weighted_score - runnerUp.weighted_score < 0.05) {
    list.push({
      id: shortId("un"),
      topic: "top option margin",
      kind: "measurement_error",
      impact: "medium",
      mitigation: "Refine criterion weights with executive input or gather tie-breaking evidence.",
      reasoning: `Top two options differ by ${(top.weighted_score - runnerUp.weighted_score).toFixed(2)} — within noise band.`,
    });
  }

  const confidences = hypotheses.map((h) => h.confidence.value);
  const avg = confidences.length ? confidences.reduce((s, v) => s + v, 0) / confidences.length : 0;
  const spread = confidences.length ? Math.max(...confidences) - Math.min(...confidences) : 0;
  const lower = Math.max(0, avg - spread / 2);
  const upper = Math.min(1, avg + spread / 2);

  return {
    uncertainties: list,
    overall_confidence_interval: { lower, upper },
    reasoning: `Catalogued ${list.length} uncertainties; overall confidence interval [${lower.toFixed(2)}, ${upper.toFixed(2)}].`,
  };
}
