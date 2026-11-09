import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withProjectsSummaryTimeout } from "./projects-summary-timeout";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("projects-summary bounded database reads", () => {
  it("releases its timer immediately when a read succeeds", async () => {
    await expect(withProjectsSummaryTimeout(Promise.resolve({ data: [1] }))).resolves.toEqual({
      data: [1],
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("releases its timer immediately when a read fails", async () => {
    await expect(
      withProjectsSummaryTimeout(Promise.reject(new Error("db unavailable"))),
    ).rejects.toThrow("db unavailable");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves the four-second deadline for a stalled read", async () => {
    const timedOut = withProjectsSummaryTimeout(new Promise<never>(() => {}));
    const assertion = expect(timedOut).rejects.toThrow("projects-summary-timeout");
    await vi.advanceTimersByTimeAsync(4_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});
