/** Validate UTC scheduling fields before creating a next-run timestamp. */
export type ReportScheduleClock = {
  frequency: "daily" | "weekly";
  hour_utc: number;
  weekday?: number | null;
};

export function assertValidReportScheduleClock(schedule: ReportScheduleClock): void {
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
