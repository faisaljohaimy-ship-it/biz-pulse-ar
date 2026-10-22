import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { WorkflowRunResult } from "@/lib/exec/workflow-engine.server";

vi.mock("@/lib/exec/workflow-engine.server", () => ({ triggerWorkflow: vi.fn() }));
import { triggerWorkflow } from "@/lib/exec/workflow-engine.server";
import { consumePendingEvents } from "./consume-events.server";

const WATERMARK = "2026-01-01T00:00:00.000Z";
const event = {
  id: "event-1",
  org_id: "org-1",
  topic: "incident.created",
  payload_json: { incident: "incident-1" },
  occurred_at: "2026-01-02T00:00:00.000Z",
};
const admitted = {
  runId: "run-1",
  status: "succeeded",
  context: {},
  created: true,
} satisfies WorkflowRunResult;
type Reply = { data: unknown; error: unknown };
function client(replies: Reply[]) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const from = vi.fn((table: string) => {
    const reply = replies.shift();
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "gte", "order", "limit", "update", "maybeSingle"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    }
    builder.then = (resolve: (value: Reply) => unknown) => {
      if (!reply) throw new Error("Unexpected database query");
      return Promise.resolve(reply).then(resolve);
    };
    return builder;
  });
  return { db: { from } as unknown as SupabaseClient<Database>, calls, from };
}
const ok = (data: unknown): Reply => ({ data, error: null });
const failed = (): Reply => ({ data: null, error: { message: "database rejected query" } });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(triggerWorkflow).mockResolvedValue(admitted);
});

describe("event consumer activation and durable admission", () => {
  it.each([undefined, "", "invalid", "0", "2026-01-01", "2999-01-01T00:00:00Z"])(
    "does not query or dispatch without a valid non-future activation: %s",
    async (watermark) => {
      const { db, from } = client([]);
      expect(await consumePendingEvents(db, "owner", "org-1", watermark)).toEqual({
        events_processed: 0,
        workflows_started: 0,
        errors: 1,
      });
      expect(from).not.toHaveBeenCalled();
      expect(triggerWorkflow).not.toHaveBeenCalled();
    },
  );
  it("filters by org/pending/watermark and acknowledges a checked successful admission", async () => {
    const { db, calls } = client([ok([event]), ok([{ id: "wf-1" }]), ok({ id: event.id })]);
    expect(await consumePendingEvents(db, "owner", "org-1", WATERMARK)).toEqual({
      events_processed: 1,
      workflows_started: 1,
      errors: 0,
    });
    expect(triggerWorkflow).toHaveBeenCalledWith(db, {
      workflowId: "wf-1",
      triggeredBy: "owner",
      triggerEvent: event.topic,
      payload: event.payload_json,
      idempotencyKey: "event:event-1:wf-1",
    });
    expect(calls).toEqual(
      expect.arrayContaining([
        { table: "enterprise_events", method: "gte", args: ["occurred_at", WATERMARK] },
        { table: "enterprise_events", method: "eq", args: ["org_id", "org-1"] },
        { table: "enterprise_events", method: "eq", args: ["status", "pending"] },
        { table: "enterprise_events", method: "limit", args: [10] },
        { table: "workflows", method: "eq", args: ["org_id", "org-1"] },
        { table: "workflows", method: "eq", args: ["enabled", true] },
        { table: "enterprise_events", method: "eq", args: ["id", event.id] },
        { table: "enterprise_events", method: "maybeSingle", args: [] },
      ]),
    );
  });
  it("awaits dispatch before any acknowledgement", async () => {
    let resolve!: (result: WorkflowRunResult) => void;
    vi.mocked(triggerWorkflow).mockReturnValue(new Promise((r) => (resolve = r)));
    const { db, calls } = client([ok([event]), ok([{ id: "wf-1" }]), ok({ id: event.id })]);
    const task = consumePendingEvents(db, "owner", "org-1", WATERMARK);
    await vi.waitFor(() => expect(triggerWorkflow).toHaveBeenCalledOnce());
    expect(calls.some((c) => c.method === "update")).toBe(false);
    resolve(admitted);
    expect((await task).events_processed).toBe(1);
  });
  it("preserves standby events with no matching enabled workflow", async () => {
    const { db, calls } = client([ok([event]), ok([])]);
    expect(await consumePendingEvents(db, "owner", "org-1", WATERMARK)).toEqual({
      events_processed: 0,
      workflows_started: 0,
      errors: 0,
    });
    expect(triggerWorkflow).not.toHaveBeenCalled();
    expect(calls.some((c) => c.method === "update")).toBe(false);
  });
  it.each(["pending", "workflow"])("fails closed on a %s query error", async (stage) => {
    const replies = stage === "pending" ? [failed()] : [ok([event]), failed()];
    const { db, calls } = client(replies);
    expect((await consumePendingEvents(db, "owner", "org-1", WATERMARK)).errors).toBe(1);
    expect(triggerWorkflow).not.toHaveBeenCalled();
    expect(calls.some((c) => c.method === "update")).toBe(false);
  });
  it.each([
    { ...event, org_id: "other-org" },
    { ...event, occurred_at: "2025-12-31T23:59:59.000Z" },
  ])("does not dispatch foreign or pre-activation events even if returned", async (invalid) => {
    const { db } = client([ok([invalid])]);
    expect((await consumePendingEvents(db, "owner", "org-1", WATERMARK)).errors).toBe(1);
    expect(triggerWorkflow).not.toHaveBeenCalled();
  });
  it.each(["rejection", "failed", "cancelled"])(
    "retains pending events after dispatch %s",
    async (failure) => {
      if (failure === "rejection")
        vi.mocked(triggerWorkflow).mockRejectedValue(new Error("rejected"));
      else
        vi.mocked(triggerWorkflow).mockResolvedValue({
          ...admitted,
          status: failure as "failed" | "cancelled",
        });
      const { db, calls } = client([ok([event]), ok([{ id: "wf-1" }])]);
      expect(await consumePendingEvents(db, "owner", "org-1", WATERMARK)).toEqual({
        events_processed: 0,
        workflows_started: failure === "rejection" ? 0 : 1,
        errors: 1,
      });
      expect(calls.some((c) => c.method === "update")).toBe(false);
    },
  );
  it("requires every matching workflow admission before marking the event", async () => {
    vi.mocked(triggerWorkflow)
      .mockResolvedValueOnce(admitted)
      .mockRejectedValueOnce(new Error("second admission failed"));
    const { db, calls } = client([ok([event]), ok([{ id: "wf-1" }, { id: "wf-2" }])]);
    expect(await consumePendingEvents(db, "owner", "org-1", WATERMARK)).toEqual({
      events_processed: 0,
      workflows_started: 1,
      errors: 1,
    });
    expect(calls.some((c) => c.method === "update")).toBe(false);
  });
  it.each(["queued", "running", "waiting_approval"] as const)(
    "accepts an existing durable %s run without inflating new starts",
    async (status) => {
      vi.mocked(triggerWorkflow).mockResolvedValue({
        ...admitted,
        status,
        created: false,
      });
      const { db } = client([ok([event]), ok([{ id: "wf-1" }]), ok({ id: event.id })]);
      expect(await consumePendingEvents(db, "owner", "org-1", WATERMARK)).toEqual({
        events_processed: 1,
        workflows_started: 0,
        errors: 0,
      });
    },
  );
  it("does not inflate starts for an existing failed run or consume its event", async () => {
    vi.mocked(triggerWorkflow).mockResolvedValue({ ...admitted, status: "failed", created: false });
    const { db, calls } = client([ok([event]), ok([{ id: "wf-1" }])]);
    expect(await consumePendingEvents(db, "owner", "org-1", WATERMARK)).toEqual({
      events_processed: 0,
      workflows_started: 0,
      errors: 1,
    });
    expect(calls.some((c) => c.method === "update")).toBe(false);
  });
  it.each([failed(), ok(null)])(
    "does not report consumption when the conditional acknowledgement fails or loses a race",
    async (markResult) => {
      const { db } = client([ok([event]), ok([{ id: "wf-1" }]), markResult]);
      const result = await consumePendingEvents(db, "owner", "org-1", WATERMARK);
      expect(result.events_processed).toBe(0);
      expect(result.errors).toBe(markResult.error ? 1 : 0);
    },
  );
});
