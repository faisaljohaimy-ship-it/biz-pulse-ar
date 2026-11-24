import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({
  cursor: null as { lastVisitAt: string } | null,
  write: vi.fn(),
  results: {} as Record<
    string,
    {
      count?: number | null;
      data?: { status: string | null; updated_at?: string }[] | null;
      error?: unknown;
    }
  >,
  queries: [] as { table: string; filters: [string, unknown[]][] }[],
}));
vi.mock("./tiers.server", () => ({ readCursor: () => f.cursor, writeCursor: f.write }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from(table: string) {
      const query = { table, filters: [] as [string, unknown[]][] };
      f.queries.push(query);
      const builder = Object.fromEntries(
        ["select", "eq", "in", "gte", "lte", "limit"].map((method) => [
          method,
          (...args: unknown[]) => {
            query.filters.push([method, args]);
            return builder;
          },
        ]),
      ) as Record<string, unknown>;
      builder.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(f.results[table] ?? {}).then(resolve);
      return builder;
    },
  },
}));
import { computePresenceDelta } from "./since-last-visit.server";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-24T16:00:00Z"));
  f.cursor = null;
  f.queries.length = 0;
  f.write.mockClear();
  f.results = {
    sec_incidents: { count: 0 },
    sim_risks: { count: 2 },
    sim_inspections: { data: [{ status: "completed" }, { status: "open" }] },
    sim_notifications: { count: 1 },
  };
});
afterEach(() => vi.useRealTimers());

describe("existing presence read adapter", () => {
  it("keeps exact zero and bounded sample evidence but cannot invent a completion delta/baseline", async () => {
    const result = await computePresenceDelta("scoped-session", "org-a", "account-a");
    expect(result.metrics.incidentsResolved).toBe(0);
    expect(result.metrics.inspectionDeltaPct).toBeNull();
    expect(result.snapshot).toMatchObject({
      accountId: "account-a",
      organizationId: "org-a",
      regionId: null,
      siteId: null,
      metrics: {
        incidentsResolved: { value: 0, coverage: "complete" },
        inspectionCompletionPct: { value: 50, coverage: "partial" },
      },
    });
    expect(result.comparison?.metrics.inspectionCompletionPct).toMatchObject({
      delta: null,
      reason: "missing_baseline",
    });
    expect(f.write).toHaveBeenCalledWith(
      "scoped-session",
      expect.objectContaining({ lastVisitAt: "2026-11-24T16:00:00.000Z" }),
    );
    expect(f.write.mock.calls[0][1]).not.toHaveProperty("metrics");
  });
  it("scopes every source to the verified org and bounds both ends of the time window", async () => {
    f.cursor = { lastVisitAt: "2026-11-24T15:00:00Z" };
    const result = await computePresenceDelta("scoped-session", "org-a", "account-a");
    expect(result.hasBaseline).toBe(true); // a visit cursor, not a metric-comparison baseline
    expect(result.comparison?.metrics.incidentsResolved.reason).toBe("missing_baseline");
    for (const query of f.queries) {
      expect(query.filters).toContainEqual(["eq", ["org_id", "org-a"]]);
      expect(query.filters.find(([method]) => method === "gte")?.[1][1]).toBe(
        "2026-11-24T15:00:00Z",
      );
      expect(query.filters.find(([method]) => method === "lte")?.[1][1]).toBe(
        "2026-11-24T16:00:00.000Z",
      );
    }
  });
  it("query error, missing count or missing inspection status is unavailable, never a successful zero", async () => {
    f.results.sec_incidents = { count: null };
    f.results.sim_risks = { count: 7, error: new Error("denied") };
    f.results.sim_inspections = { data: [{ status: null }] };
    const result = await computePresenceDelta("scoped-session", "org-a", "account-a");
    expect(result.metrics.incidentsResolved).toBeNull();
    expect(result.metrics.risksEscalated).toBeNull();
    expect(result.snapshot?.metrics.inspectionCompletionPct.value).toBeNull();
    expect(result.metrics.newCriticalAlerts).toBe(1);
  });
  it("missing org cannot cause an unscoped read, and future/invalid cursors are not trusted", async () => {
    await computePresenceDelta("scoped-session", null, "account-a");
    expect(f.queries).toHaveLength(0);
    expect(f.write).not.toHaveBeenCalled();
    f.cursor = { lastVisitAt: "2027-11-24T15:00:00Z" };
    const result = await computePresenceDelta("scoped-session", "org-a", "account-a");
    expect(result.hasBaseline).toBe(false);
    expect(result.windowFromISO).toBe("2026-11-23T16:00:00.000Z");
  });
});
