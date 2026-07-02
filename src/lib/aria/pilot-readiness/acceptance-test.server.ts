// Acceptance test runner — never fabricates results.
import type { AcceptanceState, AcceptanceTest } from "./types";
import { AcceptanceTestInputZ } from "./contracts";

export function defineAcceptanceTest(input: {
  id: string;
  title: string;
  criterionId: string | null;
  precondition: string;
  action: string;
  expected: string;
  evidence: AcceptanceTest["evidence"];
}): AcceptanceTest {
  const parsed = AcceptanceTestInputZ.parse(input);
  return {
    id: parsed.id,
    title: parsed.title,
    criterionId: parsed.criterionId,
    precondition: parsed.precondition,
    action: parsed.action,
    expected: parsed.expected,
    observed: null,
    state: "not_run",
    executedAt: null,
    evidence: parsed.evidence,
  };
}

export function recordAcceptance(input: {
  test: AcceptanceTest;
  observed: string | null;
  state: AcceptanceState;
  executedAt: string;
  evidence: AcceptanceTest["evidence"];
}): AcceptanceTest {
  if (input.observed === null && input.state !== "not_run" && input.state !== "unknown") {
    // No observation ⇒ cannot be pass or fail.
    return {
      ...input.test,
      observed: null,
      state: "unknown",
      executedAt: input.executedAt,
      evidence: [...input.test.evidence, ...input.evidence],
    };
  }
  return {
    ...input.test,
    observed: input.observed,
    state: input.state,
    executedAt: input.executedAt,
    evidence: [...input.test.evidence, ...input.evidence],
  };
}

export function summarizeAcceptance(tests: ReadonlyArray<AcceptanceTest>): {
  total: number;
  pass: number;
  fail: number;
  notRun: number;
  unknown: number;
} {
  return {
    total: tests.length,
    pass: tests.filter((t) => t.state === "pass").length,
    fail: tests.filter((t) => t.state === "fail").length,
    notRun: tests.filter((t) => t.state === "not_run").length,
    unknown: tests.filter((t) => t.state === "unknown").length,
  };
}
