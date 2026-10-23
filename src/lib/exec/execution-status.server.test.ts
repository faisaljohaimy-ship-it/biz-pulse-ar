// @vitest-environment node
/**
 * حالة التنفيذ المرجعية: قراءة بعميل المستدعي مقيّدة بالمؤسسة، لا ترمي ولا
 * تختلق — الخطأ يعود خطأً، والحقل الغائب `null`.
 */
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACTIVE_TOOL_EXECUTION_STATUSES,
  EXECUTION_STATUS_ACTIVE_LIMIT,
  EXECUTION_STATUS_RUN_LIMIT,
  readExecutionStatus,
} from "./execution-status.server";

type Result = { data: unknown; error: { message: string } | null };
type Call = { table: string; method: string; args: unknown[] };

/** عميلٌ وهمي يسجّل سلسلة الاستعلام ويُحسم بالنتيجة المهيّأة لكل جدول. */
function fakeClient(results: Record<string, Result | Error>) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const outcome = results[table] ?? { data: [], error: null };
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "eq", "in", "order", "limit"]) {
        chain[method] = (...args: unknown[]) => {
          calls.push({ table, method, args });
          return chain;
        };
      }
      chain.then = (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) =>
        outcome instanceof Error ? reject(outcome) : resolve(outcome);
      return chain;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe("readExecutionStatus", () => {
  it("returns the latest runs and active tool executions for the org", async () => {
    const { client, calls } = fakeClient({
      agent_runs: {
        data: [
          {
            id: "run-1",
            agent_id: "risk-analyst",
            status: "succeeded",
            started_at: "2026-10-18T09:00:00Z",
            finished_at: "2026-10-18T09:01:00Z",
            summary: "تمّ",
          },
          { id: "run-2", agent_id: "patrol-planner", status: "running", started_at: "x" },
          { agent_id: "no-id-row-is-dropped" },
        ],
        error: null,
      },
      tool_executions: {
        data: [
          {
            id: "exec-1",
            tool_id: "sec.create_incident",
            status: "pending_approval",
            agent_run_id: "run-2",
            created_at: "2026-10-18T09:00:30Z",
            started_at: null,
          },
        ],
        error: null,
      },
    });

    const result = await readExecutionStatus(client, "org-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.org_id).toBe("org-1");
    expect(result.visibility).toBe("caller_rls");
    expect(result.agent_runs).toEqual([
      {
        id: "run-1",
        agent_id: "risk-analyst",
        status: "succeeded",
        started_at: "2026-10-18T09:00:00Z",
        finished_at: "2026-10-18T09:01:00Z",
        summary: "تمّ",
      },
      // الحقول الغائبة null لا قيمٌ مفترضة.
      {
        id: "run-2",
        agent_id: "patrol-planner",
        status: "running",
        started_at: "x",
        finished_at: null,
        summary: null,
      },
    ]);
    expect(result.active_tool_executions).toEqual([
      {
        id: "exec-1",
        tool_id: "sec.create_incident",
        status: "pending_approval",
        agent_run_id: "run-2",
        created_at: "2026-10-18T09:00:30Z",
        started_at: null,
      },
    ]);

    // مقيّد بالمؤسسة وبالحالات النشطة وبالسقفين.
    expect(calls).toContainEqual({ table: "agent_runs", method: "eq", args: ["org_id", "org-1"] });
    expect(calls).toContainEqual({
      table: "agent_runs",
      method: "limit",
      args: [EXECUTION_STATUS_RUN_LIMIT],
    });
    expect(calls).toContainEqual({
      table: "tool_executions",
      method: "eq",
      args: ["org_id", "org-1"],
    });
    expect(calls).toContainEqual({
      table: "tool_executions",
      method: "in",
      args: ["status", [...ACTIVE_TOOL_EXECUTION_STATUSES]],
    });
    expect(calls).toContainEqual({
      table: "tool_executions",
      method: "limit",
      args: [EXECUTION_STATUS_ACTIVE_LIMIT],
    });
  });

  it("returns ok:false with the database error instead of a partial picture", async () => {
    const { client } = fakeClient({
      agent_runs: { data: [{ id: "run-1" }], error: null },
      tool_executions: { data: null, error: { message: "permission denied" } },
    });
    expect(await readExecutionStatus(client, "org-1")).toEqual({
      ok: false,
      error: "tool_executions: permission denied",
    });
  });

  it("never throws when the client rejects", async () => {
    const { client } = fakeClient({ agent_runs: new Error("network down") });
    expect(await readExecutionStatus(client, "org-1")).toEqual({
      ok: false,
      error: "network down",
    });
  });

  it("refuses an empty org without querying", async () => {
    const { client, calls } = fakeClient({});
    expect(await readExecutionStatus(client, "  ")).toEqual({
      ok: false,
      error: "missing_org_context",
    });
    expect(calls).toHaveLength(0);
  });
});
