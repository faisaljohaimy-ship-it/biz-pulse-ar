// Phase 10.4 — Self-Improvement Engine public barrel.
// Server-only. Strictly additive. Never mutates production autonomously.

export * from "./types";
export * as SelfImprovementContracts from "./contracts";
export { createEvidenceStore, type EvidenceStore } from "./evidence.server";
export { evaluateSubject } from "./evaluation.server";
export { createBenchmark, compareBenchmark } from "./benchmark.server";
export { detectRegression, type RegressionThresholds } from "./regression.server";
export { analyzeAb } from "./ab-testing.server";
export { summarizeQuality, type QualitySummary } from "./quality.server";
export { detectKnowledgeGaps } from "./knowledge-gap.server";
export { detectPerformanceGaps } from "./performance-gap.server";
export { analyzeFailures, type FailureBucket } from "./failure-analysis.server";
export { summarizeFeedback, type FeedbackSummary } from "./feedback.server";
export { scoreImprovement } from "./scoring.server";
export { prioritizeProposals } from "./prioritization.server";
export { buildProposal } from "./improvement.server";
export { issueRecommendation } from "./recommendation.server";
export { submitApproval, applyApproval } from "./approval.server";
export { buildRoadmap } from "./roadmap.server";
export { learnFromSamples, type LearningSignal } from "./learning.server";
export { createAuditLog } from "./audit.server";
export { computeMetrics } from "./metrics.server";
export { emitTelemetry } from "./telemetry.server";
export { verifyPipeline, assembleReport } from "./verification.server";
export {
  runSelfImprovementPipeline,
  type SelfImprovementPipelineInput,
  type SelfImprovementPipelineOutput,
  type EvaluationSpec,
  type ProposalDraft,
  type AbExperimentSpec,
} from "./engine.server";
