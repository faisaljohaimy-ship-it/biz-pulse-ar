import { describe, expect, it } from "vitest";
import { assertValidReportScheduleClock, computeNextRun } from "./report-schedule-time";

const NOW = new Date("2026-11-15T12:00:00.000Z"); // Sunday, 12:00 UTC

describe("UTC executive report schedules", () => {
  it.each([Number.NaN, Infinity, -Infinity, -1, 24, 10.5, null, undefined, "garbage"])(
    "rejects an invalid hour before creating a schedule (%s)",
    (hour) => {
      expect(() =>
        assertValidReportScheduleClock({
          frequency: "daily",
          hour_utc: hour as number,
        }),
      ).toThrow("hour_utc must be 0–23");
    },
  );

  it.each([Number.NaN, Infinity, -Infinity, -1, 7, 1.5, null, undefined, "garbage"])(
    "rejects an invalid weekly weekday before entering date arithmetic (%s)",
    (weekday) => {
      expect(() =>
        assertValidReportScheduleClock({
          frequency: "weekly",
          hour_utc: 10,
          weekday: weekday as number,
        }),
      ).toThrow("weekday required");
      expect(() =>
        computeNextRun({ frequency: "weekly", hour_utc: 10, weekday: weekday as number }, NOW),
      ).toThrow("weekday required");
    },
  );

  it("allows valid daily hours at the UTC boundaries", () => {
    expect(computeNextRun({ frequency: "daily", hour_utc: 0 }, NOW)).toBe(
      "2026-11-16T00:00:00.000Z",
    );
    expect(computeNextRun({ frequency: "daily", hour_utc: 23 }, NOW)).toBe(
      "2026-11-15T23:00:00.000Z",
    );
  });

  it("keeps the next daily run today if its hour has not passed and tomorrow otherwise", () => {
    expect(computeNextRun({ frequency: "daily", hour_utc: 13 }, NOW)).toBe(
      "2026-11-15T13:00:00.000Z",
    );
    expect(computeNextRun({ frequency: "daily", hour_utc: 11 }, NOW)).toBe(
      "2026-11-16T11:00:00.000Z",
    );
  });

  it("schedules the correct weekday without a potentially unbounded loop", () => {
    expect(computeNextRun({ frequency: "weekly", hour_utc: 13, weekday: 0 }, NOW)).toBe(
      "2026-11-15T13:00:00.000Z",
    );
    expect(computeNextRun({ frequency: "weekly", hour_utc: 11, weekday: 0 }, NOW)).toBe(
      "2026-11-22T11:00:00.000Z",
    );
    expect(computeNextRun({ frequency: "weekly", hour_utc: 10, weekday: 1 }, NOW)).toBe(
      "2026-11-16T10:00:00.000Z",
    );
  });

  it("does not require a weekday for daily schedules", () => {
    expect(computeNextRun({ frequency: "daily", hour_utc: 13, weekday: null }, NOW)).toBe(
      "2026-11-15T13:00:00.000Z",
    );
  });
});
