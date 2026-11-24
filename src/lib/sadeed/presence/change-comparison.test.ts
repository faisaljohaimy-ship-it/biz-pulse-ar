import { describe, expect, it } from "vitest";
import {
  comparePresenceSnapshots,
  presenceCursorScope,
  type PresenceComparisonSnapshot,
} from "./change-comparison";

const snapshot = (): PresenceComparisonSnapshot => ({
  accountId: "account-a",
  organizationId: "org-a",
  regionId: null,
  siteId: null,
  source: "presence-updated-record-state:v1",
  capturedAt: "2026-11-24T16:00:00Z",
  window: { from: "2026-11-23T15:00:00Z", to: "2026-11-24T15:00:00Z" },
  metrics: {
    incidentsResolved: { value: 0, coverage: "complete" },
    risksEscalated: { value: 4, coverage: "complete" },
    inspectionCompletionPct: { value: 50, coverage: "complete" },
    newCriticalAlerts: { value: 2, coverage: "complete" },
  },
});

describe("comparable presence readings", () => {
  it("preserves real zero, signed count changes and percentage-point differences", () => {
    const before = snapshot(),
      after = snapshot();
    before.metrics.risksEscalated.value = 7;
    before.metrics.inspectionCompletionPct.value = 40;
    const result = comparePresenceSnapshots(before, after);
    expect(result.comparable).toBe(true);
    expect(result.metrics.incidentsResolved).toEqual({
      current: 0,
      baseline: 0,
      delta: 0,
      reason: null,
    });
    expect(result.metrics.risksEscalated.delta).toBe(-3);
    expect(result.metrics.inspectionCompletionPct.delta).toBe(10);
  });

  it("a visit without a metric baseline is unknown, not no change or an improvement", () => {
    const result = comparePresenceSnapshots(null, snapshot());
    expect(result.comparable).toBe(false);
    expect(result.metrics.incidentsResolved).toEqual({
      current: 0,
      baseline: null,
      delta: null,
      reason: "missing_baseline",
    });
    for (const item of Object.values(result.metrics)) expect(item.delta).toBeNull();
  });

  it.each([
    [
      "account_changed",
      (x: PresenceComparisonSnapshot) => {
        x.accountId = "another-account";
      },
    ],
    [
      "organization_changed",
      (x: PresenceComparisonSnapshot) => {
        x.organizationId = "another-org";
      },
    ],
    [
      "scope_changed",
      (x: PresenceComparisonSnapshot) => {
        x.regionId = "another-region";
      },
    ],
    [
      "scope_changed",
      (x: PresenceComparisonSnapshot) => {
        x.siteId = "another-site";
      },
    ],
    [
      "source_changed",
      (x: PresenceComparisonSnapshot) => {
        x.source = "another-source:v2";
      },
    ],
    [
      "window_changed",
      (x: PresenceComparisonSnapshot) => {
        x.window.from = "2026-11-23T16:00:00Z";
      },
    ],
    [
      "baseline_newer",
      (x: PresenceComparisonSnapshot) => {
        x.capturedAt = "2026-11-25T16:00:00Z";
      },
    ],
  ] as const)(
    "refuses %s and does not surface the incompatible baseline values",
    (reason, alter) => {
      const before = snapshot();
      alter(before);
      const result = comparePresenceSnapshots(before, snapshot());
      for (const item of Object.values(result.metrics)) {
        expect(item).toMatchObject({ baseline: null, delta: null, reason });
      }
    },
  );

  it("partial samples and failed/unmeasured source reads never become a measured delta", () => {
    const before = snapshot(),
      after = snapshot();
    after.metrics.inspectionCompletionPct.coverage = "partial";
    after.metrics.newCriticalAlerts = { value: null, coverage: "unavailable" };
    before.metrics.risksEscalated.coverage = "partial";
    const result = comparePresenceSnapshots(before, after);
    expect(result.metrics.inspectionCompletionPct).toMatchObject({
      current: 50,
      delta: null,
      reason: "incomplete_current",
    });
    expect(result.metrics.newCriticalAlerts).toMatchObject({
      current: null,
      delta: null,
      reason: "unmeasured_current",
    });
    expect(result.metrics.risksEscalated).toMatchObject({
      delta: null,
      reason: "incomplete_baseline",
    });
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid count %s", (value) => {
    const after = snapshot();
    after.metrics.incidentsResolved.value = value;
    const result = comparePresenceSnapshots(snapshot(), after);
    expect(result.metrics.incidentsResolved).toMatchObject({
      current: null,
      delta: null,
      reason: "invalid_current",
    });
  });

  it("rejects missing fields, invalid dates and percentages outside their measured range", () => {
    expect(comparePresenceSnapshots({}, snapshot()).metrics.incidentsResolved.reason).toBe(
      "invalid_baseline",
    );
    const after = snapshot();
    after.window.from = "bad-date";
    expect(comparePresenceSnapshots(snapshot(), after).metrics.incidentsResolved.reason).toBe(
      "invalid_current",
    );
    after.window.from = "2026-11-25T16:00:00Z";
    expect(comparePresenceSnapshots(snapshot(), after).metrics.incidentsResolved.reason).toBe(
      "invalid_current",
    );
    const pct = snapshot();
    pct.metrics.inspectionCompletionPct.value = 101;
    expect(comparePresenceSnapshots(snapshot(), pct).metrics.inspectionCompletionPct.reason).toBe(
      "invalid_current",
    );
  });
});

describe("presence cursor account/org isolation", () => {
  it("reusing one caller session id cannot reuse another account or organization cursor", () => {
    expect(presenceCursorScope("account-a", "org-a", "same-session")).not.toBe(
      presenceCursorScope("account-b", "org-a", "same-session"),
    );
    expect(presenceCursorScope("account-a", "org-a", "same-session")).not.toBe(
      presenceCursorScope("account-a", "org-b", "same-session"),
    );
    expect(presenceCursorScope("a:b", "c", "session")).not.toBe(
      presenceCursorScope("a", "b:c", "session"),
    );
  });
  it("refuses missing authorization scope and invalid session hints", () => {
    expect(presenceCursorScope("", "org-a", "session")).toBeNull();
    expect(presenceCursorScope("account-a", "", "session")).toBeNull();
    expect(presenceCursorScope("account-a", "org-a", "x")).toBeNull();
    expect(presenceCursorScope("account-a", "org-a", "x".repeat(121))).toBeNull();
  });
});
