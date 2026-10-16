/**
 * مهلة الحصّة اليومية (R09، ٢٠٢٦/١٠/١٦): دلو السقف العام صفٌّ يكتب عليه كل طلب،
 * فقد يعلق وحده تحت الضغط بينما دلو المعدّل سريع. المهلة تمرّ إلى بوّابتيه كلتيهما.
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

import { enforceAiQuota } from "./ai-quota.server";

beforeEach(() => {
  vi.useFakeTimers();
  db.hangOn = "";
  db.calls = [];
});
afterEach(() => vi.useRealTimers());

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

  it("الانتهاك المزروع (المادة ٣٠): بلا مهلة تبقى معلّقة", async () => {
    db.hangOn = "ai-daily-global:";
    const p = enforceAiQuota({ surface: "chat", identity: "ip:3" });
    expect(await settleWithin(p, 60_000)).toBe("pending");
  });

  it("القاعدة السريعة: تمرّ بلا رفض", async () => {
    const p = enforceAiQuota({ surface: "chat", identity: "ip:4", deadlineMs: 1_500 });
    expect(await settleWithin(p, 10)).toBeNull();
  });
});
