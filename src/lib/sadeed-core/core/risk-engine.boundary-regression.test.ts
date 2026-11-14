import { describe, expect, it } from "vitest";
import type { SadeedContextSnapshot } from "../types/sadeed";
import { riskEngine } from "./risk-engine";

const context: SadeedContextSnapshot = {
  pathname: "/sec/twin",
  label: "Security Digital Twin",
  locale: "en",
  module: "sec",
  screen: "twin",
  permissions: [],
  pageMeta: {},
  capturedAt: "2026-11-15T00:00:00.000Z",
};

describe("riskEngine independent word-boundary regressions", () => {
  it.each([
    "Open countdown timer",
    "Perform brisk inspection",
    "Restock tissues",
  ])("does not invent a risk from ordinary words: %s", (prompt) => {
    expect(riskEngine.assess(prompt, context).level).toBe("info");
  });

  it.each([
    ["Power is down", "critical"],
    ["Emergency shutdown", "critical"],
    ["Fire near the gate", "critical"],
    ["Risk assessment needed", "medium"],
    ["Report the issue", "medium"],
    ["Review the weekly log", "low"],
  ] as const)("retains the real signal in %s", (prompt, level) => {
    expect(riskEngine.assess(prompt, context).level).toBe(level);
  });

  it.each([
    ["Review snow conditions", 0.21],
    ["Check nowadays dashboard", 0.07],
  ] as const)("does not infer urgency from a word fragment in %s", (prompt, urgency) => {
    expect(riskEngine.assess(prompt, context).urgency).toBeCloseTo(urgency);
  });

  it.each(["Act now", "Review today", "Respond immediately"])(
    "retains explicit urgency: %s",
    (prompt) => {
      expect(riskEngine.assess(prompt, context).urgency).toBe(0.9);
    },
  );
});
