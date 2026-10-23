/**
 * Scheduled executive reports — the optimistic claim. Two overlapping cron
 * invocations that read the same due schedule must not both build and email
 * the report: only the one whose conditional UPDATE (id + the next_run_at it
 * read) matches a row proceeds. Network is mocked; global fetch throws.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = {
  id: string;
  name: string;
  frequency: string;
  hour_utc: number;
  weekday: number | null;
  next_run_at: string;
  range_window: string;
  org_id: string;
  site_id: string;
  recipients: string[];
  created_by: string;
  last_status: string | null;
  last_error: string | null;
};

const db = vi.hoisted(() => ({
  rows: [] as Row[],
  /** What the due-list SELECT returns — a stale snapshot simulates concurrent readers. */
  dueSnapshot: null as Row[] | null,
  claimError: null as { message: string } | null,
  updates: [] as Array<{ patch: Record<string, unknown>; filters: Array<[string, unknown]> }>,
  sendMail: 0,
  mailOk: true,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));
vi.mock("@/lib/hook-auth.server", () => ({ verifyCronHookSecret: () => null }));
vi.mock("@/lib/api", () => ({ isApiError: () => false }));
vi.mock("@/lib/reports/snapshot.server", () => ({ buildExecutiveSnapshot: async () => ({}) }));
vi.mock("@/lib/reports/builder.server", () => ({
  buildExecPdf: async () => new Uint8Array([1, 2]),
  buildExecXlsx: () => new Uint8Array([3, 4]),
  htmlSummaryFromSnapshot: () => "<p>summary</p>",
}));
vi.mock("@/lib/api/http.server", () => ({
  httpFetch: async (url: string) => {
    if (url.endsWith("/me/sendMail")) {
      db.sendMail += 1;
      return new Response(db.mailOk ? "" : "boom", { status: db.mailOk ? 202 : 500 });
    }
    if (url.endsWith("/createLink")) {
      return Response.json({ link: { webUrl: "https://share.example/link" } });
    }
    return Response.json({ id: "item-1", name: "f", webUrl: "https://share.example/f", size: 2 });
  },
}));
vi.mock("@/integrations/supabase/client.server", () => {
  const schedules = {
    select: () => ({
      eq: () => ({
        lte: () => ({
          limit: () =>
            Promise.resolve({
              data: (db.dueSnapshot ?? db.rows).map((r) => ({ ...r })),
              error: null,
            }),
        }),
      }),
    }),
    update: (patch: Record<string, unknown>) => {
      const filters: Array<[string, unknown]> = [];
      const apply = () => {
        db.updates.push({ patch, filters: [...filters] });
        const matched = db.rows.filter((r) =>
          filters.every(([k, v]) => (r as Record<string, unknown>)[k] === v),
        );
        for (const r of matched) Object.assign(r, patch);
        return matched;
      };
      const q = {
        eq: (k: string, v: unknown) => {
          filters.push([k, v]);
          return q;
        },
        select: () => {
          if (db.claimError) {
            db.updates.push({ patch, filters: [...filters] });
            return Promise.resolve({ data: null, error: db.claimError });
          }
          return Promise.resolve({ data: apply().map((r) => ({ id: r.id })), error: null });
        },
        then: (resolve: (v: unknown) => unknown) => {
          apply();
          return resolve({ data: null, error: null });
        },
      };
      return q;
    },
  };
  return {
    supabaseAdmin: {
      from: (table: string) =>
        table === "audit_logs" ? { insert: () => Promise.resolve({ error: null }) } : schedules,
    },
  };
});

import { Route } from "./executive-reports-run";

type RunResult = {
  processed: number;
  results: Array<{ id: string; status: string; detail?: string }>;
};

async function invoke(): Promise<RunResult> {
  const post = (
    Route as unknown as {
      options: { server: { handlers: { POST: (a: { request: Request }) => Promise<Response> } } };
    }
  ).options.server.handlers.POST;
  const res = await post({ request: new Request("http://localhost/x", { method: "POST" }) });
  return (await res.json()) as RunResult;
}

const DUE_AT = "2026-10-17T06:00:00.000+00:00";

function dueRow(): Row {
  return {
    id: "sch-1",
    name: "Daily brief",
    frequency: "daily",
    hour_utc: 6,
    weekday: null,
    next_run_at: DUE_AT,
    range_window: "24h",
    org_id: "org-1",
    site_id: "site-1",
    recipients: ["owner@example.com"],
    created_by: "user-1",
    last_status: null,
    last_error: null,
  };
}

beforeEach(() => {
  db.rows = [dueRow()];
  db.dueSnapshot = null;
  db.claimError = null;
  db.updates = [];
  db.sendMail = 0;
  db.mailOk = true;
  vi.stubEnv("LOVABLE_API_KEY", "test-not-a-secret");
  vi.stubEnv("MICROSOFT_SHAREPOINT_API_KEY", "test-not-a-secret");
  vi.stubEnv("MICROSOFT_OUTLOOK_API_KEY", "test-not-a-secret");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("network must not be reached in this test");
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("executive-reports-run — claim before send", () => {
  it("claims with the next_run_at it read, then sends exactly once", async () => {
    const out = await invoke();
    expect(out.results).toEqual([{ id: "sch-1", status: "ok" }]);
    expect(db.sendMail).toBe(1);
    const claim = db.updates[0];
    expect(claim.filters).toEqual([
      ["id", "sch-1"],
      ["next_run_at", DUE_AT],
    ]);
    expect(Object.keys(claim.patch)).toEqual(["next_run_at"]);
    // The claimed value is the computed next run, reused for the final write.
    expect(Date.parse(claim.patch.next_run_at as string)).toBeGreaterThan(Date.now());
    expect(db.rows[0].next_run_at).toBe(claim.patch.next_run_at);
    expect(db.rows[0].last_status).toBe("ok");
  });

  it("overlapping invocations that read the same due row send one email", async () => {
    // Both readers saw the row before either claimed it: the due-list SELECT
    // keeps returning the pre-claim snapshot to the second invocation.
    db.dueSnapshot = [dueRow()];
    await invoke();
    const before = { ...db.rows[0] };
    const second = await invoke();
    expect(second.results).toEqual([
      { id: "sch-1", status: "skipped", detail: "claimed_by_another_run" },
    ]);
    expect(db.sendMail).toBe(1);
    expect(db.rows[0]).toEqual(before);
  });

  it("a claim error neither sends nor writes run status", async () => {
    db.claimError = { message: "connection reset" };
    const out = await invoke();
    expect(out.results[0]).toMatchObject({ id: "sch-1", status: "failed" });
    expect(out.results[0].detail).toMatch(/^claim_failed: /);
    expect(db.sendMail).toBe(0);
    expect(db.rows[0]).toEqual(dueRow());
  });
});

describe("executive-reports-run — existing outcomes after a successful claim", () => {
  it("connector not configured ⇒ skipped and advanced, nothing sent", async () => {
    vi.stubEnv("MICROSOFT_OUTLOOK_API_KEY", "");
    const out = await invoke();
    expect(out.results).toEqual([
      { id: "sch-1", status: "skipped", detail: "connector_not_configured" },
    ]);
    expect(db.sendMail).toBe(0);
    expect(db.rows[0].last_status).toBe("skipped");
    expect(db.rows[0].next_run_at).not.toBe(DUE_AT);
  });

  it("send failure ⇒ failed with the error recorded and next_run_at advanced", async () => {
    db.mailOk = false;
    const out = await invoke();
    expect(out.results[0]).toMatchObject({ id: "sch-1", status: "failed" });
    expect(db.rows[0].last_status).toBe("failed");
    expect(db.rows[0].last_error).toMatch(/^outlook_500/);
    expect(db.rows[0].next_run_at).not.toBe(DUE_AT);
  });
});
