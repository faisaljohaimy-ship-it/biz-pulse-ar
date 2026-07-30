/**
 * Phase 8.6 — Decision matrix. Converts supported hypotheses into
 * scored decision options using a canonical set of executive
 * criteria (risk/reward/cost/value/short-vs-long).
 */
import type {
  DecisionCriterion,
  DecisionOption,
  Evidence,
  Hypothesis,
  ReasoningContext,
} from "./types";
import { clamp01, confidence, shortId } from "./util";
import { TRADEOFF_AXES } from "./tradeoff.server";

export const DEFAULT_CRITERIA: DecisionCriterion[] = [
  { key: "value", description: "expected value delivered", weight: 0.25 },
  { key: "risk", description: "downside probability × magnitude (higher = safer)", weight: 0.2 },
  { key: "cost", description: "resource cost (higher = cheaper)", weight: 0.15 },
  { key: "time", description: "time-to-impact (higher = faster)", weight: 0.1 },
  { key: "money", description: "financial efficiency", weight: 0.05 },
  { key: "complexity", description: "implementation simplicity", weight: 0.05 },
  { key: "maintainability", description: "long-term serviceability", weight: 0.05 },
  { key: "scalability", description: "headroom under growth", weight: 0.05 },
  { key: "compliance", description: "regulatory posture", weight: 0.05 },
  { key: "security", description: "security posture", weight: 0.05 },
];

export interface DecisionReport {
  options: DecisionOption[];
  criteria: DecisionCriterion[];
  reasoning: string;
}

export function buildDecisionMatrix(
  context: ReasoningContext,
  hypotheses: Hypothesis[],
  evidence: Evidence[],
  criteria: DecisionCriterion[] = DEFAULT_CRITERIA,
): DecisionReport {
  const options: DecisionOption[] = [];
  for (const h of hypotheses.slice(0, 5)) {
    const scores = scoreOption(h, evidence, context);
    const weighted = weightedScore(scores, criteria);
    options.push({
      id: shortId("opt"),
      title: truncate(h.statement, 90),
      description: h.rationale,
      supporting_hypothesis_ids: [h.id],
      tradeoffs: [],
      scores,
      weighted_score: weighted,
      risk: bucket(1 - (scores.risk ?? 0.5), ["low", "medium", "high", "critical"] as const),
      reward: bucket(scores.value ?? 0.5, ["low", "medium", "high"] as const),
      time_horizon: bucket(scores.time ?? 0.5, ["long", "medium", "short"] as const),
      confidence: confidence(
        clamp01(0.4 * h.confidence.value + 0.6 * weighted),
        `hypothesis confidence ${h.confidence.value.toFixed(2)} + weighted score ${weighted.toFixed(2)}`,
        h.supporting_evidence_ids,
      ),
      reasoning: `Scored via ${criteria.length} criteria; weighted score ${weighted.toFixed(2)}.`,
    });
  }
  options.sort((a, b) => b.weighted_score - a.weighted_score);
  return {
    options,
    criteria,
    reasoning: `Constructed decision matrix from ${hypotheses.length} hypotheses using ${criteria.length} weighted criteria.`,
  };
}

function scoreOption(
  h: Hypothesis,
  evidence: Evidence[],
  ctx: ReasoningContext,
): Record<string, number> {
  const supportRatio = evidence.length ? h.supporting_evidence_ids.length / evidence.length : 0;
  const base = clamp01(0.4 + 0.6 * h.confidence.value);
  const scores: Record<string, number> = {
    value: clamp01(base + 0.1 * supportRatio),
    risk: clamp01(0.5 + 0.5 * (h.confidence.value - 0.5)),
    cost: clamp01(0.5 - 0.1 * h.opposing_evidence_ids.length),
    time: clamp01(0.5 + 0.2 * (ctx.mode === "opportunity" ? 1 : 0)),
  };
  for (const axis of TRADEOFF_AXES) {
    if (scores[axis] !== undefined) continue;
    scores[axis] = clamp01(0.5 + 0.25 * (h.confidence.value - 0.5));
  }
  return scores;
}

function weightedScore(scores: Record<string, number>, criteria: DecisionCriterion[]): number {
  const total = criteria.reduce((s, c) => s + c.weight, 0) || 1;
  const sum = criteria.reduce((s, c) => s + c.weight * (scores[c.key] ?? 0.5), 0);
  return clamp01(sum / total);
}

function bucket<T extends readonly string[]>(v: number, labels: T): T[number] {
  const idx = Math.min(labels.length - 1, Math.max(0, Math.floor(v * labels.length)));
  return labels[idx] as T[number];
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}
