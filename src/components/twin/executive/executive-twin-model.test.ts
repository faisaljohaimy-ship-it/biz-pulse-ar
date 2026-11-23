import { describe, expect, it } from "vitest";
import { EXECUTIVE_STATUS, EXECUTIVE_TWIN_REFERENCE as reference } from "./executive-twin-model";

describe("owner reference data provenance", () => {
  it("preserves the supplied reference figures without representing them as live readings", () => {
    expect(reference.is_simulation).toBe(true);
    expect(reference.source).toBe("owner-reference-image");
    expect(reference.metrics.map((item) => item.value)).toEqual([
      "99%",
      "4,820",
      "320",
      "2,150",
      "12",
    ]);
    expect(reference.departments.map((item) => item.pct)).toEqual([98, 76, 62, 48, 90]);
    expect(new Set(reference.departments.map((item) => item.id)).size).toBe(5);
    for (const department of reference.departments) {
      expect(department.ar.trim()).not.toBe("");
      expect(department.en.trim()).not.toBe("");
      expect(EXECUTIVE_STATUS[department.status].ar).toBeTruthy();
      expect(EXECUTIVE_STATUS[department.status].en).toBeTruthy();
    }
  });
});
