/**
 * Phase 8.6 — Trade-off analysis across canonical axes:
 * time, money, risk, complexity, maintainability, scalability,
 * compliance, security.
 */
import type { DecisionOption, Tradeoff, TradeoffAxis } from "./types";

const AXES: TradeoffAxis[] = [
  "time",
  "money",
  "risk",
  "complexity",
  "maintainability",
  "scalability",
  "compliance",
  "security",
];

export interface TradeoffReport {
  tradeoffs: Tradeoff[];
  reasoning: string;
}

export function compareTradeoffs(options: DecisionOption[]): TradeoffReport {
  if (options.length < 2) {
    return { tradeoffs: [], reasoning: "At least two options required for pairwise trade-off analysis." };
  }
  const tradeoffs: Tradeoff[] = [];
  for (const axis of AXES) {
    const ranked = options.slice().sort((a, b) => (b.scores[axis] ?? 0) - (a.scores[axis] ?? 0));
    const [top, next] = ranked;
    if (!top || !next) continue;
    const diff = (top.scores[axis] ?? 0) - (next.scores[axis] ?? 0);
    if (diff < 0.05) continue;
    tradeoffs.push({
      axis,
      favors: top.id,
      magnitude: diff >= 0.3 ? "large" : diff >= 0.15 ? "medium" : "small",
      reasoning: `Option "${top.title}" scores ${(top.scores[axis] ?? 0).toFixed(2)} on ${axis} vs ${(next.scores[axis] ?? 0).toFixed(2)}.`,
    });
  }
  return {
    tradeoffs,
    reasoning: `Compared ${options.length} options across ${AXES.length} trade-off axes.`,
  };
}

export function attachTradeoffs(options: DecisionOption[]): DecisionOption[] {
  const { tradeoffs } = compareTradeoffs(options);
  return options.map((o) => ({
    ...o,
    tradeoffs: tradeoffs.filter((t) => t.favors === o.id),
  }));
}

export { AXES as TRADEOFF_AXES };
