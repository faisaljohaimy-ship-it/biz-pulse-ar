// @vitest-environment node
/**
 * `/api/chat/health` — جاهزية المحرّك **المختار** (القاعدة ٤)، وحال البوّابة بجانبه
 * (DEF-11، ٢٠٢٦/١٠/١٨) فالشارة لا تقول «متصل الآن» وكل سؤالٍ يحتاج النموذج يأخذ السطر المغلق.
 * والحقول القديمة باقية بأسمائها لفحص الإنتاج (`scripts/smoke-production.mjs`: `ok` و`key_present`
 * و`provider`). لا قيمة مفتاحٍ في الجسم أبدًا. محكمٌ بلا خرج شبكي: الفحص وحده مزروع.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");

const probe = vi.hoisted(() => ({
  result: { allowed: true, unavailable: false } as { allowed: boolean; unavailable?: boolean },
  options: [] as unknown[],
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  createSupabaseAdminClient: () => ({}),
  supabaseAdmin: {},
}));
vi.mock("@/lib/governance/rate-limit.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceRateLimit: async (_k: string, _m: number, _w: number, options?: unknown) => {
    probe.options.push(options);
    return probe.result;
  },
}));

// الفحص يُحفظ 15 ث في المعزول؛ كل حالةٍ بعد دقيقةٍ من سابقتها فلا ترث نتيجتها.
beforeAll(() => vi.useFakeTimers({ toFake: ["Date"] }));
afterEach(() => {
  vi.setSystemTime(Date.now() + 60_000);
  probe.result = { allowed: true, unavailable: false };
  probe.options = [];
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
});
afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const PLAN_ENV = [
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "OPENAI_API_KEY",
  "LOVABLE_API_KEY",
  "SADEED_LLM_PROVIDER",
  "SADEED_OPENAI_ENABLED",
  "SADEED_OPENAI_MODEL",
  "SADEED_BACKUP_PROVIDER",
];

/** بلا `env` ⇐ البيئة كما هي (مفتاح Gemini تجريبي)؛ ومعه ⇐ مفاتيح الخطة كلها من `env` وحده. */
async function health(env?: Record<string, string>) {
  if (env) for (const k of PLAN_ENV) vi.stubEnv(k, env[k] ?? "");
  const mod = (await import("@/routes/api/chat.health")) as unknown as {
    Route: { options: { server: { handlers: { GET: () => Promise<Response> } } } };
  };
  const res = await mod.Route.options.server.handlers.GET();
  return { res, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/chat/health — خطة المحرّك", () => {
  it("Gemini مهيّأ ⇐ الحقول القديمة كما كانت، ومعها الوضع والاحتياطي", async () => {
    const key = "gemini-key-not-a-secret-000";
    const { res, body } = await health({ GEMINI_API_KEY: key });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      provider: "google-gemini",
      model: "gemini-3.6-flash",
      key_present: true,
      mode: "llm",
      selected: "gemini",
      backup_enabled: false,
      zero_cost_ready: true,
      transcription_configured: true,
    });
    expect(JSON.stringify(body)).not.toContain(key);
  });

  it("بلا مفتاح ⇐ الوضع الحتمي، والجاهزية الحتمية صادقة", async () => {
    const { body } = await health({});
    expect(body).toMatchObject({
      ok: true,
      provider: null,
      key_present: false,
      mode: "zero_cost",
      zero_cost_ready: true,
    });
  });

  it("مفتاح المحوّل وحده لا يجعل الذكاء جاهزًا؛ والإذنان معًا يجعلانه", async () => {
    const key = "openai-key-not-a-secret-0000";
    expect((await health({ OPENAI_API_KEY: key })).body).toMatchObject({
      key_present: false,
      mode: "zero_cost",
    });
    const { body } = await health({
      OPENAI_API_KEY: key,
      SADEED_LLM_PROVIDER: "openai",
      SADEED_OPENAI_ENABLED: "true",
    });
    expect(body).toMatchObject({
      key_present: true,
      provider: "openai",
      model: "gpt-5-mini",
      mode: "llm",
      // النسخ الصوتي على Gemini وحده — لا يتبع محرّك الدردشة.
      transcription_configured: false,
    });
    expect(JSON.stringify(body)).not.toContain(key);
  });

  it("الاحتياطي يُبلَّغ حين يطلبه المالك بالاسم فقط", async () => {
    const base = { GEMINI_API_KEY: "gemini-key-not-a-secret-000", LOVABLE_API_KEY: "lovable-k" };
    expect((await health(base)).body.backup_enabled).toBe(false);
    expect((await health({ ...base, SADEED_BACKUP_PROVIDER: "lovable" })).body.backup_enabled).toBe(
      true,
    );
  });
});

describe("/api/chat/health — حال البوّابة بجانب المفتاح", () => {
  it("المخزن يجيب ⇐ verified", async () => {
    expect((await health()).body).toMatchObject({ key_present: true, gate: "verified" });
  });

  it("المخزن لا يجيب والسياسة الافتراضية ⇐ closed، والمفتاح حاضر رغم ذلك", async () => {
    probe.result = { allowed: false, unavailable: true };
    expect((await health()).body).toMatchObject({ key_present: true, gate: "closed" });
  });

  it("المخزن لا يجيب وحدود الذاكرة بإقرار المالك ⇐ degraded (النموذج يُستدعى فعلًا)", async () => {
    vi.stubEnv("SADEED_GATE_DEGRADED_MODE", "bounded");
    probe.result = { allowed: false, unavailable: true };
    expect((await health()).body).toMatchObject({ gate: "degraded" });
  });

  it("الحدّ المبلوغ ليس عطلًا: المخزن أجاب ⇐ verified", async () => {
    probe.result = { allowed: false };
    expect((await health()).body).toMatchObject({ gate: "verified" });
  });

  it("نتيجة الفحص تُحفظ 15 ث: زياراتٌ متتالية لا تكتب على المخزن كلٌّ بنداء", async () => {
    await health();
    await health();
    expect(probe.options).toHaveLength(1);
    vi.setSystemTime(Date.now() + 16_000);
    await health();
    expect(probe.options).toHaveLength(2);
  });

  it("الفحص بمهلة — لا انتظار مفتوح على قاعدةٍ لا تردّ", async () => {
    await health();
    const opts = probe.options[0] as { deadlineMs?: number };
    expect(opts?.deadlineMs).toBeLessThanOrEqual(2_000);
  });
});
