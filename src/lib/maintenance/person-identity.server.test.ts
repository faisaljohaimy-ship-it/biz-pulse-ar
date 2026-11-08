import { describe, expect, it } from "vitest";
import { stripPersonIdentity } from "./person-identity.server";

describe("maintenance notes guest identity redaction", () => {
  const fact = "المجموعة المخططة: WOA (الغربية)";

  it.each([
    "Entered by = Example Person",
    "Created by = Example Person",
    "أنشأه = شخص تجريبي",
    "أنشأها = شخص تجريبي",
    "Entered by: Example Person",
    "Created by：Example Person",
  ])("removes creator label and value before public display: %s", (segment) => {
    expect(stripPersonIdentity(`${segment} · ${fact}`)).toBe(fact);
    expect(stripPersonIdentity(`${fact} · ${segment} · الصيانة منفّذة`)).toBe(
      `${fact} · الصيانة منفّذة`,
    );
  });

  it("preserves non-identity maintenance facts with equals separators", () => {
    expect(stripPersonIdentity("Actual cost = 200 SAR · Priority = High")).toBe(
      "Actual cost = 200 SAR · Priority = High",
    );
  });
});
