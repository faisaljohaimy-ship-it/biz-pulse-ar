import { beforeEach, describe, expect, it, vi } from "vitest";
import { runInsightScan } from "./insight-engine.server";

const state = vi.hoisted(() => ({
  departments: {
    data: [] as Array<{ id: string; name_en: string; status: string }> | null,
    error: null as { message: string } | null,
  },
  meetings: {
    data: [] as Array<{ dept_id: string; scheduled_at: string }> | null,
    error: null as { message: string } | null,
  },
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const query = {
        select() {
          return this;
        },
        gte() {
          return this;
        },
        lt() {
          return this;
        },
        not() {
          return this;
        },
        eq() {
          return this;
        },
        order() {
          return this;
        },
        limit() {
          if (table === "sim_departments") return Promise.resolve(state.departments);
          if (table === "sim_meetings") return Promise.resolve(state.meetings);
          return Promise.resolve({ data: [], error: null });
        },
      };
      return query;
    },
  },
}));

beforeEach(() => {
  state.departments = {
    data: [
      { id: "dept-a", name_en: "Operations", status: "active" },
      { id: "dept-b", name_en: "Safety", status: "active" },
    ],
    error: null,
  };
  state.meetings = { data: [], error: null };
});

describe("insight-engine inactive-department evidence", () => {
  it("does not invent inactive departments after a failed meetings query", async () => {
    state.meetings = { data: null, error: { message: "database unavailable" } };
    const result = await runInsightScan("test-org");
    expect(result.insights.some((insight) => insight.kind === "inactive_department")).toBe(false);
    expect(result.sources).not.toContain("sim_meetings");
  });

  it("treats a malformed null meetings result as unknown", async () => {
    state.meetings = { data: null, error: null };
    const result = await runInsightScan("test-org");
    expect(result.insights.some((insight) => insight.kind === "inactive_department")).toBe(false);
  });

  it("does not infer absence from a meeting result capped at 500 rows", async () => {
    state.meetings = {
      data: Array.from({ length: 500 }, () => ({
        dept_id: "dept-a",
        scheduled_at: "2026-11-14T12:00:00Z",
      })),
      error: null,
    };
    const result = await runInsightScan("test-org");
    expect(result.insights.some((insight) => insight.kind === "inactive_department")).toBe(false);
    expect(result.sources).not.toContain("sim_meetings");
  });

  it("retains the alert for two departments with a confirmed empty meeting list", async () => {
    const result = await runInsightScan("test-org");
    expect(result.insights.filter((insight) => insight.kind === "inactive_department")).toHaveLength(1);
    expect(result.sources).toContain("sim_departments");
    expect(result.sources).toContain("sim_meetings");
  });

  it("does not alert when only one department lacks a meeting", async () => {
    state.meetings.data = [{ dept_id: "dept-a", scheduled_at: "2026-11-14T12:00:00Z" }];
    const result = await runInsightScan("test-org");
    expect(result.insights.some((insight) => insight.kind === "inactive_department")).toBe(false);
  });

  it("does not infer inactivity from an erroneous department query", async () => {
    state.departments.error = { message: "read denied" };
    const result = await runInsightScan("test-org");
    expect(result.insights.some((insight) => insight.kind === "inactive_department")).toBe(false);
  });
});
