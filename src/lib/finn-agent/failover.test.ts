// @vitest-environment node
/**
 * سلسلة محرّكات فِن — سلوك السقوط والمهلات والإلغاء بمحاولاتٍ مصطنعة.
 *
 * وحدةٌ خالصة: لا SDK ولا بيئة. المهلات حقيقية لكن بالمللي ثانية، فالفحص يمرّ على
 * الساعة الفعلية لا على ساعةٍ مزيَّفة قد تخفي علقةً حقيقية.
 */
import { describe, expect, it, vi } from "vitest";
import {
  classifyEngineError,
  openFinnReply,
  type FinnAttempt,
  type FinnEngine,
  type FinnPart,
} from "./failover";

const text = (t: string): FinnPart => ({ type: "text", text: t });
const finish = (truncated = false): FinnPart => ({ type: "finish", truncated });
const err = (statusCode?: number, extra: Record<string, unknown> = {}): FinnPart => ({
  type: "error",
  error: Object.assign(new Error("provider said: secret text"), { statusCode, ...extra }),
});

async function* parts(list: FinnPart[]) {
  for (const p of list) yield p;
}

/** محاولةٌ يُرفض أول `next()` فيها — كمزوّدٍ يفشل قبل أي جزء. */
const rejecting = (error: unknown): AsyncIterable<FinnPart> => ({
  [Symbol.asyncIterator]: () => ({ next: () => Promise.reject(error) }),
});

function attempt(
  engine: FinnEngine,
  open: (signal: AbortSignal) => AsyncIterable<FinnPart>,
  extra: Partial<FinnAttempt> = {},
): FinnAttempt {
  return { engine, open, ...extra };
}

const OPTS = {
  firstTokenDeadlineMs: 40,
  totalDeadlineMs: 400,
};

const never = (): AsyncIterable<FinnPart> => ({
  [Symbol.asyncIterator]: () => ({
    next: () => new Promise<IteratorResult<FinnPart>>(() => undefined),
    return: () => Promise.resolve({ done: true, value: undefined }),
  }),
});

async function drain(events: AsyncGenerator<{ type: string; text?: string }>) {
  const out: Array<{ type: string; text?: string; code?: string }> = [];
  for await (const e of events) out.push(e);
  return out;
}

describe("classifyEngineError — رمزٌ عامّ لا نصّ", () => {
  it.each([
    [429, "rate_limited", true],
    [401, "auth_failed", true],
    [403, "auth_failed", true],
    [402, "billing", true],
    [404, "model_unavailable", true],
    [408, "timeout", true],
    [500, "upstream_error", true],
    [502, "upstream_error", true],
    [503, "upstream_error", true],
    [400, "bad_request", false],
    [413, "bad_request", false],
    [422, "bad_request", false],
  ])("HTTP %i ⇒ %s (سقوط: %s)", (status, code, fallback) => {
    const c = classifyEngineError(Object.assign(new Error("x"), { statusCode: status }));
    expect(c).toMatchObject({ code, fallback, status });
  });

  it("بلا رمز (شبكة · استيراد · مجهول) ⇒ upstream_error يُسقط", () => {
    expect(classifyEngineError(new TypeError("fetch failed"))).toMatchObject({
      code: "upstream_error",
      fallback: true,
      status: null,
    });
    expect(classifyEngineError("string")).toMatchObject({ code: "upstream_error" });
    expect(classifyEngineError(null)).toMatchObject({ code: "upstream_error" });
  });

  it("يقرأ الرمز من الخطأ المغلَّف (lastError / cause) ولا يقع في حلقة", () => {
    expect(classifyEngineError({ lastError: { statusCode: 429 } })).toMatchObject({
      code: "rate_limited",
    });
    expect(classifyEngineError({ cause: { status: 503 } })).toMatchObject({
      code: "upstream_error",
      status: 503,
    });
    const loop: Record<string, unknown> = {};
    loop.cause = loop;
    expect(classifyEngineError(loop)).toMatchObject({ code: "upstream_error" });
  });

  it("لا يقرأ message ولا responseBody: النتيجة لا تحمل أيًّا منهما", () => {
    const c = classifyEngineError(
      Object.assign(new Error("Incorrect API key sk-123"), {
        statusCode: 401,
        responseBody: "private body",
      }),
    );
    expect(JSON.stringify(c)).not.toMatch(/sk-123|private body|Incorrect/);
  });
});

describe("openFinnReply", () => {
  it("المحرّك الأول السليم يجيب بلا سقوط", async () => {
    const r = await openFinnReply(
      [attempt("openai", () => parts([text("أ"), text("ب"), finish()]))],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect(r.engine).toBe("openai");
    expect(r.fallback).toBeNull();
    expect(await drain(r.events)).toEqual([
      { type: "delta", text: "أ" },
      { type: "delta", text: "ب" },
      { type: "done", truncated: false },
    ]);
  });

  it("محاولة مُتخطّاة (skip) تسجّل سببها، والتالية تجيب", async () => {
    const open = vi.fn();
    const r = await openFinnReply(
      [
        attempt("openai", open, { skip: "not_configured" }),
        attempt("gemini", () => parts([text("ج"), finish()])),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect(open).not.toHaveBeenCalled();
    expect(r).toMatchObject({ engine: "gemini", fallback: "not_configured" });
  });

  it("الأجزاء غير النصّية (progress) لا تُحتسب إجابة، والنصّ الفارغ يُتجاهل", async () => {
    const r = await openFinnReply(
      [
        attempt("openai", () =>
          parts([{ type: "progress" }, text(""), { type: "progress" }, text("س"), finish()]),
        ),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect((await drain(r.events))[0]).toEqual({ type: "delta", text: "س" });
  });

  it("ردٌّ فارغ (finish بلا نصّ) عطلٌ ⇒ سقوط", async () => {
    const r = await openFinnReply(
      [
        attempt("openai", () => parts([finish()])),
        attempt("gemini", () => parts([text("ج"), finish()])),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect(r).toMatchObject({ engine: "gemini", fallback: "upstream_error" });
  });

  it("الاستثناء المرمى من المحاولة نفسها يُصنَّف كالجزء error", async () => {
    const r = await openFinnReply(
      [
        attempt("openai", () => rejecting(Object.assign(new Error("x"), { statusCode: 429 }))),
        attempt("gemini", () => parts([text("ج"), finish()])),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect(r).toMatchObject({ engine: "gemini", fallback: "rate_limited" });
  });

  it("open() يرمي متزامنًا ⇒ يُعامل فشلًا لا انهيارًا", async () => {
    const r = await openFinnReply(
      [
        attempt("openai", () => {
          throw new TypeError("boom");
        }),
        attempt("gemini", () => parts([text("ج"), finish()])),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect(r).toMatchObject({ engine: "gemini", fallback: "upstream_error" });
  });

  it("تأخّر أول مخرج عن المهلة ⇒ يُقطع GPT ويُسقط إلى الاحتياطي (fallback=timeout)", async () => {
    let openaiSignal: AbortSignal | null = null;
    const r = await openFinnReply(
      [
        attempt("openai", (s) => {
          openaiSignal = s;
          return never();
        }),
        attempt("gemini", () => parts([text("ج"), finish()])),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect(r).toMatchObject({ engine: "gemini", fallback: "timeout" });
    expect((openaiSignal as AbortSignal | null)?.aborted).toBe(true);
  });

  it("المهلة تخصّ أول مخرجٍ فقط: ردٌّ بدأ ثم أبطأ من المهلة لا يُقطع بها", async () => {
    const slow = (async function* () {
      yield text("بدأ");
      await new Promise((r) => setTimeout(r, 120)); // أطول من firstTokenDeadlineMs=40
      yield text(" وأكمل");
      yield finish();
    })();
    const r = await openFinnReply([attempt("openai", () => slow)], {
      ...OPTS,
      signal: new AbortController().signal,
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.engine).toBe("openai");
    const events = await drain(r.events);
    expect(events.map((e) => e.text ?? e.type).join("")).toBe("بدأ وأكملdone");
  });

  it("استثناءٌ يُرمى من البثّ بعد أن بدأ النصّ ⇒ حدث خطأ معلَن، لا إخفاء ولا تكملة", async () => {
    const broken = (async function* () {
      yield text("بدأ");
      throw Object.assign(new Error("socket hang up"), { statusCode: 503 });
    })();
    const second = vi.fn(() => parts([text("لا يجب أن يصل"), finish()]));
    const r = await openFinnReply([attempt("openai", () => broken), attempt("gemini", second)], {
      ...OPTS,
      signal: new AbortController().signal,
    });
    if (!r.ok) throw new Error("expected ok");
    expect(await drain(r.events)).toEqual([
      { type: "delta", text: "بدأ" },
      { type: "error", code: "engine_error" },
    ]);
    expect(second).not.toHaveBeenCalled();
  });

  it("السقف الكلّي يقطع ردًّا بدأ ثم تعلّق: خطأ timeout معلَن في البثّ", async () => {
    const stuck = (async function* () {
      yield text("بدأ");
      await new Promise<never>(() => undefined);
    })();
    const r = await openFinnReply([attempt("openai", () => stuck)], {
      firstTokenDeadlineMs: 40,
      totalDeadlineMs: 80,
      signal: new AbortController().signal,
    });
    if (!r.ok) throw new Error("expected ok");
    const events = await drain(r.events);
    expect(events.at(-1)).toEqual({ type: "error", code: "timeout" });
  });

  it("كل المحاولات تنتهي مهلتها ⇒ timeout (لا engine_error)", async () => {
    const r = await openFinnReply([attempt("openai", never), attempt("gemini", never)], {
      ...OPTS,
      signal: new AbortController().signal,
    });
    expect(r).toEqual({ ok: false, code: "timeout" });
  });

  it("كلها غير مهيّأة ⇒ no_engine بلا فتح شيء", async () => {
    const open = vi.fn();
    const r = await openFinnReply(
      [
        attempt("openai", open, { skip: "not_configured" }),
        attempt("gemini", open, { skip: "not_configured" }),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    expect(r).toEqual({ ok: false, code: "no_engine" });
    expect(open).not.toHaveBeenCalled();
  });

  it("انقطاع العميل قبل أول مخرج ⇒ aborted ولا تُجرَّب محاولة أخرى", async () => {
    const client = new AbortController();
    const second = vi.fn(() => parts([text("لا"), finish()]));
    const pending = openFinnReply([attempt("openai", never), attempt("gemini", second)], {
      firstTokenDeadlineMs: 5_000,
      totalDeadlineMs: 5_000,
      signal: client.signal,
    });
    setTimeout(() => client.abort(), 20);
    expect(await pending).toEqual({ ok: false, code: "aborted" });
    expect(second).not.toHaveBeenCalled();
  });

  it("انقطاع العميل أثناء البثّ ينهي المولِّد بلا حدث ويلغي المحرّك", async () => {
    const client = new AbortController();
    let engineSignal: AbortSignal | null = null;
    const body = (async function* () {
      yield text("أ");
      await new Promise<never>(() => undefined);
    })();
    const r = await openFinnReply(
      [
        attempt("openai", (s) => {
          engineSignal = s;
          return body;
        }),
      ],
      { ...OPTS, totalDeadlineMs: 5_000, signal: client.signal },
    );
    if (!r.ok) throw new Error("expected ok");
    const it = r.events[Symbol.asyncIterator]();
    expect((await it.next()).value).toEqual({ type: "delta", text: "أ" });
    client.abort();
    expect((await it.next()).done).toBe(true);
    expect((engineSignal as AbortSignal | null)?.aborted).toBe(true);
  });

  it("إغلاق المولِّد من المستهلك (cancel) يلغي المحرّك", async () => {
    let engineSignal: AbortSignal | null = null;
    const r = await openFinnReply(
      [
        attempt("openai", (s) => {
          engineSignal = s;
          return parts([text("أ"), text("ب"), finish()]);
        }),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    const it = r.events[Symbol.asyncIterator]();
    await it.next();
    await it.return?.(undefined);
    expect((engineSignal as AbortSignal | null)?.aborted).toBe(true);
  });

  it("onFailure يُستدعى بخطأ المحاولة الفاشلة قبل أي نصّ — لا بعده", async () => {
    const onFailure = vi.fn();
    const e = err(429);
    const r = await openFinnReply(
      [
        attempt("gemini", () => parts([e]), { onFailure }),
        attempt("gemini", () => parts([text("ج"), finish()])),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure.mock.calls[0][0]).toBe((e as { error: unknown }).error);
  });

  it("السجلّ يتلقّى engine وcode وstatus فقط — لا نصّ ولا جسم", async () => {
    const log = vi.fn();
    await openFinnReply(
      [
        attempt("openai", () =>
          parts([err(429, { responseBody: "SECRET-BODY", url: "https://api.openai.com/x" })]),
        ),
        attempt("gemini", () => parts([text("ج"), finish()])),
      ],
      { ...OPTS, signal: new AbortController().signal, log },
    );
    expect(log).toHaveBeenCalledWith({ engine: "openai", code: "rate_limited", status: 429 });
    const dumped = JSON.stringify(log.mock.calls);
    expect(dumped).not.toMatch(/SECRET-BODY|secret text|api\.openai\.com/);
  });
});

describe("إثبات الأداة (المادة ٣٠)", () => {
  it("كاشف «الإفصاح»: لو لم يُمرَّر السبب لظهر null — والاختبار يلتقط ذلك", async () => {
    // محاولة تفشل بـ429 ثم تجيب الثانية؛ لو أُهمل تسجيل السبب لبقي fallback=null
    // وهو ما يعني سقوطًا صامتًا. نؤكّد أن القيمة الفعلية ليست null.
    const r = await openFinnReply(
      [
        attempt("openai", () => parts([err(429)])),
        attempt("gemini", () => parts([text("ج"), finish()])),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect(r.fallback).not.toBeNull();
    expect(r.engine).not.toBe("openai");
  });

  it("وسقوط GPT-ثم-نجاحه لا يُعلن احتياطيًّا: engine=openai وfallback=null", async () => {
    const r = await openFinnReply(
      [attempt("openai", () => parts([text("ج"), finish()])), attempt("gemini", never)],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect([r.engine, r.fallback]).toEqual(["openai", null]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ملاحظات المراجعة W5 #3 · #4 · #5 · #6 — كل اختبارٍ هنا جُرِّب أحمر على الشيفرة
// السابقة قبل الإصلاح (المادة ٣٠).
// ─────────────────────────────────────────────────────────────────────────────

const finishWith = (finishReason: string): FinnPart => ({
  type: "finish",
  truncated: finishReason === "length",
  finishReason,
});

/** خطأ كما يبنيه الـSDK: رمز HTTP + جسم JSON مُحلَّل في `data` (رمزٌ آلي لا نصّ). */
const apiError = (statusCode: number, data: unknown): Error =>
  Object.assign(new Error("provider said: secret text"), { statusCode, data });

describe("W5 #3 — ردٌّ مقطوع بعد بدء النصّ لا يُعلن مكتملًا", () => {
  const run = async (reason: string) => {
    const r = await openFinnReply(
      [attempt("openai", () => parts([text("function f() {"), finishWith(reason)]))],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    return drain(r.events);
  };

  it.each(["other", "unknown", "error", "content-filter"])(
    "finish=%s بعد نصّ ⇒ خطأ معلَن لا done",
    async (reason) => {
      const events = await run(reason);
      expect(events[0]).toEqual({ type: "delta", text: "function f() {" });
      expect(events.at(-1)).toEqual({ type: "error", code: "engine_error" });
      expect(events.some((e) => e.type === "done")).toBe(false);
    },
  );

  it.each(["stop", "tool-calls"])("finish=%s ⇒ done مكتمل", async (reason) => {
    expect((await run(reason)).at(-1)).toEqual({ type: "done", truncated: false });
  });

  it("finish=length ⇒ done مقطوع بالحدّ (truncated) لا خطأ", async () => {
    expect((await run("length")).at(-1)).toEqual({ type: "done", truncated: true });
  });
});

describe("W5 #4 — 400 من محرّكٍ لاحق (أو خطأ مفتاح/منطقة) لا يقطع السلسلة", () => {
  const GOOGLE_BAD_KEY = {
    error: {
      code: 400,
      status: "INVALID_ARGUMENT",
      message: "API key not valid. Please pass a valid API key.",
      details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "API_KEY_INVALID" }],
    },
  };

  it("GPT 429 ثم Gemini 400 ثم بوّابة سليمة ⇒ تجيب البوّابة", async () => {
    const gateway = vi.fn(() => parts([text("من البوّابة"), finish()]));
    const r = await openFinnReply(
      [
        attempt("openai", () => parts([err(429)])),
        attempt("gemini", () => parts([err(400)])),
        attempt("gemini", gateway),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect(gateway).toHaveBeenCalledTimes(1);
    // والسبب المعلَن يبقى سبب سقوط GPT لا سبب الـ400 اللاحق.
    expect(r).toMatchObject({ engine: "gemini", fallback: "rate_limited" });
  });

  it("GPT غير مهيّأ + مفتاح Gemini المباشر مرفوض بـ400 (API_KEY_INVALID) ⇒ البوّابة", async () => {
    const gateway = vi.fn(() => parts([text("من البوّابة"), finish()]));
    const r = await openFinnReply(
      [
        attempt("openai", () => parts([]), { skip: "not_configured" }),
        attempt("gemini", () => parts([{ type: "error", error: apiError(400, GOOGLE_BAD_KEY) }])),
        attempt("gemini", gateway),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect(gateway).toHaveBeenCalledTimes(1);
  });

  it("كلها تفشل (429 ثم 400 ثم 400) ⇒ engine_error برمزٍ عامّ", async () => {
    const r = await openFinnReply(
      [
        attempt("openai", () => parts([err(429)])),
        attempt("gemini", () => parts([err(400)])),
        attempt("gemini", () => parts([err(400)])),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    expect(r).toEqual({ ok: false, code: "engine_error" });
  });

  it("400 من أول محرّكٍ جُرِّب (طلبٌ معطوب) يبقى قاطعًا — لا إنفاق على ثانٍ", async () => {
    const second = vi.fn(() => parts([text("لا"), finish()]));
    const r = await openFinnReply(
      [attempt("openai", () => parts([err(400)])), attempt("gemini", second)],
      { ...OPTS, signal: new AbortController().signal },
    );
    expect(r).toEqual({ ok: false, code: "bad_request" });
    expect(second).not.toHaveBeenCalled();
  });

  it("وclassify: 400 + API_KEY_INVALID ⇒ auth_failed يُسقط؛ 400 عاديّ ⇒ bad_request", () => {
    expect(classifyEngineError(apiError(400, GOOGLE_BAD_KEY))).toMatchObject({
      code: "auth_failed",
      fallback: true,
      status: 400,
    });
    expect(
      classifyEngineError(apiError(400, { error: { status: "FAILED_PRECONDITION" } })),
    ).toMatchObject({ code: "model_unavailable", fallback: true });
    expect(
      classifyEngineError(apiError(400, { error: { status: "INVALID_ARGUMENT" } })),
    ).toMatchObject({ code: "bad_request", fallback: false });
  });
});

describe("W5 #5 — مهلة أول مخرج لا يعطّلها progress", () => {
  const stalledAfter = (first: FinnPart): AsyncIterable<FinnPart> => ({
    [Symbol.asyncIterator]: () => {
      let sent = false;
      return {
        next: () => {
          if (!sent) {
            sent = true;
            return Promise.resolve({ done: false, value: first });
          }
          return new Promise<IteratorResult<FinnPart>>(() => undefined);
        },
        return: () => Promise.resolve({ done: true, value: undefined }),
      };
    },
  });

  it("progress ثم صمت ⇒ يسقط إلى الاحتياطي عند مهلة أول مخرج لا عند السقف الكلّي", async () => {
    const started = Date.now();
    const r = await openFinnReply(
      [
        attempt("openai", () => stalledAfter({ type: "progress" })),
        attempt("gemini", () => parts([text("احتياطي"), finish()])),
      ],
      { firstTokenDeadlineMs: 60, totalDeadlineMs: 2_000, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error(`expected ok, got ${r.code}`);
    expect(r).toMatchObject({ engine: "gemini", fallback: "timeout" });
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it("وبلا أي جزء (صمتٌ كامل) سلوكه كما كان — مرجعٌ للمقارنة", async () => {
    const r = await openFinnReply(
      [attempt("openai", never), attempt("gemini", () => parts([text("ج"), finish()]))],
      { firstTokenDeadlineMs: 60, totalDeadlineMs: 2_000, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect(r).toMatchObject({ engine: "gemini", fallback: "timeout" });
  });

  it("progress ثم نصّ ضمن المهلة ⇒ يجيب المحرّك نفسه بلا سقوط", async () => {
    const r = await openFinnReply(
      [
        attempt("openai", () => parts([{ type: "progress" }, text("س"), finish()])),
        attempt("gemini", never),
      ],
      { firstTokenDeadlineMs: 60, totalDeadlineMs: 2_000, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect([r.engine, r.fallback]).toEqual(["openai", null]);
  });
});

describe("W5 #6 — نفاد رصيد OpenAI يُعلَن billing لا rate_limited", () => {
  it("429 + data.error.code=insufficient_quota ⇒ billing", () => {
    expect(
      classifyEngineError(apiError(429, { error: { code: "insufficient_quota", type: "x" } })),
    ).toMatchObject({ code: "billing", fallback: true, status: 429 });
  });

  it("429 + data.error.type=insufficient_quota ⇒ billing أيضًا", () => {
    expect(
      classifyEngineError(apiError(429, { error: { type: "insufficient_quota" } })),
    ).toMatchObject({ code: "billing" });
  });

  it("429 عادي أو برمزٍ آخر ⇒ rate_limited", () => {
    expect(classifyEngineError(apiError(429, undefined))).toMatchObject({ code: "rate_limited" });
    expect(
      classifyEngineError(apiError(429, { error: { code: "rate_limit_exceeded" } })),
    ).toMatchObject({ code: "rate_limited" });
  });

  it("النصّ الحرّ وحده لا يكفي: لا يُقرأ message ولا responseBody", () => {
    const sneaky = Object.assign(new Error("insufficient_quota: you exceeded"), {
      statusCode: 429,
      responseBody: '{"error":{"code":"insufficient_quota"}}',
    });
    expect(classifyEngineError(sneaky)).toMatchObject({ code: "rate_limited" });
  });

  it("النتيجة رمزٌ عامّ: لا تُعاد قيمة المزوّد", () => {
    const c = classifyEngineError(
      apiError(429, { error: { code: "insufficient_quota", message: "SECRET-TEXT" } }),
    );
    expect(JSON.stringify(c)).not.toMatch(/SECRET-TEXT|insufficient_quota/);
  });

  it("وإفصاح السقوط يحمل billing على الاستجابة", async () => {
    const r = await openFinnReply(
      [
        attempt("openai", () =>
          parts([
            { type: "error", error: apiError(429, { error: { code: "insufficient_quota" } }) },
          ]),
        ),
        attempt("gemini", () => parts([text("ج"), finish()])),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect(r.fallback).toBe("billing");
  });
});

describe("أجزاء الأداة في سلسلة المحرّكات (٢٠٢٦/١٠/٢٤)", () => {
  const tool = (phase: "start" | "done" | "error" = "start"): FinnPart => ({
    type: "tool",
    name: "platform_status",
    phase,
  });

  it("أداةٌ قبل أول نصّ لا تُعدّ إجابةً ولا تفكّ المهلة، وتُبثّ قبل أول نصّ", async () => {
    const r = await openFinnReply(
      [attempt("openai", () => parts([tool("start"), tool("done"), text("جاهز"), finish()]))],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    const events: unknown[] = [];
    for await (const e of r.events) events.push(e);
    expect(events).toEqual([
      { type: "tool", name: "platform_status", phase: "start" },
      { type: "tool", name: "platform_status", phase: "done" },
      { type: "delta", text: "جاهز" },
      { type: "done", truncated: false },
    ]);
  });

  it("أداةٌ ثم صمتٌ ⇒ المهلة تُسقط إلى الاحتياطي معلَنًا (الأداة لا تُفكّ المهلة)", async () => {
    const stuckAfterTool = (): AsyncIterable<FinnPart> => ({
      [Symbol.asyncIterator]: () => {
        let sent = false;
        return {
          next: () => {
            if (!sent) {
              sent = true;
              return Promise.resolve({ done: false as const, value: tool("start") });
            }
            return new Promise<IteratorResult<FinnPart>>(() => undefined);
          },
          return: () => Promise.resolve({ done: true, value: undefined }),
        };
      },
    });
    const r = await openFinnReply(
      [
        attempt("openai", stuckAfterTool),
        attempt("gemini", () => parts([text("من الاحتياطي"), finish()])),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!r.ok) throw new Error("expected ok");
    expect(r.engine).toBe("gemini");
    expect(r.fallback).toBe("timeout");
    const events: unknown[] = [];
    for await (const e of r.events) events.push(e);
    // أحداث أداة المحرّك الساقط لا تُنسب للمحرّك الذي أجاب.
    expect(events).toEqual([
      { type: "delta", text: "من الاحتياطي" },
      { type: "done", truncated: false },
    ]);
  });

  it("أداةٌ بعد النصّ تمرّ في موضعها، وأداةٌ بلا نصّ ثم finish ⇒ ردٌّ فارغٌ عطلٌ لا إجابة", async () => {
    const mid = await openFinnReply(
      [
        attempt("openai", () =>
          parts([text("أ"), tool("start"), tool("done"), text("ب"), finish()]),
        ),
      ],
      { ...OPTS, signal: new AbortController().signal },
    );
    if (!mid.ok) throw new Error("expected ok");
    const events: unknown[] = [];
    for await (const e of mid.events) events.push(e);
    expect(events.map((e) => (e as { type: string }).type)).toEqual([
      "delta",
      "tool",
      "tool",
      "delta",
      "done",
    ]);

    const empty = await openFinnReply([attempt("openai", () => parts([tool("start"), finish()]))], {
      ...OPTS,
      signal: new AbortController().signal,
    });
    expect(empty.ok).toBe(false);
  });
});
