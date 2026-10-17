// @vitest-environment node
/**
 * المسارات الأربعة التي كانت تصل النموذج بحدّ الدقيقة وحده (المرحلة ب-٢، ٢٠٢٦/١٠/١٧):
 * `/api/sadeed/chat` · `/api/sadeed/transcribe` · `/api/voice-stt` · `/api/learn/sadeed-teach`.
 *
 * سلوكيًّا: المفتاح مرفوع ⇐ 503 `ai_disabled` قبل أي شبكة (لا مصادقة ولا حدّ ولا
 * نموذج)؛ السقف اليومي 429 ⇐ يُعاد كما هو وصفر نداء نموذج؛ والمسار السليم يصل
 * النموذج مرّة — فالأصفار أعلاه ذات معنى.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sim = vi.hoisted(() => ({
  rateCalls: 0,
  authCalls: 0,
  modelCalls: 0,
  sttCalls: 0,
  quota: null as Response | null,
}));

vi.mock("@/lib/governance/rate-limit.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceRateLimit: async () => {
    sim.rateCalls++;
    return { allowed: true };
  },
}));

vi.mock("@/lib/governance/ai-quota.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceAiQuota: async () => sim.quota,
}));

vi.mock("@/lib/hook-auth.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  verifySupabaseUser: async () => {
    sim.authCalls++;
    return { userId: "11111111-1111-4111-8111-111111111111" };
  },
}));

vi.mock("@/lib/sadeed/gemini-transcription.server", () => ({
  MAX_GEMINI_AUDIO_BYTES: 12 * 1024 * 1024,
  GEMINI_AUDIO_TYPES: new Set(["audio/webm"]),
  transcribeWithGemini: async () => {
    sim.sttCalls++;
    return { text: "نصّ", model: "stub", provider: "google-gemini" };
  },
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateText: async () => {
    sim.modelCalls++;
    return { text: "ردٌّ صوري." };
  },
}));

vi.mock("@/lib/sadeed/gemini-provider.server", () => {
  const runtime = { vendor: "google-gemini", modelId: "stub", provider: () => ({}) };
  return {
    resolveSadeedGeminiRuntime: () => runtime,
    resolveSadeedGeminiRuntimes: () => [runtime],
  };
});

vi.mock("@/lib/sadeed-context.server", () => ({
  buildProductionDatasetsSnapshot: async () => ({ contextBlock: "" }),
}));

vi.mock("@supabase/supabase-js", () => {
  const lesson = {
    aria_system_prompt_ar: "",
    aria_system_prompt_en: "",
    title_ar: "درس",
    title_en: "Lesson",
    summary_ar: "",
    summary_en: "",
    published: true,
  };
  const chain: unknown = new Proxy(() => chain, {
    get(_t, prop) {
      if (prop === "then")
        return (resolve: (v: unknown) => unknown) => resolve({ data: lesson, error: null });
      return () => chain;
    },
    apply: () => chain,
  });
  return {
    createClient: () => ({
      from: () => chain,
      auth: {
        getUser: async () => ({
          data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
          error: null,
        }),
      },
    }),
  };
});

type Handler = (args: { request: Request }) => Promise<Response>;
async function handlerOf(path: string): Promise<Handler> {
  const mod = (await import(/* @vite-ignore */ path)) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  return mod.Route.options.server.handlers.POST;
}

const audioForm = () => {
  const form = new FormData();
  form.set("audio", new File([new Uint8Array(2_048)], "clip.webm", { type: "audio/webm" }));
  return form;
};

const ROUTES: ReadonlyArray<{
  name: string;
  path: string;
  request: () => Request;
  modelCounter: () => number;
  authenticated: boolean;
}> = [
  {
    name: "/api/sadeed/chat",
    path: "@/routes/api/sadeed/chat",
    request: () =>
      new Request("http://local/api/sadeed/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "ما حالة التصاريح اليوم؟" }),
      }),
    modelCounter: () => sim.modelCalls,
    authenticated: false,
  },
  {
    name: "/api/sadeed/transcribe",
    path: "@/routes/api/sadeed/transcribe",
    request: () =>
      new Request("http://local/api/sadeed/transcribe", {
        method: "POST",
        headers: { authorization: "Bearer stub-token-long-enough-for-guards" },
        body: audioForm(),
      }),
    modelCounter: () => sim.sttCalls,
    authenticated: true,
  },
  {
    name: "/api/voice-stt",
    path: "@/routes/api/voice-stt",
    request: () =>
      new Request("http://local/api/voice-stt", {
        method: "POST",
        headers: { authorization: "Bearer stub-token-long-enough-for-guards" },
        body: audioForm(),
      }),
    modelCounter: () => sim.sttCalls,
    authenticated: true,
  },
  {
    name: "/api/learn/sadeed-teach",
    path: "@/routes/api/learn/sadeed-teach",
    request: () =>
      new Request("http://local/api/learn/sadeed-teach", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer stub-token-long-enough-for-guards",
        },
        body: JSON.stringify({
          slug: "lesson-1",
          messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "اشرح الدرس" }] }],
        }),
      }),
    modelCounter: () => sim.modelCalls,
    authenticated: false,
  },
];

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
  vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
  sim.rateCalls = 0;
  sim.authCalls = 0;
  sim.modelCalls = 0;
  sim.sttCalls = 0;
  sim.quota = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe.each(ROUTES)("$name", ({ path, request, modelCounter, authenticated }) => {
  it("المفتاح مرفوع ⇐ 503 ai_disabled قبل المصادقة والحدّ والنموذج", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const res = await (await handlerOf(path))({ request: request() });
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe("ai_disabled");
    expect(sim.authCalls, "المصادقة استُدعيت رغم الإيقاف").toBe(0);
    expect(sim.rateCalls, "الحدّ استُدعي رغم الإيقاف").toBe(0);
    expect(modelCounter(), "النموذج استُدعي رغم الإيقاف").toBe(0);
  });

  it("السقف اليومي 429 ⇐ يُعاد كما هو بعد الحدّ، وصفر نداء نموذج", async () => {
    sim.quota = new Response(JSON.stringify({ error: "daily_identity_cap", message_ar: "سقف." }), {
      status: 429,
      headers: { "Retry-After": "3600", "Content-Type": "application/json; charset=utf-8" },
    });
    const res = await (await handlerOf(path))({ request: request() });
    expect(res.status).toBe(429);
    expect(((await res.json()) as { error: string }).error).toBe("daily_identity_cap");
    expect(sim.rateCalls, "الحصّة فُحصت قبل الحدّ أو بدونه").toBe(1);
    if (authenticated) expect(sim.authCalls).toBe(1);
    expect(modelCounter(), "النموذج استُدعي رغم السقف").toBe(0);
  });

  it("المسار السليم يصل النموذج مرّة — فالأصفار أعلاه ذات معنى", async () => {
    const res = await (await handlerOf(path))({ request: request() });
    expect(res.status).toBe(200);
    expect(modelCounter()).toBe(1);
  });
});
