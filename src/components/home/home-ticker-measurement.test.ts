import { describe, expect, it } from "vitest";
import { tickerLoop } from "./HomeTicker";

describe("tickerLoop measurement guards", () => {
  it.each([
    [Infinity, 700, 44],
    [100, Infinity, 44],
    [100, NaN, 44],
    [100, 300, Infinity],
    [1e-200, 1e200, 44],
    [100, 300, Number.MIN_VALUE],
    [100, -Infinity, 44],
  ])("rejects non-finite or overflowed layout values (%s, %s, %s)", (copy, view, speed) => {
    expect(tickerLoop(copy, view, speed)).toBeNull();
  });

  it("keeps finite timing for normal measurements", () => {
    expect(tickerLoop(100, 300, 50)).toEqual({ seconds: 2, copies: 4 });
    expect(tickerLoop(100, 0, 50)).toEqual({ seconds: 2, copies: 2 });
    expect(tickerLoop(0, 300, 50)).toBeNull();
    expect(tickerLoop(100, 300, 0)).toBeNull();
  });

  it("caps duplicate lists at 64 and rejects negative finite view widths", () => {
    expect(tickerLoop(1, 63, 1)).toEqual({ seconds: 1, copies: 64 });
    expect(tickerLoop(1, 64, 1)).toBeNull();
    expect(tickerLoop(1, 1e9, 1)).toBeNull();
    expect(tickerLoop(100, -1, 50)).toBeNull();
  });
});
