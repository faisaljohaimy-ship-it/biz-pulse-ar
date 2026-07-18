import { describe, expect, it } from "vitest";
import { normalizeE164 } from "./phone-number";

describe("ARIA E.164 phone normalization", () => {
  it("normalizes the registered Saudi owner number from 00 notation", () => {
    expect(normalizeE164("00966500888778")).toBe("+966500888778");
  });

  it("preserves a canonical E.164 number", () => {
    expect(normalizeE164("+966 50 088 8778")).toBe("+966500888778");
  });

  it("rejects a local number without a country code", () => {
    expect(() => normalizeE164("0500888778")).toThrow(/E\.164/);
  });
});
