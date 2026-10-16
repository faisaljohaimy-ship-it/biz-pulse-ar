/**
 * سَدِيد لا يعرض رمز خطأ حين تتعذّر الحصّة — سلوكيًّا (المالك، ٢٠٢٦/١٠/١٦).
 *
 * لقطة جوال المالك: سؤالٌ عادي فظهر «rate_limit_unavailable» في فقاعة حمراء.
 * السبب: القاعدة لا تردّ، فيفشل `check_rate_limit` مغلقًا، فيعيد المعالج ‏503
 * بجسمٍ إنجليزي. والمطلوب ما تقرّره الطبقة الأولى من «سَدِيد لا يتعطل»: ردٌّ
 * محليٌّ صادق — دون نداء النموذج المدفوع بلا حصّةٍ متحقَّقة.
 *
 * محكم البيئة على طريقة `chat-council-gate.test.ts`: لا خرج شبكي، ونتيجة
 * المحدِّد والحصّة تُضبط لكل حالة.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

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
  modelCalls: 0,
  rateOptions: [] as unknown[],
}));

vi.mock("@/lib/governance/rate-limit.server", () => ({
  enforceRateLimit: async (_k: string, _m: number, _w: number, options?: unknown) => {
    gates.rateOptions.push(options);
    return gates.rate;
  },
}));

vi.mock("@/lib/governance/ai-quota.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceAiQuota: async () => gates.quota,
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateText: async () => {
    gates.modelCalls++;
    return { text: "ردّ صوري." };
  },
}));

afterAll(() => vi.unstubAllEnvs());

type Handler = (args: { request: Request }) => Promise<Response>;

async function post() {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  return mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            id: "m1",
            role: "user",
            parts: [{ type: "text", text: "هل يمكنك رفع وتحميل البيانات التي سأرفقها لك؟" }],
          },
        ],
        threadId: "thread-stub",
      }),
    }),
  });
}

beforeEach(() => {
  gates.rate = { allowed: true, unavailable: false };
  gates.quota = null;
  gates.modelCalls = 0;
  gates.rateOptions = [];
});

const HAS_ARABIC = /[؀-ۿ]/;

describe("حصّةٌ لا يُتحقَّق منها ⇐ ردٌّ محليٌّ صادق، لا رمز", () => {
  it("المحدِّد غير متاح (لقطة المالك): ‏200 بردٍّ عربي، ولا نداء للنموذج", async () => {
    gates.rate = { allowed: false, unavailable: true };
    const res = await post();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("local-quota-unverified");
    const body = await res.text();
    expect(body).not.toContain("rate_limit_unavailable");
    expect(HAS_ARABIC.test(body)).toBe(true);
    expect(gates.modelCalls, "نموذج مدفوع استُدعي بلا حصّةٍ متحقَّقة").toBe(0);
  });

  it("الحصّة اليومية غير متاحة (‏503): ردٌّ محلّي كذلك، ولا نداء للنموذج", async () => {
    gates.quota = new Response(JSON.stringify({ error: "quota_unavailable" }), { status: 503 });
    const res = await post();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("local-quota-unverified");
    expect(gates.modelCalls).toBe(0);
  });

  it("السقف اليومي المبلوغ فعلًا (‏429) يبقى رفضًا — الحماية لم تُرخَ", async () => {
    gates.quota = new Response(JSON.stringify({ error: "daily_identity_cap" }), { status: 429 });
    const res = await post();
    expect(res.status).toBe(429);
    expect(gates.modelCalls).toBe(0);
  });

  it("الحدّ المؤقت المبلوغ (‏429) رسالته عربية لا إنجليزية", async () => {
    gates.rate = { allowed: false };
    const res = await post();
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(HAS_ARABIC.test(body.error)).toBe(true);
    expect(body.error).not.toMatch(/rate limited/i);
  });

  it("الفحص يُستدعى بمهلة — لا انتظار مفتوح على قاعدةٍ لا تردّ", async () => {
    await post();
    expect(gates.rateOptions[0]).toEqual({ deadlineMs: expect.any(Number) });
    expect((gates.rateOptions[0] as { deadlineMs: number }).deadlineMs).toBeLessThanOrEqual(2_000);
  });

  it("المسار السليم كما هو: يصل النموذج", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(gates.modelCalls).toBeGreaterThan(0);
  });
});
