import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
vi.mock("./tool-registry.server", () => ({
  getExecutor: vi.fn(() => ({})),
  isIdempotentCall: vi.fn(() => true),
}));
vi.mock("./tool-orchestrator.server", () => ({ executeTool: vi.fn() }));
vi.mock("./audit.server", () => ({ audit: vi.fn() }));
vi.mock("./event-bus.server", () => ({ publishEvent: vi.fn() }));
vi.mock("@/lib/authz.server", () => ({ requirePlatformAdmin: vi.fn() }));
import { executeTool } from "./tool-orchestrator.server";
import { isIdempotentCall } from "./tool-registry.server";
import { audit } from "./audit.server";
import { requirePlatformAdmin } from "@/lib/authz.server";
import { triggerWorkflow, resumeWorkflowRun, cancelWorkflowRun } from "./workflow-engine.server";

type Row = Record<string, unknown>;
type Operation = { table: string; op: string; values?: Row; filters: Array<[string, unknown]> };
const ORG = "org-one";
const ACTOR = "owner";
/** In-memory query adapter with conditional updates and the actual run PK contract.
 * Tests exercise engine behavior, not query-source string matching. */
function fixture(steps: Row[], start = String(steps[0].id)) {
  const tables: Record<string, Row[]> = {
    workflows: [{ id: "wf", enabled: true, org_id: ORG, definition_json: { start, steps } }],
    org_members: [{ user_id: ACTOR, org_id: ORG, role: "owner" }],
    workflow_runs: [],
    workflow_step_runs: [],
    tool_executions: [],
  };
  const log: Operation[] = [];
  let fail: ((q: Operation) => boolean) | undefined;
  let nextId = 0;
  function from(table: string) {
    let op = "select";
    let values: Row | undefined;
    let max = Infinity;
    const filters: Array<[string, unknown]> = [];
    let cached: Promise<{ data: unknown; error: unknown }> | undefined;
    function execute(single = false) {
      if (cached) return cached;
      const q = { table, op, values, filters };
      log.push(structuredClone(q));
      if (fail?.(q))
        return Promise.resolve({ data: null, error: { message: "injected write failure" } });
      const list = tables[table] ?? [];
      const matches = (r: Row) =>
        filters.every(([key, value]) =>
          key.startsWith("contains:")
            ? Object.entries(value as Row).every(([k, v]) => (r[key.slice(9)] as Row)?.[k] === v)
            : r[key] === value,
        );
      let rows = list.filter(matches).slice(0, max);
      if (op === "insert") {
        const row = { id: `row-${++nextId}`, ...structuredClone(values) };
        if (list.some((r) => r.id === row.id))
          return Promise.resolve({ data: null, error: { code: "23505" } });
        list.push(row);
        rows = [row];
        tables[table] = list;
      } else if (op === "update") {
        for (const row of rows) Object.assign(row, structuredClone(values));
      }
      cached = Promise.resolve({
        data: structuredClone(single ? (rows[0] ?? null) : rows),
        error: null,
      });
      return cached;
    }
    const query = {
      select: (_columns?: string) => query,
      eq: (key: string, value: unknown) => {
        filters.push([key, value]);
        return query;
      },
      contains: (key: string, value: unknown) => {
        filters.push([`contains:${key}`, value]);
        return query;
      },
      order: () => query,
      limit: (value: number) => {
        max = value;
        return query;
      },
      insert: (value: Row) => {
        op = "insert";
        values = value;
        return query;
      },
      update: (value: Row) => {
        op = "update";
        values = value;
        return query;
      },
      single: () => execute(true),
      maybeSingle: () => execute(true),
      then: (resolve: (r: unknown) => unknown, reject: (e: unknown) => unknown) =>
        execute().then(resolve, reject),
    };
    return query;
  }
  return {
    client: { from } as unknown as SupabaseClient<Database>,
    tables,
    log,
    fail: (fn: (q: Operation) => boolean) => {
      fail = fn;
    },
  };
}
const tool = (id = "tool", next?: string) => ({
  id,
  kind: "tool",
  toolId: "sql.read",
  input: {},
  ...(next ? { next } : {}),
});
const trigger = { workflowId: "wf", triggeredBy: ACTOR, payload: { loop: true } };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isIdempotentCall).mockReturnValue(true);
  vi.mocked(requirePlatformAdmin).mockResolvedValue(undefined);
  vi.mocked(executeTool).mockResolvedValue({
    executionId: "execution",
    status: "succeeded",
    output: { actual: 7 },
  });
});

describe("workflow execution evidence", () => {
  it("fails a cyclic definition at the step ceiling instead of inventing success", async () => {
    const f = fixture([
      { id: "loop", kind: "condition", when: { path: "trigger.loop" }, ifTrue: "loop" },
    ]);
    const result = await triggerWorkflow(f.client, trigger);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("step limit");
    expect(f.tables.workflow_step_runs).toHaveLength(200);
    expect(vi.mocked(audit).mock.calls.some(([, e]) => e.action === "workflow.run.success")).toBe(
      false,
    );
  });
  it("allows exactly200 real completed steps when no cursor remains", async () => {
    const f = fixture(
      Array.from({ length: 200 }, (_, i) => tool(String(i), i < 199 ? String(i + 1) : undefined)),
    );
    expect((await triggerWorkflow(f.client, trigger)).status).toBe("succeeded");
    expect(executeTool).toHaveBeenCalledTimes(200);
    expect(f.tables.workflow_runs[0].current_step).toBe("199");
  });
  it.each(["checkpoint", "step insert"])(
    "does not execute tools if %s persistence fails",
    async (point) => {
      const f = fixture([tool()]);
      f.fail((q) =>
        point === "checkpoint"
          ? q.table === "workflow_runs" && q.op === "update" && q.values?.current_step !== undefined
          : q.table === "workflow_step_runs" && q.op === "insert",
      );
      expect((await triggerWorkflow(f.client, trigger)).status).toBe("failed");
      expect(executeTool).not.toHaveBeenCalled();
    },
  );
  it("does not overwrite cancellation with success", async () => {
    const f = fixture([tool()]);
    vi.mocked(executeTool).mockImplementation(async () => {
      f.tables.workflow_runs[0].status = "cancelled";
      return { executionId: "execution", status: "succeeded" };
    });
    expect((await triggerWorkflow(f.client, trigger)).status).toBe("cancelled");
    expect(f.tables.workflow_runs[0].status).toBe("cancelled");
    expect(vi.mocked(audit).mock.calls.some(([, e]) => e.action === "workflow.run.success")).toBe(
      false,
    );
  });
  it("links the exact pending execution before returning waiting_approval", async () => {
    const f = fixture([tool()]);
    vi.mocked(executeTool).mockResolvedValue({
      executionId: "pending-17",
      status: "pending_approval",
    });
    expect((await triggerWorkflow(f.client, trigger)).status).toBe("waiting_approval");
    expect(f.tables.workflow_step_runs[0]).toMatchObject({
      status: "waiting",
      tool_execution_id: "pending-17",
    });
  });
  it("rejects membership in another organization before creating a run", async () => {
    const f = fixture([tool()]);
    f.tables.org_members[0].org_id = "other";
    await expect(triggerWorkflow(f.client, trigger)).rejects.toThrow("صلاحية");
    expect(f.tables.workflow_runs).toHaveLength(0);
    expect(executeTool).not.toHaveBeenCalled();
  });
  it("admits a racing idempotency key once using the run primary key", async () => {
    const f = fixture([tool()]);
    const results = await Promise.all([
      triggerWorkflow(f.client, { ...trigger, idempotencyKey: "event-1" }),
      triggerWorkflow(f.client, { ...trigger, idempotencyKey: "event-1" }),
    ]);
    expect(f.tables.workflow_runs).toHaveLength(1);
    expect(executeTool).toHaveBeenCalledTimes(1);
    expect(results.filter((x) => x.created)).toHaveLength(1);
    expect(results[0].runId).toBe(results[1].runId);
  });
});

function waitingFixture(kind = "tool") {
  const f = fixture([
    kind === "tool" ? tool("review", "next") : { id: "review", kind: "approval", next: "next" },
    tool("next"),
  ]);
  f.tables.workflow_runs.push({
    id: "run",
    workflow_id: "wf",
    status: "waiting_approval",
    current_step: "review",
    org_id: ORG,
    triggered_by: ACTOR,
    context_json: { steps: {} },
  });
  f.tables.workflow_step_runs.push({
    id: "step",
    run_id: "run",
    step_id: "review",
    org_id: ORG,
    status: "waiting",
    tool_execution_id: kind === "tool" ? "approved" : null,
  });
  f.tables.tool_executions.push({
    id: "approved",
    workflow_run_id: "run",
    org_id: ORG,
    tool_id: "sql.read",
    status: "succeeded",
    approved_by: ACTOR,
    approved_at: "2026-10-22T12:00:00Z",
    output_json: { output: { actual: 42 }, rollbackPayload: { private: "not context" } },
  });
  return f;
}
describe("workflow approval and resume", () => {
  it.each([
    "pending_approval",
    "queued",
    "running",
    "failed",
    "rejected",
    "expired",
    "rolled_back",
  ])("does not resume a %s tool", async (status) => {
    const f = waitingFixture();
    f.tables.tool_executions[0].status = status;
    await expect(resumeWorkflowRun(f.client, "run", ACTOR)).rejects.toThrow("نجاح تنفيذ");
    expect(f.tables.workflow_runs[0].status).toBe("waiting_approval");
    expect(executeTool).not.toHaveBeenCalled();
  });
  it.each(["org_id", "workflow_run_id", "tool_id", "approved_by", "approved_at"])(
    "fails closed for mismatched/missing %s evidence",
    async (field) => {
      const f = waitingFixture();
      f.tables.tool_executions[0][field] = field.startsWith("approved_") ? null : "other";
      await expect(resumeWorkflowRun(f.client, "run", ACTOR)).rejects.toThrow("نجاح تنفيذ");
      expect(executeTool).not.toHaveBeenCalled();
    },
  );
  it("does not guess a missing legacy execution link", async () => {
    const f = waitingFixture();
    f.tables.workflow_step_runs[0].tool_execution_id = null;
    await expect(resumeWorkflowRun(f.client, "run", ACTOR)).rejects.toThrow("تُربط");
    expect(executeTool).not.toHaveBeenCalled();
  });
  it("uses real approved output, marks approval and runs only the next step", async () => {
    const f = waitingFixture();
    const result = await resumeWorkflowRun(f.client, "run", ACTOR);
    expect(result.status).toBe("succeeded");
    expect(result.context.steps).toMatchObject({ review: { actual: 42 } });
    expect(JSON.stringify(result.context)).not.toContain("rollbackPayload");
    expect(executeTool).toHaveBeenCalledTimes(1);
    expect(f.tables.workflow_step_runs[0].status).toBe("succeeded");
  });
  it("only one concurrent resumer executes the continuation", async () => {
    const f = waitingFixture();
    const results = await Promise.allSettled([
      resumeWorkflowRun(f.client, "run", ACTOR),
      resumeWorkflowRun(f.client, "run", ACTOR),
    ]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(executeTool).toHaveBeenCalledTimes(1);
  });
  it("requires platform admin and live approving membership", async () => {
    const f = waitingFixture();
    vi.mocked(requirePlatformAdmin).mockRejectedValueOnce(new Error("admin required"));
    await expect(resumeWorkflowRun(f.client, "run", ACTOR)).rejects.toThrow("admin required");
    f.tables.org_members[0].role = "operator";
    await expect(resumeWorkflowRun(f.client, "run", ACTOR)).rejects.toThrow("صلاحية");
    expect(executeTool).not.toHaveBeenCalled();
  });
  it("saves explicit approval before continuing an approval-only step", async () => {
    const f = waitingFixture("approval");
    expect((await resumeWorkflowRun(f.client, "run", ACTOR)).status).toBe("succeeded");
    expect(f.tables.workflow_step_runs[0].output_json).toMatchObject({ approved_by: ACTOR });
  });
});

describe("workflow cancellation persistence", () => {
  it("never overwrites a terminal state that wins a race with cancellation", async () => {
    const f = waitingFixture();
    f.fail((q) => {
      if (q.table === "workflow_runs" && q.values?.status === "cancelled")
        f.tables.workflow_runs[0].status = "succeeded";
      return false;
    });
    await expect(cancelWorkflowRun(f.client, "run", ACTOR)).rejects.toThrow("تغيّرت حالة");
    expect(f.tables.workflow_runs[0].status).toBe("succeeded");
    expect(vi.mocked(audit).mock.calls.some(([, e]) => e.action === "workflow.run.cancel")).toBe(
      false,
    );
  });
  it("does not declare cancellation when the write fails", async () => {
    const f = waitingFixture();
    f.fail((q) => q.table === "workflow_runs" && q.op === "update");
    await expect(cancelWorkflowRun(f.client, "run", ACTOR)).rejects.toThrow("حفظ الإلغاء");
    expect(f.tables.workflow_runs[0].status).toBe("waiting_approval");
  });
  it("rejects rolled-back runs and outsiders", async () => {
    const f = waitingFixture();
    f.tables.workflow_runs[0].status = "rolled_back";
    await expect(cancelWorkflowRun(f.client, "run", ACTOR)).rejects.toThrow("انتهت");
    f.tables.workflow_runs[0].status = "running";
    f.tables.org_members[0].org_id = "other";
    await expect(cancelWorkflowRun(f.client, "run", ACTOR)).rejects.toThrow("صلاحية");
  });
  it("saves actual cancellation and keeps its tenant in the audit", async () => {
    const f = waitingFixture();
    expect(await cancelWorkflowRun(f.client, "run", ACTOR)).toEqual({ ok: true });
    expect(f.tables.workflow_runs[0].status).toBe("cancelled");
    expect(vi.mocked(audit).mock.calls.at(-1)?.[1]).toMatchObject({
      org_id: ORG,
      action: "workflow.run.cancel",
    });
  });
});

describe("workflow retry boundaries", () => {
  it("does not retry or follow onError after an unconfirmed tool outcome", async () => {
    const f = fixture([
      {
        ...tool("write", "next"),
        retry: { max: 3, backoffMs: 100, factor: 2 },
        onError: "fallback",
      },
      tool("next"),
      tool("fallback"),
    ]);
    vi.mocked(executeTool).mockResolvedValue({
      executionId: "maybe-done",
      status: "failed",
      outcomeUnknown: true,
      error: "outcome unknown",
    });
    const result = await triggerWorkflow(f.client, trigger);
    expect(result).toMatchObject({ status: "failed", outcomeUnknown: true });
    expect(executeTool).toHaveBeenCalledTimes(1);
    expect(f.tables.workflow_step_runs).toHaveLength(1);
  });
  it("does not apply workflow retries to a non-idempotent executor", async () => {
    const f = fixture([{ ...tool(), retry: { max: 3, backoffMs: 100, factor: 2 } }]);
    vi.mocked(isIdempotentCall).mockReturnValue(false);
    vi.mocked(executeTool).mockResolvedValue({
      executionId: "failed",
      status: "failed",
      error: "refused",
    });
    expect((await triggerWorkflow(f.client, trigger)).status).toBe("failed");
    expect(executeTool).toHaveBeenCalledTimes(1);
  });
});
