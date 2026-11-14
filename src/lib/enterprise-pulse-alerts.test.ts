import { describe, expect, it } from "vitest";
import { deriveAlerts, type CrisisPrediction } from "./enterprise-pulse";

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

  it("preserves original ordering for equal risks and does not mutate the source", () => {
    const crises = [crisis("first", 69), crisis("second", 69), crisis("third", 80)];
    expect(deriveAlerts(crises).map((alert) => alert.id)).toEqual(["third", "first", "second"]);
    expect(crises.map((item) => item.id)).toEqual(["first", "second", "third"]);
  });
});
