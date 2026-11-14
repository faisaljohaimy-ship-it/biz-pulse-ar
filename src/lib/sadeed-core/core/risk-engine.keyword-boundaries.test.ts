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

describe("riskEngine keyword boundaries", () => {
  it.each(["Download the weekly summary", "Check firewall configuration", "Verify download links"])(
    "does not invent a critical incident from a routine request: %s",
    (prompt) => {
      expect(riskEngine.assess(prompt, context).level).toBe("info");
    },
  );

  it.each([
    "Power is down",
    "Wildfire near the station",
    "Fire near the gate",
    "Emergency shutdown",
    "Outage at the power station",
  ])("retains critical classification for real risk terms: %s", (prompt) => {
    expect(riskEngine.assess(prompt, context).level).toBe("critical");
  });

  it("preserves lower severity signal classification", () => {
    expect(riskEngine.assess("Review the weekly log", context).level).toBe("low");
  });
});
