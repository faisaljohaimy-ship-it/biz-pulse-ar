import { afterEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime } from "./enterprise-pulse-time";

const NOW = new Date("2026-11-11T02:00:00.000Z");
const atOffset = (milliseconds: number) => new Date(NOW.getTime() + milliseconds);

afterEach(() => vi.useRealTimers());

describe("executive pulse relative timestamps", () => {
  it("does not expose NaN for invalid timestamps in either locale", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(new Date(Number.NaN), "en")).toBe("—");
    expect(formatRelativeTime(new Date(Number.NaN), "ar")).toBe("—");
  });

  it("identifies future scheduled events instead of reporting them as just now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(atOffset(10_000), "en")).toBe("in 10s");
    expect(formatRelativeTime(atOffset(120_000), "en")).toBe("in 2m");
    expect(formatRelativeTime(atOffset(120_000), "ar")).toBe("بعد 2 دقيقة");
    expect(formatRelativeTime(atOffset(3_600_000), "en")).toBe("in 1h");
  });

  it("retains the existing past and near-now labels", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(atOffset(0), "en")).toBe("just now");
    expect(formatRelativeTime(atOffset(-45_000), "en")).toBe("45s ago");
    expect(formatRelativeTime(atOffset(-120_000), "ar")).toBe("قبل 2 دقيقة");
    expect(formatRelativeTime(atOffset(-7_200_000), "en")).toBe("2h ago");
    expect(formatRelativeTime(atOffset(3_000), "en")).toBe("just now");
  });
});
