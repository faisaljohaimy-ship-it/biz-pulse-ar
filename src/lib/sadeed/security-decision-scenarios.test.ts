import { describe, expect, it, vi } from "vitest";
import {
  SECURITY_DECISION_SCENARIOS,
  buildSecurityDecisionScenario,
  type SecurityDecisionScenarioId,
} from "./security-decision-scenarios";

describe("synthetic security decision scenarios", () => {
  it.each(SECURITY_DECISION_SCENARIOS)(
    "provides a coherent bilingual $id story with unverified evidence and human ownership",
    ({ id, name_ar, name_en }) => {
      const scenario = buildSecurityDecisionScenario(id);
      expect(name_ar).toMatch(/[\u0600-\u06ff]/);
      expect(name_en).toMatch(/[a-z]/i);
      expect(scenario.simulated).toBe(true);
      expect(scenario.source).toBe("demo_fixture");
      expect(scenario.approvalRequired).toBe(true);
      expect(scenario.decisionStatus).toBe("awaiting_human_approval");
      expect(scenario.eventAr).toContain("افتراضي");
      expect(scenario.eventEn).toContain("fictional");
      expect(scenario.ownerAr).toContain("افتراضي");
      expect(scenario.ownerEn).toContain("fictional role");
      expect(scenario.reviewWindowMinutes).toBeGreaterThan(0);
      expect(Number.isSafeInteger(scenario.reviewWindowMinutes)).toBe(true);
      expect(scenario.recommendedActionsAr).toHaveLength(scenario.recommendedActionsEn.length);
      expect(scenario.recommendedActionsEn[0]).toMatch(/verify/i);
      expect(scenario.alternatives.length).toBeGreaterThan(1);
      for (const alternative of scenario.alternatives) {
        expect(alternative.titleAr).toMatch(/[\u0600-\u06ff]/);
        expect(alternative.titleEn).toMatch(/[a-z]/i);
        expect(alternative.tradeoffAr).toMatch(/[\u0600-\u06ff]/);
        expect(alternative.tradeoffEn).toMatch(/[a-z]/i);
      }
      expect(scenario.evidence.length).toBeGreaterThan(0);
      for (const evidence of scenario.evidence) {
        expect(evidence.simulated).toBe(true);
        expect(["unverified", "needs_verification"]).toContain(evidence.status);
        expect(evidence.labelAr).toMatch(/[\u0600-\u06ff]/);
        expect(evidence.labelEn).toMatch(/synthetic|fictional/i);
        expect(evidence.detailAr).toBeTruthy();
        expect(evidence.detailEn).toBeTruthy();
      }
      if (scenario.severity === "high") {
        expect(scenario.severityReasonEn).toMatch(/high priority/i);
        expect(scenario.auditTrail.map((entry) => entry.detailEn).join(" ")).not.toMatch(
          /\bcritical\b/i,
        );
      }
    },
  );

  it("changes context, evidence, reviewer and recommendations with the chosen story", () => {
    const access = buildSecurityDecisionScenario("access");
    const camera = buildSecurityDecisionScenario("camera");
    const patrol = buildSecurityDecisionScenario("patrol");
    expect(access.severity).toBe("critical");
    expect(camera.severity).toBe("high");
    expect(patrol.severity).toBe("high");
    expect(new Set([access.id, camera.id, patrol.id]).size).toBe(3);
    expect(new Set([access.ownerEn, camera.ownerEn, patrol.ownerEn]).size).toBe(3);
    expect(camera.eventEn).toMatch(/camera unavailable/i);
    expect(camera.recommendedActionsEn.join(" ")).toMatch(
      /inspection without creating a work order/i,
    );
    expect(camera.evidence[0].detailEn).toMatch(/no camera.*connection/i);
    expect(patrol.eventEn).toMatch(/missed checkpoint/i);
    expect(patrol.recommendedActionsEn.join(" ")).toMatch(
      /without dispatching people or vehicles/i,
    );
    expect(patrol.evidence[0].detailEn).toMatch(/does not prove patrol absence/i);
    expect(patrol.severityReasonEn).toMatch(/neither an incident nor misconduct/i);
    expect(camera.recommendedActionsEn).not.toEqual(access.recommendedActionsEn);
    expect(patrol.evidence).not.toEqual(camera.evidence);
  });

  it("rejects unknown scenarios instead of silently showing an unrelated incident", () => {
    expect(() => buildSecurityDecisionScenario("live-site" as SecurityDecisionScenarioId)).toThrow(
      RangeError,
    );
  });

  it("builds fresh deterministic fixtures locally without contacting any service", () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network"));
    try {
      for (const { id } of SECURITY_DECISION_SCENARIOS) {
        const first = buildSecurityDecisionScenario(id);
        const second = buildSecurityDecisionScenario(id);
        expect(first).toEqual(second);
        first.evidence[0].detailEn = "Local test mutation";
        expect(second.evidence[0].detailEn).not.toBe("Local test mutation");
        expect(buildSecurityDecisionScenario(id)).toEqual(second);
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
