import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { buildExecutiveSnapshot } from "./snapshot.server";

vi.mock("@/lib/sec.functions", () => ({
  fetchExecKpiSources: vi.fn(async () => ({})),
  computeExecKpis: vi.fn(() => ({})),
}));

function mockedClient(failedTable: string | null): SupabaseClient {
  return {
    from: (table: string) => {
      const result =
        table === failedTable
          ? { data: null, error: { message: "database unavailable" } }
          : { data: [], error: null };
      const query = {
        select: () => query,
        gte: () => query,
        order: () => query,
        limit: () => query,
        eq: () => query,
        then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

describe("executive snapshot source integrity", () => {
  it.each(["sec_incidents", "sec_work_orders", "sec_permits", "sec_patrols"])(
    "rejects a failed %s query instead of exporting a zero-count report",
    async (failedTable) => {
      await expect(
        buildExecutiveSnapshot(mockedClient(failedTable), {
          range: "24h",
          orgId: "isolated-test-organization",
        }),
      ).rejects.toThrow(`Executive snapshot source failed: ${failedTable}`);
    },
  );

  it("preserves legitimate empty results without inventing counts", async () => {
    const snapshot = await buildExecutiveSnapshot(mockedClient(null), {
      range: "24h",
      orgId: "isolated-test-organization",
    });
    expect(snapshot.totals).toEqual({
      incidents: 0,
      workOrders: 0,
      permits: 0,
      patrols: 0,
    });
    expect(snapshot.incidents).toEqual([]);
    expect(snapshot.workOrders).toEqual([]);
    expect(snapshot.permits).toEqual([]);
    expect(snapshot.patrols).toEqual([]);
  });
});
