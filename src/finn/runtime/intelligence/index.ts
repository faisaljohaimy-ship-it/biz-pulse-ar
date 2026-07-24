/** Executive Intelligence Runtime — public surface (Phase 6). Advisory only; constructed per kernel; no globals. */
export {
  IMPACT_RANK,
  IntelError,
  type ApprovalRequirement,
  type Clock,
  type DecisionAlternative,
  type EvidenceItem,
  type ExecutiveDecision,
  type ExecutiveRecommendation,
  type ImpactAssessment,
  type ImpactLevel,
  type KpiSample,
  type RecommendationStatus,
  type Urgency,
} from "./types";
export { ExecutiveEvidenceEngine, type EvidenceSource } from "./evidence";
export {
  ExecutiveContextEngine,
  ExecutiveMemory,
  type ApprovalRecord,
  type ObjectiveStatus,
  type OutcomeRecord,
  type RiskRecord,
  type StrategicObjective,
} from "./context";
export {
  ExecutiveDecisionEngine,
  ExecutiveDecisionRegistry,
  type DecisionDraftInput,
  type DecisionLifecycle,
} from "./decisions";
export { ExecutiveReasoningEngine } from "./reasoning";
export {
  ExecutiveRecommendationCache,
  ExecutiveRecommendationEngine,
  type RecommendationInput,
} from "./recommendations";
export { ExecutiveKpiIntelligence, type TrendDirection } from "./kpi";
export {
  ExecutiveInsightEngine,
  type ExecutiveInsight,
  type InsightInputs,
  type InsightKind,
} from "./insights";
export {
  ExecutiveEventStream,
  ExecutiveTimelineEngine,
  type ExecutiveEvent,
  type TimelineEntry,
  type TimelineKind,
} from "./events";
export {
  ExecutiveSnapshotEngine,
  type ExecutiveAlert,
  type ExecutiveSnapshot,
  type SnapshotInput,
} from "./snapshots";
export {
  EXECUTIVE_CAPABILITIES,
  ExecutiveCapabilityRegistry,
  type ExecutiveCapability,
  type ExecutiveCapabilityKind,
} from "./capabilities";
export { ExecutiveAuditEngine } from "./audit";
export {
  INTEL_TOKENS,
  ExecutiveIntelligenceRuntime,
  createExecutiveIntelligence,
  type ExecutiveBrief,
  type IntelligenceOptions,
} from "./kernel";
