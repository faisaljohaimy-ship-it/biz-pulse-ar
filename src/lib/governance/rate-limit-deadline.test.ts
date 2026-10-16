/**
 * مهلة فحص المعدّل: قاعدةٌ لا تردّ لا تعلّق الطلب (٢٠٢٦/١٠/١٦).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => ({ impl: (() => new Promise(() => {})) as () => Promise<unknown> }));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: () => rpc.impl() },
}));

import { enforceRateLimit } from "./rate-limit.server";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("enforceRateLimit — المهلة", () => {
  it("نداءٌ معلّق ⇐ «غير متاح» عند المهلة بالضبط، مغلقًا", async () => {
    rpc.impl = () => new Promise(() => {});
    let settled: unknown = "pending";
    void enforceRateLimit("k", 10, 60, { deadlineMs: 1_500 }).then((r) => (settled = r));
    await vi.advanceTimersByTimeAsync(1_499);
    expect(settled).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toEqual({ allowed: false, unavailable: true });
  });

  it("الانتهاك المزروع (المادة ٣٠): بلا مهلة يبقى معلّقًا", async () => {
    rpc.impl = () => new Promise(() => {});
    let settled: unknown = "pending";
    void enforceRateLimit("k", 10, 60).then((r) => (settled = r));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(settled).toBe("pending");
  });

  it("الردّ السريع يسبق المهلة ويُحترم", async () => {
    rpc.impl = async () => ({ data: true, error: null });
    await expect(enforceRateLimit("k", 10, 60, { deadlineMs: 1_500 })).resolves.toEqual({
      allowed: true,
    });
  });

  it("خطأ القاعدة ما زال يفشل مغلقًا", async () => {
    rpc.impl = async () => ({ data: null, error: { message: "boom" } });
    await expect(enforceRateLimit("k", 10, 60, { deadlineMs: 1_500 })).resolves.toEqual({
      allowed: false,
      unavailable: true,
    });
  });
});
