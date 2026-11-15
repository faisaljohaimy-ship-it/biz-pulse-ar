/** Validate UTC scheduling fields before creating a next-run timestamp. */
export type ReportScheduleClock = {
  frequency: "daily" | "weekly";
  hour_utc: number;
  weekday?: number | null;
};

export function assertValidReportScheduleClock(schedule: ReportScheduleClock): void {
  if (schedule.frequency !== "daily" && schedule.frequency !== "weekly") {
    throw new Error("frequency must be daily or weekly");
  }
  if (!Number.isInteger(schedule.hour_utc) || schedule.hour_utc < 0 || schedule.hour_utc > 23) {
    throw new Error("hour_utc must be 0–23");
  }
  if (schedule.frequency === "weekly") {
    const weekday = schedule.weekday;
    if (typeof weekday !== "number" || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new Error("weekday required");
    }
  }
}

/** UTC-only scheduling. The clock argument is for deterministic, isolated tests. */
export function computeNextRun(schedule: ReportScheduleClock, now: Date = new Date()): string {
  assertValidReportScheduleClock(schedule);
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), schedule.hour_utc, 0, 0),
  );
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  if (schedule.frequency === "weekly") {
    const daysUntil = ((schedule.weekday as number) - next.getUTCDay() + 7) % 7;
    next.setUTCDate(next.getUTCDate() + daysUntil);
  }
  return next.toISOString();
}

/**
 * Cron advancement preserves the historical next-day / next-weekday rule:
 * a due report never gets re-claimed at a same-day clock slot. Validate
 * persisted rows before date arithmetic, and use a bounded weekday offset
 * instead of a loop that hangs on a fractional or impossible weekday.
 */
export function advanceDueReportScheduleClock(
  schedule: ReportScheduleClock,
  now: Date = new Date(),
): string {
  assertValidReportScheduleClock(schedule);
  const next = new Date(now.getTime());
  next.setUTCHours(schedule.hour_utc, 0, 0, 0);
  if (schedule.frequency === "weekly") {
    const weekday = schedule.weekday as number;
    const daysForward = ((weekday - next.getUTCDay() + 6) % 7) + 1;
    next.setUTCDate(next.getUTCDate() + daysForward);
  } else {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString();
}
