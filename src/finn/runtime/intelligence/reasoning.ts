/**
 * Executive Reasoning Engine — explanations over the decision model.
 *
 * Pure evaluation: explain a decision, why, why not an alternative, impacts
 * across every dimension, confidence, the evidence chain, the reasoning
 * trace, dependencies and missing information. It never mutates a decision
 * and never executes anything.
 */
import {
  IntelError,
  type DecisionAlternative,
  type EvidenceItem,
  type ExecutiveDecision,
  type ImpactAssessment,
  type ImpactLevel,
} from "./types";
import type { ExecutiveEvidenceEngine } from "./evidence";

export class ExecutiveReasoningEngine {
  constructor(private readonly evidence: ExecutiveEvidenceEngine) {}

  /** Full structured explanation of a decision. */
  explainDecision(decision: ExecutiveDecision): readonly string[] {
    const topEvidence = [...decision.evidence].sort((a, b) => b.weight - a.weight)[0];
    return [
      `الهدف: ${decision.objective}`,
      `السياق: ${decision.context}`,
      `الثقة: ${Math.round(decision.confidence * 100)}%`,
      topEvidence ? `أقوى دليل: ${topEvidence.statement} (${topEvidence.source})` : "لا دليل",
      `الأثر: أعمال=${decision.businessImpact.level} · مالي=${decision.financialImpact.level} · تشغيلي=${decision.operationalImpact.level} · امتثال=${decision.complianceImpact.level}`,
      `درجة المخاطر: ${decision.riskScore}/100`,
      `الاعتمادات المطلوبة: ${decision.requiredApprovals.join(", ") || "لا شيء"}`,
    ];
  }

  /** Why this decision — the declared reasoning plus supporting evidence. */
  explainWhy(decision: ExecutiveDecision): readonly string[] {
    return [
      ...decision.reasoningPath,
      ...decision.evidence.map((item) => `دليل (${item.source}): ${item.statement}`),
    ];
  }

  /** Why an alternative was NOT chosen — its declared tradeoff. */
  explainWhyNot(decision: ExecutiveDecision, alternativeId: string): string {
    const alternative = decision.alternatives.find((a) => a.id === alternativeId);
    if (!alternative) {
      throw new IntelError("reasoning", `unknown alternative "${alternativeId}"`);
    }
    return `لم يُختَر «${alternative.summary}»: ${alternative.tradeoff}`;
  }

  /** The strongest alternative recommendation, or null when none exist. */
  alternativeRecommendation(decision: ExecutiveDecision): DecisionAlternative | null {
    return decision.alternatives[0] ?? null;
  }

  businessImpact(decision: ExecutiveDecision): ImpactAssessment {
    return decision.businessImpact;
  }

  operationalImpact(decision: ExecutiveDecision): ImpactAssessment {
    return decision.operationalImpact;
  }

  complianceImpact(decision: ExecutiveDecision): ImpactAssessment {
    return decision.complianceImpact;
  }

  financialImpact(decision: ExecutiveDecision): ImpactAssessment {
    return decision.financialImpact;
  }

  /** Risk impact derived from the decision's risk score. */
  riskImpact(decision: ExecutiveDecision): { score: number; level: ImpactLevel } {
    const score = decision.riskScore;
    const level: ImpactLevel =
      score >= 75
        ? "critical"
        : score >= 50
          ? "high"
          : score >= 25
            ? "medium"
            : score > 0
              ? "low"
              : "none";
    return { score, level };
  }

  confidenceScore(decision: ExecutiveDecision): number {
    return decision.confidence;
  }

  evidenceChain(decision: ExecutiveDecision): readonly EvidenceItem[] {
    return decision.evidence;
  }

  reasoningTrace(decision: ExecutiveDecision): readonly string[] {
    return decision.trace;
  }

  /** Systems this decision depends on / affects. */
  dependencies(decision: ExecutiveDecision): readonly string[] {
    return decision.affectedSystems;
  }

  /** Required topics with no supporting evidence in this decision. */
  missingInformation(
    decision: ExecutiveDecision,
    requiredTopics: readonly string[],
  ): readonly string[] {
    return this.evidence.missingTopics(
      requiredTopics,
      decision.evidence.map((item) => item.id),
    );
  }
}
