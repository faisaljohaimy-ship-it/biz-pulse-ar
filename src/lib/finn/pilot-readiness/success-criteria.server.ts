// Success criteria + deterministic measurement against observed values.
import type { SuccessCriterion, SuccessMeasurement, TriState } from "./types";
import { SuccessCriterionZ } from "./contracts";

export function validateCriterion(c: SuccessCriterion): SuccessCriterion {
  return SuccessCriterionZ.parse(c);
}

function compare(observed: number, target: number, cmp: SuccessCriterion["comparator"]): boolean {
  if (cmp === "lte") return observed <= target;
  if (cmp === "gte") return observed >= target;
  return observed === target;
}

export function measureCriterion(input: {
  criterion: SuccessCriterion;
  observed: number | null;
  evidence: SuccessMeasurement["evidence"];
}): SuccessMeasurement {
  if (input.observed === null) {
    return {
      criterionId: input.criterion.id,
      observed: null,
      state: "unknown",
      detail: "no_evidence",
      evidence: input.evidence,
    };
  }
  const ok = compare(input.observed, input.criterion.target, input.criterion.comparator);
  const state: TriState = ok ? "pass" : "fail";
  return {
    criterionId: input.criterion.id,
    observed: input.observed,
    state,
    detail: `${input.observed} ${input.criterion.comparator} ${input.criterion.target}`,
    evidence: input.evidence,
  };
}

export function summarizeMeasurements(m: ReadonlyArray<SuccessMeasurement>): {
  pass: number;
  fail: number;
  unknown: number;
} {
  return {
    pass: m.filter((x) => x.state === "pass").length,
    fail: m.filter((x) => x.state === "fail").length,
    unknown: m.filter((x) => x.state === "unknown").length,
  };
}
