import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OperationalReadReviewResult } from "./operational-read-review.functions";

const captured = vi.hoisted(() => ({
  middleware: [] as unknown[],
  auth: { kind: "required-auth" },
}));
vi.mock("@tanstack/react-start", () => {
  const builder = () => {
    const chain = {
      middleware: (items: unknown[]) => {
        captured.middleware = items;
        return chain;
      },
      validator: () => chain,
      server: () => ({ kind: "private-response" }),
      handler: (handler: unknown) => handler,
    };
    return chain;
  };
  return { createMiddleware: builder, createServerFn: builder };
});
vi.mock("@tanstack/react-start/server", () => ({ setResponseHeader: vi.fn() }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: captured.auth }));
import { getOperationalReadReview } from "./operational-read-review.functions";

const org = "11111111-1111-4111-8111-111111111111";
const account = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";
type Result = { data: unknown; error: { code: string } | null; count?: number | null };
type QueryLog = {
  table: string;
  columns: string | null;
  filters: [string, unknown][];
  limit: number | null;
  signal: AbortSignal | null;
};
function fixture(changes: Record<string, Result> = {}) {
  const calls: QueryLog[] = [];
  const results: Record<string, Result> = {
    org_members: { data: { org_id: org }, error: null },
    sec_incidents: {
      data: [
        {
          id,
          org_id: org,
          severity: "critical",
          status: "open",
          updated_at: "2026-11-24T12:00:00Z",
          owner: "private-person-not-for-report",
        },
      ],
      count: 1,
      error: null,
    },
    sec_permits: { data: [], count: 0, error: null },
    sec_contractors: { data: [], count: 0, error: null },
    ...changes,
  };
  const supabase = {
    from: (table: string) => {
      const log: QueryLog = { table, columns: null, filters: [], limit: null, signal: null };
      calls.push(log);
      const q = {
        select: (columns: string) => {
          log.columns = columns;
          return q;
        },
        eq: (column: string, value: unknown) => {
          log.filters.push([column, value]);
          return q;
        },
        order: () => q,
        limit: (value: number) => {
          log.limit = value;
          return q;
        },
        abortSignal: (signal: AbortSignal) => {
          log.signal = signal;
          return q;
        },
        maybeSingle: () => Promise.resolve(results[table]),
        then: <TResult1 = Result, TResult2 = never>(
          onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ): Promise<TResult1 | TResult2> =>
          Promise.resolve(results[table]).then(onfulfilled, onrejected),
      };
      return q;
    },
  };
  const run = getOperationalReadReview as unknown as (args: {
    data: { organizationId: string };
    context: { userId: string; supabase: typeof supabase };
  }) => Promise<OperationalReadReviewResult>;
  return {
    calls,
    run: () => run({ data: { organizationId: org }, context: { userId: account, supabase } }),
  };
}

beforeEach(() => vi.useRealTimers());
describe("caller-scoped operational review adapter", () => {
  it("requires existing authentication and uses bounded caller/org-filtered column lists without writes or fallback", async () => {
    expect(captured.middleware).toContain(captured.auth);
    const f = fixture();
    const result = await f.run();
    expect(result.status).toBe("ok");
    expect(f.calls[0].filters).toEqual([
      ["user_id", account],
      ["org_id", org],
    ]);
    for (const query of f.calls.slice(1)) {
      expect(query.filters).toEqual([["org_id", org]]);
      expect(query.columns).not.toContain("*");
      expect(query.limit).toBe(500);
      expect(query.signal).toBeInstanceOf(AbortSignal);
    }
    if (result.status !== "ok") throw new Error("Expected ready source");
    expect(result.accountId).toBe(account);
    expect(result.organizationId).toBe(org);
    expect(result.handover.cases).toMatchObject([
      { id, status: "open", deadline: null, ownerRecorded: true },
    ]);
    expect(JSON.stringify(result)).not.toContain("private-person-not-for-report");
    expect(result.permits.findingCount).toBe(0);
  });
  it("stops before source reads for missing/foreign/error membership", async () => {
    for (const membership of [
      { data: null, error: null },
      { data: { org_id: "foreign" }, error: null },
      { data: null, error: { code: "42501" } },
    ]) {
      const f = fixture({ org_members: membership });
      expect(await f.run()).toEqual({ status: "unavailable" });
      expect(f.calls.map((call) => call.table)).toEqual(["org_members"]);
    }
  });
  it("does not turn source failure into zero or leak a malformed/foreign-organization row", async () => {
    for (const result of [
      { data: null, count: null, error: { code: "42501" } },
      {
        data: [
          {
            id,
            org_id: "44444444-4444-4444-8444-444444444444",
            status: "active",
            updated_at: null,
            starts_at: null,
            ends_at: null,
          },
        ],
        count: 1,
        error: null,
      },
      { data: [{ id: "malformed" }], count: 1, error: null },
    ]) {
      const f = fixture({ sec_permits: result });
      const response = await f.run();
      if (response.status !== "ok") throw new Error("Expected independent sources");
      expect(response.permits.findingCount).toBeNull();
      expect(response.reads.find((read) => read.scope.source === "sec_permits")).toMatchObject({
        state: "source_error",
        rows: null,
      });
      expect(response.handover.caseCount).toBe(1);
      expect(JSON.stringify(response)).not.toContain("44444444-4444-4444-8444-444444444444");
    }
  });
});
