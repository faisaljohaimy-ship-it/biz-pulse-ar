import { emitCognitiveEvent } from "./events";
import type { DecisionOption, Evidence, Tradeoff } from "./types";

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function evidenceFor(
  option: DecisionOption,
  evidence: ReadonlyArray<Evidence>,
): ReadonlyArray<Evidence> {
  const set = new Set(option.evidenceIds);
  return evidence.filter((e) => set.has(e.id));
}

export function analyzeTradeoffs(
  options: ReadonlyArray<DecisionOption>,
  evidence: ReadonlyArray<Evidence>,
): ReadonlyArray<Tradeoff> {
  const tradeoffs: Tradeoff[] = [];
  for (const option of options) {
    const ev = evidenceFor(option, evidence);
    const avgWeight = ev.length === 0 ? 0.4 : ev.reduce((s, e) => s + e.weight, 0) / ev.length;
    const diversity = new Set(ev.map((e) => e.source.kind)).size;
    const pros: string[] = [];
    const cons: string[] = [];
    if (avgWeight >= 0.6) pros.push("Strong evidentiary support.");
    else cons.push("Evidentiary support is limited.");
    if (diversity >= 3) pros.push("Multi-source corroboration.");
    else cons.push("Single-source dependence.");
    if (option.summary.length > 120) cons.push("Scope is broad; execution complexity elevated.");
    else pros.push("Focused scope.");

    const tradeoff: Tradeoff = {
      optionId: option.id,
      pros,
      cons,
      cost: clamp01(0.5 - avgWeight * 0.2),
      risk: clamp01(0.6 - avgWeight * 0.4),
      speed: clamp01(0.4 + avgWeight * 0.3),
      accuracy: clamp01(avgWeight),
      complexity: clamp01(0.5 - diversity * 0.1),
      compliance: clamp01(0.6 + avgWeight * 0.2),
      maintainability: clamp01(0.5 + avgWeight * 0.2),
    };
    tradeoffs.push(tradeoff);
  }
  emitCognitiveEvent("TradeoffCompleted", { count: tradeoffs.length });
  return tradeoffs;
}
