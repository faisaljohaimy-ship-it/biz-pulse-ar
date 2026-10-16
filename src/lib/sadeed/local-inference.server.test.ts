/**
 * المزوّد المحليّ الاختياري — الإعداد والتحقّق والبروتوكول (٢٠٢٦/١٠/١٦).
 *
 * لا شبكة: `fetch` مزروعٌ يتكلّم بروتوكول OpenAI-compatible كما يتكلّمه
 * Ollama (`/v1/chat/completions`)، والـSDK الحقيقي يحلّله — فالاختبار يمسّ
 * الطبقة التي ستعمل فعلًا، لا نسخةً عنها.
 */
import { afterEach, describe, expect, it } from "vitest";
import { generateText, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import {
  coolLocalInference,
  createLocalInferenceModel,
  describeLocalInferenceError,
  LOCAL_INFERENCE_DEFAULT_TIMEOUT_MS,
  localInferenceCoolingDown,
  localInferenceSignal,
  resetLocalInferenceCooldown,
  resolveLocalInference,
  type LocalInferenceConfig,
} from "./local-inference.server";

const LOOPBACK = {
  SADEED_LOCAL_INFERENCE_ENABLED: "true",
  SADEED_LOCAL_INFERENCE_BASE_URL: "http://127.0.0.1:11434/v1",
  SADEED_LOCAL_INFERENCE_MODEL: "qwen2.5:7b-instruct",
};
const SECRET = "sk-local-test-not-a-real-secret";

function enabled(env: Record<string, string | undefined>): LocalInferenceConfig {
  const r = resolveLocalInference(env);
  if (!r.enabled) throw new Error(`expected enabled, got ${JSON.stringify(r)}`);
  return r;
}

function completion(content: string | null, extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({
      id: "chatcmpl-1",
      object: "chat.completion",
      created: 1,
      model: "qwen2.5:7b-instruct",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content, ...extra },
          finish_reason: extra.tool_calls ? "tool_calls" : "stop",
        },
      ],
      usage: { prompt_tokens: 12, completion_tokens: 6, total_tokens: 18 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

afterEach(() => resetLocalInferenceCooldown());

describe("الإعداد — مطفأ افتراضيًّا ويفشل مغلقًا", () => {
  it("بلا راية ⇐ مطفأ، ولو اكتمل الباقي", () => {
    expect(resolveLocalInference({})).toEqual({ enabled: false, reason: "disabled" });
    const { SADEED_LOCAL_INFERENCE_ENABLED: _off, ...rest } = LOOPBACK;
    expect(resolveLocalInference(rest)).toEqual({ enabled: false, reason: "disabled" });
    expect(
      resolveLocalInference({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_ENABLED: "false" }).enabled,
    ).toBe(false);
  });

  it("Ollama محليّ على http بلا مفتاح ⇐ مقبول، والقيم الافتراضية آمنة", () => {
    const c = enabled(LOOPBACK);
    expect(c.baseURL).toBe("http://127.0.0.1:11434/v1");
    expect(c.hostClass).toBe("loopback");
    expect(c.apiKey).toBeNull();
    expect(c.mode).toBe("fallback");
    expect(c.timeoutMs).toBe(LOCAL_INFERENCE_DEFAULT_TIMEOUT_MS);
    expect(c.maxRetries).toBe(0);
    expect(
      enabled({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_BASE_URL: "http://localhost:11434/v1/" })
        .baseURL,
    ).toBe("http://localhost:11434/v1");
    expect(
      enabled({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_BASE_URL: "http://[::1]:8000/v1" }).hostClass,
    ).toBe("loopback");
  });

  it("مضيفٌ بعيد يتطلّب TLS ومفتاحًا معًا — لا خادم استدلال عاريًا على الإنترنت", () => {
    const remoteHttp = resolveLocalInference({
      ...LOOPBACK,
      SADEED_LOCAL_INFERENCE_BASE_URL: "http://203.0.113.7:11434/v1",
      SADEED_LOCAL_INFERENCE_API_KEY: SECRET,
    });
    expect(remoteHttp).toMatchObject({
      enabled: false,
      reason: "invalid",
      problems: ["remote_requires_https"],
    });

    const remoteNoKey = resolveLocalInference({
      ...LOOPBACK,
      SADEED_LOCAL_INFERENCE_BASE_URL: "https://llm.example.com/v1",
    });
    expect(remoteNoKey).toMatchObject({ enabled: false, problems: ["remote_requires_api_key"] });

    const ok = enabled({
      ...LOOPBACK,
      SADEED_LOCAL_INFERENCE_BASE_URL: "https://llm.example.com/v1",
      SADEED_LOCAL_INFERENCE_API_KEY: SECRET,
    });
    expect(ok.hostClass).toBe("remote");
    expect(ok.apiKey).toBe(SECRET);
  });

  it("عنوانٌ بحروف اعتماد أو استعلام أو بروتوكولٍ آخر ⇐ مرفوض", () => {
    const bad = (url: string) =>
      resolveLocalInference({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_BASE_URL: url });
    expect(bad("http://user:pw@127.0.0.1:11434/v1")).toMatchObject({
      problems: ["base_url_credentials"],
    });
    expect(bad("http://127.0.0.1:11434/v1?key=x")).toMatchObject({ problems: ["base_url_query"] });
    expect(bad("file:///etc/passwd")).toMatchObject({ enabled: false, reason: "invalid" });
    expect(bad("not a url")).toMatchObject({ problems: ["base_url_invalid"] });
    expect(bad("")).toMatchObject({ problems: ["base_url_missing"] });
  });

  it("اسم نموذجٍ خارج الصيغة ⇐ مرفوض", () => {
    for (const m of ["", "../../etc", "a b", "x".repeat(200), "model;rm"]) {
      const r = resolveLocalInference({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_MODEL: m });
      expect(r.enabled, m).toBe(false);
    }
    for (const m of ["llama3.1:8b", "Qwen/Qwen2.5-7B-Instruct", "gemma-2-9b-it"]) {
      expect(enabled({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_MODEL: m }).modelId).toBe(m);
    }
  });

  it("المهلة والمحاولات محصورة — لا انتظار مفتوح ولا إعادة بلا حدّ", () => {
    expect(enabled({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_TIMEOUT_MS: "5" }).timeoutMs).toBe(1_000);
    expect(enabled({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_TIMEOUT_MS: "9999999" }).timeoutMs).toBe(
      60_000,
    );
    expect(enabled({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_TIMEOUT_MS: "abc" }).timeoutMs).toBe(
      20_000,
    );
    expect(enabled({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_MAX_RETRIES: "50" }).maxRetries).toBe(2);
    expect(enabled({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_MAX_RETRIES: "-3" }).maxRetries).toBe(0);
    expect(enabled({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_MODE: "PRIMARY" }).mode).toBe("primary");
    expect(enabled({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_MODE: "anything" }).mode).toBe("fallback");
  });

  it("المشاكل أسماءٌ ثابتة — لا قيمة سرّية ولا عنوان فيها", () => {
    const r = resolveLocalInference({
      SADEED_LOCAL_INFERENCE_ENABLED: "1",
      SADEED_LOCAL_INFERENCE_BASE_URL: `http://admin:${SECRET}@10.0.0.5:11434/v1?token=${SECRET}`,
      SADEED_LOCAL_INFERENCE_MODEL: "bad model",
      SADEED_LOCAL_INFERENCE_API_KEY: SECRET,
    });
    const text = JSON.stringify(r);
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain("10.0.0.5");
    expect(r.enabled).toBe(false);
  });
});

describe("البروتوكول — الـSDK الحقيقي فوق fetch مزروع", () => {
  it("يرسل إلى /chat/completions بالمفتاح والنموذج، ويعيد العربية كما هي", async () => {
    const config = enabled({
      ...LOOPBACK,
      SADEED_LOCAL_INFERENCE_BASE_URL: "https://llm.example.com/v1",
      SADEED_LOCAL_INFERENCE_API_KEY: SECRET,
    });
    const seen: { url: string; auth: string | null; body: Record<string, unknown> }[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push({
        url: String(input),
        auth: new Headers(init?.headers).get("authorization"),
        body: JSON.parse(String(init?.body)),
      });
      return completion("مرحبًا، الحالة الأمنية مستقرة في المناطق الأربع.");
    }) as typeof fetch;

    const r = await generateText({
      model: createLocalInferenceModel(config, fetchImpl),
      system: "أنت سَدِيد.",
      messages: [
        { role: "user", content: "السؤال الأول" },
        { role: "assistant", content: "الجواب الأول" },
        { role: "user", content: "ما الحالة؟" },
      ],
      maxRetries: 0,
    });

    expect(r.text).toBe("مرحبًا، الحالة الأمنية مستقرة في المناطق الأربع.");
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe("https://llm.example.com/v1/chat/completions");
    expect(seen[0].auth).toBe(`Bearer ${SECRET}`);
    expect(seen[0].body.model).toBe("qwen2.5:7b-instruct");
    // السجلّ كاملًا بترتيبه: النظام ثم الأدوار الثلاثة.
    const msgs = seen[0].body.messages as { role: string; content: string }[];
    expect(msgs.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(msgs[2].content).toBe("الجواب الأول");
  });

  it("محليّ بلا مفتاح ⇐ لا ترويسة Authorization تُختلق", async () => {
    let auth: string | null = "unset";
    const fetchImpl = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      auth = new Headers(init?.headers).get("authorization");
      return completion("نعم.");
    }) as typeof fetch;
    await generateText({
      model: createLocalInferenceModel(enabled(LOOPBACK), fetchImpl),
      prompt: "؟",
      maxRetries: 0,
    });
    expect(auth).toBeNull();
  });

  it("الأدوات تعمل عبر البروتوكول: نداء أداة ثم جوابٌ نهائيّ", async () => {
    let call = 0;
    const bodies: Record<string, unknown>[] = [];
    const fetchImpl = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      call++;
      if (call === 1) {
        return completion(null, {
          tool_calls: [
            {
              id: "call_1",
              type: "function",
              function: {
                name: "count_open_permits",
                arguments: JSON.stringify({ region: "الغربية" }),
              },
            },
          ],
        });
      }
      return completion("في الغربية ثلاثة تصاريح نشطة.");
    }) as typeof fetch;

    const executed: unknown[] = [];
    const r = await generateText({
      model: createLocalInferenceModel(enabled(LOOPBACK), fetchImpl),
      prompt: "كم تصريحًا نشطًا في الغربية؟",
      tools: {
        count_open_permits: tool({
          description: "عدد التصاريح النشطة",
          inputSchema: z.object({ region: z.string() }),
          execute: async (input) => {
            executed.push(input);
            return { count: 3 };
          },
        }),
      },
      stopWhen: stepCountIs(4),
      maxRetries: 0,
    });

    expect(executed).toEqual([{ region: "الغربية" }]);
    expect(r.text).toBe("في الغربية ثلاثة تصاريح نشطة.");
    expect((bodies[0].tools as unknown[]).length).toBe(1);
    // الجولة الثانية تحمل نتيجة الأداة إلى النموذج.
    const second = bodies[1].messages as { role: string; content: string }[];
    expect(second.some((m) => m.role === "tool" && m.content.includes("3"))).toBe(true);
  });

  it("البثّ: الرموز تصل متتابعةً والعربية سليمةً عبر حدود القطع", async () => {
    const pieces = ["الحالة ", "مستقرة", " في الغربية."];
    const fetchImpl = (async () => {
      const enc = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const p of pieces) {
            const chunk = {
              id: "c",
              object: "chat.completion.chunk",
              created: 1,
              model: "m",
              choices: [{ index: 0, delta: { content: p }, finish_reason: null }],
            };
            controller.enqueue(enc.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          }
          controller.enqueue(
            enc.encode(
              `data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", created: 1, model: "m", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`,
            ),
          );
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
    }) as typeof fetch;

    const s = streamText({
      model: createLocalInferenceModel(enabled(LOOPBACK), fetchImpl),
      prompt: "؟",
      maxRetries: 0,
    });
    const got: string[] = [];
    for await (const d of s.textStream) got.push(d);
    expect(got).toEqual(pieces);
    expect(await s.text).toBe("الحالة مستقرة في الغربية.");
  });

  it("خادمٌ لا يردّ ⇐ تنقطع المهلة الصلبة ولا يعلق الطلب", async () => {
    const config = enabled({ ...LOOPBACK, SADEED_LOCAL_INFERENCE_TIMEOUT_MS: "1000" });
    const fetchImpl = ((_i: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      })) as typeof fetch;
    const t0 = Date.now();
    const err = await generateText({
      model: createLocalInferenceModel(config, fetchImpl),
      prompt: "؟",
      maxRetries: 0,
      abortSignal: localInferenceSignal(config),
    }).catch((e: unknown) => e);
    const elapsed = Date.now() - t0;
    expect(err).toBeInstanceOf(Error);
    expect(describeLocalInferenceError(err)).toBe("timeout");
    expect(elapsed).toBeGreaterThanOrEqual(950);
    expect(elapsed).toBeLessThan(3_000);
  });

  it("إلغاء العميل يقطع الطلب المحليّ فورًا", async () => {
    const config = enabled(LOOPBACK);
    const parent = new AbortController();
    const signal = localInferenceSignal(config, parent.signal);
    expect(signal.aborted).toBe(false);
    parent.abort();
    expect(signal.aborted).toBe(true);
  });
});

describe("أوصاف الأخطاء والتبريد", () => {
  it("الوصف صنفٌ ثابت — لا عنوان ولا نصّ خام", () => {
    expect(describeLocalInferenceError(new Error("connect ECONNREFUSED 10.1.2.3:11434"))).toBe(
      "unreachable",
    );
    expect(
      describeLocalInferenceError(new Error("Bad Request 400: model does not support tools")),
    ).toBe("http_400");
    const t = new Error("x");
    t.name = "TimeoutError";
    expect(describeLocalInferenceError(t)).toBe("timeout");
    expect(describeLocalInferenceError("weird")).toBe("error");
  });

  it("بعد الفشل يُتخطّى المحليّ دقيقةً ثم يعود", () => {
    const now = 1_000_000;
    expect(localInferenceCoolingDown(now)).toBe(false);
    coolLocalInference(60_000, now);
    expect(localInferenceCoolingDown(now + 59_999)).toBe(true);
    expect(localInferenceCoolingDown(now + 60_000)).toBe(false);
  });
});
