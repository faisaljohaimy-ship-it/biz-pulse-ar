/**
 * الحصّة المحدودة في الذاكرة `degradedAiQuota` (نقض الحارس على 782b171، البند ١ — V34).
 *
 * الاختبار السابق مارس `degradedAllowance` وحدها، فحذفُ السقف العام من داخل
 * `degradedAiQuota` كان يبقى أخضر. هنا تُمارَس الدالة نفسها عند سقفها الفعليّ:
 * نصف `SADEED_CHAT_DAILY_GLOBAL` (الافتراض 5000 ⇐ 2500) عبر هوياتٍ مختلفة، فالطلب
 * الأوّل فوق السقف يُرفض 429 `daily_global_cap` أيًّا كانت هويته.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: () => Promise.resolve({ data: true, error: null }),
    from: () => ({ insert: () => Promise.resolve({ error: null }) }),
  },
}));

type QuotaModule = typeof import("./ai-quota.server");
type RateModule = typeof import("./rate-limit.server");

async function loadFresh(env: Record<string, string> = {}): Promise<QuotaModule> {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const rate = (await import("./rate-limit.server")) as RateModule;
  rate.resetRateLimitStateForTests();
  return (await import("./ai-quota.server")) as QuotaModule;
}

async function body(res: Response | null) {
  return (await (res as Response).json()) as { error: string; message_ar: string };
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("degradedAiQuota — السقف العام عند حدّه الفعليّ", () => {
  it("الافتراض: 2500 هوية مختلفة تمرّ، والهوية 2501 تُرفض 429 daily_global_cap (V34)", async () => {
    const { degradedAiQuota } = await loadFresh();
    for (let i = 1; i <= 2500; i++) {
      expect(
        degradedAiQuota("chat", `ip:10.0.${Math.floor(i / 256)}.${i % 256}`),
        `هوية ${i}`,
      ).toBe(null);
    }
    const over = degradedAiQuota("chat", "ip:fresh-identity-never-seen");
    expect(over).not.toBe(null);
    expect((over as Response).status).toBe(429);
    const parsed = await body(over);
    expect(parsed.error).toBe("daily_global_cap");
    expect(parsed.message_ar).toMatch(/[؀-ۿ]/);
    expect((over as Response).headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(Number((over as Response).headers.get("Retry-After"))).toBeGreaterThanOrEqual(60);
    expect((over as Response).headers.get("Content-Type")).toContain("application/json");
    // وليس رفضًا بالهوية: هويةٌ مرّت قبل قليل تُرفض الآن بالرمز العامّ نفسه.
    const known = degradedAiQuota("chat", "ip:10.0.0.1");
    expect((await body(known)).error).toBe("daily_global_cap");
  });

  it("السقف العام يُقرأ من البيئة لا من رقمٍ مكتوب: SADEED_CHAT_DAILY_GLOBAL=10 ⇐ خمسٌ تمرّ والسادسة تُرفض", async () => {
    const { degradedAiQuota } = await loadFresh({ SADEED_CHAT_DAILY_GLOBAL: "10" });
    for (let i = 1; i <= 5; i++) {
      expect(degradedAiQuota("chat", `ip:${i}`), `هوية ${i}`).toBe(null);
    }
    const over = degradedAiQuota("chat", "ip:6");
    expect((over as Response).status).toBe(429);
    expect((await body(over)).error).toBe("daily_global_cap");
  });

  it("سقف الهوية نصف الأصل أيضًا (120 ⇐ 60)، ولا يمسّ هويةً أخرى", async () => {
    const { degradedAiQuota } = await loadFresh();
    for (let i = 1; i <= 60; i++) {
      expect(degradedAiQuota("chat", "ip:same"), `طلب ${i}`).toBe(null);
    }
    const over = degradedAiQuota("chat", "ip:same");
    expect((over as Response).status).toBe(429);
    expect((await body(over)).error).toBe("daily_identity_cap");
    expect(degradedAiQuota("chat", "ip:other")).toBe(null);
  });

  it("الأسطح مستقلّة: استنفاد الصوت لا يُغلق الدردشة", async () => {
    const { degradedAiQuota } = await loadFresh({
      SADEED_TTS_DAILY_GLOBAL: "2",
      SADEED_CHAT_DAILY_GLOBAL: "2",
    });
    expect(degradedAiQuota("tts", "a")).toBe(null);
    expect((await body(degradedAiQuota("tts", "b"))).error).toBe("daily_global_cap");
    expect(degradedAiQuota("chat", "a")).toBe(null);
  });
});
