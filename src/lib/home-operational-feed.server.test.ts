import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { REGIONS } from "@/lib/regions";
import {
  readHomeOperationalFeed,
  SEEDED_INCIDENT_REFS,
  SEEDED_PROJECT_REFS,
} from "./home-operational-feed.server";

function client(fail = false) {
  const filters: Array<{ table: string; column: string; operator: string; value: string }> = [];
  const selected: Array<{ table: string; fields: string; options: unknown }> = [];
  const db = {
    from(table: string) {
      let region: string | undefined;
      const chain = {
        select(fields: string, options?: unknown) {
          selected.push({ table, fields, options });
          return chain;
        },
        not: (column: string, operator: string, value: string) => {
          filters.push({ table, column, operator, value });
          return chain;
        },
        or: () => chain,
        eq: (_: string, value: string) => {
          region = value;
          return chain;
        },
        in: () => chain,
        gt: () => chain,
        order: () => chain,
        limit: () => chain,
        abortSignal: () =>
          Promise.resolve(
            fail
              ? { data: null, error: { message: "offline" }, count: null }
              : table === "sec_incidents"
                ? { data: null, error: null, count: 1902 }
                : table === "maint_orders_v"
                  ? { data: null, error: null, count: region === "western" ? 7 : 0 }
                  : {
                      data: [
                        {
                          id: "p",
                          name_ar: "مشروع",
                          name_en: "Project",
                          progress: 120,
                          health: "unknown",
                          updated_at: "2026-10-20T00:00:00Z",
                          manager: "must not escape",
                        },
                      ],
                      error: null,
                    },
          ),
      };
      return chain;
    },
    rpc: vi.fn(() => ({
      abortSignal: () =>
        Promise.resolve(
          fail
            ? { data: null, error: { message: "offline" } }
            : { data: { by_region: [{ key: "western", active: 15 }] }, error: null },
        ),
    })),
  };
  return { db: db as unknown as SupabaseClient<Database>, selected, filters };
}

describe("home operational feed RLS reads", () => {
  it("uses exact incident counts beyond row limits and projects only safe fields", async () => {
    const { db, selected, filters } = client();
    const result = await readHomeOperationalFeed(db);
    expect(result.incidents.count).toBe(1902);
    for (const [table, refs] of [
      ["sec_incidents", SEEDED_INCIDENT_REFS],
      ["sec_projects", SEEDED_PROJECT_REFS],
    ] as const) {
      expect(filters).toContainEqual({ table, column: "ref", operator: "ilike", value: "%SIM%" });
      const seedFilter = filters.find(
        (f) => f.table === table && f.column === "ref" && f.operator === "in",
      );
      for (const ref of refs) expect(seedFilter?.value).toContain(ref);
    }
    expect(selected.find((q) => q.table === "sec_incidents")?.options).toEqual({
      count: "exact",
      head: true,
    });
    expect(result.projects.rows[0]).toMatchObject({ progress: null, regionId: null, health: null });
    expect(result.projects.rows[0]).not.toHaveProperty("manager");
    expect(selected.find((q) => q.table === "sec_projects")?.fields).not.toContain("*");
    expect(result.maintenance.regions.find((r) => r.regionId === "western")).toEqual({
      regionId: "western",
      active: 15,
      overdue: 7,
    });
  });
  it("retains unknown incidents on failures and labels approved project exports without personal fields", async () => {
    const result = await readHomeOperationalFeed(client(true).db);
    expect(result.incidents).toEqual({ count: null, source: { kind: "unavailable", date: null } });
    expect(result.projects.source).toEqual({ kind: "export", date: "2026-08-30" });
    expect(result.projects.rows).toHaveLength(6);
    for (const p of result.projects.rows) {
      expect(p).not.toHaveProperty("manager");
      expect(p).not.toHaveProperty("contractor");
      if (p.regionId) expect(REGIONS.some((r) => r.id === p.regionId)).toBe(true);
    }
    expect(result.maintenance.source.kind).toBe("export");
  });
});
