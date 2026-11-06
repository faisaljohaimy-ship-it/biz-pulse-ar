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


  it.each(["timeout", "rpc_error"] as const)(
    "failure logs redact identity and backend error details (%s)",
    async (failure) => {
      const privateKey = "ai-daily-id:finn:test-date:synthetic-private-identity";
      const privateDbMessage = "synthetic sensitive database response for private identity";
      if (failure === "timeout") {
        rpc.impl = () => new Promise(() => {});
        const pending = enforceRateLimit(privateKey, 10, 60, { deadlineMs: 500 });
        await vi.advanceTimersByTimeAsync(500);
        await expect(pending).resolves.toEqual({ allowed: false, unavailable: true });
      } else {
        rpc.impl = async () => ({
          data: null,
          error: { message: privateDbMessage },
        });
        await expect(enforceRateLimit(privateKey, 10, 60)).resolves.toEqual({
          allowed: false,
          unavailable: true,
        });
      }
      const output = JSON.stringify(vi.mocked(console.error).mock.calls);
      expect(output).toContain("rate_limit.check_failed");
      expect(output).not.toContain(privateKey);
      expect(output).not.toContain(privateDbMessage);
    },
  );

  it("opening the breaker never exposes the caller or database response in logs", async () => {
    const privateKey = "ai-daily-id:chat:test-date:synthetic-private-identity";
    const privateDbMessage = "synthetic sensitive database response";
    rpc.impl = async () => ({ data: null, error: { message: privateDbMessage } });
    for (let i = 0; i < 5; i += 1) {
      await expect(enforceRateLimit(privateKey, 10, 60)).resolves.toEqual({
        allowed: false,
        unavailable: true,
      });
    }
    const output = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(output).toContain("rate_limit.breaker.opened");
    expect(output).not.toContain(privateKey);
    expect(output).not.toContain(privateDbMessage);
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

  it("a valid false RPC decision remains an ordinary quota denial", async () => {
    rpc.impl = async () => ({ data: false, error: null });
    await expect(enforceRateLimit("chat:normal-deny", 10, 60)).resolves.toEqual({ allowed: false });
  });

  it.each(["false", "true", 1, 0, {}, [], null, undefined])(
    "non-boolean RPC result %s must fail closed, never become an allowed request",
    async (data) => {
      rpc.impl = async () => ({ data, error: null });
      await expect(enforceRateLimit("chat:malformed-response", 10, 60)).resolves.toEqual({
        allowed: false,
        unavailable: true,
      });
    },
  );

  it.each([null, undefined, "unexpected", 123])(
    "malformed RPC envelope %s returns unavailable instead of throwing",
    async (envelope) => {
      rpc.impl = async () => envelope;
      await expect(enforceRateLimit("chat:invalid-envelope", 10, 60)).resolves.toEqual({
        allowed: false,
        unavailable: true,
      });
    },
  );

  it("خطأ القاعدة ما زال يفشل مغلقًا", async () => {
    rpc.impl = async () => ({ data: null, error: { message: "boom" } });
    await expect(enforceRateLimit("k", 10, 60, { deadlineMs: 1_500 })).resolves.toEqual({
      allowed: false,
      unavailable: true,
    });
  });

  it("عميل الإدارة المفقود يرمي تزامنيًا: لا استثناء ولا 500، بل رفض مغلق", async () => {
    rpc.impl = () => {
      throw new Error("Missing Supabase environment variable: SERVICE_ROLE_KEY");
    };
    await expect(enforceRateLimit("health:chat", 600, 60, { deadlineMs: 1_500 })).resolves.toEqual({
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
