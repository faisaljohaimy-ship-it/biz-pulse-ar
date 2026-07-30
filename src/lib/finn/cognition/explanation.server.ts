import { emitCognitiveEvent } from "./events";
import type {
  Alternative,
  ConfidenceModel,
  Contradiction,
  DecisionOption,
  DecisionScore,
  Evidence,
  ExecutiveRecommendation,
  RiskSignal,
  SimulationResult,
  Tradeoff,
} from "./types";

export interface ExplanationBundle {
  readonly human: string;
  readonly machine: Readonly<Record<string, unknown>>;
}

export function generateRecommendation(input: {
  winner: DecisionOption | null;
  score: DecisionScore | null;
  confidence: ConfidenceModel;
  risks: ReadonlyArray<RiskSignal>;
}): ExecutiveRecommendation {
  const winner = input.winner;
  if (!winner) {
    return {
      decisionOptionId: "none",
      title: "Defer decision — insufficient support",
      rationale: "No viable option met the evidence and confidence thresholds.",
      nextAction: "Gather additional evidence or reframe the goal.",
      businessImpact: "Prevents low-confidence commitments.",
      requiresApproval: true,
    };
  }
  const criticalRisks = input.risks.filter((r) => r.likelihood * r.impact >= 0.4);
  const requiresApproval = input.confidence.overall < 0.6 || criticalRisks.length > 0;
  return {
    decisionOptionId: winner.id,
    title: winner.title,
    rationale: `Selected on composite score ${(input.score?.score ?? 0).toFixed(2)} with confidence ${(input.confidence.overall * 100).toFixed(0)}%.`,
    nextAction: `Route "${winner.title}" to the Executive Brain for authorization.`,
    businessImpact: winner.summary,
    requiresApproval,
  };
}

export function buildExplanation(input: {
  goal: string;
  evidence: ReadonlyArray<Evidence>;
  options: ReadonlyArray<DecisionOption>;
  tradeoffs: ReadonlyArray<Tradeoff>;
  scores: ReadonlyArray<DecisionScore>;
  alternatives: ReadonlyArray<Alternative>;
  contradictions: ReadonlyArray<Contradiction>;
  simulations: ReadonlyArray<SimulationResult>;
  risks: ReadonlyArray<RiskSignal>;
  confidence: ConfidenceModel;
  recommendation: ExecutiveRecommendation;
}): ExplanationBundle {
  const lines: string[] = [];
  lines.push(`# Executive Recommendation`);
  lines.push("");
  lines.push(`**Goal:** ${input.goal}`);
  lines.push(`**Decision:** ${input.recommendation.title}`);
  lines.push(`**Confidence:** ${(input.confidence.overall * 100).toFixed(0)}%`);
  lines.push(`**Requires approval:** ${input.recommendation.requiresApproval ? "Yes" : "No"}`);
  lines.push("");
  lines.push(`## Rationale`);
  lines.push(input.recommendation.rationale);
  lines.push("");
  lines.push(`## Evidence (${input.evidence.length})`);
  for (const e of input.evidence.slice(0, 6)) {
    lines.push(`- [${e.strength}] ${e.claim} — source: ${e.source.label}`);
  }
  if (input.alternatives.length > 0) {
    lines.push("");
    lines.push(`## Alternatives`);
    for (const a of input.alternatives) {
      lines.push(`- ${a.optionId}: ${a.reasonNotSelected}`);
    }
  }
  if (input.risks.length > 0) {
    lines.push("");
    lines.push(`## Risks`);
    for (const r of input.risks) {
      lines.push(`- ${r.description} (L=${r.likelihood.toFixed(2)}, I=${r.impact.toFixed(2)})`);
    }
  }
  if (input.contradictions.length > 0) {
    lines.push("");
    lines.push(`## Contradictions`);
    for (const c of input.contradictions) {
      lines.push(`- [${c.severity}] ${c.description}`);
    }
  }
  lines.push("");
  lines.push(`## Next Action`);
  lines.push(input.recommendation.nextAction);

  const machine = {
    goal: input.goal,
    recommendation: input.recommendation,
    confidence: input.confidence,
    evidenceCount: input.evidence.length,
    optionCount: input.options.length,
    tradeoffCount: input.tradeoffs.length,
    scoreCount: input.scores.length,
    contradictionCount: input.contradictions.length,
    simulationCount: input.simulations.length,
    riskCount: input.risks.length,
  } as const;

  emitCognitiveEvent("ExplanationGenerated", {
    length: lines.length,
    confidence: input.confidence.overall,
  });

  return { human: lines.join("\n"), machine };
}
