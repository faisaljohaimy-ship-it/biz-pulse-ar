/**
 * Phase 8.8 — Executive Cognitive Layer (Meta Intelligence)
 *
 * Public API. Strictly additive:
 *   - Provides evidence-first reasoning artifacts.
 *   - Never executes agents, never mutates memory/planner/task-bus.
 *   - Consumed by the Executive Brain to authorize decisions.
 */

import { runReasoning } from "./reasoning.server";
import type { ReasoningInput } from "./reasoning.server";
import { simulateAll } from "./simulation.server";
import { buildExplanation, generateRecommendation } from "./explanation.server";
import { snapshotCognitiveMetrics } from "./metrics.server";
import { evaluateCognitiveHealth } from "./health.server";
import type {
  CognitiveHealth,
  CognitiveMetrics,
  CognitiveSession,
  DecisionOption,
  RiskSignal,
  SimulationResult,
  Tradeoff,
} from "./types";

export function runReasoningSession(input: ReasoningInput): CognitiveSession {
  return runReasoning(input);
}

export function evaluateDecision(session: CognitiveSession): {
  verified: boolean;
  issues: ReadonlyArray<string>;
  confidence: number;
  recommendation: CognitiveSession["recommendation"];
} {
  return {
    verified: session.verified,
    issues: session.verificationIssues,
    confidence: session.confidence.overall,
    recommendation: session.recommendation,
  };
}

export function simulateDecision(input: {
  options: ReadonlyArray<DecisionOption>;
  tradeoffs: ReadonlyArray<Tradeoff>;
  risks?: ReadonlyArray<RiskSignal>;
}): ReadonlyArray<SimulationResult> {
  return simulateAll(input.options, input.tradeoffs, input.risks ?? []);
}

export function generateExplanation(session: CognitiveSession): {
  human: string;
  machine: Readonly<Record<string, unknown>>;
} {
  const bundle = buildExplanation({
    goal: session.goal,
    evidence: session.evidence,
    options: session.options,
    tradeoffs: session.tradeoffs,
    scores: session.scores,
    alternatives: session.alternatives,
    contradictions: session.contradictions,
    simulations: session.simulations,
    risks: session.risks,
    confidence: session.confidence,
    recommendation: session.recommendation,
  });
  return bundle;
}

export function reasoningMetrics(): CognitiveMetrics {
  return snapshotCognitiveMetrics();
}

export function reasoningHealth(): CognitiveHealth {
  return evaluateCognitiveHealth();
}

export { onCognitiveEvent } from "./events";
export { runReasoning };
export { generateRecommendation };
export type {
  CognitiveHealth,
  CognitiveMetrics,
  CognitiveSession,
  ReasoningInput,
};
