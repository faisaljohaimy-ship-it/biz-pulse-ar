/** Preserve "unmeasured" on malformed CM/SAP numeric cells. Synthetic inputs only. */
import { describe, expect, it } from "vitest";
import { toNumber } from "@/lib/maintenance/cm-log-rules";

describe("maintenance numeric import integrity", () => {
  it.each([",", "1,,200", "12,34", "1,234,", "0x10", "0b10", "1_000"])(
    "rejects malformed or non-decimal spreadsheet text %s instead of inventing a number",
    (raw) => {
      expect(toNumber(raw)).toBeNull();
    },
  );

  it.each([
    ["0", 0],
    ["1,234.50", 1234.5],
    ["-2,500", -2500],
    ["2.5e2", 250],
    [".75", 0.75],
  ] as const)("preserves valid measured number %s", (raw, expected) => {
    expect(toNumber(raw)).toBe(expected);
  });

  it("retains null for empty cells and finite numeric zero", () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber("")).toBeNull();
    expect(toNumber(0)).toBe(0);
  });
});
