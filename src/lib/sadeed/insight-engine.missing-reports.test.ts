import { beforeEach, describe, expect, it, vi } from "vitest";
import { runInsightScan } from "./insight-engine.server";

const state = vi.hoisted(() => ({
  reportResult: {
    data: [] as Array<{ kind: string }> | null,
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
          return Promise.resolve(
            table === "sec_reports" ? state.reportResult : { data: [], error: null },
          );
        },
      };
      return query;
    },
  },
}));

beforeEach(() => {
  state.reportResult = { data: [], error: null };
});

describe("insight-engine missing-reports evidence", () => {
  it("does not invent missing reports when the read fails", async () => {
    state.reportResult = { data: null, error: { message: "query failed" } };

    const result = await runInsightScan("test-org");
    expect(result.insights.some((item) => item.kind === "missing_reports")).toBe(false);
    expect(result.sources).not.toContain("sec_reports");
    expect(result.block).not.toContain("No operational reports");
  });

  it("treats an unexpectedly null result without an error as unknown", async () => {
    state.reportResult = { data: null, error: null };

    const result = await runInsightScan("test-org");
    expect(result.insights.some((item) => item.kind === "missing_reports")).toBe(false);
    expect(result.sources).not.toContain("sec_reports");
  });

  it("retains the missing-reports alert for a confirmed empty read", async () => {
    const result = await runInsightScan("test-org");
    expect(result.insights.filter((item) => item.kind === "missing_reports")).toHaveLength(1);
    expect(result.sources).toContain("sec_reports");
  });

  it("keeps valid populated report reads free of false missing alerts", async () => {
    state.reportResult = { data: [{ kind: "daily" }], error: null };

    const result = await runInsightScan("test-org");
    expect(result.insights.some((item) => item.kind === "missing_reports")).toBe(false);
    expect(result.sources).toContain("sec_reports");
  });
});
