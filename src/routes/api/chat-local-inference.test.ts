/**
 * الاستدلال المحليّ الاختياري في `/api/chat` — إثباتٌ سلوكيّ (٢٠٢٦/١٠/١٦).
 *
 * المحكم على طريقة `chat-gate-resilience.test.ts`: لا شبكة، والبوّابات تمرّ،
 * و`generateText` مزروعٌ يسجّل **أيّ نموذجٍ** استُدعي (معرّفه) ويفشل حسب الحالة.
 * النموذج المحليّ يُبنى بالوحدة الحقيقية من متغيّرات البيئة، فالاختبار يمسّ
 * مسار الإعداد كاملًا لا نسخةً عنه.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
vi.mock("@/lib/governance/rate-limit.server", () => ({
  enforceRateLimit: async () => ({ allowed: true }),
}));
vi.mock("@/lib/governance/ai-quota.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceAiQuota: async () => null,
}));

const sim = vi.hoisted(() => ({
  /** معرّفات النماذج التي استُدعيت بالترتيب. */
  calls: [] as { modelId: string; maxRetries: unknown; signalIsRequest: boolean }[],
  failHosted: null as null | string,
  failLocal: null as null | string,
  requestSignal: null as AbortSignal | null,
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateText: async (opts: {
    model: { modelId: string };
    maxRetries?: number;
    abortSignal?: AbortSignal;
  }) => {
    const modelId = opts.model.modelId;
    sim.calls.push({
      modelId,
      maxRetries: opts.maxRetries,
      signalIsRequest: opts.abortSignal === sim.requestSignal,
    });
    const isLocal = modelId.startsWith("qwen");
    if (isLocal && sim.failLocal) throw new Error(sim.failLocal);
    if (!isLocal && sim.failHosted) throw new Error(sim.failHosted);
    return { text: isLocal ? "ردٌّ من المحرّك المحليّ." : "ردٌّ من المحرّك المستضاف." };
  },
}));

type Handler = (args: { request: Request }) => Promise<Response>;

const BASE_ENV: Record<string, string> = {
  GEMINI_API_KEY: "test-key-not-a-secret",
  SUPABASE_URL: "https://stub.invalid",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_stub",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_stub",
};
const LOCAL_ENV: Record<string, string> = {
  SADEED_LOCAL_INFERENCE_ENABLED: "true",
  SADEED_LOCAL_INFERENCE_BASE_URL: "http://127.0.0.1:11434/v1",
  SADEED_LOCAL_INFERENCE_MODEL: "qwen2.5:7b-instruct",
};
const FAKE_KEY = "sk-local-fake-key-for-test-only";

function env(extra: Record<string, string> = {}) {
  for (const [k, v] of Object.entries({ ...BASE_ENV, ...extra })) vi.stubEnv(k, v);
}

async function post() {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  const controller = new AbortController();
  const request = new Request("http://local/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          id: "m1",
          role: "user",
          parts: [{ type: "text", text: "ما إجراءات السلامة لتصاريح العمل الساخن؟" }],
        },
      ],
      threadId: "thread-stub",
    }),
    signal: controller.signal,
  });
  sim.requestSignal = request.signal;
  return mod.Route.options.server.handlers.POST({ request });
}

beforeEach(async () => {
  sim.calls = [];
  sim.failHosted = null;
  sim.failLocal = null;
  env();
  const { resetLocalInferenceCooldown } = await import("@/lib/sadeed/local-inference.server");
  resetLocalInferenceCooldown();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const HOSTED = "gemini-3.6-flash";
const LOCAL = "qwen2.5:7b-instruct";

describe("/api/chat — المحرّك المحليّ الاختياري", () => {
  it("الافتراض (الراية مطفأة): المستضاف وحده، كما كان حرفًا", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(sim.calls.map((c) => c.modelId)).toEqual([HOSTED]);
    expect(res.headers.get("X-SADEED-Inference-Path")).toBe("hosted");
    expect(sim.calls[0].signalIsRequest).toBe(true);
  });

  it("وضع البديل (fallback): المستضاف يعمل ⇐ لا يُلمس المحليّ", async () => {
    env(LOCAL_ENV);
    const res = await post();
    expect(sim.calls.map((c) => c.modelId)).toEqual([HOSTED]);
    expect(res.headers.get("X-SADEED-Inference-Path")).toBe("hosted");
  });

  it("وضع البديل: المستضاف يفشل ⇐ المحليّ يجيب، بمهلته لا بإشارة الطلب وحدها", async () => {
    env(LOCAL_ENV);
    sim.failHosted = "Service Unavailable 503";
    const res = await post();
    expect(res.status).toBe(200);
    expect(sim.calls.map((c) => c.modelId)).toEqual([HOSTED, LOCAL]);
    expect(res.headers.get("X-SADEED-Inference-Path")).toBe("local");
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("safe-gateway");
    expect(await res.text()).toContain("المحرّك المحليّ");
    const local = sim.calls[1];
    expect(local.maxRetries).toBe(0);
    expect(local.signalIsRequest, "المحليّ بلا مهلةٍ صلبة").toBe(false);
  });

  it("المحاولات المحليّة محصورة بما في الإعداد", async () => {
    env({ ...LOCAL_ENV, SADEED_LOCAL_INFERENCE_MAX_RETRIES: "2" });
    sim.failHosted = "502 Bad Gateway";
    await post();
    expect(sim.calls[1].maxRetries).toBe(2);
  });

  it("كلاهما يفشل ⇐ رسالة المسار المستضاف كما كانت، ثم يُبرَّد المحليّ دقيقة", async () => {
    env(LOCAL_ENV);
    sim.failHosted = "429 RESOURCE_EXHAUSTED quota";
    sim.failLocal = "connect ECONNREFUSED 127.0.0.1:11434";
    const first = await post();
    expect(first.status).toBe(200);
    const text = await first.text();
    // نصّ الخطأ المعروض هو ما يعطيه mapProviderError لخطأ المستضاف (quota ⇐ «حدّ التحليل»).
    expect(text).toContain("بلغت الجلسة حدّ التحليل");
    expect(text).not.toContain("ECONNREFUSED");
    expect(first.headers.get("X-SADEED-Inference-Path")).toBe("hosted");
    expect(sim.calls.map((c) => c.modelId)).toEqual([HOSTED, LOCAL]);

    // الطلب التالي أثناء التبريد: لا نداء محليّ.
    sim.calls = [];
    sim.failLocal = null;
    await post();
    expect(sim.calls.map((c) => c.modelId)).toEqual([HOSTED]);
  });

  it("الوضع الأوّل (primary): المحليّ أوّلًا، والمستضاف لا يُستدعى إن نجح", async () => {
    env({ ...LOCAL_ENV, SADEED_LOCAL_INFERENCE_MODE: "primary" });
    const res = await post();
    expect(sim.calls.map((c) => c.modelId)).toEqual([LOCAL]);
    expect(res.headers.get("X-SADEED-Inference-Path")).toBe("local");
  });

  it("الوضع الأوّل: المحليّ يفشل ⇐ المستضاف يجيب والمسار «hosted»", async () => {
    env({ ...LOCAL_ENV, SADEED_LOCAL_INFERENCE_MODE: "primary" });
    sim.failLocal = "timeout";
    const res = await post();
    expect(sim.calls.map((c) => c.modelId)).toEqual([LOCAL, HOSTED]);
    expect(res.headers.get("X-SADEED-Inference-Path")).toBe("hosted");
    expect(await res.text()).toContain("المحرّك المستضاف");
  });

  it("إعدادٌ مرفوض (بعيد بلا TLS) ⇐ تحذيرٌ بأسماء المشاكل فقط، والمستضاف وحده", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    env({
      ...LOCAL_ENV,
      SADEED_LOCAL_INFERENCE_BASE_URL: "http://203.0.113.7:11434/v1",
      SADEED_LOCAL_INFERENCE_API_KEY: FAKE_KEY,
    });
    sim.failHosted = "503";
    await post();
    expect(sim.calls.map((c) => c.modelId)).toEqual([HOSTED]);
    const rejected = warn.mock.calls.find((c) => String(c[0]).includes("local inference config"));
    expect(rejected).toBeDefined();
    expect(JSON.stringify(rejected)).toContain("remote_requires_https");
    expect(JSON.stringify(warn.mock.calls)).not.toContain(FAKE_KEY);
    expect(JSON.stringify(warn.mock.calls)).not.toContain("203.0.113.7");
  });

  it("لا عنوان ولا مفتاح في أيّ سجلّ على مسار الفشل", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    env({
      ...LOCAL_ENV,
      SADEED_LOCAL_INFERENCE_BASE_URL: "https://llm.example.com/v1",
      SADEED_LOCAL_INFERENCE_API_KEY: FAKE_KEY,
    });
    sim.failHosted = "503";
    sim.failLocal = `401 Unauthorized for key ${FAKE_KEY} at https://llm.example.com/v1`;
    await post();
    const all = JSON.stringify([...warn.mock.calls, ...log.mock.calls, ...error.mock.calls]);
    expect(all).not.toContain(FAKE_KEY);
    expect(all).not.toContain("llm.example.com");
    expect(all).toContain("local inference failed");
  });
});
