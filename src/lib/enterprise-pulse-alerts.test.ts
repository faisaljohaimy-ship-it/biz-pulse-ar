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

  it("preserves original ordering for equal risks and does not mutate the source", () => {
    const crises = [crisis("first", 69), crisis("second", 69), crisis("third", 80)];
    expect(deriveAlerts(crises).map((alert) => alert.id)).toEqual(["third", "first", "second"]);
    expect(crises.map((item) => item.id)).toEqual(["first", "second", "third"]);
  });
});
