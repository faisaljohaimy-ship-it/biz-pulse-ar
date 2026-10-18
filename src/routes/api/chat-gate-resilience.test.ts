/**
 * بوّابة `/api/chat` حين يتعذّر مخزن الحدّ — سلوكيًّا (المالك ٢٠٢٦/١٠/١٦، ثم VIBE 5.1).
 *
 * لقطة جوال المالك: سؤالٌ عادي فظهر «rate_limit_unavailable» في فقاعة حمراء.
 * السبب المقيس: قاعدة الإنتاج لا تردّ (‏504 على `select now()`)، فيفشل
 * `check_rate_limit` مغلقًا. السياسة الآن:
 *
 * - `bounded` (الافتراض): الطلب يمرّ **بحدودٍ في الذاكرة** (نصف السقوف) ويصل
 *   النموذج، والردّ موسومٌ `X-SADEED-Gate: degraded`. ما فوق الحدّ ⇐ 429 عربي
 *   بـ`Retry-After`. لا يصير السطح بلا حدّ، ولا يُحرم المستخدم من ردّ.
 * - `closed` (بيئة): ردٌّ محليٌّ صادق بلا نموذج — سلوك ما قبل VIBE 5.1.
 *
 * محكم البيئة على طريقة `chat-council-gate.test.ts`: لا خرج شبكي؛ `enforceRateLimit`
 * وحدها مزروعة، والحصّة المحدودة والحرّاس حقيقيّون ويُصفَّرون لكل حالة.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");

function stubSupabase() {
  const result = { data: null, error: null, count: 0 };
  const chain: unknown = new Proxy(() => chain, {
    get(_t, prop) {
      if (prop === "then") return (resolve: (v: unknown) => unknown) => resolve(result);
      return () => chain;
    },
    apply: () => chain,
  });
  return {
    from: () => chain,
    rpc: () => chain,
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  };
}

vi.mock("@supabase/supabase-js", () => ({ createClient: () => stubSupabase() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  createSupabaseAdminClient: () => stubSupabase(),
  supabaseAdmin: stubSupabase(),
}));

const gates = vi.hoisted(() => ({
  rate: { allowed: true, unavailable: false } as { allowed: boolean; unavailable?: boolean },
  quota: null as Response | null,
  /** حين يُضبط: يُستبدل بالحصّة المحدودة الحقيقية (لاختبار أن المعالج يعيد رفضها). */
  degradedQuota: null as null | (() => Response | null),
  modelCalls: 0,
  rateOptions: [] as unknown[],
  quotaOptions: [] as unknown[],
}));

vi.mock("@/lib/governance/rate-limit.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceRateLimit: async (_k: string, _m: number, _w: number, options?: unknown) => {
    gates.rateOptions.push(options);
    return gates.rate;
  },
}));

vi.mock("@/lib/governance/ai-quota.server", async (importOriginal) => {
  const original = await importOriginal<{
    degradedAiQuota: (...a: unknown[]) => Response | null;
  }>();
  return {
    ...original,
    enforceAiQuota: async (opts: unknown) => {
      gates.quotaOptions.push(opts);
      return gates.quota;
    },
    degradedAiQuota: (...args: unknown[]) =>
      gates.degradedQuota ? gates.degradedQuota() : original.degradedAiQuota(...args),
  };
});

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateText: async () => {
    gates.modelCalls++;
    return { text: "ردّ صوري." };
  },
}));

afterAll(() => vi.unstubAllEnvs());

/**
 * الطبقات الحتمية تسبق الحصّة الآن (٢٠٢٦/١٠/١٨)، فأوّل طلبٍ يحمّل وحدات المجموعات
 * والموجّه وسجلّ الشاشات — ثانيتان إلى أربع تحت الحمل. لو دُفع ذلك في أوّل حالةٍ
 * لتجاوز سقف الخمس ثوانٍ وبقي طلبه جاريًا يستنزف الحدّ المحدود في الذاكرة فتسقط
 * الحالتان بعده. فيُدفع مرّةً هنا، والسقف أوسع كأخواته.
 */
vi.setConfig({ testTimeout: 20_000, hookTimeout: 30_000 });
beforeAll(async () => {
  await import("@/routes/api/chat");
  await import("@/lib/sadeed/instant-data-answers.server");
  await import("@/lib/sadeed/llm/zero-cost-router.server");
});

type Handler = (args: { request: Request }) => Promise<Response>;

async function post(
  text = "هل يمكنك رفع وتحميل البيانات التي سأرفقها لك؟",
  thread = "thread-stub",
) {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  return mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ id: "m1", role: "user", parts: [{ type: "text", text }] }],
        threadId: thread,
      }),
    }),
  });
}

beforeEach(async () => {
  gates.rate = { allowed: true, unavailable: false };
  gates.quota = null;
  gates.degradedQuota = null;
  gates.modelCalls = 0;
  gates.rateOptions = [];
  gates.quotaOptions = [];
  const rl = await import("@/lib/governance/rate-limit.server");
  rl.resetRateLimitStateForTests();
  const guards = await import("@/lib/governance/request-guards.server");
  guards.resetRequestGuardsForTests();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
  vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");
  vi.restoreAllMocks();
});

const HAS_ARABIC = /[؀-ۿ]/;

describe("المخزن معطّل — السياسة المحدودة (SADEED_GATE_DEGRADED_MODE=bounded، بإقرار المالك)", () => {
  beforeEach(() => vi.stubEnv("SADEED_GATE_DEGRADED_MODE", "bounded"));

  it("الحصّة المحدودة ترفض ⇐ المعالج يعيد رفضها وصفر نداء نموذج (الانتهاك المزروع V15)", async () => {
    gates.rate = { allowed: false, unavailable: true };
    gates.degradedQuota = () =>
      new Response(JSON.stringify({ error: "daily_identity_cap", message_ar: "سقف." }), {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    const res = await post();
    expect(res.status).toBe(429);
    expect(((await res.json()) as { error: string }).error).toBe("daily_identity_cap");
    expect(gates.modelCalls, "نموذجٌ استُدعي رغم رفض الحصّة المحدودة").toBe(0);
  });

  it("لقطة المالك: ‏200 بردٍّ عربي من النموذج، موسومًا degraded، ولا رمز", async () => {
    gates.rate = { allowed: false, unavailable: true };
    const res = await post();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Gate")).toBe("degraded");
    // المصدر يسمّي من أجاب فعلًا (٢٠٢٦/١٠/١٨) — كان «safe-gateway» لكل ردّ نموذج.
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
    const body = await res.text();
    expect(body).not.toContain("rate_limit_unavailable");
    expect(HAS_ARABIC.test(body)).toBe(true);
    expect(gates.modelCalls).toBe(1);
    // لا نُنفق مهلتين على الحصّة اليومية حين يُعرف عطل المخزن.
    expect(gates.quotaOptions).toHaveLength(0);
  });

  it("الحدّ في الذاكرة نصف الأصل: الزائر 12/300 ⇐ ستٌّ تمرّ والسابعة 429 بـRetry-After", async () => {
    gates.rate = { allowed: false, unavailable: true };
    for (let i = 1; i <= 6; i++) {
      const res = await post();
      expect(res.status, `طلب ${i}`).toBe(200);
    }
    const seventh = await post();
    expect(seventh.status).toBe(429);
    expect(seventh.headers.get("Retry-After")).toMatch(/^\d+$/);
    const body = (await seventh.json()) as { error: string; code?: string };
    expect(body.code).toBe("rate_limited");
    expect(HAS_ARABIC.test(body.error)).toBe(true);
    expect(gates.modelCalls, "السابع وصل النموذج").toBe(6);
  });

  it("الحصّة غير متاحة (‏503 quota_unavailable) بعد معدّلٍ سليم ⇐ المسار المحدود كذلك", async () => {
    gates.quota = new Response(JSON.stringify({ error: "quota_unavailable" }), { status: 503 });
    const res = await post();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Gate")).toBe("degraded");
    expect(gates.modelCalls).toBe(1);
  });
});

describe("المخزن معطّل — السياسة المغلقة (الافتراض بلا متغيّر بيئة)", () => {
  it("بلا متغيّر ⇐ ردٌّ محليّ صادق موسومًا closed ولا نداء للنموذج", async () => {
    gates.rate = { allowed: false, unavailable: true };
    const res = await post();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("local-quota-unverified");
    expect(res.headers.get("X-SADEED-Gate")).toBe("closed");
    // الزائر بلا Bearer: الردّ المغلق يحمل حال الجلسة كغيره — فحص الدخان يقرؤها
    // ليُثبت أن لا صلاحية مُنحت (نقض الحارس على 782b171، البند ٢).
    expect(res.headers.get("X-SADEED-Auth")).toBe("anonymous");
    expect(res.headers.get("X-SADEED-Request-ID")).toMatch(/\S/);
    const body = await res.text();
    expect(body).not.toContain("rate_limit_unavailable");
    expect(HAS_ARABIC.test(body)).toBe(true);
    expect(gates.modelCalls, "نموذج مدفوع استُدعي بلا حصّةٍ متحقَّقة").toBe(0);
  });

  it("المغلقة تشمل الحصّة غير المتاحة أيضًا، وقيمةٌ مجهولة تبقى مغلقة", async () => {
    vi.stubEnv("SADEED_GATE_DEGRADED_MODE", "open-please");
    gates.quota = new Response(JSON.stringify({ error: "quota_unavailable" }), { status: 503 });
    const res = await post();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("local-quota-unverified");
    expect(gates.modelCalls).toBe(0);
  });
});

describe("ما لم يتغيّر", () => {
  it("السقف اليومي المبلوغ فعلًا (‏429) يبقى رفضًا — الحماية لم تُرخَ، والردّ موسوم", async () => {
    gates.quota = new Response(JSON.stringify({ error: "daily_identity_cap" }), {
      status: 429,
      headers: { "Retry-After": "3600", "Content-Type": "application/json; charset=utf-8" },
    });
    const res = await post();
    expect(res.status).toBe(429);
    expect(gates.modelCalls).toBe(0);
    // ردّ الحصّة يأتي من `ai-quota.server` بلا ترويسات البوّابة؛ المعالج يُلحقها
    // ويحفظ ما جاء به (Retry-After وجسمه) — ولا يُسقط ترويسات الأمان.
    expect(res.headers.get("X-SADEED-Gate")).toBe("verified");
    expect(res.headers.get("X-SADEED-Auth")).toBe("anonymous");
    expect(res.headers.get("Retry-After")).toBe("3600");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(((await res.json()) as { error: string }).error).toBe("daily_identity_cap");
  });

  it("الحدّ المؤقت المبلوغ (‏429) رسالته عربية ورمزه ثابت وترويسات Retry-After والبوّابة والجلسة حاضرة (M16)", async () => {
    gates.rate = { allowed: false };
    const res = await post();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(res.headers.get("X-SADEED-Gate")).toBe("verified");
    expect(res.headers.get("X-SADEED-Auth")).toBe("anonymous");
    const body = (await res.json()) as { error: string; code?: string };
    expect(HAS_ARABIC.test(body.error)).toBe(true);
    expect(body.error).not.toMatch(/rate limited/i);
    expect(body.code).toBe("rate_limited");
  });

  it("الفحص يُستدعى بمهلة — لا انتظار مفتوح على قاعدةٍ لا تردّ", async () => {
    await post();
    expect(gates.rateOptions[0]).toEqual({ deadlineMs: expect.any(Number) });
    expect((gates.rateOptions[0] as { deadlineMs: number }).deadlineMs).toBeLessThanOrEqual(2_000);
  });

  it("الحصّة تُستدعى بمهلة كذلك (R08)", async () => {
    await post();
    const opts = gates.quotaOptions[0] as { deadlineMs?: number };
    expect(opts?.deadlineMs, "enforceAiQuota بلا مهلة").toEqual(expect.any(Number));
    expect(opts.deadlineMs as number).toBeLessThanOrEqual(2_000);
  });

  it("503 مفتاح الإيقاف ليس «حصّة غير متاحة» — لا يُستبدل بردٍّ محلّي ولا بمسارٍ محدود", async () => {
    gates.quota = new Response(JSON.stringify({ error: "ai_disabled" }), { status: 503 });
    const res = await post();
    expect(res.status).toBe(503);
    expect(gates.modelCalls).toBe(0);
  });

  it("المسار السليم كما هو: يصل النموذج موسومًا verified", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Gate")).toBe("verified");
    expect(gates.modelCalls).toBeGreaterThan(0);
  });
});
