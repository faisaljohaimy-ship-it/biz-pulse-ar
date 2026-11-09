import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SHOWCASE_QUERY_DEADLINE_MS,
  withShowcaseDeadline,
} from "./showcase-query-deadline";

afterEach(() => vi.useRealTimers());

describe("enterprise showcase query deadline", () => {
  it("clears the deadline when a database result resolves immediately", async () => {
    vi.useFakeTimers();
    await expect(withShowcaseDeadline(Promise.resolve({ data: [] }))).resolves.toEqual({
      data: [],
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the deadline when the database rejects", async () => {
    vi.useFakeTimers();
    await expect(withShowcaseDeadline(Promise.reject(new Error("db offline")))).rejects.toThrow(
      "db offline",
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retains the 4-second fallback for hung queries and clears the timer", async () => {
    vi.useFakeTimers();
    expect(SHOWCASE_QUERY_DEADLINE_MS).toBe(4_000);
    const pending = withShowcaseDeadline(new Promise<never>(() => {}));
    const result = expect(pending).rejects.toThrow("showcase-timeout");
    await vi.advanceTimersByTimeAsync(SHOWCASE_QUERY_DEADLINE_MS - 1);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels the timer when a slow query finishes before the deadline", async () => {
    vi.useFakeTimers();
    const delayed = new Promise<number>((resolve) => {
      setTimeout(() => resolve(5), 1_000);
    });
    const pending = withShowcaseDeadline(delayed);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(pending).resolves.toBe(5);
    expect(vi.getTimerCount()).toBe(0);
  });
});
