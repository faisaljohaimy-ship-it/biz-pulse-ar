/**
 * Phase 10.0 — E2E test summarizer.
 */
import type { TestCase, TestOutcome, TestReport } from "./types";
import { buildTestPlan } from "./test-plan.server";

export function summarizeE2E(
  outcomes: ReadonlyArray<TestOutcome>,
): TestReport {
  const plan = buildTestPlan();
  const cases: ReadonlyArray<TestCase> = plan.cases.filter(
    (c) => c.kind === "e2e",
  );
  const map = new Map<string, TestOutcome>();
  for (const o of outcomes) map.set(o.case_id, o);
  const merged: TestOutcome[] = cases.map(
    (c) => map.get(c.id) ?? { case_id: c.id, status: "unknown" as const },
  );
  return {
    kind: "e2e",
    outcomes: merged,
    executed_at: new Date().toISOString(),
  };
}
