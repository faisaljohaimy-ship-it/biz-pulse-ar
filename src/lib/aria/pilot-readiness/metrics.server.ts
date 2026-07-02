// Pilot metrics aggregator.
import type {
  AcceptanceTest,
  FeedbackItem,
  PilotMetrics,
  RiskEntry,
  RolloutPlan,
  Stakeholder,
  SuccessCriterion,
  ValueCase,
} from "./types";

export function computePilotMetrics(input: {
  stakeholders: ReadonlyArray<Stakeholder>;
  criteria: ReadonlyArray<SuccessCriterion>;
  acceptance: ReadonlyArray<AcceptanceTest>;
  feedback: ReadonlyArray<FeedbackItem>;
  risks: ReadonlyArray<RiskEntry>;
  rollout: RolloutPlan;
  valueCase: ValueCase;
}): PilotMetrics {
  return {
    stakeholders: input.stakeholders.length,
    champions: input.stakeholders.filter((s) => s.stance === "champion").length,
    blockers: input.stakeholders.filter((s) => s.stance === "blocker").length,
    criteria: input.criteria.length,
    acceptanceRun: input.acceptance.filter((t) => t.state !== "not_run").length,
    acceptancePass: input.acceptance.filter((t) => t.state === "pass").length,
    acceptanceFail: input.acceptance.filter((t) => t.state === "fail").length,
    feedbackCount: input.feedback.length,
    positiveFeedback: input.feedback.filter((f) => f.sentiment === "positive").length,
    negativeFeedback: input.feedback.filter((f) => f.sentiment === "negative").length,
    criticalRisks: input.risks.filter((r) => r.severity === "critical").length,
    rolloutWaves: input.rollout.waves.length,
    valueDrivers: input.valueCase.drivers.length,
  };
}
