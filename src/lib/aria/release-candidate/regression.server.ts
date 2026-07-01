/**
 * Phase 10.0 — Regression test summarizer.
 */
import type { TestCase, TestOutcome, TestReport } from "./types";
import { buildTestPlan } from "./test-plan.server";

export function summarizeRegression(
  outcomes: ReadonlyArray<TestOutcome>,
): TestReport {
  const plan = buildTestPlan();
  const cases: ReadonlyArray<TestCase> = plan.cases.filter(
    (c) => c.kind === "regression",
  );
  const map = new Map<string, TestOutcome>();
  for (const o of outcomes) map.set(o.case_id, o);
  const merged: TestOutcome[] = cases.map(
    (c) => map.get(c.id) ?? { case_id: c.id, status: "unknown" as const },
  );
  return {
    kind: "regression",
    outcomes: merged,
    executed_at: new Date().toISOString(),
  };
}
