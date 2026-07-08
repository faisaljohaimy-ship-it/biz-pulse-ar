// Phase 10.6 — Pilot Readiness public barrel.
// Server-only. Strictly additive. No fabricated pilot outcomes.

export * from "./types";
export * as PilotContracts from "./contracts";

export { definePilotScope } from "./pilot-scope.server";
export { validateStakeholder, summarizeStakeholders } from "./stakeholder-map.server";
export {
  validateCriterion,
  measureCriterion,
  summarizeMeasurements,
} from "./success-criteria.server";
export { buildDemoScript } from "./demo-script.server";
export {
  defineAcceptanceTest,
  recordAcceptance,
  summarizeAcceptance,
} from "./acceptance-test.server";
export { captureFeedback, summarizeFeedback } from "./feedback.server";
export { buildTrainingPlan } from "./training-plan.server";
export { buildSupportPlan } from "./support-plan.server";
export { deriveSeverity, registerRisk, summarizeRisks } from "./risk-register.server";
export { buildGovernancePlan } from "./governance-plan.server";
export { buildRolloutPlan } from "./rollout-plan.server";
export { buildValueCase } from "./value-case.server";
export { computeRoi } from "./roi-model.server";
export { createPilotAudit } from "./audit.server";
export { computePilotMetrics } from "./metrics.server";
export { emitPilotTelemetry } from "./telemetry.server";
export { verifyPilotReadiness } from "./verification.server";
export {
  runPilotReadinessPipeline,
  type PilotPipelineInput,
  type CriterionMeasurementInput,
} from "./pilot-plan.server";
