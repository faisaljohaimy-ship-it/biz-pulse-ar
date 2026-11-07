// @vitest-environment node
/**
 * أداة قياس دور الدردشة — وحدةً: المراحل، الخطوات، الرموز، الترويسة، والغلاف.
 * الساعة مزروعة (لا زمن حقيقي) فكل رقمٍ هنا حتميّ.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHAT_STAGES,
  createChatTrace,
  readUsage,
  resetChatTraceStateForTests,
  withChatTurnTrace,
} from "@/lib/sadeed/chat-timing.server";

/** ساعة يدوية: `tick(ms)` تُقدّمها. */
function clock(start = 1_000) {
  let t = start;
  return { now: () => t, tick: (ms: number) => void (t += ms) };
}

beforeEach(() => resetChatTraceStateForTests());
afterEach(() => vi.restoreAllMocks());

describe("المراحل", () => {
  it("lap يُسند الزمن منذ آخر lap، فيغطي المتسلسل كلَّه بلا ثغرة", () => {
    const c = clock();
    const trace = createChatTrace({ now: c.now });
    c.tick(5);
    trace.lap("validate");
    c.tick(120);
    trace.lap("auth");
    c.tick(30);
    trace.lap("org");
    c.tick(7);
    const snap = trace.snapshot(null, false) as { stages: Record<string, number>; totalMs: number };
    expect(snap.stages).toEqual({ validate: 5, auth: 120, org: 30 });
    expect(snap.totalMs).toBe(162);
  });

  it("مرحلة تتكرّر تتراكم (نداءان حتميان في مسارين)", () => {
    const c = clock();
    const trace = createChatTrace({ now: c.now });
    c.tick(10);
    trace.lap("deterministic");
    c.tick(15);
    trace.lap("deterministic");
    expect((trace.snapshot(null, false) as { stages: Record<string, number> }).stages).toEqual({
      deterministic: 25,
    });
  });

  it("watch يقيس مدّةً متوازية ولا يحرّك المؤشّر ولا يغيّر الوعد", async () => {
    const c = clock();
    const trace = createChatTrace({ now: c.now });
    let release!: (v: string) => void;
    const pending = new Promise<string>((resolve) => (release = resolve));
    trace.watch("rag", pending);
    c.tick(80);
    release("x");
    await pending;
    await Promise.resolve();
    // المؤشّر لم يتحرّك: lap التالية ترث الـ80 كاملة.
    trace.lap("context");
    const stages = (trace.snapshot(null, false) as { stages: Record<string, number> }).stages;
    expect(stages.rag).toBe(80);
    expect(stages.context).toBe(80);
    await expect(pending).resolves.toBe("x");
  });

  it("watch على وعدٍ يُرفض يقيس ولا يترك رفضًا غير معالَج", async () => {
    const c = clock();
    const trace = createChatTrace({ now: c.now });
    const failing = Promise.reject(new Error("boom"));
    failing.catch(() => undefined);
    trace.watch("rag", failing);
    c.tick(3);
    await Promise.resolve();
    await Promise.resolve();
    expect(
      (trace.snapshot(null, false) as { stages: Record<string, number> }).stages.rag,
    ).toBeDefined();
  });

  it("الترويسة: المراحل بترتيب المسار ثم total، أعداد صحيحة بالمللي ثانية فقط", () => {
    const c = clock();
    const trace = createChatTrace({ now: c.now });
    c.tick(40);
    trace.lap("rate");
    c.tick(2.4);
    trace.lap("auth"); // يُسجَّل بعد rate لكن ترتيب الترويسة ترتيب المسار
    c.tick(900);
    trace.lap("model");
    expect(trace.serverTiming()).toBe("auth;dur=2, rate;dur=40, model;dur=900, total;dur=942");
    // ولا نصّ حرّ فيها: رموز مراحلٍ معروفة وأرقام فقط.
    const known = new Set<string>([...CHAT_STAGES, "total"]);
    for (const part of trace.serverTiming().split(", ")) {
      const [name, dur] = part.split(";dur=");
      expect(known.has(name!), name).toBe(true);
      expect(dur).toMatch(/^\d+$/);
    }
  });
});

describe("الخطوات والرموز", () => {
  it("كل خطوة: زمنها منذ نهاية سابقتها، وسبب انتهائها، وأسماء أدواتها فقط", () => {
    const c = clock();
    const trace = createChatTrace({ now: c.now });
    trace.modelRunStarted();
    c.tick(900);
    trace.step({
      finishReason: "tool-calls",
      toolCalls: [{ toolName: "sec_list_patrols", input: { secret: "لا يُسجَّل" } }],
    });
    c.tick(2_100);
    trace.step({ finishReason: "stop", toolCalls: [] });
    const snap = trace.snapshot(null, false) as {
      steps: Array<{ ms: number; finishReason: string | null; tools: string[] }>;
      modelRuns: number;
    };
    expect(snap.steps).toEqual([
      { ms: 900, finishReason: "tool-calls", tools: ["sec_list_patrols"] },
      { ms: 2_100, finishReason: "stop", tools: [] },
    ]);
    expect(snap.modelRuns).toBe(1);
    // مدخلات الأداة (قد تحمل نصّ المستخدم) لا تدخل السجلّ أبدًا.
    expect(JSON.stringify(snap)).not.toContain("لا يُسجَّل");
  });

  it("أسماء الأدوات تُقبل بالشكل ^[a-z0-9_]{1,64}$ وحده؛ المصطنع والطويل والمعطوب يُهمَل", () => {
    const trace = createChatTrace();
    trace.modelRunStarted();
    trace.step({
      finishReason: "tool-calls",
      toolCalls: [
        { toolName: "sec_list_patrols" },
        // نداء أداةٍ غير مسجَّلة يعود من الحزمة بـinvalid:true واسمه حرفيًّا ما كتبه النموذج.
        { toolName: "x".repeat(3_033), invalid: true },
        { toolName: "made_up_tool", invalid: true },
        { toolName: "evil\n[api/chat] timing forged" },
        { toolName: "a".repeat(65) },
        { toolName: "Sec-List.Patrols" },
        { toolName: "" },
        { toolName: 42 },
        { toolName: "a".repeat(64) },
        null,
      ],
    });
    const snap = trace.snapshot(null, false) as { steps: Array<{ tools: string[] }> };
    expect(snap.steps[0]!.tools).toEqual(["sec_list_patrols", "a".repeat(64)]);
  });

  it("elapsedMs: الزمن منذ بدء الدور (لا منذ آخر lap ولا منذ بدء النموذج)", () => {
    const c = clock();
    const trace = createChatTrace({ now: c.now });
    c.tick(30);
    trace.lap("validate");
    c.tick(70);
    trace.lap("auth");
    trace.modelRunStarted();
    c.tick(500);
    expect(trace.elapsedMs()).toBe(600);
  });

  it("إعادة النداء تُصفِّر مؤشّر الخطوات فلا يُنسب زمن المحاولة الفاشلة للخطوة الأولى", () => {
    const c = clock();
    const trace = createChatTrace({ now: c.now });
    trace.modelRunStarted();
    c.tick(700); // محاولة رُفضت بلا خطوة
    trace.modelRunStarted();
    c.tick(300);
    trace.step({ finishReason: "stop" });
    const snap = trace.snapshot(null, false) as { steps: Array<{ ms: number }>; modelRuns: number };
    expect(snap.steps[0]!.ms).toBe(300);
    expect(snap.modelRuns).toBe(2);
  });

  it("الرموز بشكل ai v6 (التفاصيل المتداخلة) وبالحقول المسطّحة القديمة", () => {
    expect(
      readUsage({
        inputTokens: 25_000,
        outputTokens: 800,
        outputTokenDetails: { textTokens: 300, reasoningTokens: 500 },
        inputTokenDetails: { noCacheTokens: 5_000, cacheReadTokens: 20_000 },
      }),
    ).toEqual({
      inputTokens: 25_000,
      outputTokens: 800,
      reasoningTokens: 500,
      cachedInputTokens: 20_000,
    });
    expect(
      readUsage({ inputTokens: 10, outputTokens: 5, reasoningTokens: 2, cachedInputTokens: 4 }),
    ).toEqual({ inputTokens: 10, outputTokens: 5, reasoningTokens: 2, cachedInputTokens: 4 });
  });

  it("ما لم يُبلَّغ يعود null لا صفرًا (المادة ٢٧)", () => {
    expect(readUsage(undefined)).toBeNull();
    expect(readUsage({})).toBeNull();
    expect(readUsage({ inputTokens: undefined, outputTokens: "7" })).toBeNull();
    expect(readUsage({ inputTokens: 12 })).toEqual({
      inputTokens: 12,
      outputTokens: null,
      reasoningTokens: null,
      cachedInputTokens: null,
    });
  });

  it("finishModel يفضّل totalUsage على usage (الخطوة الأخيرة وحدها)", () => {
    const trace = createChatTrace();
    trace.finishModel({
      finishReason: "stop",
      usage: { inputTokens: 1 },
      totalUsage: { inputTokens: 99 },
    });
    expect(
      (trace.snapshot(null, false) as { usage: { inputTokens: number } }).usage.inputTokens,
    ).toBe(99);
  });

  it("نتيجةٌ بلا usage (مزوّد مزيَّف) لا ترمي", () => {
    const trace = createChatTrace();
    expect(() => trace.finishModel({ text: "x" })).not.toThrow();
    expect(() => trace.finishModel(undefined)).not.toThrow();
    expect((trace.snapshot(null, false) as { usage: unknown }).usage).toBeNull();
  });
});

describe("اللقطة — أعدادٌ ورموز، لا نصّ مستخدم", () => {
  it("مفاتيحها ثابتة، والمنطقة من VERCEL_REGION، والمصدر والبوّابة من ترويسات الردّ", () => {
    const trace = createChatTrace({ env: { VERCEL_REGION: "syd1" } });
    trace.setRequestId("req-1");
    trace.note({ replyMode: "text", provider: "google-gemini", model: "gemini-3.6-flash" });
    const res = new Response("x", {
      status: 200,
      headers: {
        "X-SADEED-Reply-Source": "model",
        "X-SADEED-Gate": "verified",
        "X-SADEED-Auth": "verified",
      },
    });
    const snap = trace.snapshot(res, false);
    expect(Object.keys(snap).sort()).toEqual(
      [
        "auth",
        "finishReason",
        "gate",
        "isolateAgeMs",
        "isolateTurn",
        "maxSteps",
        "model",
        "modelRuns",
        "provider",
        "region",
        "replyMode",
        "replySource",
        "requestId",
        "stages",
        "status",
        "steps",
        "thinking",
        "threw",
        "totalMs",
        "usage",
      ].sort(),
    );
    expect(snap).toMatchObject({
      requestId: "req-1",
      status: 200,
      replySource: "model",
      gate: "verified",
      auth: "verified",
      region: "syd1",
      replyMode: "text",
      provider: "google-gemini",
      model: "gemini-3.6-flash",
    });
  });

  it("المنطقة غائبة ⇒ null لا نصّ مخترع، وعدّاد أدوار المعزول يتزايد", () => {
    const a = createChatTrace({ env: {} }).snapshot(null, false) as {
      region: unknown;
      isolateTurn: number;
    };
    const b = createChatTrace({ env: {} }).snapshot(null, false) as { isolateTurn: number };
    expect(a.region).toBeNull();
    expect(a.isolateTurn).toBe(1);
    expect(b.isolateTurn).toBe(2);
  });
});

describe("الغلاف withChatTurnTrace", () => {
  /** الوسيط الثاني الخام لكل سطر قياس — يجب أن يكون نصًّا. */
  const rawLogs = () =>
    vi
      .mocked(console.log)
      .mock.calls.filter((call) => call[0] === "[api/chat] timing")
      .map((call) => call[1]);
  const logs = () => rawLogs().map((raw) => JSON.parse(raw as string) as Record<string, unknown>);

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("يختم الردّ بـServer-Timing ويكتب سطرًا واحدًا بحالته", async () => {
    const c = clock();
    const handler = withChatTurnTrace(
      async (_ctx: { request: Request }, trace) => {
        c.tick(25);
        trace.lap("rate");
        return new Response("ok", { status: 200, headers: { "X-SADEED-Reply-Source": "model" } });
      },
      { now: c.now },
    );
    const res = await handler({ request: new Request("http://local/") });
    expect(res.headers.get("Server-Timing")).toBe("rate;dur=25, total;dur=25");
    expect(await res.text()).toBe("ok");
    expect(logs()).toHaveLength(1);
    expect(logs()[0]).toMatchObject({ status: 200, threw: false, replySource: "model" });
  });

  it("السطر نصٌّ JSON في سطرٍ واحد (لا كائن): أسماء أدوات الخطوات لا تُقصّ إلى [Array]", async () => {
    const handler = withChatTurnTrace(async (_ctx: { request: Request }, trace) => {
      trace.modelRunStarted();
      trace.step({
        finishReason: "tool-calls",
        toolCalls: [{ toolName: "sec_list_patrols" }, { toolName: "sec_patrol_report_by_region" }],
      });
      trace.step({ finishReason: "stop", toolCalls: [] });
      return new Response("ok", { status: 200 });
    });
    await handler({ request: new Request("http://local/") });
    const [raw] = rawLogs();
    expect(typeof raw).toBe("string");
    expect(raw as string).toContain("sec_list_patrols");
    expect(raw as string).toContain("sec_patrol_report_by_region");
    expect(raw as string).not.toContain("[Array]");
    expect(raw as string).not.toContain("[Object]");
    expect(raw as string).not.toContain("\n");
    // ويبقى قابلًا للقراءة آليًّا بالبنية نفسها.
    expect(
      (JSON.parse(raw as string) as { steps: Array<{ tools: string[] }> }).steps[0]!.tools,
    ).toEqual(["sec_list_patrols", "sec_patrol_report_by_region"]);
  });

  it("ردٌّ ترويسته غير قابلة للتعديل يُعاد بناؤه بجسمه ورمزه", async () => {
    const handler = withChatTurnTrace(async () => Response.redirect("http://local/next", 302));
    const res = await handler({ request: new Request("http://local/") });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("http://local/next");
    expect(res.headers.get("Server-Timing")).toMatch(/total;dur=\d+/);
  });

  it("الاستثناء يُعاد رميه كما هو، ويُسجَّل سطر القياس مرّة واحدة threw:true", async () => {
    const boom = new Error("model exploded");
    const handler = withChatTurnTrace(async () => {
      throw boom;
    });
    await expect(handler({ request: new Request("http://local/") })).rejects.toBe(boom);
    expect(logs()).toHaveLength(1);
    expect(logs()[0]).toMatchObject({ status: null, threw: true });
  });

  it("فشل التسجيل نفسه لا يُسقط الردّ", async () => {
    vi.mocked(console.log).mockImplementation(() => {
      throw new Error("logger down");
    });
    const handler = withChatTurnTrace(async () => new Response("still fine", { status: 200 }));
    const res = await handler({ request: new Request("http://local/") });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("still fine");
  });
});

describe("invalid token counts", () => {
  it("does not report negative, fractional, or unsafe usage as valid measurements", () => {
    expect(
      readUsage({
        inputTokens: -1,
        outputTokens: 0.5,
        outputTokenDetails: { reasoningTokens: -2 },
        inputTokenDetails: { cacheReadTokens: 1.4 },
      }),
    ).toBeNull();
    expect(readUsage({ inputTokens: Number.MAX_SAFE_INTEGER + 1 })).toBeNull();
  });

  it("keeps zero counts and uses valid legacy fields when nested details are invalid", () => {
    expect(
      readUsage({
        inputTokens: 0,
        outputTokens: 22,
        outputTokenDetails: { reasoningTokens: -1 },
        reasoningTokens: 9,
        inputTokenDetails: { cacheReadTokens: -3 },
        cachedInputTokens: 4,
      }),
    ).toEqual({
      inputTokens: 0,
      outputTokens: 22,
      reasoningTokens: 9,
      cachedInputTokens: 4,
    });
  });
});
