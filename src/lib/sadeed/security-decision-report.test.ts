import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/lib/i18n";
import {
  createSecurityDecisionDemoState,
  securityDecisionDemoReducer,
  type SecurityDecisionDemoState,
} from "./security-decision-demo";
import { buildSecurityDecisionReport } from "./security-decision-report";
import {
  buildSecurityDecisionScenario,
  type SecurityDecisionScenario,
} from "./security-decision-scenarios";

const exportedAt = new Date("2026-11-22T12:34:56.000Z");

function finished(outcome: "reviewed" | "needs_verification"): SecurityDecisionDemoState {
  let state = createSecurityDecisionDemoState();
  state = securityDecisionDemoReducer(state, { type: "start" });
  state = securityDecisionDemoReducer(state, { type: "advance" });
  state = securityDecisionDemoReducer(state, { type: "advance" });
  return securityDecisionDemoReducer(state, { type: "review", outcome });
}

describe("standalone synthetic security decision report", () => {
  it("distinguishes an unreviewed draft from both local review outcomes without granting approval", () => {
    const demo = buildSecurityDecisionScenario("access");
    const draft = buildSecurityDecisionReport(
      demo,
      createSecurityDecisionDemoState(),
      "en",
      exportedAt,
    );
    expect(draft).toContain("Unreviewed draft");
    expect(draft).toContain("Draft report; the local review is incomplete");
    for (const [outcome, label] of [
      ["reviewed", "Simulated review completed"],
      ["needs_verification", "Simulated verification requested"],
    ] as const) {
      const report = buildSecurityDecisionReport(demo, finished(outcome), "en", exportedAt);
      expect(report).toContain(label);
      expect(report).not.toContain("Unreviewed draft");
      expect(report).toContain("Only a local review step was completed");
      expect(report).toContain("Actual approval is still required");
      expect(report).toContain("Operational approval not granted");
      expect(report).toContain("Executed actions: 0");
      expect(report).toContain("No request was sent and no action was executed");
    }
  });

  it.each(["ar", "en"] as const)(
    "includes the chosen scenario, source, owner, review window, alternatives and temporary history in %s",
    (locale) => {
      const demo = buildSecurityDecisionScenario("camera");
      const state = finished("needs_verification");
      const report = buildSecurityDecisionReport(demo, state, locale, exportedAt);
      const document = new DOMParser().parseFromString(report, "text/html");
      const text = document.body.textContent!;
      expect(document.documentElement.lang).toBe(locale);
      expect(document.documentElement.dir).toBe(locale === "ar" ? "rtl" : "ltr");
      expect(text).toContain(demo.id);
      expect(text).toContain("demo_fixture");
      expect(text).toContain("simulated=true");
      expect(text).toContain(exportedAt.toISOString());
      expect(text).toContain(locale === "ar" ? demo.eventAr : demo.eventEn);
      expect(text).toContain(locale === "ar" ? demo.ownerAr : demo.ownerEn);
      expect(text).toContain(String(demo.reviewWindowMinutes));
      expect(text).toContain(locale === "ar" ? demo.severityReasonAr : demo.severityReasonEn);
      for (const alternative of demo.alternatives) {
        expect(text).toContain(locale === "ar" ? alternative.titleAr : alternative.titleEn);
        expect(text).toContain(locale === "ar" ? alternative.tradeoffAr : alternative.tradeoffEn);
      }
      for (const entry of state.auditTrail) {
        expect(text).toContain(locale === "ar" ? entry.detailAr : entry.detailEn);
      }
      expect(document.querySelector("script,iframe,img,link,[src],[href],[onclick]")).toBeNull();
      expect(report).toBe(buildSecurityDecisionReport(demo, state, locale, exportedAt));
    },
  );

  it.each(["ar", "en"] as const)("escapes all report content fields in %s", (locale) => {
    const payload = `</dd><script>alert("xss")</script><img src=x onerror='attack()'>&`;
    const original = buildSecurityDecisionScenario("access");
    const demo: SecurityDecisionScenario = {
      ...original,
      id: payload,
      eventAr: payload,
      eventEn: payload,
      locationAr: payload,
      locationEn: payload,
      ownerAr: payload,
      ownerEn: payload,
      severityReasonAr: payload,
      severityReasonEn: payload,
      recommendedActionsAr: [payload],
      recommendedActionsEn: [payload],
      evidence: [
        {
          ...original.evidence[0],
          labelAr: payload,
          labelEn: payload,
          detailAr: payload,
          detailEn: payload,
        },
      ],
      alternatives: [
        { titleAr: payload, titleEn: payload, tradeoffAr: payload, tradeoffEn: payload },
      ],
    };
    const state = {
      ...finished("reviewed"),
      auditTrail: [{ step: "review", detailAr: payload, detailEn: payload }],
    };
    const report = buildSecurityDecisionReport(demo, state, locale, exportedAt);
    const document = new DOMParser().parseFromString(report, "text/html");
    expect(report).not.toContain(payload);
    expect(report).toContain("&lt;script&gt;");
    expect(document.querySelector("script,img,[onerror]")).toBeNull();
    expect(document.body.textContent).toContain(payload);
  });

  it("refuses live or operational inputs instead of mislabelling them as a simulation", () => {
    const demo = buildSecurityDecisionScenario("patrol");
    const state = finished("reviewed");
    const unsafeDemos = [
      { ...demo, simulated: false },
      { ...demo, source: "live_sensor" },
    ];
    const unsafeStates = [
      { ...state, simulated: false },
      { ...state, operationalApproval: true },
      { ...state, executedActions: ["dispatch"] },
    ];
    for (const unsafe of unsafeDemos) {
      expect(() =>
        buildSecurityDecisionReport(unsafe as SecurityDecisionScenario, state, "en", exportedAt),
      ).toThrow("Only non-operational synthetic reports are supported");
    }
    for (const unsafe of unsafeStates) {
      expect(() =>
        buildSecurityDecisionReport(demo, unsafe as SecurityDecisionDemoState, "en", exportedAt),
      ).toThrow("Only non-operational synthetic reports are supported");
    }
  });

  it("rejects unsupported or injected locale attributes before producing HTML", () => {
    const demo = buildSecurityDecisionScenario("access");
    const state = finished("reviewed");
    for (const locale of [
      "fr",
      'en" onload="attack()',
      'en"><script>attack()</script><html lang="en',
    ]) {
      expect(() => buildSecurityDecisionReport(demo, state, locale as Locale, exportedAt)).toThrow(
        "Only non-operational synthetic reports are supported",
      );
    }
  });

  it("rejects injected, non-finite, fractional or non-positive review windows", () => {
    const demo = buildSecurityDecisionScenario("camera");
    const state = finished("reviewed");
    for (const reviewWindowMinutes of [
      "<script>attack()</script>",
      "30",
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
      1.5,
      0,
      -1,
    ]) {
      expect(() =>
        buildSecurityDecisionReport(
          { ...demo, reviewWindowMinutes } as SecurityDecisionScenario,
          state,
          "en",
          exportedAt,
        ),
      ).toThrow("Only non-operational synthetic reports are supported");
    }
  });

  it("refuses a real evidence entry even when the containing scenario claims to be synthetic", () => {
    const original = buildSecurityDecisionScenario("access");
    const demo = {
      ...original,
      evidence: original.evidence.map((entry, index) =>
        index === 0 ? { ...entry, simulated: false } : entry,
      ),
    } as unknown as SecurityDecisionScenario;
    expect(demo.simulated).toBe(true);
    expect(() => buildSecurityDecisionReport(demo, finished("reviewed"), "en", exportedAt)).toThrow(
      "Only non-operational synthetic reports are supported",
    );
  });

  it("builds the report locally without fetching assets or sending scenario data", () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network"));
    try {
      const report = buildSecurityDecisionReport(
        buildSecurityDecisionScenario("access"),
        finished("reviewed"),
        "en",
        exportedAt,
      );
      expect(report).toContain("not an operational audit record");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
