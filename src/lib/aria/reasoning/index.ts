/**
 * Phase 8.6 — Executive Cognitive Reasoning Engine (public surface).
 *
 * Import from callers:
 *   import { reason } from "@/lib/aria/reasoning";
 *
 * Strictly additive. Consumed by the Planning Engine. Never mutates
 * memory, dispatches tasks, or bypasses any existing layer.
 */
export {
  reason,
  multiPerspectiveReason,
  generateAlternatives,
  challengeAssumptionsPublic as challengeAssumptions,
  compareStrategies,
  produceRecommendation,
} from "./reasoner.server";

export { subscribeReasoning } from "./events";
export { reasoningMetrics, REASONER_VERSION } from "./metrics.server";
export { reasoningHealth } from "./health.server";

export {
  ReasonInputSchema,
  MultiPerspectiveInputSchema,
  ReasoningModeSchema,
  LanguageSchema,
  type ReasonInputParsed,
  type MultiPerspectiveInputParsed,
} from "./contracts";

export type {
  Assumption,
  ConfidenceBand,
  ConfidenceScore,
  CounterArgument,
  DecisionCriterion,
  DecisionOption,
  Evidence,
  ExecutiveRecommendation,
  Hypothesis,
  Language,
  ReasoningContext,
  ReasoningEvent,
  ReasoningEventName,
  ReasoningHealth,
  ReasoningMetrics,
  ReasoningMode,
  ReasoningNode,
  ReasoningNodeKind,
  ReasoningResult,
  ReasoningTrace,
  ReflectionReport,
  Tradeoff,
  TradeoffAxis,
  Uncertainty,
} from "./types";
