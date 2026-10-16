/**
 * مهلة الحصّة اليومية (R09، ٢٠٢٦/١٠/١٦): دلو السقف العام صفٌّ يكتب عليه كل طلب،
 * فقد يعلق وحده تحت الضغط بينما دلو المعدّل سريع. المهلة تمرّ إلى بوّابتيه كلتيهما.
 *
 * ومنذ VIBE 5.1: بلا خيار تعمل المهلة الافتراضية (2000) لكل بوّابة، وتوجد
 * `degradedAiQuota` — السقوف نفسها بنصف قيمتها في ذاكرة المعزول حين يتعذّر المخزن.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  hangOn: "" as string,
  calls: [] as string[],
}));

vi.mock("@/integrations/supabase/client.server", () => {
  const chain: unknown = new Proxy(() => chain, {
    get(_t, prop) {
      if (prop === "then") return (resolve: (v: unknown) => unknown) => resolve({ error: null });
      return () => chain;
    },
    apply: () => chain,
  });
  return {
    supabaseAdmin: {
      rpc: (_fn: string, args: { _bucket_key: string }) => {
        db.calls.push(args._bucket_key);
        if (db.hangOn && args._bucket_key.startsWith(db.hangOn)) return new Promise(() => {});
        return Promise.resolve({ data: true, error: null });
      },
      from: () => chain,
    },
  };
});

import { degradedAiQuota, enforceAiQuota } from "./ai-quota.server";
import { RATE_LIMIT_DEFAULT_DEADLINE_MS, resetRateLimitStateForTests } from "./rate-limit.server";

beforeEach(() => {
  vi.useFakeTimers();
  resetRateLimitStateForTests();
  db.hangOn = "";
  db.calls = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function settleWithin(promise: Promise<Response | null>, ms: number) {
  let settled: Response | null | "pending" = "pending";
  void promise.then((r) => (settled = r));
  await vi.advanceTimersByTimeAsync(ms);
  return settled as Response | null | "pending";
}

describe("enforceAiQuota — المهلة تبلغ البوّابتين", () => {
  it("البوّابة العامة معلّقة ⇐ ‏503 quota_unavailable عند المهلة", async () => {
    db.hangOn = "ai-daily-global:";
    const p = enforceAiQuota({ surface: "chat", identity: "ip:1", deadlineMs: 1_500 });
    expect(await settleWithin(p, 1_499)).toBe("pending");
    const res = await settleWithin(p, 1);
    expect(res).not.toBe("pending");
    expect((res as Response).status).toBe(503);
    expect(((await (res as Response).json()) as { error: string }).error).toBe("quota_unavailable");
  });

  it("العامة تمرّ وبوّابة الهوية معلّقة ⇐ ‏503 بعد مهلتها", async () => {
    db.hangOn = "ai-daily-id:";
    const p = enforceAiQuota({ surface: "chat", identity: "ip:2", deadlineMs: 1_500 });
    const res = await settleWithin(p, 1_600);
    expect(res).not.toBe("pending");
    expect((res as Response).status).toBe(503);
    expect(db.calls.some((k) => k.startsWith("ai-daily-global:"))).toBe(true);
  });

  it("بلا خيار ⇐ المهلة الافتراضية لكل بوّابة، لا تعليق", async () => {
    db.hangOn = "ai-daily-global:";
    const p = enforceAiQuota({ surface: "chat", identity: "ip:3" });
    expect(await settleWithin(p, RATE_LIMIT_DEFAULT_DEADLINE_MS - 1)).toBe("pending");
    const res = await settleWithin(p, 1);
    expect((res as Response).status).toBe(503);
  });

  it("القاعدة السريعة: تمرّ بلا رفض", async () => {
    const p = enforceAiQuota({ surface: "chat", identity: "ip:4", deadlineMs: 1_500 });
    expect(await settleWithin(p, 10)).toBeNull();
  });
});

describe("degradedAiQuota — السقوف نفسها بنصفها في الذاكرة", () => {
  it("حصّة الهوية للدردشة 120 ⇐ 60 تمرّ والـ61 تُرفض برسالةٍ عربية ورمزها", async () => {
    for (let i = 1; i <= 60; i++) expect(degradedAiQuota("chat", "ip:9"), `طلب ${i}`).toBeNull();
    const res = degradedAiQuota("chat", "ip:9");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    const body = (await res!.json()) as { error: string; message_ar: string };
    expect(body.error).toBe("daily_identity_cap");
    expect(body.message_ar).toContain("المحدودة");
    expect(res!.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(db.calls, "لا قاعدة في المسار المحدود").toHaveLength(0);
  });

  it("هويةٌ أخرى لها دلوها، والسقف العام مشترك", () => {
    expect(degradedAiQuota("chat", "ip:a")).toBeNull();
    expect(degradedAiQuota("chat", "ip:b")).toBeNull();
  });
});
