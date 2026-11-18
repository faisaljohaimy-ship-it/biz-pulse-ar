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

  it("selects only columns that exist in the live schema", async () => {
    const selects: Record<string, string> = {};
    const client = {
      from: (table: string) => {
        const result = { data: [], error: null };
        const query = {
          select: (cols: string) => {
            selects[table] = cols;
            return query;
          },
          gte: () => query,
          order: () => query,
          limit: () => query,
          eq: () => query,
          then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
        };
        return query;
      },
    } as unknown as SupabaseClient;

    await buildExecutiveSnapshot(client, { range: "24h", orgId: "org" });

    // Phantom columns previously selected (PostgREST fails the whole query on
    // any of these): incidents/work_orders have title_ar+title_en, not title;
    // incidents reference site_id, not site; permits use work_type, not type.
    const cols = (t: string) => selects[t].split(",").map((c) => c.trim());
    expect(cols("sec_incidents")).not.toContain("title");
    expect(cols("sec_incidents")).not.toContain("site");
    expect(cols("sec_incidents")).toContain("title_ar");
    expect(cols("sec_incidents")).toContain("site_id");
    expect(cols("sec_work_orders")).not.toContain("title");
    expect(cols("sec_work_orders")).toContain("title_ar");
    expect(cols("sec_permits")).not.toContain("type");
    expect(cols("sec_permits")).toContain("work_type");
  });

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
