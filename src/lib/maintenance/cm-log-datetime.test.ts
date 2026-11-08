/** Invalid spreadsheet date-time tails must not fabricate maintenance chronology. */
import { describe, expect, it } from "vitest";
import { toIsoDate } from "@/lib/maintenance/cm-log-rules";

describe("CM/SAP import timestamp validation", () => {
  it.each([
    "2026-11-08junk",
    "2026-11-08T99:99:99Z",
    "2026-11-08T12:60:00Z",
    "2026-11-08T12:30:60Z",
    "2026-11-08 12:30:00corrupt",
    "2026-11-08T12:30:00+25:00",
    "2026-11-08T12:30:00.3Zjunk",
  ])("rejects malformed date-time input %s rather than inventing a date", (raw) => {
    expect(toIsoDate(raw)).toBeNull();
  });

  it.each([
    ["2026-11-08", "2026-11-08"],
    ["2026-11-08T12:30:00Z", "2026-11-08"],
    ["2026-11-08 12:30:00", "2026-11-08"],
    ["2026-11-08T23:59:59.999+03:00", "2026-11-08"],
    ["2024-02-29", "2024-02-29"],
  ])("preserves valid dates and date-times %s", (raw, day) => {
    expect(toIsoDate(raw)).toBe(day);
  });

  it("still rejects impossible days and preserves genuine Excel date cells", () => {
    expect(toIsoDate("2025-02-29")).toBeNull();
    expect(toIsoDate(45658)).toBe("2025-01-01");
    expect(toIsoDate(new Date("2025-04-01T00:00:00Z"))).toBe("2025-04-01");
  });
});
