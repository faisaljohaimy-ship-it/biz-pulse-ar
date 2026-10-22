// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ owner: vi.fn(), org: vi.fn(), rpc: vi.fn(), abort: vi.fn() }));
vi.mock("./owner.server", () => ({ requireFnnOwner: mocks.owner }));
vi.mock("./command.server", () => ({ resolveCommandOrg: mocks.org }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: mocks.rpc } }));
import { readFnnTasks, automationTasksPlan, type FnnTasks } from "./automation-tasks.server";
import type { CommandContext } from "./command.server";
const ctx = { userId: "owner", supabase: {} } as CommandContext;
const at = (ago = 0) => new Date(Date.now() - ago).toISOString();
const valid = (): FnnTasks => ({
  activation_at: at(60_000),
  observed_at: at(),
  state: "healthy",
  tasks: [],
});
const task = (): FnnTasks["tasks"][number] => ({
  code: "new_event_backlog",
  status: "open",
  first_seen_at: at(30_000),
  last_seen_at: at(),
  last_evaluated_at: at(),
  resolved_at: null,
  reopen_count: 0,
  resolution_count: 0,
  evidence: {
    watchdog_state: "healthy",
    pending_events_aged: 1,
    pending_events_aged_capped: false,
    sample_limit: 1000,
  },
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.owner.mockResolvedValue(undefined);
  mocks.org.mockResolvedValue("00000000-0000-0000-0000-000000000001");
  mocks.rpc.mockReturnValue({ abortSignal: mocks.abort });
  mocks.abort.mockResolvedValue({ data: valid(), error: null });
});
describe("FNN operational follow-up reader", () => {
  it("denies guests before membership or privileged access", async () => {
    mocks.owner.mockRejectedValue(Error("owner"));
    await expect(readFnnTasks(ctx)).rejects.toThrow("owner");
    expect(mocks.org).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("checks live fixed-organization membership before privileged access", async () => {
    mocks.org.mockRejectedValue(Error("revoked"));
    await expect(readFnnTasks(ctx)).rejects.toThrow("revoked");
    expect(mocks.org).toHaveBeenCalledWith(ctx, "00000000-0000-0000-0000-000000000001");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("reads only the fixed status RPC under a deadline and strips private extras", async () => {
    mocks.abort.mockResolvedValue({
      data: {
        ...valid(),
        owner_email: "secret",
        tasks: [
          { ...task(), private_id: "secret", evidence: { ...task().evidence, raw_sql: "secret" } },
        ],
      },
      error: null,
    });
    const out = await readFnnTasks(ctx);
    expect(JSON.stringify(out)).not.toContain("secret");
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("sadeed_fnn_automation_tasks");
    expect(mocks.abort.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });
  it("does not turn an unavailable or old RPC into an empty healthy queue", async () => {
    for (const data of [null, { enabled: true }, { ...valid(), observed_at: null }]) {
      mocks.abort.mockResolvedValue({ data, error: null });
      await expect(readFnnTasks(ctx)).rejects.toThrow();
    }
    mocks.abort.mockResolvedValue({ data: null, error: Error("database secret") });
    await expect(readFnnTasks(ctx)).rejects.toThrow("لم تصل حالة متابعة FNN");
  });
  it("downgrades an old successful observation to stale", async () => {
    mocks.abort.mockResolvedValue({
      data: { ...valid(), activation_at: at(20 * 60_000), observed_at: at(16 * 60_000) },
      error: null,
    });
    expect((await readFnnTasks(ctx)).state).toBe("stale");
  });
  it("rejects future or pre-activation task evidence", async () => {
    for (const t of [
      { ...task(), last_seen_at: at(-120_000) },
      { ...task(), first_seen_at: at(120_000) },
    ]) {
      mocks.abort.mockResolvedValue({ data: { ...valid(), tasks: [t] }, error: null });
      await expect(readFnnTasks(ctx)).rejects.toThrow("إثبات متابعة صالح");
    }
  });
  it("rejects duplicate codes and impossible resolution or cap evidence", async () => {
    for (const tasks of [
      [task(), task()],
      [{ ...task(), status: "resolved" }],
      [{ ...task(), evidence: { ...task().evidence, pending_events_aged_capped: true } }],
    ]) {
      mocks.abort.mockResolvedValue({ data: { ...valid(), tasks }, error: null });
      await expect(readFnnTasks(ctx)).rejects.toThrow();
    }
  });
  it("only describes an empty queue as observed when a fresh reconciliation exists", () => {
    expect(automationTasksPlan(valid()).steps.join(" ")).toContain("لم يرصد آخر تحقق");
    for (const state of ["initializing", "disabled", "error", "stale"] as const) {
      const text = automationTasksPlan({ ...valid(), state }).steps.join(" ");
      expect(text).toContain("غير مؤكدة");
      expect(text).not.toContain("لم يرصد آخر تحقق");
    }
  });
  it("never equates a resolved follow-up with executing or approving business events", () => {
    const plan = automationTasksPlan({
      ...valid(),
      tasks: [{ ...task(), status: "resolved", resolved_at: at(), resolution_count: 1 }],
    });
    expect(plan.steps.join(" ")).toContain("زال شرط تنبيه المتابعة");
    expect(plan.steps.join(" ")).toContain("لا يعني تنفيذ الأحداث");
  });
});
