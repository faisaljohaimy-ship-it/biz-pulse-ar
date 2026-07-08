// Pilot readiness verification. No pilot GO without evidence.
import type {
  AcceptanceTest,
  PilotDecision,
  PilotScope,
  RiskEntry,
  RoiResult,
  Stakeholder,
  SuccessMeasurement,
  ValueCase,
} from "./types";

export interface VerificationOutput {
  readonly decision: PilotDecision;
  readonly reasons: ReadonlyArray<string>;
}

export function verifyPilotReadiness(input: {
  scope: PilotScope;
  stakeholders: ReadonlyArray<Stakeholder>;
  measurements: ReadonlyArray<SuccessMeasurement>;
  acceptance: ReadonlyArray<AcceptanceTest>;
  risks: ReadonlyArray<RiskEntry>;
  valueCase: ValueCase;
  roi: RoiResult;
}): VerificationOutput {
  const reasons: string[] = [];

  if (input.scope.evidence.length === 0) reasons.push("scope_no_evidence");
  if (input.stakeholders.length === 0) reasons.push("no_stakeholders");
  if (input.acceptance.length === 0) reasons.push("no_acceptance_tests");

  const anyFailAccept = input.acceptance.some((t) => t.state === "fail");
  const allRunAccept =
    input.acceptance.length > 0 && input.acceptance.every((t) => t.state !== "not_run");
  const anyUnknownAccept = input.acceptance.some((t) => t.state === "unknown");

  const anyFailMeasure = input.measurements.some((m) => m.state === "fail");
  const anyUnknownMeasure = input.measurements.some((m) => m.state === "unknown");

  const critRisks = input.risks.filter((r) => r.severity === "critical").length;
  const unknownRoi = input.roi.confidence === "unknown";
  const unknownValue = input.valueCase.confidence === "unknown";

  if (anyFailAccept) reasons.push("acceptance_failures");
  if (anyFailMeasure) reasons.push("success_criteria_failed");
  if (critRisks > 0) reasons.push(`unmitigated_critical_risks:${critRisks}`);

  let decision: PilotDecision;
  if (reasons.length > 0) {
    decision = "NO_GO";
  } else if (!allRunAccept || anyUnknownAccept || anyUnknownMeasure || unknownRoi || unknownValue) {
    decision = "GO_WITH_KNOWN_LIMITATIONS";
    if (!allRunAccept) reasons.push("acceptance_incomplete");
    if (anyUnknownAccept) reasons.push("acceptance_unknown");
    if (anyUnknownMeasure) reasons.push("measurements_unknown");
    if (unknownRoi) reasons.push("roi_unknown");
    if (unknownValue) reasons.push("value_case_unknown");
  } else {
    decision = "GO";
    reasons.push("all_invariants_satisfied");
  }
  return { decision, reasons };
}
