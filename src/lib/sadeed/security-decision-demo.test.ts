import { describe, expect, it, vi } from "vitest";
import {
  buildUnauthorizedAccessDecisionDemo,
  isSecurityDecisionDemoRoute,
  createSecurityDecisionDemoState,
  securityDecisionDemoReducer,
  type SecurityDecisionDemoAction,
  type SecurityDecisionDemoState,
} from "./security-decision-demo";

describe("SADEED security decision demonstration", () => {
  it("exempts only the exact synthetic route from staff attribution", () => {
    expect(isSecurityDecisionDemoRoute("/sec/decision-center")).toBe(true);
    expect(isSecurityDecisionDemoRoute("/sec/decision-center/")).toBe(true);
    for (const path of [
      "/sec",
      "/sec/incidents",
      "/security-center",
      "/sec/decision-center/real",
      "/sec/decision-center-admin",
    ])
      expect(isSecurityDecisionDemoRoute(path), path).toBe(false);
  });
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

  it("provides matching Arabic and English content without presenting synthetic evidence as verified", () => {
    const demo = buildUnauthorizedAccessDecisionDemo();
    for (const field of ["title", "location", "event", "severityReason"] as const) {
      expect(demo[`${field}Ar`]).toMatch(/[\u0600-\u06ff]/);
      expect(demo[`${field}En`]).toMatch(/[a-z]/i);
    }
    expect(demo.locationEn).toContain("not a real facility");
    expect(demo.severityReasonEn).toContain("preset");
    expect(demo.recommendedActionsEn).toHaveLength(demo.recommendedActionsAr.length);
    expect(demo.recommendedActionsEn[0]).toContain("Verify");
    expect(demo.evidence.length).toBeGreaterThan(0);
    for (const evidence of demo.evidence) {
      expect(evidence.simulated).toBe(true);
      expect(["unverified", "needs_verification"]).toContain(evidence.status);
      expect(evidence.labelAr).toContain("افتراضي");
      expect(evidence.labelEn).toMatch(/synthetic|fictional/i);
      expect(evidence.detailAr).toBeTruthy();
      expect(evidence.detailEn).toBeTruthy();
    }
    for (const entry of demo.auditTrail) {
      expect(entry.detailAr).toBeTruthy();
      expect(entry.detailEn).toBeTruthy();
    }
  });
});

function advanceToReview(): SecurityDecisionDemoState {
  return [
    { type: "start" },
    { type: "advance" },
    { type: "advance" },
  ].reduce<SecurityDecisionDemoState>(
    (state, action) => securityDecisionDemoReducer(state, action as SecurityDecisionDemoAction),
    createSecurityDecisionDemoState(),
  );
}

describe("local security decision demonstration state", () => {
  it("starts idle with no audit history, approval, or executed actions", () => {
    expect(createSecurityDecisionDemoState()).toEqual({
      stage: "idle",
      simulated: true,
      operationalApproval: false,
      executedActions: [],
      auditTrail: [],
    });
  });

  it("progresses through assessment and recommendations before allowing review", () => {
    const initial = createSecurityDecisionDemoState();
    const assessment = securityDecisionDemoReducer(initial, { type: "start" });
    const recommendation = securityDecisionDemoReducer(assessment, { type: "advance" });
    const awaitingReview = securityDecisionDemoReducer(recommendation, { type: "advance" });
    expect(assessment.stage).toBe("assessment");
    expect(recommendation.stage).toBe("recommendation");
    expect(awaitingReview.stage).toBe("awaiting_review");
    expect(awaitingReview.auditTrail.map((entry) => entry.step)).toEqual([
      "intake",
      "assessment",
      "recommendation",
    ]);
    expect(initial.auditTrail).toHaveLength(0);
    expect(assessment.auditTrail).toHaveLength(1);
    expect(recommendation.auditTrail).toHaveLength(2);
  });

  it.each(["reviewed", "needs_verification"] as const)(
    "records the %s outcome locally without approving or executing actions",
    (outcome) => {
      const beforeReview = advanceToReview();
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      try {
        const reviewed = securityDecisionDemoReducer(beforeReview, { type: "review", outcome });
        expect(reviewed.stage).toBe(outcome);
        expect(reviewed.simulated).toBe(true);
        expect(reviewed.operationalApproval).toBe(false);
        expect(reviewed.executedActions).toEqual([]);
        expect(reviewed.auditTrail).toHaveLength(4);
        expect(reviewed.auditTrail.at(-1)?.detailAr).toContain("لم ينفذ أي إجراء");
        expect(reviewed.auditTrail.at(-1)?.detailEn).toContain("no action has been executed");
        expect(beforeReview.stage).toBe("awaiting_review");
        expect(beforeReview.auditTrail).toHaveLength(3);
        expect(fetchSpy).not.toHaveBeenCalled();
        // Terminal outcomes cannot be used to append duplicate approvals or restart the run.
        expect(securityDecisionDemoReducer(reviewed, { type: "review", outcome })).toBe(reviewed);
        expect(securityDecisionDemoReducer(reviewed, { type: "start" })).toBe(reviewed);
        expect(securityDecisionDemoReducer(reviewed, { type: "advance" })).toBe(reviewed);
      } finally {
        fetchSpy.mockRestore();
      }
    },
  );

  it("ignores early review, skipped stages, duplicate starts, and unsupported outcomes", () => {
    const initial = createSecurityDecisionDemoState();
    const assessment = securityDecisionDemoReducer(initial, { type: "start" });
    const recommendation = securityDecisionDemoReducer(assessment, { type: "advance" });
    for (const state of [initial, assessment, recommendation]) {
      expect(securityDecisionDemoReducer(state, { type: "review", outcome: "reviewed" })).toBe(
        state,
      );
    }
    expect(securityDecisionDemoReducer(initial, { type: "advance" })).toBe(initial);
    expect(securityDecisionDemoReducer(assessment, { type: "start" })).toBe(assessment);
    const awaitingReview = advanceToReview();
    expect(
      securityDecisionDemoReducer(awaitingReview, {
        type: "review",
        outcome: "approved",
      } as unknown as SecurityDecisionDemoAction),
    ).toBe(awaitingReview);
  });

  it("resets the entire local run and reproduces deterministic results", () => {
    const reviewed = securityDecisionDemoReducer(advanceToReview(), {
      type: "review",
      outcome: "reviewed",
    });
    const reset = securityDecisionDemoReducer(reviewed, { type: "reset" });
    expect(reset).toEqual(createSecurityDecisionDemoState());
    expect(reset.auditTrail).not.toBe(reviewed.auditTrail);
    expect(advanceToReview()).toEqual(advanceToReview());
    expect(buildUnauthorizedAccessDecisionDemo()).toEqual(buildUnauthorizedAccessDecisionDemo());
  });
});
