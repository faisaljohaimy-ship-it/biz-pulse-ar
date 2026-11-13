/**
 * تسخين الوحدات الثقيلة في `/api/chat` — سلوكيًّا (٢٠٢٦/١١/٠٣).
 *
 * يُثبت أن الاستيرادات الديناميكية تبدأ **عند أعلى المعالج** — بعد مفتاح الإيقاف وقبل التحقّق
 * من الطلب — بحيث يتداخل تقييمها مع انتظارات الشبكة في معزولةٍ باردة، وأنها لا تغيّر ردًّا:
 * طلبٌ يُرفض عند التحقّق (400) كان لا يحمّل شيئًا منها، فوجودها محمَّلةً بعد ردٍّ كهذا دليلٌ
 * قاطع على أن البدء سابقٌ للتحقّق. وكل وحدةٍ تُسجَّل عند تقييمها بغلافٍ حول الأصل (لا تُستبدل).
 */
import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");

const sim = vi.hoisted(() => ({ loaded: new Set<string>() }));

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
vi.mock("@/lib/sadeed/instant-data-answers.server", async (importOriginal) => {
  sim.loaded.add("instant");
  return importOriginal();
});
vi.mock("@/lib/sadeed/llm/zero-cost-router.server", async (importOriginal) => {
  sim.loaded.add("router");
  return importOriginal();
});
vi.mock("@/lib/sadeed-context.server", async (importOriginal) => {
  sim.loaded.add("context");
  return importOriginal();
});
vi.mock("@/lib/sadeed-tools.server", async (importOriginal) => {
  sim.loaded.add("tools");
  return importOriginal();
});

afterAll(() => vi.unstubAllEnvs());
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

type Handler = (args: { request: Request }) => Promise<Response>;

/** طلبٌ يُرفض عند التحقّق (400) — لا يبلغ أي وحدةٍ ثقيلة بنفسه. */
async function postInvalid(headers: Record<string, string> = {}) {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  return mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ messages: [] }),
    }),
  });
}

beforeEach(() => {
  vi.resetModules();
  sim.loaded.clear();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(async () => {
  // Finish the previous request's fire-and-forget imports before the next test
  // resets Vitest's module registry. Otherwise the in-flight context module
  // can be reused without re-invoking its tracking mock on the next request.
  await vi.dynamicImportSettled();
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
  vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");
  vi.restoreAllMocks();
});

describe("التسخين عند أعلى المعالج", () => {
  it("تحميل المسار نفسه لا يحمّل الوحدات الثقيلة (وإلا لم يقِس هذا الاختبار شيئًا)", async () => {
    await import("@/routes/api/chat");
    expect([...sim.loaded]).toEqual([]);
  });

  it("طلبٌ مسجَّل يُرفض عند التحقّق ⇒ الوحدات الأربع محمَّلة رغم ذلك", async () => {
    await import("@/routes/api/chat");
    const res = await postInvalid({
      authorization: "Bearer valid.jwt.that.is.long.enough.for.the.guard",
    });
    expect(res.status).toBe(400);
    await vi.dynamicImportSettled();
    expect([...sim.loaded].sort()).toEqual(["context", "instant", "router", "tools"]);
  });

  it("زائر (بلا Authorization): الثلاث دون الأدوات — لا يدفعها من لن يستعملها", async () => {
    await import("@/routes/api/chat");
    const res = await postInvalid();
    expect(res.status).toBe(400);
    await vi.dynamicImportSettled();
    expect([...sim.loaded].sort()).toEqual(["context", "instant", "router"]);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(sim.loaded.has("tools")).toBe(false);
  });

  it("مفتاح الإيقاف يسبق التسخين: لا تحميل بعد رفضه", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "true");
    await import("@/routes/api/chat");
    const res = await postInvalid({
      authorization: "Bearer valid.jwt.that.is.long.enough.for.the.guard",
    });
    expect(res.status).toBe(503);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect([...sim.loaded]).toEqual([]);
  });
});

describe("حارس البنية — مواقع الاستيراد الأصلية باقية والتسخين لا يُنتظر", () => {
  const code = readFileSync("src/routes/api/chat.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

  it("التسخين بعد مفتاح الإيقاف وقبل validateChatRequest، بلا await، ويبتلع إخفاقه", () => {
    const offAt = code.indexOf("if (off) return off;");
    const warmAt = code.indexOf("const warmUp");
    const validateAt = code.indexOf("await validateChatRequest(request)");
    expect(offAt).toBeGreaterThan(-1);
    expect(warmAt).toBeGreaterThan(offAt);
    expect(validateAt).toBeGreaterThan(warmAt);
    const block = code.slice(warmAt, validateAt);
    expect(block).toMatch(/void Promise\.all\(warmUp\)\.catch\(\(\) => \{\}\);/);
    expect(block).not.toMatch(/await\s/);
    expect(block).toContain('import("@/lib/sadeed/instant-data-answers.server")');
    expect(block).toContain('import("@/lib/sadeed/llm/zero-cost-router.server")');
    expect(block).toContain('import("@/lib/sadeed-context.server")');
    expect(block).toMatch(
      /if \(request\.headers\.get\("authorization"\)\) warmUp\.push\(import\("@\/lib\/sadeed-tools\.server"\)\)/,
    );
  });

  it("مواقع await import الأصلية حرفًا (يقرؤها عقد الاسترجاع وغيره)", () => {
    expect(code).toContain('await import("@/lib/sadeed/instant-data-answers.server")');
    expect(code).toContain('await import("@/lib/sadeed/llm/zero-cost-router.server")');
    expect(code).toContain('await import("@/lib/sadeed/rag.server")');
    expect(code).toMatch(/await import\("@\/lib\/sadeed-context\.server"\)/);
    expect(code).toMatch(/\(await import\("@\/lib\/sadeed-tools\.server"\)\)\.buildSadeedTools/);
    // ولا اسم دالة الإجابة الفورية قبل مطابقة التذكّر السريع (يقارن chat-latency موضع أول ظهورٍ له).
    const warmAt = code.indexOf("const warmUp");
    const instantNameAt = code.indexOf("matchInstantDataAnswer");
    expect(instantNameAt).toBeGreaterThan(code.indexOf("matchFastRecall(lastUserText)"));
    expect(instantNameAt).toBeGreaterThan(warmAt);
  });
});
