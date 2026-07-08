import { emitCognitiveEvent } from "./events";
import type {
  DecisionOption,
  RiskSignal,
  SimulationOutcome,
  SimulationResult,
  Tradeoff,
} from "./types";

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function narrativeFor(
  option: DecisionOption,
  tradeoff: Tradeoff,
  outcome: SimulationOutcome,
): string {
  if (outcome === "best") {
    return `Best case for "${option.title}": accuracy holds at ${(tradeoff.accuracy * 100).toFixed(0)}%, risk contained, compliance intact.`;
  }
  if (outcome === "worst") {
    return `Worst case for "${option.title}": risk materializes (${(tradeoff.risk * 100).toFixed(0)}%), latency and cost overshoot, recovery required.`;
  }
  return `Expected case for "${option.title}": balanced execution with accuracy ${(tradeoff.accuracy * 100).toFixed(0)}% and risk ${(tradeoff.risk * 100).toFixed(0)}%.`;
}

function kpiDelta(tradeoff: Tradeoff, outcome: SimulationOutcome): Record<string, number> {
  const sign = outcome === "worst" ? -1 : 1;
  const magnitude = outcome === "expected" ? 0.5 : 1;
  return {
    accuracy: sign * tradeoff.accuracy * magnitude,
    speed: sign * tradeoff.speed * magnitude,
    compliance: sign * tradeoff.compliance * magnitude,
    risk: -sign * tradeoff.risk * magnitude,
  };
}

export function simulateOption(
  option: DecisionOption,
  tradeoff: Tradeoff,
  risks: ReadonlyArray<RiskSignal>,
): ReadonlyArray<SimulationResult> {
  const riskWeight =
    risks.length === 0
      ? 0.2
      : Math.min(1, risks.reduce((s, r) => s + r.likelihood * r.impact, 0) / risks.length);
  const bestProb = clamp01(0.4 + tradeoff.accuracy * 0.4 - riskWeight * 0.2);
  const worstProb = clamp01(0.15 + riskWeight * 0.35);
  const expectedProb = clamp01(1 - bestProb - worstProb);
  return [
    {
      optionId: option.id,
      outcome: "best",
      narrative: narrativeFor(option, tradeoff, "best"),
      probability: bestProb,
      kpiDelta: kpiDelta(tradeoff, "best"),
    },
    {
      optionId: option.id,
      outcome: "expected",
      narrative: narrativeFor(option, tradeoff, "expected"),
      probability: expectedProb,
      kpiDelta: kpiDelta(tradeoff, "expected"),
    },
    {
      optionId: option.id,
      outcome: "worst",
      narrative: narrativeFor(option, tradeoff, "worst"),
      probability: worstProb,
      kpiDelta: kpiDelta(tradeoff, "worst"),
    },
  ];
}

export function simulateAll(
  options: ReadonlyArray<DecisionOption>,
  tradeoffs: ReadonlyArray<Tradeoff>,
  risks: ReadonlyArray<RiskSignal>,
): ReadonlyArray<SimulationResult> {
  const byOpt = new Map(tradeoffs.map((t) => [t.optionId, t] as const));
  const results: SimulationResult[] = [];
  for (const option of options) {
    const t = byOpt.get(option.id);
    if (!t) continue;
    results.push(...simulateOption(option, t, risks));
  }
  emitCognitiveEvent("SimulationCompleted", { count: results.length });
  return results;
}
