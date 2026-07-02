// Phase 11.6 — Executive Acceptance Experience barrel.
export * from "./types";
export * from "./contracts";
export {
  beginFirstImpression,
  advanceFirstImpression,
  markGreeted,
  firstImpressionReady,
  resetFirstImpression,
} from "./first-impression.server";
export { composeExecutiveGreeting } from "./executive-greeting.server";
export {
  noteEngagement,
  getEngagement,
  resetEngagement,
} from "./engagement-state.server";
export {
  assessDemoReadiness,
  type DemoReadinessInput,
} from "./demo-readiness.server";
export {
  recordAcceptanceSignal,
  acceptanceSignals,
  acceptanceScore,
} from "./acceptance-signals.server";
export {
  requestDelight,
  resetDelight,
  type DelightKind,
  type DelightRequest,
  type DelightDecision,
} from "./delight-moments.server";
export {
  assessTrust,
  type TrustInput,
  type TrustAssessment,
} from "./trust-indicators.server";
export {
  assessQuality,
  type QualityInput,
  type QualityAssessment,
} from "./conversation-quality.server";
export {
  discipline,
  type DisciplinedResponse,
} from "./response-discipline.server";
export {
  performHandoff,
  type HandoffRequest,
  type HandoffOutcome,
} from "./handoff.server";
export {
  logAcceptance,
  acceptanceAudit,
  type AcceptanceAuditEntry,
  type AcceptanceAuditKind,
} from "./audit.server";
export {
  acceptanceMetrics,
  recordGreeting,
  recordStepCompleted,
  recordQuality,
  recordDisciplineTrim,
  recordHandoff,
  recordDelight,
  type AcceptanceMetricsSnapshot,
} from "./metrics.server";
export {
  verifyAcceptance,
  type AcceptanceVerification,
} from "./verification.server";
