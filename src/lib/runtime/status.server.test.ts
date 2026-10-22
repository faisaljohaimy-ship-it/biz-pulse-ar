import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/dual-agent/owner.server", () => ({ requireFnnOwner: vi.fn() }));
const { rpc, abortSignal } = vi.hoisted(() => ({ rpc: vi.fn(), abortSignal: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc } }));
import { requireFnnOwner } from "@/lib/dual-agent/owner.server";
import { readRuntimeStatus } from "./status.server";
import type { CommandContext } from "@/lib/dual-agent/command.server";

const context = { userId: "owner", supabase: {} } as CommandContext;
const valid = {
  enabled: true,
  schedule: "*/5 * * * *",
  last_attempt_at: null,
  last_completed_at: null,
  last_success_at: null,
  last_status: "ok",
  last_error: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireFnnOwner).mockResolvedValue(undefined);
  rpc.mockReturnValue({ abortSignal });
  abortSignal.mockResolvedValue({ data: valid, error: null });
});
describe("runtime monitoring owner boundary", () => {
  it("rejects outsiders before touching the privileged client", async () => {
    vi.mocked(requireFnnOwner).mockRejectedValue(new Error("مالك النظام فقط"));
    await expect(readRuntimeStatus(context)).rejects.toThrow("مالك النظام");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("returns verified status but never database error details or extra private fields", async () => {
    abortSignal.mockResolvedValue({
      data: {
        ...valid,
        last_status: "error",
        last_error: "private row identifier",
        private_row: "sensitive",
      },
      error: null,
    });
    const result = await readRuntimeStatus(context);
    expect(result.last_error).toBe("تعذّرت دورة المراقبة الأخيرة.");
    expect(result).not.toHaveProperty("private_row");
    expect(rpc).toHaveBeenCalledWith("sadeed_runtime_status");
    expect(abortSignal.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });
  it("fails closed on malformed or unavailable monitoring evidence", async () => {
    abortSignal.mockResolvedValue({ data: { enabled: true }, error: null });
    await expect(readRuntimeStatus(context)).rejects.toThrow("حالة تشغيل صالحة");
    abortSignal.mockResolvedValue({ data: null, error: new Error("secret database detail") });
    await expect(readRuntimeStatus(context)).rejects.toThrow("تعذّرت قراءة مراقبة التشغيل");
  });
});
