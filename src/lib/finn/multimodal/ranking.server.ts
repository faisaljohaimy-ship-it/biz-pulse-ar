/**
 * Ranking — weighted by confidence, evidence count, recency, modality bonus.
 */
import type { MultimodalFinding } from "./types";

export interface RankWeights {
  readonly confidence: number;
  readonly evidence: number;
  readonly recency: number;
  readonly linked: number;
}

const DEFAULTS: RankWeights = {
  confidence: 0.55,
  evidence: 0.2,
  recency: 0.15,
  linked: 0.1,
};

export function scoreFinding(
  f: MultimodalFinding,
  now: number = Date.now(),
  weights: RankWeights = DEFAULTS,
): number {
  const created = Date.parse(f.created_at);
  const ageH = Number.isFinite(created) ? Math.max(0, (now - created) / 3_600_000) : 24;
  const recency = 1 / (1 + ageH / 24);
  const evidence = Math.min(1, f.evidence.length / 3);
  const linked = Math.min(1, (f.linked_memory_ids.length + f.linked_graph_entities.length) / 4);
  return Number(
    (
      weights.confidence * f.confidence +
      weights.evidence * evidence +
      weights.recency * recency +
      weights.linked * linked
    ).toFixed(4),
  );
}

export function rank(findings: readonly MultimodalFinding[]): readonly MultimodalFinding[] {
  const now = Date.now();
  return [...findings].sort((a, b) => scoreFinding(b, now) - scoreFinding(a, now));
}
