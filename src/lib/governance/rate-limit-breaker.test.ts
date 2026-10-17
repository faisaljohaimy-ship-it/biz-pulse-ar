/**
 * قاطع دارة مخزن حدّ المعدّل والحصّة المحدودة في الذاكرة (VIBE 5.1، ٢٠٢٦/١٠/١٦).
 *
 * مؤقّتات زائفة؛ `rpc` مزروع يُعلَّق أو يُخطئ أو ينجح حسب الحالة. كل اختبار
 * يبدأ من قاطعٍ مغلق ودلاءٍ فارغة.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => ({ mode: "ok" as "ok" | "hang" | "error", calls: 0 }));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: () => {
      rpc.calls += 1;
      if (rpc.mode === "hang") return new Promise(() => {});
      if (rpc.mode === "error") return Promise.resolve({ data: null, error: { message: "boom" } });
      return Promise.resolve({ data: true, error: null });
    },
  },
}));

import {
  BREAKER_FAILURE_THRESHOLD,
  BREAKER_FAILURE_WINDOW_MS,
  BREAKER_OPEN_MS,
  DEGRADED_MAX_KEYS,
  RATE_LIMIT_DEFAULT_DEADLINE_MS,
  degradedAllowance,
  enforceRateLimit,
  gateDegradedMode,
  rateLimitStorageState,
  resetRateLimitStateForTests,
} from "./rate-limit.server";

beforeEach(() => {
  vi.useFakeTimers();
  resetRateLimitStateForTests();
  rpc.mode = "ok";
  rpc.calls = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function settle<T>(promise: Promise<T>, ms: number): Promise<T | "pending"> {
  let settled: T | "pending" = "pending";
  void promise.then((v) => (settled = v));
  await vi.advanceTimersByTimeAsync(ms);
  return settled;
}

/** يفتح القاطع بخمسة فشلٍ (مهلات) ويعيد عدد نداءات القاعدة عندها. */
async function openBreaker(): Promise<number> {
  rpc.mode = "hang";
  for (let i = 0; i < BREAKER_FAILURE_THRESHOLD; i++) {
    const r = await settle(enforceRateLimit("k", 10, 60), RATE_LIMIT_DEFAULT_DEADLINE_MS);
    expect(r).toEqual({ allowed: false, unavailable: true });
  }
  expect(rateLimitStorageState().state).toBe("open");
  return rpc.calls;
}

describe("المهلة الافتراضية", () => {
  it("بلا خيار ⇐ «غير متاح» عند 2000 مللي ثانية بالضبط، لا انتظار مفتوح", async () => {
    rpc.mode = "hang";
    const p = enforceRateLimit("k", 10, 60);
    expect(await settle(p, RATE_LIMIT_DEFAULT_DEADLINE_MS - 1)).toBe("pending");
    expect(await settle(p, 1)).toEqual({ allowed: false, unavailable: true });
    const s = rateLimitStorageState();
    expect(s.state).toBe("closed");
    expect(s.consecutiveFailures).toBe(1);
  });

  it("الخيار الصريح يسبق الافتراض", async () => {
    rpc.mode = "hang";
    const p = enforceRateLimit("k", 10, 60, { deadlineMs: 500 });
    expect(await settle(p, 499)).toBe("pending");
    expect(await settle(p, 1)).toEqual({ allowed: false, unavailable: true });
  });
});

describe("القاطع", () => {
  it("خمسة فشلٍ تفتحه (دستور الهندسة §3)؛ والنداء السادس فوريٌّ بلا لمس القاعدة", async () => {
    const callsAtOpen = await openBreaker();
    expect(callsAtOpen).toBe(BREAKER_FAILURE_THRESHOLD);
    const r = await settle(enforceRateLimit("k", 10, 60), 0);
    expect(r).toEqual({ allowed: false, unavailable: true });
    expect(rpc.calls).toBe(BREAKER_FAILURE_THRESHOLD);
  });

  it("أربعة فشلٍ لا تفتحه، وفشلٌ خامس بعد أكثر من 60 ث يبدأ سلسلةً جديدة", async () => {
    rpc.mode = "hang";
    for (let i = 0; i < BREAKER_FAILURE_THRESHOLD - 1; i++) {
      await settle(enforceRateLimit("k", 10, 60), RATE_LIMIT_DEFAULT_DEADLINE_MS);
    }
    expect(rateLimitStorageState().state).toBe("closed");
    expect(rateLimitStorageState().consecutiveFailures).toBe(BREAKER_FAILURE_THRESHOLD - 1);
    await vi.advanceTimersByTimeAsync(BREAKER_FAILURE_WINDOW_MS + 1);
    await settle(enforceRateLimit("k", 10, 60), RATE_LIMIT_DEFAULT_DEADLINE_MS);
    expect(rateLimitStorageState().state).toBe("closed");
    expect(rateLimitStorageState().consecutiveFailures).toBe(1);
  });

  it("خطأ القاعدة يُحتسب فشلًا، ويفشل مغلقًا، وخمسةٌ منه تفتح القاطع", async () => {
    rpc.mode = "error";
    for (let i = 0; i < BREAKER_FAILURE_THRESHOLD; i++) {
      expect(await settle(enforceRateLimit("k", 10, 60), 0)).toEqual({
        allowed: false,
        unavailable: true,
      });
    }
    expect(rateLimitStorageState().state).toBe("open");
  });

  it("التعافي: بعد 30 ث يمرّ فحصٌ واحد؛ نجاحه يغلق القاطع ويعيد التحقّق الحقيقي", async () => {
    await openBreaker();
    await vi.advanceTimersByTimeAsync(BREAKER_OPEN_MS);
    expect(rateLimitStorageState().state).toBe("half-open");
    rpc.mode = "ok";
    const probe = enforceRateLimit("a", 10, 60);
    const bystander = enforceRateLimit("b", 10, 60);
    expect(await settle(bystander, 0)).toEqual({ allowed: false, unavailable: true });
    expect(await settle(probe, 0)).toEqual({ allowed: true });
    expect(rpc.calls).toBe(BREAKER_FAILURE_THRESHOLD + 1);
    expect(rateLimitStorageState().state).toBe("closed");
    expect(await settle(enforceRateLimit("c", 10, 60), 0)).toEqual({ allowed: true });
    expect(rpc.calls).toBe(BREAKER_FAILURE_THRESHOLD + 2);
  });

  it("فشل الفحص يعيد الفتح مدّةً كاملة", async () => {
    await openBreaker();
    await vi.advanceTimersByTimeAsync(BREAKER_OPEN_MS);
    rpc.mode = "hang";
    const probe = enforceRateLimit("a", 10, 60);
    expect(await settle(probe, RATE_LIMIT_DEFAULT_DEADLINE_MS)).toEqual({
      allowed: false,
      unavailable: true,
    });
    expect(rpc.calls).toBe(BREAKER_FAILURE_THRESHOLD + 1);
    expect(rateLimitStorageState().state).toBe("open");
    expect(await settle(enforceRateLimit("b", 10, 60), 0)).toEqual({
      allowed: false,
      unavailable: true,
    });
    expect(rpc.calls).toBe(BREAKER_FAILURE_THRESHOLD + 1);
  });

  it("لقطة الحالة أعدادٌ وطوابع لا غير", () => {
    expect(rateLimitStorageState()).toEqual({
      state: "closed",
      consecutiveFailures: 0,
      openedAt: null,
      lastFailureAt: null,
      lastSuccessAt: null,
    });
  });
});

describe("الحصّة المحدودة في الذاكرة", () => {
  it("نصف السقف: 12 في 300 ث ⇐ ستٌّ تمرّ والسابعة تُرفض بـRetry-After ضمن النافذة", () => {
    for (let i = 1; i <= 6; i++) {
      const d = degradedAllowance("chat:ip:1", 12, 300);
      expect(d.allowed, `طلب ${i}`).toBe(true);
      expect(d.cap).toBe(6);
    }
    const seventh = degradedAllowance("chat:ip:1", 12, 300);
    expect(seventh.allowed).toBe(false);
    expect(seventh.remaining).toBe(0);
    expect(seventh.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(seventh.retryAfterSeconds).toBeLessThanOrEqual(300);
  });

  it("النافذة تتجدّد بعد مدّتها، والسقف لا يقلّ عن واحد", async () => {
    expect(degradedAllowance("x", 1, 60).allowed).toBe(true);
    expect(degradedAllowance("x", 1, 60).allowed).toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(degradedAllowance("x", 1, 60).allowed).toBe(true);
  });

  it("المفاتيح محدودة العدد: الأقدم يُطرد فلا تنمو الذاكرة برشّ المفاتيح", () => {
    expect(degradedAllowance("first", 2, 60).allowed).toBe(true);
    for (let i = 0; i < DEGRADED_MAX_KEYS + 5; i++) degradedAllowance(`spray-${i}`, 2, 60);
    // لو بقي «first» لكان هذا نداءه الثاني فوق سقف 1 ⇐ مرفوض؛ طُرد ⇐ يبدأ من جديد.
    expect(degradedAllowance("first", 2, 60).allowed).toBe(true);
  });

  it("سياسة التدهور من البيئة: الافتراض closed (قرار فوترةٍ للمالك)، و«bounded» وحدها تفتح", () => {
    expect(gateDegradedMode({})).toBe("closed");
    expect(gateDegradedMode({ SADEED_GATE_DEGRADED_MODE: "bounded" })).toBe("bounded");
    expect(gateDegradedMode({ SADEED_GATE_DEGRADED_MODE: " BOUNDED " })).toBe("bounded");
    expect(gateDegradedMode({ SADEED_GATE_DEGRADED_MODE: "closed" })).toBe("closed");
    expect(gateDegradedMode({ SADEED_GATE_DEGRADED_MODE: "on" })).toBe("closed");
    expect(gateDegradedMode({ SADEED_GATE_DEGRADED_MODE: "" })).toBe("closed");
  });

  it("السقف العام المحدود مشترك: 2500 هوية تمرّ والـ2501 تُرفض (الانتهاك المزروع V34)", () => {
    // نصف السقف اليومي العام للدردشة (5000) = 2500 — دلوٌ واحد لكل الهويات.
    const key = "ai-daily-global:chat:2026-10-17";
    for (let i = 1; i <= 2500; i++) {
      expect(degradedAllowance(key, 5_000, 86_400).allowed, `هوية ${i}`).toBe(true);
    }
    const over = degradedAllowance(key, 5_000, 86_400);
    expect(over.allowed).toBe(false);
    expect(over.remaining).toBe(0);
  });
});
