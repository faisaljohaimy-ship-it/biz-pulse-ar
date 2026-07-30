import type {
  ConfidenceModel,
  DecisionOption,
  DecisionScore,
  Evidence,
  ExecutiveRecommendation,
  Hypothesis,
} from "./types";

export interface VerificationResult {
  readonly ok: boolean;
  readonly issues: ReadonlyArray<string>;
}

export function verifyReasoning(input: {
  evidence: ReadonlyArray<Evidence>;
  hypotheses: ReadonlyArray<Hypothesis>;
  options: ReadonlyArray<DecisionOption>;
  scores: ReadonlyArray<DecisionScore>;
  confidence: ConfidenceModel;
  recommendation: ExecutiveRecommendation;
}): VerificationResult {
  const issues: string[] = [];
  if (input.evidence.length === 0) issues.push("no_evidence");
  if (input.hypotheses.length === 0) issues.push("no_hypotheses");
  if (input.options.length === 0) issues.push("no_options");
  if (input.scores.length === 0) issues.push("no_scores");

  const evidenceIds = new Set(input.evidence.map((e) => e.id));
  for (const h of input.hypotheses) {
    for (const id of [...h.supportingEvidenceIds, ...h.opposingEvidenceIds]) {
      if (!evidenceIds.has(id)) issues.push(`hypothesis_orphan_evidence:${id}`);
    }
  }
  for (const o of input.options) {
    for (const id of o.evidenceIds) {
      if (!evidenceIds.has(id)) issues.push(`option_orphan_evidence:${id}`);
    }
  }

  const optionIds = new Set(input.options.map((o) => o.id));
  if (!optionIds.has(input.recommendation.decisionOptionId)) {
    issues.push("recommendation_unlinked");
  }
  if (input.confidence.overall < 0.25 && !input.recommendation.requiresApproval) {
    issues.push("low_confidence_without_approval");
  }
  if (input.confidence.overall > 1 || input.confidence.overall < 0) {
    issues.push("confidence_out_of_range");
  }

  return { ok: issues.length === 0, issues };
}
