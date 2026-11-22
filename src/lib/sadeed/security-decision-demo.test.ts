import { describe, expect, it } from "vitest";
import { buildUnauthorizedAccessDecisionDemo } from "./security-decision-demo";

describe("SADEED security decision demonstration", () => {
  it("labels all evidence and events as simulated", () => {
    const demo = buildUnauthorizedAccessDecisionDemo();
    expect(demo.simulated).toBe(true);
    expect(demo.source).toBe("demo_fixture");
    expect(demo.locationAr).toContain("افتراضية");
    expect(demo.eventAr).toContain("افتراضي");
  });

  it("requires human approval and does not claim execution", () => {
    const demo = buildUnauthorizedAccessDecisionDemo();
    expect(demo.approvalRequired).toBe(true);
    expect(demo.decisionStatus).toBe("awaiting_human_approval");
    expect(demo.auditTrail.at(-1)?.detailAr).toContain("لم ينفذ أي إجراء");
  });

  it("offers verification before operational escalation", () => {
    const demo = buildUnauthorizedAccessDecisionDemo();
    expect(demo.recommendedActionsAr[0]).toContain("التحقق");
    expect(demo.auditTrail).toHaveLength(4);
  });
});
