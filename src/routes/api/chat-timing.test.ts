/**
 * أداة قياس `/api/chat` — سلوكيًّا عبر المعالج الحقيقي (٢٠٢٦/١١/٠٣).
 *
 * يُثبت: ترويسة `Server-Timing` على كل ردّ (نموذج · منع · كشف إيقاف)، وسطرًا واحدًا
 * `[api/chat] timing` لكل دور بمراحله وخطواته ورموزه، وخلوّه من نصّ المستخدم ومعرّفاته،
 * وأن `first_token_ms` صار رقمًا (كان `null` ثابتًا — المتغيّر الميّت `firstTokenAt`).
 */
import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");

const QUESTION = "ما إجراءات السلامة لتصاريح العمل الساخن؟";
const USER_ID = "user-secret-id-7421";
const THREAD_ID = "11111111-1111-4111-8111-111111111111";

const sim = vi.hoisted(() => ({
  member: false,
  rate: { allowed: true } as { allowed: boolean },
  delayMs: 0,
  steps: [] as unknown[],
  totalUsage: undefined as unknown,
  inserts: [] as Array<{ table: string; payload: Record<string, unknown> }>,
}));

function stubSupabase() {
  const result = { data: null, error: null, count: 0 };
  return {
    from: (table: string) => {
      const chain: unknown = new Proxy(() => chain, {
        get(_t, prop) {
          if (prop === "then") return (resolve: (v: unknown) => unknown) => resolve(result);
          if (prop === "insert")
            return (payload: Record<string, unknown>) => {
              sim.inserts.push({ table, payload });
              return chain;
            };
          return () => chain;
        },
        apply: () => chain,
      });
      return chain;
    },
    rpc: () => {
      const chain: unknown = new Proxy(() => chain, {
        get(_t, prop) {
          if (prop === "then") return (resolve: (v: unknown) => unknown) => resolve(result);
          return () => chain;
        },
        apply: () => chain,
      });
      return chain;
    },
    auth: {
      getUser: async () =>
        sim.member
          ? { data: { user: { id: USER_ID, app_metadata: {} } }, error: null }
          : { data: { user: null }, error: { message: "no session" } },
    },
  };
}

vi.mock("@supabase/supabase-js", () => ({ createClient: () => stubSupabase() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  createSupabaseAdminClient: () => stubSupabase(),
  supabaseAdmin: stubSupabase(),
}));
vi.mock("@/lib/governance/rate-limit.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceRateLimit: async () => sim.rate,
}));
vi.mock("@/lib/governance/ai-quota.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceAiQuota: async () => null,
}));
vi.mock("@/lib/sadeed-tools.server", () => ({
  buildSadeedTools: () => ({ marker: { description: "x" } }),
}));
vi.mock("@/lib/sadeed/rag.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  gatherRagContext: async () => ({
    contextBlock: "",
    citations: [],
    counts: { memories: 0, knowledge: 0, documents: 0 },
    embedding: null,
  }),
}));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateText: async (opts: { onStepFinish?: (step: unknown) => void }) => {
    if (sim.delayMs) await new Promise((resolve) => setTimeout(resolve, sim.delayMs));
    for (const step of sim.steps) opts.onStepFinish?.(step);
    return { text: "ردّ صوري.", finishReason: "stop", totalUsage: sim.totalUsage };
  },
}));

afterAll(() => vi.unstubAllEnvs());
vi.setConfig({ testTimeout: 20_000 });

type Handler = (args: { request: Request }) => Promise<Response>;
async function post(text = QUESTION) {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  return mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(sim.member
          ? { authorization: "Bearer valid.jwt.that.is.long.enough.for.the.guard" }
          : {}),
      },
      body: JSON.stringify({
        messages: [{ id: "m1", role: "user", parts: [{ type: "text", text }] }],
        threadId: THREAD_ID,
      }),
    }),
  });
}

const timingLogs = () =>
  vi
    .mocked(console.log)
    .mock.calls.filter((call) => call[0] === "[api/chat] timing")
    .map((call) => call[1] as Record<string, unknown>);

const stageNames = (res: Response) =>
  (res.headers.get("Server-Timing") ?? "").split(", ").map((part) => part.split(";")[0]);

beforeEach(async () => {
  sim.member = false;
  sim.rate = { allowed: true };
  sim.delayMs = 0;
  sim.steps = [];
  sim.totalUsage = undefined;
  sim.inserts = [];
  const guards = await import("@/lib/governance/request-guards.server");
  guards.resetRequestGuardsForTests();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
  vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");
  vi.restoreAllMocks();
});

describe("ترويسة Server-Timing وسطر القياس — دور مسجَّل بنموذج", () => {
  beforeEach(() => {
    sim.member = true;
  });

  it("كل مراحل المسار حاضرة بترتيبها، والمجلس غائب في الوضع العادي", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(stageNames(res)).toEqual([
      "validate",
      "auth",
      "org",
      "rate",
      "deterministic",
      "adapter",
      "quota",
      "context",
      "rag",
      "tools",
      "prefs",
      "prompt",
      "model",
      "finalize",
      "total",
    ]);
    for (const part of (res.headers.get("Server-Timing") ?? "").split(", ")) {
      expect(part).toMatch(/^[a-z]+;dur=\d+$/);
    }
  });

  it("سطرٌ واحد فقط لكل دور، يحمل معرّف الطلب نفسه الذي في ترويسة الردّ", async () => {
    const res = await post();
    const logs = timingLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      requestId: res.headers.get("X-SADEED-Request-ID"),
      status: 200,
      threw: false,
      replySource: "model",
      replyMode: "text",
      provider: "google-gemini",
      model: "gemini-3.6-flash",
    });
    expect((logs[0]!.stages as Record<string, number>).model).toBeGreaterThanOrEqual(0);
  });

  it("الخطوات والرموز تصل السطر من onStepFinish ونتيجة generateText", async () => {
    sim.steps = [
      { finishReason: "tool-calls", toolCalls: [{ toolName: "sec_list_patrols" }] },
      { finishReason: "stop", toolCalls: [] },
    ];
    sim.totalUsage = {
      inputTokens: 24_000,
      outputTokens: 900,
      outputTokenDetails: { reasoningTokens: 600 },
      inputTokenDetails: { cacheReadTokens: 0 },
    };
    await post();
    const [log] = timingLogs();
    const steps = log!.steps as Array<{ finishReason: string; tools: string[]; ms: number }>;
    expect(steps.map((s) => s.finishReason)).toEqual(["tool-calls", "stop"]);
    expect(steps[0]!.tools).toEqual(["sec_list_patrols"]);
    expect(log!.finishReason).toBe("stop");
    expect(log!.usage).toEqual({
      inputTokens: 24_000,
      outputTokens: 900,
      reasoningTokens: 600,
      cachedInputTokens: 0,
    });
  });

  it("السطر أعدادٌ ورموز: لا نصّ سؤال ولا معرّف مستخدم ولا خيط", async () => {
    await post();
    const line = JSON.stringify(timingLogs());
    expect(line).not.toContain(QUESTION);
    expect(line).not.toContain("الساخن");
    expect(line).not.toContain(USER_ID);
    expect(line).not.toContain(THREAD_ID);
    expect(line).not.toMatch(/Bearer|jwt/i);
  });

  it("first_token_ms رقمٌ لا null: زمن اكتمال الدور، ولا يتجاوز latency_ms", async () => {
    sim.delayMs = 40;
    await post();
    // الإدراجات بلا انتظار (void) — دورة مهامّ واحدة تكفي.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const row = sim.inserts.find((i) => i.table === "finn_interactions")?.payload;
    expect(row, "لم يُكتب finn_interactions").toBeDefined();
    expect(typeof row!.first_token_ms).toBe("number");
    expect(row!.first_token_ms as number).toBeGreaterThanOrEqual(35);
    expect(row!.first_token_ms as number).toBeLessThanOrEqual(row!.latency_ms as number);
  });
});

describe("الزائر والمنع والإيقاف", () => {
  it("زائر: لا مراحل auth/org/prefs (لم تعمل أصلًا) ولا تُسجَّل صفرًا", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    const names = stageNames(res);
    for (const absent of ["auth", "org", "prefs", "council"]) expect(names).not.toContain(absent);
    for (const present of ["validate", "rate", "quota", "context", "model", "finalize", "total"])
      expect(names).toContain(present);
  });

  it("رفض المعدّل 429 يحمل الترويسة ويُسجَّل بحالته", async () => {
    sim.rate = { allowed: false };
    const res = await post();
    expect(res.status).toBe(429);
    expect(res.headers.get("Server-Timing")).toMatch(/rate;dur=\d+, total;dur=\d+/);
    const logs = timingLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ status: 429, replySource: null });
  });

  it("الردّ الحتمي (قبل النموذج) يحمل الترويسة وسطره", async () => {
    const res = await post("من أنت؟");
    expect(res.headers.get("X-SADEED-Reply-Source")).not.toBe("model");
    expect(res.headers.get("Server-Timing")).toMatch(/deterministic;dur=\d+/);
    expect(timingLogs()).toHaveLength(1);
    expect(stageNames(res)).not.toContain("model");
  });

  it("مفتاح الإيقاف (قبل أي شبكة) يُختم ويُسجَّل أيضًا", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "true");
    const res = await post();
    expect(res.status).toBe(503);
    expect(res.headers.get("Server-Timing")).toMatch(/total;dur=\d+/);
    const logs = timingLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ status: 503, requestId: null });
  });
});

describe("حارس البنية — بقاء القياس والمتغيّر الميّت خارج الشيفرة", () => {
  const CHAT = readFileSync("src/routes/api/chat.ts", "utf8");
  const code = CHAT.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

  it("معالج POST مغلَّف بأثر الدور — وإلا اختفت الترويسة والسطر معًا", () => {
    expect(code).toMatch(/POST: withChatTurnTrace\(async \(\{ request \}, trace\) =>/);
    expect(code).toContain('from "@/lib/sadeed/chat-timing.server"');
  });

  it("لا عودة لـ firstTokenAt الميّت: لا تهيئة بـnull ولا تعبير يعود null", () => {
    // الصياغة الميّتة كانت `const firstTokenAt: number | null = null;` ثم
    // `first_token_ms: firstTokenAt ? … : null` — فالعمود فارغ دائمًا.
    expect(code).not.toMatch(/firstTokenAt\s*(?::[^=;]+)?=\s*null/);
    expect(code).toMatch(/const firstTokenAt = Date\.now\(\)/);
    expect(code).toMatch(/first_token_ms: firstTokenAt - startAt/);
    expect(code).not.toMatch(/first_token_ms:[^,\n]*\?[^,\n]*:\s*null/);
  });

  it("المراحل الإلزامية تُسجَّل عند نقاطها (lap/watch/note/step/finishModel)", () => {
    for (const stage of [
      "validate",
      "auth",
      "org",
      "rate",
      "deterministic",
      "adapter",
      "quota",
      "context",
      "council",
      "tools",
      "prefs",
      "prompt",
      "model",
      "finalize",
    ]) {
      expect(code, `lap(${stage})`).toContain(`trace.lap("${stage}")`);
    }
    expect(code).toContain('trace.watch("rag", ragPromise)');
    expect(code).toContain("trace.step(step)");
    expect(code).toContain("trace.finishModel(gen)");
    expect(code).toContain("trace.modelRunStarted()");
  });
});
