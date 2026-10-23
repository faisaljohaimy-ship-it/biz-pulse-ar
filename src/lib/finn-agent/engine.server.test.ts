// @vitest-environment node
/**
 * محرّك فِن — GPT أساسًا والاحتياطي معلَن (أمر المالك ٢٠٢٦/١٠/٢٣: «اربط مع جي بي تي
 * للبرمجة والاعتماد»).
 *
 * **كل شيء هنا بمحاكاة**: لا مفتاح حقيقي ولا نداء فعلي لـGPT ولا لـGemini. ما يُثبته:
 * سلوك الاختيار والسقوط والإفصاح والتسريب، لا جودة ردٍّ حقيقي. وحزمة `@ai-sdk/openai`
 * تُحاكى بالكامل (`vi.mock` بمصنع) فتعمل الاختبارات محليًّا ولو لم تكن مثبّتة.
 *
 * المادة ٣٠: كل فحص سلبي هنا جُرِّب أولًا على انتهاكٍ مزروع (انظر آخر الملف).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Call = {
  tag: string;
  modelId: string | null;
  system: unknown;
  messages: unknown;
  maxOutputTokens: unknown;
  maxRetries: unknown;
  providerOptions: unknown;
  extra: Record<string, unknown>;
};

const sim = vi.hoisted(() => ({
  calls: [] as Call[],
  /** سيناريو كل محرّك: يعيد أجزاء fullStream أو يرمي. */
  script: {} as Record<string, (signal: AbortSignal) => AsyncIterable<Record<string, unknown>>>,
  openAiKeys: [] as string[],
  gatewayAvailable: true,
  directAvailable: true,
  cooling: false,
  coolCalls: [] as number[],
  killSwitch: false,
}));

/** حزمة OpenAI المحاكاة — دالة معلنة (تُرفع) كي يعيد الاختبارُ تسجيلها بعد إلغائها. */
function openAiModule() {
  return {
    createOpenAI: (opts: { apiKey: string }) => {
      sim.openAiKeys.push(opts.apiKey);
      return { responses: (id: string) => ({ tag: "openai", modelId: id }) };
    },
  };
}
vi.mock("@ai-sdk/openai", () => openAiModule());

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  streamText: (args: Record<string, unknown>) => {
    const model = args.model as { tag: string; modelId: string | null };
    const {
      model: _m,
      system,
      messages,
      maxOutputTokens,
      maxRetries,
      providerOptions,
      ...extra
    } = args;
    void _m;
    sim.calls.push({
      tag: model.tag,
      modelId: model.modelId ?? null,
      system,
      messages,
      maxOutputTokens,
      maxRetries,
      providerOptions,
      extra,
    });
    const make = sim.script[model.tag];
    return { fullStream: make ? make(args.abortSignal as AbortSignal) : (async function* () {})() };
  },
}));

vi.mock("@/lib/sadeed/gemini-provider.server", () => ({
  resolveSadeedGeminiRuntimes: () =>
    sim.directAvailable
      ? [
          {
            vendor: "google-gemini",
            modelId: "gemini-test",
            provider: (id: string) => ({ tag: "gemini-direct", modelId: id }),
          },
        ]
      : [],
}));

vi.mock("@/lib/sadeed/backup-provider.server", () => ({
  createSadeedBackupModel: () =>
    sim.gatewayAvailable ? { tag: "gemini-gateway", modelId: "gateway-test" } : null,
  primaryCoolingDown: () => sim.cooling,
  coolPrimary: (ms: number) => {
    sim.coolCalls.push(ms);
  },
  primaryCooldownFor: () => 12_345,
}));

vi.mock("@/lib/governance/ai-quota.server", () => ({
  aiKillSwitchOn: () => sim.killSwitch,
  assertAiEnabled: () => {
    if (sim.killSwitch) throw new Error("ai_disabled");
  },
}));

const textPart = (text: string) => ({ type: "text-delta", id: "t", text });
const finishPart = (finishReason = "stop") => ({ type: "finish", finishReason });

async function* stream(parts: Array<Record<string, unknown>>) {
  for (const p of parts) yield p;
}

async function collect(
  events: AsyncGenerator<{ type: string; text?: string; code?: string; truncated?: boolean }>,
) {
  const out: string[] = [];
  let tail: Record<string, unknown> | null = null;
  for await (const e of events) {
    if (e.type === "delta") out.push(e.text ?? "");
    else tail = e;
  }
  return { text: out.join(""), tail };
}

const SECRET_KEY = "sk-test-SECRET-KEY-do-not-leak-0123456789";

/** ما يجب ألّا يظهر في أي سجلٍّ أو استجابة: المفتاح ونصّ المزوّد ونصّ المحادثة وعنوان النقطة. */
const leaks = (haystack: string) =>
  [SECRET_KEY, "Incorrect API key", "اكتب دالة", "api.openai.com"].filter((t) =>
    haystack.includes(t),
  );

const MSGS = [{ role: "user" as const, content: "اكتب دالة" }];
let engine: typeof import("./engine.server");

beforeEach(async () => {
  sim.calls = [];
  sim.script = {};
  sim.openAiKeys = [];
  sim.gatewayAvailable = true;
  sim.directAvailable = true;
  sim.cooling = false;
  sim.coolCalls = [];
  sim.killSwitch = false;
  vi.stubEnv("OPENAI_API_KEY", SECRET_KEY);
  vi.stubEnv("FINN_OPENAI_MODEL", "");
  vi.stubEnv("GEMINI_API_KEY", "gem-key");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  engine = await import("./engine.server");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const open = (messages = MSGS, signal = new AbortController().signal) =>
  engine.openFinnChatStream(messages, signal);

describe("① GPT هو المحرّك الأساسي — والإعدادات للخادم وحده", () => {
  it("مفتاح مضبوط ⇒ يجيب GPT ولا سقوط", async () => {
    sim.script.openai = () => stream([textPart("مرحبًا"), finishPart()]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    expect(r.engine).toBe("openai");
    expect(r.fallback).toBeNull();
    expect((await collect(r.events)).text).toBe("مرحبًا");
    expect(sim.calls.map((c) => c.tag)).toEqual(["openai"]);
  });

  it("النموذج الافتراضي gpt-4.1 عبر Responses، وFINN_OPENAI_MODEL يغيّره", async () => {
    sim.script.openai = () => stream([textPart("x"), finishPart()]);
    await open();
    expect(sim.calls[0].modelId).toBe("gpt-4.1");
    vi.stubEnv("FINN_OPENAI_MODEL", "gpt-5-mini");
    sim.calls = [];
    await open();
    expect(sim.calls[0].modelId).toBe("gpt-5-mini");
  });

  it.each(["", "   ", "gpt 4.1; drop", "../../x", "a".repeat(80), "نموذج"])(
    "معرّف نموذجٍ مشوَّه «%s» في البيئة ⇒ الافتراضي لا تمريره",
    (bad) => {
      expect(engine.resolveFinnOpenAiModelId({ FINN_OPENAI_MODEL: bad })).toBe("gpt-4.1");
    },
  );

  it("سقف المخرجات ٤٠٠٠، بلا محاولات SDK، وstore:false، والموجِّه موجِّه فِن", async () => {
    sim.script.openai = () => stream([textPart("x"), finishPart()]);
    const { FINN_SYSTEM_PROMPT } = await import("./prompt");
    await open();
    const call = sim.calls[0];
    expect(call.maxOutputTokens).toBe(4000);
    expect(call.maxRetries).toBe(0);
    expect(call.providerOptions).toEqual({ openai: { store: false } });
    expect(call.system).toBe(FINN_SYSTEM_PROMPT);
    // الرسائل كما أُرسلت: دورٌ ونصٌّ فقط.
    expect(call.messages).toEqual([{ role: "user", content: "اكتب دالة" }]);
  });

  it("المفتاح يُمرَّر إلى المزوّد من البيئة وحدها", async () => {
    sim.script.openai = () => stream([textPart("x"), finishPart()]);
    await open();
    expect(sim.openAiKeys).toEqual([SECRET_KEY]);
  });

  it("حالة المحرّكين منطقيّات واسم نموذج — لا مفتاح ولا طوله", () => {
    const status = engine.readFinnEngineStatus({
      OPENAI_API_KEY: SECRET_KEY,
      FINN_OPENAI_MODEL: "gpt-4.1",
      GEMINI_API_KEY: "g",
    });
    expect(status).toEqual({ gpt: true, gptModel: "gpt-4.1", fallback: true, paused: false });
    const dump = JSON.stringify(status);
    expect(dump).not.toContain(SECRET_KEY);
    expect(dump).not.toMatch(/sk-/);
    expect(dump).not.toContain(String(SECRET_KEY.length));
  });

  it("الجاهزية صادقة: بلا مفتاح ⇒ gpt=false والاحتياطي وحده", () => {
    expect(engine.readFinnEngineStatus({ GEMINI_API_KEY: "g" })).toMatchObject({
      gpt: false,
      fallback: true,
    });
    expect(engine.readFinnEngineStatus({ OPENAI_API_KEY: "   " })).toMatchObject({ gpt: false });
    expect(engine.finnHasAnyEngine({})).toBe(false);
    expect(engine.finnHasAnyEngine({ OPENAI_API_KEY: "k" })).toBe(true);
    expect(engine.finnHasAnyEngine({ LOVABLE_API_KEY: "k" })).toBe(true);
  });

  it("مفتاح الإيقاف يُرى في الحالة ويمنع الفتح قبل أي محاولة", async () => {
    sim.killSwitch = true;
    expect(engine.readFinnEngineStatus({}).paused).toBe(true);
    await expect(open()).rejects.toThrow();
    expect(sim.calls).toEqual([]);
  });
});

describe("② السقوط إلى الاحتياطي معلَنٌ لا صامت", () => {
  it("مفتاح GPT غائب ⇒ الاحتياطي يجيب، وfallback=not_configured، وGPT لم يُنشأ أصلًا", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    sim.script["gemini-direct"] = () => stream([textPart("احتياطي"), finishPart()]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    expect(r.engine).toBe("gemini");
    expect(r.fallback).toBe("not_configured");
    expect(sim.openAiKeys).toEqual([]);
    expect(sim.calls.map((c) => c.tag)).toEqual(["gemini-direct"]);
  });

  it("429 من GPT ⇒ الاحتياطي، وfallback=rate_limited", async () => {
    sim.script.openai = () =>
      stream([
        { type: "error", error: Object.assign(new Error("Rate limit"), { statusCode: 429 }) },
      ]);
    sim.script["gemini-direct"] = () => stream([textPart("احتياطي"), finishPart()]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    expect(r.engine).toBe("gemini");
    expect(r.fallback).toBe("rate_limited");
    expect(sim.calls.map((c) => c.tag)).toEqual(["openai", "gemini-direct"]);
  });

  it.each([
    [500, "upstream_error"],
    [503, "upstream_error"],
    [404, "model_unavailable"],
    [401, "auth_failed"],
    [402, "billing"],
  ])("HTTP %i من GPT ⇒ احتياطي معلَن بالرمز %s", async (statusCode, reason) => {
    sim.script.openai = () =>
      stream([{ type: "error", error: Object.assign(new Error("boom"), { statusCode }) }]);
    sim.script["gemini-direct"] = () => stream([textPart("احتياطي"), finishPart()]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    expect(r.engine).toBe("gemini");
    expect(r.fallback).toBe(reason);
  });

  it("فشل الاستيراد الديناميكي لحزمة OpenAI ⇒ سقوطٌ معلَن لا انهيار (والمحرّك لم يُستدعَ)", async () => {
    // الحزمة غير موجودة/معطوبة: `await import("@ai-sdk/openai")` نفسه يُرفض.
    vi.resetModules();
    vi.doMock("@ai-sdk/openai", () => {
      throw new Error("Cannot find package '@ai-sdk/openai'");
    });
    const fresh = await import("./engine.server");
    sim.script["gemini-direct"] = () => stream([textPart("احتياطي"), finishPart()]);
    const r = await fresh.openFinnChatStream(MSGS, new AbortController().signal);
    // أعد تسجيل المحاكاة الأصلية لبقية الاختبارات.
    vi.doMock("@ai-sdk/openai", () => openAiModule());
    if (!r.ok) throw new Error("expected ok");
    expect(r.engine).toBe("gemini");
    expect(r.fallback).toBe("upstream_error");
    expect(sim.calls.map((c) => c.tag)).toEqual(["gemini-direct"]);
  });

  it("400 (الطلب نفسه معطوب) لا يُسقط إلى محرّكٍ ثانٍ", async () => {
    sim.script.openai = () =>
      stream([{ type: "error", error: Object.assign(new Error("bad"), { statusCode: 400 }) }]);
    sim.script["gemini-direct"] = () => stream([textPart("لا يجب أن يصل"), finishPart()]);
    const r = await open();
    expect(r).toEqual({ ok: false, code: "bad_request" });
    expect(sim.calls.map((c) => c.tag)).toEqual(["openai"]);
  });

  it("خنق Gemini المباشر ⇒ بوّابة الاحتياط تجيب، والسبب يبقى سبب GPT", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    sim.script["gemini-direct"] = () =>
      stream([{ type: "error", error: Object.assign(new Error("quota"), { statusCode: 429 }) }]);
    sim.script["gemini-gateway"] = () => stream([textPart("من البوّابة"), finishPart()]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    expect(r.engine).toBe("gemini");
    expect(r.fallback).toBe("not_configured");
    expect(sim.calls.map((c) => c.tag)).toEqual(["gemini-direct", "gemini-gateway"]);
    // والمفتاح المباشر المخنوق يُبرَّد فلا تُنفق الطلبات التالية عليه.
    expect(sim.coolCalls).toEqual([12_345]);
  });

  it("المفتاح المباشر في التبريد ⇒ تُتخطّى محاولته إلى البوّابة فورًا", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    sim.cooling = true;
    sim.script["gemini-gateway"] = () => stream([textPart("من البوّابة"), finishPart()]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    expect(sim.calls.map((c) => c.tag)).toEqual(["gemini-gateway"]);
  });

  it("لا محرّك أصلًا ⇒ no_engine بلا أي نداء", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    sim.directAvailable = false;
    sim.gatewayAvailable = false;
    expect(await open()).toEqual({ ok: false, code: "no_engine" });
    expect(sim.calls).toEqual([]);
  });

  it("المحرّكان يفشلان ⇒ engine_error برمزٍ عامّ", async () => {
    const boom = () =>
      stream([{ type: "error", error: Object.assign(new Error("x"), { statusCode: 503 }) }]);
    sim.script.openai = boom;
    sim.script["gemini-direct"] = boom;
    sim.script["gemini-gateway"] = boom;
    expect(await open()).toEqual({ ok: false, code: "engine_error" });
  });

  it("لا خلط: فشلُ GPT بعد أن بدأ بالنصّ يُنهي الردّ بخطأ ولا يكمله الاحتياطي", async () => {
    sim.script.openai = () =>
      stream([
        textPart("بداية "),
        { type: "error", error: Object.assign(new Error("mid"), { statusCode: 503 }) },
      ]);
    sim.script["gemini-direct"] = () => stream([textPart("تكملة من محرّك آخر"), finishPart()]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    expect(r.engine).toBe("openai");
    const done = await collect(r.events);
    expect(done.text).toBe("بداية ");
    expect(done.tail).toEqual({ type: "error", code: "engine_error" });
    expect(sim.calls.map((c) => c.tag)).toEqual(["openai"]);
  });

  it("قطعٌ بالطول (length) يُعلَن truncated", async () => {
    sim.script.openai = () => stream([textPart("طويل"), finishPart("length")]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    expect((await collect(r.events)).tail).toEqual({ type: "done", truncated: true });
  });
});

describe("②-ب ملاحظات W5 #3–#6 عبر تطبيع أجزاء الـSDK الحقيقية", () => {
  const apiErr = (statusCode: number, data?: unknown) =>
    Object.assign(new Error("provider text"), { statusCode, data });

  it("#3 إغلاق المزوّد البثَّ بعد نصّ (finishReason=other) ⇒ خطأ معلَن لا done مكتمل", async () => {
    sim.script.openai = () => stream([textPart("function f() {"), finishPart("other")]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    const done = await collect(r.events);
    expect(done.text).toBe("function f() {");
    expect(done.tail).toEqual({ type: "error", code: "engine_error" });
  });

  it("#3 مرشِّح المحتوى بعد بدء الرد ⇒ خطأ معلَن أيضًا", async () => {
    sim.script.openai = () => stream([textPart("بداية"), finishPart("content-filter")]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    expect((await collect(r.events)).tail).toEqual({ type: "error", code: "engine_error" });
  });

  it("#6 نفاد رصيد OpenAI (429 + insufficient_quota) ⇒ السبب المعلَن billing", async () => {
    sim.script.openai = () =>
      stream([{ type: "error", error: apiErr(429, { error: { code: "insufficient_quota" } }) }]);
    sim.script["gemini-direct"] = () => stream([textPart("احتياطي"), finishPart()]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    expect(r.fallback).toBe("billing");
  });

  it("#4 GPT 429 ثم Gemini المباشر 400 ⇒ تجيب بوّابة الاحتياط", async () => {
    sim.script.openai = () => stream([{ type: "error", error: apiErr(429) }]);
    sim.script["gemini-direct"] = () => stream([{ type: "error", error: apiErr(400) }]);
    sim.script["gemini-gateway"] = () => stream([textPart("من البوّابة"), finishPart()]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    expect(sim.calls.map((c) => c.tag)).toEqual(["openai", "gemini-direct", "gemini-gateway"]);
    expect(r.fallback).toBe("rate_limited");
  });

  it("#4 GPT غير مهيّأ + مفتاح Gemini المرفوض (API_KEY_INVALID) ⇒ البوّابة", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    sim.script["gemini-direct"] = () =>
      stream([
        {
          type: "error",
          error: apiErr(400, {
            error: { status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] },
          }),
        },
      ]);
    sim.script["gemini-gateway"] = () => stream([textPart("من البوّابة"), finishPart()]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    expect(sim.calls.map((c) => c.tag)).toEqual(["gemini-direct", "gemini-gateway"]);
  });

  it("#5 reasoning-start ثم صمت ⇒ يسقط إلى الاحتياطي عند مهلة أول نصّ", async () => {
    vi.useFakeTimers();
    try {
      sim.script.openai = (signal) =>
        (async function* () {
          yield { type: "reasoning-start", id: "r" };
          await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve()));
        })();
      sim.script["gemini-direct"] = () => stream([textPart("احتياطي"), finishPart()]);
      const pending = open();
      await vi.advanceTimersByTimeAsync(46_000);
      const r = await pending;
      if (!r.ok) throw new Error(`expected ok, got ${r.code}`);
      expect(r).toMatchObject({ engine: "gemini", fallback: "timeout" });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("③ لا يتسرّب نصّ المزوّد ولا المفتاح — لا في الاستجابة ولا في السجلّ", () => {
  const LEAK_BODY = `{"error":{"message":"Incorrect API key provided: ${SECRET_KEY}. prompt: اكتب دالة"}}`;
  const leaky = () =>
    Object.assign(new Error(`401 Incorrect API key provided: ${SECRET_KEY}`), {
      statusCode: 401,
      responseBody: LEAK_BODY,
      requestBodyValues: { input: [{ role: "user", content: "اكتب دالة" }] },
      url: "https://api.openai.com/v1/responses",
    });

  it("خطأ المزوّد الغنيّ بالأسرار: السجلّ رموزٌ فقط", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    sim.script.openai = () => stream([{ type: "error", error: leaky() }]);
    sim.script["gemini-direct"] = () => stream([textPart("ok"), finishPart()]);
    const r = await open();
    if (!r.ok) throw new Error("expected ok");
    await collect(r.events);
    const logged = JSON.stringify([...warn.mock.calls, ...err.mock.calls, ...log.mock.calls]);
    expect(logged).toContain("auth_failed");
    expect(leaks(logged)).toEqual([]);
  });

  it("وسجلّ الـSDK الافتراضي مُعطَّل: onError مُمرَّر فلا يُطبع الخطأ كاملًا", async () => {
    sim.script.openai = () => stream([textPart("x"), finishPart()]);
    await open();
    expect(typeof sim.calls[0].extra.onError).toBe("function");
    // يُستدعى بلا أثر: لا يطبع ولا يرمي.
    const err = vi.spyOn(console, "error");
    (sim.calls[0].extra.onError as (e: unknown) => unknown)({ error: leaky() });
    expect(err).not.toHaveBeenCalled();
  });

  it("فشل الكلّ ⇒ النتيجة رمزٌ عامّ لا يحمل نصًّا من المزوّد", async () => {
    sim.script.openai = () => stream([{ type: "error", error: leaky() }]);
    sim.script["gemini-direct"] = () => stream([{ type: "error", error: leaky() }]);
    sim.script["gemini-gateway"] = () => stream([{ type: "error", error: leaky() }]);
    const r = await open();
    expect(r).toEqual({ ok: false, code: "engine_error" });
    expect(leaks(JSON.stringify(r))).toEqual([]);
  });
});

describe("④ إثبات الأداة (المادة ٣٠): كاشفُ التسريب يحمرّ على تسريبٍ مزروع", () => {
  it("كل نوع تسريب تلتقطه `leaks` — والسجلّ النظيف لا يُدان", () => {
    expect(leaks(JSON.stringify({ message: `401 ${SECRET_KEY}` }))).toContain(SECRET_KEY);
    expect(leaks("Incorrect API key provided")).toContain("Incorrect API key");
    expect(leaks("مسودة: اكتب دالة")).toContain("اكتب دالة");
    expect(leaks("POST https://api.openai.com/v1/responses")).toContain("api.openai.com");
    expect(leaks(JSON.stringify({ engine: "openai", code: "auth_failed", status: 401 }))).toEqual(
      [],
    );
  });
});
