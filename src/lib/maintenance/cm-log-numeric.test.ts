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

  it.each([
    "9007199254740992",
    "9007199254740993",
    "9,007,199,254,740,993",
    "9.007199254740993e15",
    "-9007199254740993",
  ])("rejects unsafe integer magnitude %s rather than rounding a measured value", (raw) => {
    expect(toNumber(raw)).toBeNull();
  });

  it("rejects an already-rounded unsafe JS integer", () => {
    expect(toNumber(Number.MAX_SAFE_INTEGER + 2)).toBeNull();
  });

  it("preserves the maximum safely representable positive and negative integers", () => {
    expect(toNumber("9007199254740991")).toBe(Number.MAX_SAFE_INTEGER);
    expect(toNumber("-9,007,199,254,740,991")).toBe(-Number.MAX_SAFE_INTEGER);
  });

  it("retains null for empty cells and finite numeric zero", () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber("")).toBeNull();
    expect(toNumber(0)).toBe(0);
  });
});
