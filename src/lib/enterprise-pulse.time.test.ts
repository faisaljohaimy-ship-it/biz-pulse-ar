import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { formatRelativeTime } from "./enterprise-pulse";

const NOW = new Date("2026-11-09T00:00:00.000Z");
const shifted = (ms: number) => new Date(NOW.getTime() + ms);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("enterprise pulse relative-time formatting", () => {
  it("shows upcoming timestamps as future, not just now", () => {
    expect(formatRelativeTime(shifted(30_000), "en")).toBe("in 30s");
    expect(formatRelativeTime(shifted(30_000), "ar")).toBe("بعد 30 ثانية");
    expect(formatRelativeTime(shifted(300_000), "en")).toBe("in 5m");
    expect(formatRelativeTime(shifted(300_000), "ar")).toBe("بعد 5 دقيقة");
    expect(formatRelativeTime(shifted(7_200_000), "en")).toBe("in 2h");
    expect(formatRelativeTime(shifted(7_200_000), "ar")).toBe("بعد 2 ساعة");
  });

  it("preserves the existing past and near-now behavior", () => {
    expect(formatRelativeTime(shifted(-30_000), "en")).toBe("30s ago");
    expect(formatRelativeTime(shifted(-30_000), "ar")).toBe("قبل 30 ثانية");
    expect(formatRelativeTime(shifted(-300_000), "en")).toBe("5m ago");
    expect(formatRelativeTime(shifted(-7_200_000), "ar")).toBe("قبل 2 ساعة");
    expect(formatRelativeTime(shifted(3_000), "en")).toBe("just now");
    expect(formatRelativeTime(shifted(-3_000), "ar")).toBe("الآن");
  });

  it("does not produce NaN or false freshness for invalid dates", () => {
    expect(formatRelativeTime(new Date("invalid"), "en")).toBe("unknown");
    expect(formatRelativeTime(new Date("invalid"), "ar")).toBe("غير معروف");
  });
});
