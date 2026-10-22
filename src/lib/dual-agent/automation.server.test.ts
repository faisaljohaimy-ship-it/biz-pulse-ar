// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ owner: vi.fn(), org: vi.fn(), rpc: vi.fn(), abort: vi.fn() }));
vi.mock("./owner.server", () => ({ requireFnnOwner: mocks.owner }));
vi.mock("./command.server", () => ({ resolveCommandOrg: mocks.org }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: mocks.rpc } }));
import {
  readFnnAutomation,
  automationReportPlan,
  type FnnAutomationStatus,
} from "./automation.server";
import type { CommandContext } from "./command.server";
const ctx = { userId: "owner", supabase: {} } as CommandContext;
const valid = (): FnnAutomationStatus => ({
  enabled: true,
  schedule: "*/5 * * * *",
  state: "healthy",
  last_attempt_at: new Date().toISOString(),
  last_completed_at: new Date().toISOString(),
  last_success_at: new Date().toISOString(),
  last_error_code: null,
  completed_cycles: 1,
  report: {
    observed_at: new Date().toISOString(),
    watchdog_state: "healthy",
    pending_events: 2,
    pending_events_capped: false,
    running_workflows: 0,
    running_workflows_capped: false,
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
describe("FNN scheduled report boundary", () => {
  it("rejects an outsider before privileged access", async () => {
    mocks.owner.mockRejectedValue(Error("owner only"));
    await expect(readFnnAutomation(ctx)).rejects.toThrow("owner only");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.org).not.toHaveBeenCalled();
  });
  it("requires live membership of the fixed organization before privileged access", async () => {
    mocks.org.mockRejectedValue(Error("revoked membership"));
    await expect(readFnnAutomation(ctx)).rejects.toThrow("revoked");
    expect(mocks.org).toHaveBeenCalledWith(ctx, "00000000-0000-0000-0000-000000000001");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("only reads stored evidence with a deadline; strips extra fields and errors", async () => {
    mocks.abort.mockResolvedValue({
      data: {
        ...valid(),
        state: "error",
        last_error_code: "private identifier",
        private_row: "secret",
        report: { ...valid().report!, owner_email: "secret" },
      },
      error: null,
    });
    const out = await readFnnAutomation(ctx);
    expect(out.last_error_code).not.toContain("private");
    expect(out).not.toHaveProperty("private_row");
    expect(out.report).not.toHaveProperty("owner_email");
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("sadeed_fnn_automation_status");
    expect(mocks.abort.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });
  it("does not treat an enabled cron without a report as healthy", async () => {
    mocks.abort.mockResolvedValue({ data: { ...valid(), report: null }, error: null });
    await expect(readFnnAutomation(ctx)).rejects.toThrow("إثبات تشغيل صالح");
  });
  it("does not present an old snapshot as healthy", async () => {
    const old = new Date(Date.now() - 16 * 60_000).toISOString();
    mocks.abort.mockResolvedValue({
      data: { ...valid(), report: { ...valid().report!, observed_at: old } },
      error: null,
    });
    expect((await readFnnAutomation(ctx)).state).toBe("stale");
  });
  it("rejects future evidence, malformed counters and raw database failures", async () => {
    for (const data of [
      { ...valid(), last_success_at: new Date(Date.now() + 120_000).toISOString() },
      { ...valid(), report: { ...valid().report!, pending_events: 1001 } },
    ]) {
      mocks.abort.mockResolvedValue({ data, error: null });
      await expect(readFnnAutomation(ctx)).rejects.toThrow();
    }
    mocks.abort.mockResolvedValue({ data: null, error: Error("database secret") });
    await expect(readFnnAutomation(ctx)).rejects.toThrow("تعذّرت قراءة تقرير FNN");
  });
  it("labels capped samples and missing cycles without invented business execution", () => {
    const s = { ...valid(), state: "initializing" as const, report: null };
    expect(automationReportPlan(s).steps.join(" ")).toContain("لم تُحفظ نتيجة");
    const plan = automationReportPlan({
      ...valid(),
      state: "healthy",
      report: {
        ...valid().report!,
        pending_events: 1000,
        pending_events_capped: true,
        watchdog_state: "healthy",
      },
    });
    expect(plan.steps.join(" ")).toContain("1000 أو أكثر");
    expect(plan.steps.join(" ")).toContain("لا ينفّذ الأحداث");
  });
});
