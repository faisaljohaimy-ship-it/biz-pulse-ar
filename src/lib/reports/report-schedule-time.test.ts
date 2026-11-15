import { describe, expect, it } from "vitest";
import { advanceDueReportScheduleClock, assertValidReportScheduleClock, computeNextRun } from "./report-schedule-time";

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

describe("cron report schedule advancement", () => {
  it.each(["hourly", "WEEKLY", "", null, undefined])(
    "rejects unknown persisted frequencies instead of silently scheduling daily (%s)",
    (frequency) => {
      const schedule = { frequency, hour_utc: 10, weekday: 1 } as unknown as Parameters<
        typeof advanceDueReportScheduleClock
      >[0];
      expect(() => advanceDueReportScheduleClock(schedule, NOW)).toThrow(
        "frequency must be daily or weekly",
      );
      expect(() => computeNextRun(schedule, NOW)).toThrow("frequency must be daily or weekly");
    },
  );

  it.each([Number.NaN, Infinity, -Infinity, -1, 7, 1.5, null, undefined])(
    "rejects invalid persisted weekly weekdays without an unbounded search (%s)",
    (weekday) => {
      expect(() =>
        advanceDueReportScheduleClock(
          { frequency: "weekly", hour_utc: 10, weekday: weekday as number },
          NOW,
        ),
      ).toThrow("weekday required");
    },
  );

  it("keeps the existing next-day behavior for a due daily report", () => {
    expect(advanceDueReportScheduleClock({ frequency: "daily", hour_utc: 23 }, NOW)).toBe(
      "2026-11-16T23:00:00.000Z",
    );
  });

  it("keeps the existing strictly-next-weekday behavior, including same weekday", () => {
    expect(
      advanceDueReportScheduleClock({ frequency: "weekly", hour_utc: 10, weekday: 1 }, NOW),
    ).toBe("2026-11-16T10:00:00.000Z");
    expect(
      advanceDueReportScheduleClock({ frequency: "weekly", hour_utc: 10, weekday: 0 }, NOW),
    ).toBe("2026-11-22T10:00:00.000Z");
  });

  it("validates persisted hour before shifting the cron clock", () => {
    expect(() =>
      advanceDueReportScheduleClock({ frequency: "daily", hour_utc: 24 }, NOW),
    ).toThrow("hour_utc must be 0–23");
  });
});
