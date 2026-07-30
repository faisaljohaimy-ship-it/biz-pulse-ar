// Pilot readiness end-to-end orchestrator.
import type {
  AcceptanceTest,
  DemoScript,
  EvidenceRef,
  FeedbackItem,
  GovernancePlan,
  PilotReadinessReport,
  PilotScope,
  RiskEntry,
  RoiInputs,
  RolloutPlan,
  Stakeholder,
  SuccessCriterion,
  SuccessMeasurement,
  SupportPlan,
  TrainingPlan,
  ValueCase,
} from "./types";
import { createPilotAudit } from "./audit.server";
import { computePilotMetrics } from "./metrics.server";
import { verifyPilotReadiness } from "./verification.server";
import { computeRoi } from "./roi-model.server";
import { measureCriterion } from "./success-criteria.server";

export interface CriterionMeasurementInput {
  readonly criterionId: string;
  readonly observed: number | null;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface PilotPipelineInput {
  readonly scope: PilotScope;
  readonly stakeholders: ReadonlyArray<Stakeholder>;
  readonly criteria: ReadonlyArray<SuccessCriterion>;
  readonly measurements: ReadonlyArray<CriterionMeasurementInput>;
  readonly demoScript: DemoScript;
  readonly acceptance: ReadonlyArray<AcceptanceTest>;
  readonly feedback: ReadonlyArray<FeedbackItem>;
  readonly training: TrainingPlan;
  readonly support: SupportPlan;
  readonly risks: ReadonlyArray<RiskEntry>;
  readonly governance: GovernancePlan;
  readonly rollout: RolloutPlan;
  readonly valueCase: ValueCase;
  readonly roiInputs: RoiInputs;
  readonly roiEvidence: ReadonlyArray<EvidenceRef>;
  readonly now: string;
}

export function runPilotReadinessPipeline(input: PilotPipelineInput): PilotReadinessReport {
  const audit = createPilotAudit();

  audit.append({
    at: input.now,
    stage: "define_scope",
    status: "pass",
    detail: `pilot=${input.scope.pilotId}`,
  });

  audit.append({
    at: input.now,
    stage: "map_stakeholders",
    status: input.stakeholders.length > 0 ? "pass" : "unknown",
    detail: `count=${input.stakeholders.length}`,
  });

  const measurements: SuccessMeasurement[] = input.criteria.map((c) => {
    const m = input.measurements.find((x) => x.criterionId === c.id);
    return measureCriterion({
      criterion: c,
      observed: m?.observed ?? null,
      evidence: m?.evidence ?? [],
    });
  });
  audit.append({
    at: input.now,
    stage: "measure_criteria",
    status: "pass",
    detail: `criteria=${input.criteria.length}`,
  });

  audit.append({
    at: input.now,
    stage: "demo_script",
    status: "pass",
    detail: `steps=${input.demoScript.steps.length}`,
  });

  audit.append({
    at: input.now,
    stage: "acceptance",
    status: input.acceptance.length > 0 ? "pass" : "unknown",
    detail: `tests=${input.acceptance.length}`,
  });

  audit.append({
    at: input.now,
    stage: "feedback",
    status: input.feedback.length > 0 ? "pass" : "unknown",
    detail: `items=${input.feedback.length}`,
  });

  const roi = computeRoi({
    inputs: input.roiInputs,
    valueCase: input.valueCase,
    evidence: input.roiEvidence,
  });
  audit.append({
    at: input.now,
    stage: "roi",
    status: roi.confidence === "unknown" ? "unknown" : "pass",
    detail: `confidence=${roi.confidence}`,
  });

  const metrics = computePilotMetrics({
    stakeholders: input.stakeholders,
    criteria: input.criteria,
    acceptance: input.acceptance,
    feedback: input.feedback,
    risks: input.risks,
    rollout: input.rollout,
    valueCase: input.valueCase,
  });

  const { decision, reasons } = verifyPilotReadiness({
    scope: input.scope,
    stakeholders: input.stakeholders,
    measurements,
    acceptance: input.acceptance,
    risks: input.risks,
    valueCase: input.valueCase,
    roi,
  });
  audit.append({
    at: input.now,
    stage: "verify",
    status: decision === "GO" ? "pass" : decision === "NO_GO" ? "fail" : "unknown",
    detail: decision,
  });

  return {
    scope: input.scope,
    stakeholders: input.stakeholders,
    criteria: input.criteria,
    measurements,
    demoScript: input.demoScript,
    acceptanceTests: input.acceptance,
    feedback: input.feedback,
    training: input.training,
    support: input.support,
    risks: input.risks,
    governance: input.governance,
    rollout: input.rollout,
    valueCase: input.valueCase,
    roi,
    metrics,
    audit: audit.entries(),
    decision,
    reasons,
    generatedAt: input.now,
  };
}
