// @vitest-environment node
/**
 * `/api/chat/health` — جاهزية المحرّك **المختار** (القاعدة ٤)، وحال البوّابة بجانبه
 * (DEF-11، ٢٠٢٦/١٠/١٨) فالشارة لا تقول «متصل الآن» وكل سؤالٍ يحتاج النموذج يأخذ السطر المغلق.
 * والحقول القديمة باقية بأسمائها لفحص الإنتاج (`scripts/smoke-production.mjs`: `ok` و`key_present`
 * و`provider`). لا قيمة مفتاحٍ في الجسم أبدًا. محكمٌ بلا خرج شبكي: الفحص وحده مزروع.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { isVendorSafe } from "@/lib/sadeed/vendor-mask";

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

describe("/api/chat/health: كتلة الاسترجاع (O7 ب)", () => {
  /** الأربعة التي يقرؤها فحص الإنتاج وقرّاء الجاهزية: لا تُسقَط ولا يُعاد تسميتها. */
  const PRESERVED = ["rag_ready", "rag_embedding_model", "key_present", "provider"] as const;
  const preservedOk = (body: Record<string, unknown>) => PRESERVED.every((k) => k in body);
  const KEY = "embedding-key-not-a-secret-000";

  /** الراية والمفتاح من البيئة كما هما: مفتاح الدردشة منفصل عن مفتاح التضمين. */
  async function retrieval(flag: string, embeddingKey: string) {
    vi.stubEnv("SADEED_GEMINI_RAG_READY", flag);
    vi.stubEnv("GEMINI_API_KEY", embeddingKey);
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    return health();
  }

  it("الشكل: ثلاثة مفاتيح بأنواعها، ولا شيء آخر داخل الكتلة", async () => {
    const { body } = await retrieval("", "");
    const block = body.retrieval as Record<string, unknown>;
    expect(Object.keys(block).sort()).toEqual([
      "embedding_provider",
      "lexical_ready",
      "vector_ready",
    ]);
    expect(typeof block.lexical_ready).toBe("boolean");
    expect(typeof block.vector_ready).toBe("boolean");
    expect(typeof block.embedding_provider).toBe("string");
  });

  it("الحالة الإنتاجية اليوم (لا راية ولا مفتاح تضمين): معجمي جاهز، متّجهي لا، المزوّد none", async () => {
    const { body } = await retrieval("", "");
    expect(body.retrieval).toEqual({
      lexical_ready: true,
      vector_ready: false,
      embedding_provider: "none",
    });
  });

  it.each([
    ["", "", false, "none"],
    ["true", "", false, "none"],
    ["", KEY, false, "primary"],
    ["false", KEY, false, "primary"],
    ["true", KEY, true, "primary"],
  ] as const)(
    "الراية=%j والمفتاح=%j ⇒ vector_ready=%s والمزوّد=%s، والمعجمي جاهز دائمًا",
    async (flag, key, vectorReady, provider) => {
      const { body } = await retrieval(flag, key);
      expect(body.retrieval).toEqual({
        lexical_ready: true,
        vector_ready: vectorReady,
        embedding_provider: provider,
      });
    },
  );

  it("مفتاح GOOGLE_GENERATIVE_AI_API_KEY يكفي كمفتاح تضمين، كما في حلّال المفتاح نفسه", async () => {
    vi.stubEnv("SADEED_GEMINI_RAG_READY", "true");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", KEY);
    const { body } = await health();
    expect(body.retrieval).toMatchObject({ vector_ready: true, embedding_provider: "primary" });
  });

  it("الراية بلا مفتاح: rag_ready القديم يبقى true بمعناه (الراية) وvector_ready false بمعناه الأدقّ", async () => {
    const { body } = await retrieval("true", "");
    expect(body.rag_ready).toBe(true);
    expect((body.retrieval as { vector_ready: boolean }).vector_ready).toBe(false);
  });

  it("الحقول الأربعة القديمة باقية بأسمائها وأنواعها وقيمها", async () => {
    const { body } = await retrieval("true", KEY);
    expect(preservedOk(body)).toBe(true);
    expect(body.rag_ready).toBe(true);
    expect(body.rag_embedding_model).toBe("gemini-embedding-2");
    expect(body.key_present).toBe(true);
    expect(body.provider).toBe("google-gemini");
    expect(body.ok).toBe(true);
  });

  it("مزروع: إسقاط أي حقل من الأربعة يُدان بالفاحص نفسه", async () => {
    const { body } = await retrieval("true", KEY);
    expect(preservedOk(body)).toBe(true);
    for (const dropped of PRESERVED) {
      const copy = { ...body };
      delete copy[dropped];
      expect(preservedOk(copy), dropped).toBe(false);
    }
  });

  it("الكتلة محايدة: لا اسم مزوّد ولا قيمة مفتاح داخلها (قناع المزوّدين)", async () => {
    const { body } = await retrieval("true", KEY);
    const json = JSON.stringify(body.retrieval);
    expect(isVendorSafe(json)).toBe(true);
    expect(json).not.toContain(KEY);
  });

  it("المصدر: الحقول الأربعة تُكتب في الجسم كما كانت، والكتلة من describeRetrievalReadiness", () => {
    const src = readFileSync("src/routes/api/chat.health.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^[ \t]*\/\/.*$/gm, "");
    expect(src).toMatch(/provider:\s*plan\.provider/);
    expect(src).toMatch(/key_present:\s*plan\.configured/);
    expect(src).toMatch(/rag_embedding_model:\s*GEMINI_EMBEDDING_MODEL/);
    expect(src).toMatch(/rag_ready:\s*isGeminiRagReady\(\)/);
    expect(src).toMatch(/retrieval:\s*describeRetrievalReadiness\(\)/);
  });
});
