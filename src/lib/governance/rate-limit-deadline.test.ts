/**
 * مهلة فحص المعدّل: قاعدةٌ لا تردّ لا تعلّق الطلب (٢٠٢٦/١٠/١٦).
 *
 * منذ VIBE 5.1 المهلة **افتراضية** (2000 مللي ثانية) لا خيارًا قد يُنسى — فكل
 * مستدعٍ (الصوت، النقاط العامة، الدردشة) محميٌّ ولو لم يمرّر شيئًا. الانتهاك
 * المزروع هنا نسخةٌ من المنطق القديم (انتظار النداء كما هو) تُثبت أنه كان يعلق.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => ({ impl: (() => new Promise(() => {})) as () => Promise<unknown> }));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: () => rpc.impl() },
}));

import {
  RATE_LIMIT_DEFAULT_DEADLINE_MS,
  enforceRateLimit,
  resetRateLimitStateForTests,
} from "./rate-limit.server";

beforeEach(() => {
  vi.useFakeTimers();
  resetRateLimitStateForTests();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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

  it("بلا خيار ⇐ المهلة الافتراضية 2000 مللي ثانية — لا نداء بلا حدّ", async () => {
    rpc.impl = () => new Promise(() => {});
    let settled: unknown = "pending";
    void enforceRateLimit("k", 10, 60).then((r) => (settled = r));
    await vi.advanceTimersByTimeAsync(RATE_LIMIT_DEFAULT_DEADLINE_MS - 1);
    expect(settled).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toEqual({ allowed: false, unavailable: true });
  });

  it("الانتهاك المزروع (المادة ٣٠): المنطق القديم — انتظار النداء كما هو — يعلق", async () => {
    rpc.impl = () => new Promise(() => {});
    const legacy = async () => {
      const { data, error } = (await rpc.impl()) as { data: unknown; error: unknown };
      return error ? { allowed: false, unavailable: true } : { allowed: Boolean(data) };
    };
    let settled: unknown = "pending";
    void legacy().then((r) => (settled = r));
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

  it("نداءٌ يرمي (شبكة) يُعامل كخطأ قاعدة — مغلقًا لا استثناءً", async () => {
    rpc.impl = async () => {
      throw new Error("fetch failed");
    };
    await expect(enforceRateLimit("k", 10, 60, { deadlineMs: 1_500 })).resolves.toEqual({
      allowed: false,
      unavailable: true,
    });
  });
});
