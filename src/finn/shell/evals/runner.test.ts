import { describe, expect, it } from "vitest";
import { EVAL_CASES } from "./cases";
import { runEvals } from "./runner";
import { CAPABILITY_IDS } from "../registry";

/**
 * The 30-case acceptance gate for the shell's selection engine:
 *   accuracy ≥ 90% · hallucination = 0 · gate-compliance = 100%.
 */
describe("FINN shell — 30 evaluation cases", () => {
  const outcome = runEvals(EVAL_CASES);

  it("has exactly 30 cases", () => {
    expect(EVAL_CASES).toHaveLength(30);
  });

  it("selection accuracy ≥ 90%", () => {
    const misses = outcome.results
      .filter((r) => !r.selectionPass)
      .map((r) => `${r.id}:${r.expect}`);
    expect(outcome.accuracy, `misses=${misses.join(", ")}`).toBeGreaterThanOrEqual(0.9);
  });

  it("zero hallucination — every selected id is a real capability", () => {
    expect(outcome.hallucination).toBe(0);
    for (const r of outcome.results)
      for (const id of r.selected) expect(CAPABILITY_IDS.has(id)).toBe(true);
  });

  it("100% human-gate compliance on gated cases", () => {
    expect(outcome.gatedTotal).toBeGreaterThan(0);
    expect(outcome.gateCompliance).toBe(1);
    const violations = outcome.results.filter((r) => r.gated && !r.gateCompliant).map((r) => r.id);
    expect(violations, `violations=${violations.join(", ")}`).toHaveLength(0);
  });
});
