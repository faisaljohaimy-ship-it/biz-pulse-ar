import { describe, expect, it } from "vitest";
import { deriveAlerts, deriveStatus, type CrisisPrediction } from "./enterprise-pulse";

function crisis(id: string, riskScore: number): CrisisPrediction {
  return {
    id,
    riskScore,
    probability: 50,
    category: "delay",
    title_ar: id,
    title_en: id,
    impact_ar: "",
    impact_en: "",
    owner: "owner",
    action_ar: "",
    action_en: "",
    route: "/risk",
  };
}

describe("Enterprise Pulse executive risk alerts", () => {
  it("shows the five highest risks even when source sort_order puts a higher risk sixth", () => {
    // Seeded/realtime crises arrive in sort_order, not by risk_score.
    // The sixth crisis must displace a lower-severity fifth crisis.
    const crises = [
      crisis("c-1", 86),
      crisis("c-2", 74),
      crisis("c-3", 71),
      crisis("c-4", 64),
      crisis("c-5", 58),
      crisis("c-6", 69),
    ];

    const alerts = deriveAlerts(crises);
    expect(alerts.map((alert) => alert.id)).toEqual(["c-1", "c-2", "c-3", "c-6", "c-4"]);
    expect(alerts.map((alert) => alert.severity)).toEqual([
      "critical",
      "high",
      "high",
      "high",
      "medium",
    ]);
    expect(crises.map((item) => item.id)).toEqual(["c-1", "c-2", "c-3", "c-4", "c-5", "c-6"]);
  });

  it("does not let a malformed risk score displace a valid top-five alert", () => {
    const crises = [
      crisis("unknown", Number.NaN),
      crisis("critical", 95),
      crisis("high-1", 80),
      crisis("high-2", 75),
      crisis("medium", 60),
      crisis("low", 45),
    ];
    expect(deriveAlerts(crises).map((a) => a.id)).toEqual([
      "critical",
      "high-1",
      "high-2",
      "medium",
      "low",
    ]);
    expect(crises[0].riskScore).toBeNaN();
  });

  it("never renders a severity from infinite, negative, or over-100 risk measurements", () => {
    const crises = [
      crisis("infinite", Number.POSITIVE_INFINITY),
      crisis("negative", -1),
      crisis("out-of-range", 101),
      crisis("critical-edge", 100),
      crisis("low-edge", 0),
    ];
    expect(deriveAlerts(crises).map((a) => [a.id, a.severity])).toEqual([
      ["critical-edge", "critical"],
      ["low-edge", "low"],
    ]);
  });

  it("rejects coerced null, string and boolean risk telemetry in alert cards", () => {
    const crises = [
      crisis("missing", null as unknown as number),
      crisis("string-critical", "99" as unknown as number),
      crisis("boolean", true as unknown as number),
      crisis("legitimate", 81),
    ];
    expect(deriveAlerts(crises).map((alert) => alert.id)).toEqual(["legitimate"]);
  });

  it("preserves original ordering for equal risks and does not mutate the source", () => {
    const crises = [crisis("first", 69), crisis("second", 69), crisis("third", 80)];
    expect(deriveAlerts(crises).map((alert) => alert.id)).toEqual(["third", "first", "second"]);
    expect(crises.map((item) => item.id)).toEqual(["first", "second", "third"]);
  });
});

describe("Enterprise Pulse overall risk status", () => {
  it("ignores NaN telemetry without hiding a valid critical crisis", () => {
    const crises = [crisis("malformed", Number.NaN), crisis("critical", 90)];
    expect(deriveStatus(crises)).toEqual({ status: "critical", health: 69 });
    expect(crises[0].riskScore).toBeNaN();
  });

  it("rejects infinite and out-of-range risk scores without corrupting health", () => {
    const crises = [
      crisis("infinite", Number.POSITIVE_INFINITY),
      crisis("negative", -1),
      crisis("oversized", 101),
      crisis("warning", 65),
    ];
    expect(deriveStatus(crises)).toEqual({ status: "warning", health: 77 });
  });

  it("does not elevate status using coerced numeric strings, booleans or nulls", () => {
    const malformed = [
      crisis("missing", null as unknown as number),
      crisis("string-critical", "99" as unknown as number),
      crisis("boolean", true as unknown as number),
    ];
    expect(deriveStatus(malformed)).toEqual({ status: "healthy", health: 100 });
    expect(deriveStatus([...malformed, crisis("real", 81)])).toEqual({
      status: "critical",
      health: 72,
    });
  });

  it("keeps existing healthy fallback and valid 0/100 boundaries", () => {
    expect(deriveStatus([crisis("invalid", Number.NaN)])).toEqual({
      status: "healthy",
      health: 100,
    });
    expect(deriveStatus([crisis("zero", 0)])).toEqual({ status: "healthy", health: 100 });
    expect(deriveStatus([crisis("hundred", 100)])).toEqual({
      status: "critical",
      health: 65,
    });
  });
});
