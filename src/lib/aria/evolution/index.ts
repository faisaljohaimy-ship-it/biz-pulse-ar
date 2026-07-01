/**
 * Phase 9.4 — Autonomous Self-Evolution Engine.
 *
 * Public surface. Strictly additive; consumers use only what is
 * re-exported here.
 */

export * from "./types";
export * from "./contracts";
export { reflect } from "./reflection.server";
export { analyzeFailure } from "./failure-analysis.server";
export { rootCause } from "./root-cause.server";
export { detectPatterns } from "./pattern.server";
export { summarizeTrends } from "./trend.server";
export {
  generateExperience,
} from "./experience.server";
export {
  appendExperience,
  listExperiences,
  findExperience,
  experienceCount,
} from "./experience-store.server";
export {
  indexByOutcome,
  indexByProblem,
  successRate,
} from "./experience-index.server";
export {
  registerStrategy,
  getStrategy,
  listStrategies,
} from "./strategy.server";
export { compareStrategies } from "./strategy-evolution.server";
export { analyzePlannerSignals } from "./planner-optimization.server";
export { analyzeRuntimeSignals } from "./runtime-optimization.server";
export { analyzeToolSignals } from "./tool-learning.server";
export { analyzeWorkflowSignals } from "./workflow-learning.server";
export { analyzePolicySignals } from "./policy-learning.server";
export { analyzePromptSignals } from "./prompt-learning.server";
export { distillLessons } from "./knowledge-distillation.server";
export { consolidate } from "./memory-consolidation.server";
export {
  recordBenchmark,
  listBenchmarks,
  findBenchmark,
} from "./benchmark.server";
export { abTest } from "./ab-testing.server";
export { detectRegression } from "./regression.server";
export { deriveConfidence } from "./confidence.server";
export {
  normalize,
  weightedMean,
  trendDelta,
  reliability,
} from "./scoring.server";
export {
  proposeImprovement,
  listProposals,
  findProposal,
} from "./improvement.server";
export { reviewProposal } from "./self-review.server";
export { critiqueProposal } from "./self-critique.server";
export {
  recommend,
  listRecommendations,
} from "./recommendation.server";
export { verifyBundle } from "./verification.server";
export {
  recordMetric,
  listMetrics,
  metricSummary,
} from "./metrics.server";
export {
  emitTelemetry,
  listTelemetry,
} from "./telemetry.server";
export { audit, listAudit } from "./audit.server";
