/**
 * Phase 10.0 — Smoke test summarizer.
 * Consumes caller-supplied outcomes. Missing outcomes remain UNKNOWN.
 */
import type { TestCase, TestOutcome, TestReport } from "./types";
import { buildTestPlan } from "./test-plan.server";

export function summarizeSmoke(
  outcomes: ReadonlyArray<TestOutcome>,
): TestReport {
  const plan = buildTestPlan();
  const smokeCases: ReadonlyArray<TestCase> = plan.cases.filter(
    (c) => c.kind === "smoke",
  );
  const map = new Map<string, TestOutcome>();
  for (const o of outcomes) map.set(o.case_id, o);
  const merged: TestOutcome[] = smokeCases.map(
    (c) => map.get(c.id) ?? { case_id: c.id, status: "unknown" as const },
  );
  return {
    kind: "smoke",
    outcomes: merged,
    executed_at: new Date().toISOString(),
  };
}
