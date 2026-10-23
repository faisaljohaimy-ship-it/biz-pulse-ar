/**
 * ترتيب البوّابتين سلوكيًّا (٢٠٢٦/١٠/١٨): سقف الهوية قبل السقف العام.
 *
 * كان العامّ أوّلًا، و`check_rate_limit` **يعدّ الطلب** على دلوه قبل أن يُجيب.
 * فعنوانٌ واحد بلغ حصّته اليومية وظلّ يطرق النقاط العامة كان يستهلك من الدلو
 * المشترك مع كل رفضٍ بالهوية، حتى يبلغ السقف العام فيُغلق الخدمة على الجميع.
 * هنا يُحاكى المخزن بعدّادٍ حقيقيّ لكل دلو (لا جوابٍ ثابت)، فيُقاس الاستهلاك
 * نفسه لا ترتيب الأسطر.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** مخزنٌ في الذاكرة يحاكي `check_rate_limit`: يعدّ ثم يقارن بالسقف. */
const store = vi.hoisted(() => ({ counts: new Map<string, number>() }));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: (_fn: string, args: { _bucket_key: string; _max_requests: number }) => {
      const next = (store.counts.get(args._bucket_key) ?? 0) + 1;
      store.counts.set(args._bucket_key, next);
      return Promise.resolve({ data: next <= args._max_requests, error: null });
    },
    from: () => ({ insert: () => Promise.resolve({ error: null }) }),
  },
}));

type QuotaModule = typeof import("./ai-quota.server");

async function loadFresh(env: Record<string, string>): Promise<QuotaModule> {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const rate = await import("./rate-limit.server");
  rate.resetRateLimitStateForTests();
  return import("./ai-quota.server");
}

async function code(res: Response | null): Promise<string | null> {
  if (!res) return null;
  return ((await res.json()) as { error: string }).error;
}

function globalCount(): number {
  for (const [key, n] of store.counts) if (key.startsWith("ai-daily-global:chat:")) return n;
  return 0;
}

beforeEach(() => {
  store.counts.clear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("enforceAiQuota — الهوية الممنوعة لا تستهلك السقف العام", () => {
  it("عنوانٌ واحد يطرق 500 مرّة بسقف هويةٍ 3: يستهلك من العام 3 لا 500، والآخرون يمرّون", async () => {
    const { enforceAiQuota } = await loadFresh({
      SADEED_CHAT_DAILY_PER_IDENTITY: "3",
      SADEED_CHAT_DAILY_GLOBAL: "10",
    });
    const codes: Array<string | null> = [];
    for (let i = 0; i < 500; i++) {
      codes.push(await code(await enforceAiQuota({ surface: "chat", identity: "ip:abuser" })));
    }
    expect(codes.slice(0, 3)).toEqual([null, null, null]);
    expect(new Set(codes.slice(3))).toEqual(new Set(["daily_identity_cap"]));
    // الجوهر: الرفض بالهوية لم يمسّ الدلو المشترك.
    expect(globalCount()).toBe(3);

    // بقي من العام سبعة — تمرّ سبع هويات أخرى، والثامنة تصطدم بالسقف العام.
    for (let i = 1; i <= 7; i++) {
      expect(await enforceAiQuota({ surface: "chat", identity: `ip:user-${i}` }), `هوية ${i}`).toBe(
        null,
      );
    }
    expect(await code(await enforceAiQuota({ surface: "chat", identity: "ip:user-8" }))).toBe(
      "daily_global_cap",
    );
  });

  it("assertAiQuota بالترتيب نفسه: الهوية الممنوعة تُرمى daily_identity_cap بلا نداءٍ للعام", async () => {
    const { assertAiQuota, AiGateError } = await loadFresh({
      SADEED_CHAT_DAILY_PER_IDENTITY: "1",
      SADEED_CHAT_DAILY_GLOBAL: "50",
    });
    await expect(assertAiQuota({ surface: "chat", identity: "u1" })).resolves.toBeUndefined();
    for (let i = 0; i < 20; i++) {
      const caught = await assertAiQuota({ surface: "chat", identity: "u1" }).catch((e) => e);
      expect(caught).toBeInstanceOf(AiGateError);
      expect((caught as InstanceType<typeof AiGateError>).code).toBe("daily_identity_cap");
    }
    expect(globalCount()).toBe(1);
  });
});

describe("سطح kb منفصل عن المساعد — بحث المعرفة لا يأكل حصّة المساعد", () => {
  it("مستخدمٌ يستنفد حصّته من البحث الدلالي: دلوا المساعد لم يُمسّا، ومساعده يعمل", async () => {
    // صفحة المعرفة تبحث مع كل حرف. كانت تُحسب على `chat` بالمفتاح نفسه الذي
    // يستعمله `/api/chat` للمستخدم، فكان بحثٌ واحد طويل يأكل حصّته من المساعد،
    // وبحثُ قلّةٍ يُغلق السقف العام للمساعد على الجميع (مراجعة ٢٠٢٦/١٠/١٨).
    const { enforceAiQuota } = await loadFresh({
      SADEED_KB_DAILY_PER_IDENTITY: "3",
      SADEED_KB_DAILY_GLOBAL: "100",
      SADEED_CHAT_DAILY_PER_IDENTITY: "1",
      SADEED_CHAT_DAILY_GLOBAL: "1",
    });
    const codes: Array<string | null> = [];
    for (let i = 0; i < 50; i++) {
      codes.push(await code(await enforceAiQuota({ surface: "kb", identity: "user-1" })));
    }
    expect(codes.slice(0, 3)).toEqual([null, null, null]);
    expect(new Set(codes.slice(3))).toEqual(new Set(["daily_identity_cap"]));
    expect(globalCount(), "البحث لم يمسّ السقف العام للمساعد").toBe(0);
    expect([...store.counts.keys()].some((k) => k.includes(":chat:"))).toBe(false);
    // سقفا المساعد 1/1 — لو استهلك البحث منهما شيئًا لمُنع هذا النداء.
    expect(await enforceAiQuota({ surface: "chat", identity: "user-1" })).toBe(null);
  });
});

describe("degradedAiQuota — الترتيب نفسه في حدود الذاكرة", () => {
  it("هويةٌ تطرق 200 مرّة بنصف سقفٍ 2: تعدّ على العام مرّتين فقط، ويبقى للآخرين", async () => {
    // نصف السقوف: هوية 4 ⇐ 2، عام 10 ⇐ 5.
    const { degradedAiQuota } = await loadFresh({
      SADEED_CHAT_DAILY_PER_IDENTITY: "4",
      SADEED_CHAT_DAILY_GLOBAL: "10",
    });
    const codes: Array<string | null> = [];
    for (let i = 0; i < 200; i++) codes.push(await code(degradedAiQuota("chat", "ip:abuser")));
    expect(codes.slice(0, 2)).toEqual([null, null]);
    expect(new Set(codes.slice(2))).toEqual(new Set(["daily_identity_cap"]));
    // بقي من العام المحدود ثلاثة (5 − 2).
    for (let i = 1; i <= 3; i++) {
      expect(degradedAiQuota("chat", `ip:user-${i}`), `هوية ${i}`).toBe(null);
    }
    expect(await code(degradedAiQuota("chat", "ip:user-4"))).toBe("daily_global_cap");
    expect(store.counts.size, "لا مخزن في المسار المحدود").toBe(0);
  });
});
