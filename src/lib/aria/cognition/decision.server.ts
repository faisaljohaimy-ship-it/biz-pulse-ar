import { emitCognitiveEvent } from "./events";
import type {
  Alternative,
  DecisionOption,
  DecisionScore,
  Evidence,
  Hypothesis,
  Tradeoff,
} from "./types";

const WEIGHTS = {
  accuracy: 0.28,
  compliance: 0.18,
  maintainability: 0.12,
  speed: 0.1,
  risk: 0.15,
  cost: 0.1,
  complexity: 0.07,
} as const;

function scoreOne(tradeoff: Tradeoff, hypothesis: Hypothesis): DecisionScore {
  const positive =
    tradeoff.accuracy * WEIGHTS.accuracy +
    tradeoff.compliance * WEIGHTS.compliance +
    tradeoff.maintainability * WEIGHTS.maintainability +
    tradeoff.speed * WEIGHTS.speed;
  const negative =
    tradeoff.risk * WEIGHTS.risk +
    tradeoff.cost * WEIGHTS.cost +
    tradeoff.complexity * WEIGHTS.complexity;
  const raw = positive - negative;
  const normalized = Math.max(0, Math.min(1, (raw + 0.5) * (0.6 + hypothesis.confidence * 0.4)));
  return {
    optionId: tradeoff.optionId,
    score: normalized,
    components: {
      accuracy: tradeoff.accuracy,
      compliance: tradeoff.compliance,
      maintainability: tradeoff.maintainability,
      speed: tradeoff.speed,
      risk: tradeoff.risk,
      cost: tradeoff.cost,
      complexity: tradeoff.complexity,
      hypothesisConfidence: hypothesis.confidence,
    },
  };
}

export function buildDecisionOptions(
  hypotheses: ReadonlyArray<Hypothesis>,
  evidence: ReadonlyArray<Evidence>,
): ReadonlyArray<DecisionOption> {
  const options: DecisionOption[] = [];
  for (const h of hypotheses) {
    if (h.rejected) continue;
    options.push({
      id: `opt_${h.id}`,
      title: h.statement,
      summary: h.rationale,
      hypothesisId: h.id,
      evidenceIds: [...h.supportingEvidenceIds],
    });
  }
  if (options.length === 0 && hypotheses.length > 0) {
    const h = hypotheses[0];
    options.push({
      id: `opt_${h.id}`,
      title: h.statement,
      summary: h.rationale,
      hypothesisId: h.id,
      evidenceIds: [...h.supportingEvidenceIds],
    });
  }
  void evidence;
  return options;
}

export function scoreOptions(
  tradeoffs: ReadonlyArray<Tradeoff>,
  hypotheses: ReadonlyArray<Hypothesis>,
  options: ReadonlyArray<DecisionOption>,
): { scores: ReadonlyArray<DecisionScore>; winner: DecisionOption | null; alternatives: ReadonlyArray<Alternative> } {
  const hypById = new Map(hypotheses.map((h) => [h.id, h] as const));
  const optById = new Map(options.map((o) => [o.id, o] as const));
  const scores: DecisionScore[] = [];
  for (const t of tradeoffs) {
    const opt = optById.get(t.optionId);
    if (!opt) continue;
    const hyp = hypById.get(opt.hypothesisId);
    if (!hyp) continue;
    scores.push(scoreOne(t, hyp));
  }
  scores.sort((a, b) => b.score - a.score);
  const winner = scores.length > 0 ? optById.get(scores[0].optionId) ?? null : null;
  const alternatives: Alternative[] = scores.slice(1).map((s) => ({
    optionId: s.optionId,
    reasonNotSelected: `Lower composite score (${s.score.toFixed(2)}) vs winner.`,
  }));
  emitCognitiveEvent("DecisionGenerated", {
    winner: winner?.id ?? null,
    optionCount: options.length,
  });
  return { scores, winner, alternatives };
}
