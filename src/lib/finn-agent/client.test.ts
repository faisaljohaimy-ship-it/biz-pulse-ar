// @vitest-environment node
/**
 * ناقل فِن في المتصفح — يرسل `messages` وحدها، ويقرأ البثّ، ويحوّل كل خطأ إلى جملة
 * عربية ثابتة. الشبكة مُحاكاة بـ`Response` حقيقية لا بنص.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { userFacingError } from "@/lib/errors/user-facing-error";

const net = vi.hoisted(() => ({
  calls: [] as Array<{ url: string; init: RequestInit }>,
  respond: null as null | ((init: RequestInit) => Promise<Response> | Response),
}));

vi.mock("@/lib/auth-fetch", () => ({
  authenticatedFetch: async (url: string, init: RequestInit) => {
    net.calls.push({ url, init });
    if (!net.respond) throw new Error("no responder");
    return net.respond(init);
  },
}));

import {
  FINN_ERROR_AR,
  FINN_FALLBACK_REASON_AR,
  classifyFinnHttpError,
  describeFinnReadiness,
  type FinnClientErrorKind,
} from "./copy";
import { engineFromHeader, streamFinnReply, type FinnReplyMeta } from "./client";
import { encodeFinnEvent, type FinnStreamEvent } from "./stream-protocol";

const enc = new TextEncoder();
function sse(events: FinnStreamEvent[], headers: Record<string, string> = {}, split = 0) {
  const wire = events.map(encodeFinnEvent).join("");
  const bytes = enc.encode(wire);
  const chunks: Uint8Array[] = [];
  const size = split > 0 ? split : bytes.length;
  for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.slice(i, i + size));
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(ch);
      c.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream", "X-FINN-Engine": "openai", ...headers },
  });
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function run(messages = [{ role: "user" as const, content: "س" }]) {
  const deltas: string[] = [];
  const metas: FinnReplyMeta[] = [];
  const result = await streamFinnReply({
    messages,
    signal: new AbortController().signal,
    onMeta: (m) => metas.push(m),
    onDelta: (t) => deltas.push(t),
  });
  return { result, deltas, metas };
}

beforeEach(() => {
  net.calls = [];
  net.respond = null;
});

describe("الإرسال", () => {
  it("يرسل POST إلى /api/finn/chat بـmessages وحدها (دورٌ ونصّ)", async () => {
    net.respond = () => sse([{ type: "done", truncated: false }]);
    await run([
      { role: "user", content: "س" },
      // @ts-expect-error — حقلٌ زائد لا يجب أن يعبر
      { role: "assistant", content: "ج", model: "gpt-5-pro", engine: "openai" },
    ]);
    expect(net.calls).toHaveLength(1);
    expect(net.calls[0].url).toBe("/api/finn/chat");
    expect(net.calls[0].init.method).toBe("POST");
    const body = JSON.parse(String(net.calls[0].init.body));
    expect(Object.keys(body)).toEqual(["messages"]);
    expect(body.messages).toEqual([
      { role: "user", content: "س" },
      { role: "assistant", content: "ج" },
    ]);
    expect(JSON.stringify(body)).not.toMatch(/gpt-5-pro|openai|engine|model/);
  });

  it("لا يرسل ترويسة نموذج أو محرّك", async () => {
    net.respond = () => sse([{ type: "done", truncated: false }]);
    await run();
    const headers = new Headers(net.calls[0].init.headers);
    expect([...headers.keys()].sort()).toEqual(["accept", "content-type"]);
    expect(net.calls[0].init.cache).toBe("no-store");
  });
});

describe("القراءة", () => {
  it("meta من الترويسات ثم deltas ثم done", async () => {
    net.respond = () =>
      sse(
        [
          { type: "delta", text: "مر" },
          { type: "delta", text: "حبًا" },
          { type: "done", truncated: true },
        ],
        { "X-FINN-Engine": "gemini", "X-FINN-Fallback": "rate_limited" },
      );
    const { result, deltas, metas } = await run();
    expect(result).toEqual({ ok: true, truncated: true });
    expect(deltas.join("")).toBe("مرحبًا");
    expect(metas).toEqual([{ engine: "fallback", fallback: "rate_limited" }]);
  });

  it("قطعٌ صغيرة تقطع الحروف العربية المُرمَّزة في منتصفها لا تُفسد النصّ", async () => {
    net.respond = () =>
      sse(
        [
          { type: "delta", text: "أهلًا بالعالم — كود" },
          { type: "done", truncated: false },
        ],
        {},
        3,
      );
    const { result, deltas } = await run();
    expect(result).toMatchObject({ ok: true });
    expect(deltas.join("")).toBe("أهلًا بالعالم — كود");
  });

  it.each([
    ["openai", "gpt"],
    ["gemini", "fallback"],
    ["none", null],
    // الرد المحلّي بلا نموذج (٢٠٢٦/١٠/٣٠): ليس GPT ولا الاحتياطي، فلا شارة محرّك — الجسم يقول الحقيقة.
    ["local", null],
    ["", null],
    ["claude", null],
  ])("ترويسة X-FINN-Engine=%j ⇒ %j (غير المعروف لا يُخمَّن)", (header, engine) => {
    expect(engineFromHeader(header || null)).toBe(engine);
  });

  it("سببُ سقوطٍ غير معروف في الترويسة يُهمَل (لا نصّ حرّ يعبر)", async () => {
    net.respond = () =>
      sse([{ type: "done", truncated: false }], {
        "X-FINN-Engine": "gemini",
        "X-FINN-Fallback": "401 Incorrect API key sk-123",
      });
    const { metas } = await run();
    expect(metas[0]).toEqual({ engine: "fallback", fallback: null });
  });

  it("حدث خطأ في البثّ ⇒ فشلٌ عربيّ بحسب الرمز", async () => {
    net.respond = () =>
      sse([
        { type: "delta", text: "جزء" },
        { type: "error", code: "timeout" },
      ]);
    const { result, deltas } = await run();
    expect(deltas).toEqual(["جزء"]);
    expect(result).toMatchObject({ ok: false, aborted: false, kind: "timeout" });
    net.respond = () => sse([{ type: "error", code: "engine_error" }]);
    expect((await run()).result).toMatchObject({ kind: "engine" });
  });

  it("انتهاء الجسم بلا done ⇒ interrupted", async () => {
    net.respond = () => sse([{ type: "delta", text: "ناقص" }]);
    const { result, deltas } = await run();
    expect(deltas).toEqual(["ناقص"]);
    expect(result).toMatchObject({ ok: false, kind: "interrupted" });
  });
});

describe("أخطاء الخادم ⇒ جملٌ عربية ثابتة، لا نصّ الخادم", () => {
  const LEAK = "Unauthorized: Invalid token sk-SECRET provider text";
  it.each<[number, string | null, FinnClientErrorKind]>([
    [404, "not_found", "not_found"],
    [503, "ai_disabled", "paused"],
    [429, "finn_rate_limited", "rate_limited"],
    [429, "daily_identity_cap", "quota"],
    [429, "daily_global_cap", "quota_global"],
    [503, "quota_unavailable", "unavailable"],
    [503, "rate_limit_unavailable", "unavailable"],
    [503, "no_engine", "unavailable"],
    [502, "engine_unavailable", "engine"],
    [504, "engine_timeout", "timeout"],
    [413, "too_large", "too_large"],
    [500, null, "unknown"],
  ])("HTTP %i · %s ⇒ %s", async (status, code, kind) => {
    net.respond = () => json(status, { error: code, message_ar: LEAK, detail: LEAK });
    const { result } = await run();
    expect(result).toEqual({ ok: false, aborted: false, kind, message: FINN_ERROR_AR[kind] });
    expect(JSON.stringify(result)).not.toMatch(/sk-SECRET|Unauthorized|provider text/);
  });

  it("سقف النظام وسقف المالك جملتان مختلفتان (W5 #2) — لا يُقرأ هذا ذاك", () => {
    expect(FINN_ERROR_AR.quota_global).not.toBe(FINN_ERROR_AR.quota);
    expect(FINN_ERROR_AR.quota_global).toMatch(/النظام|الكلّي|العام/);
    expect(FINN_ERROR_AR.quota).toMatch(/حصّتك|حصّة/);
  });

  it("جسمٌ ليس JSON ⇒ يكفي رمز HTTP", async () => {
    net.respond = () => new Response("<html>bad gateway</html>", { status: 502 });
    expect((await run()).result).toMatchObject({ kind: "engine" });
  });

  it("انقطاع الشبكة ⇒ network", async () => {
    net.respond = () => {
      throw new TypeError("Failed to fetch");
    };
    expect((await run()).result).toMatchObject({ ok: false, aborted: false, kind: "network" });
  });

  it("إيقاف المالك ⇒ aborted لا خطأ", async () => {
    const controller = new AbortController();
    net.respond = (init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("a", "AbortError")));
      });
    const pending = streamFinnReply({
      messages: [{ role: "user", content: "س" }],
      signal: controller.signal,
      onMeta: () => {},
      onDelta: () => {},
    });
    controller.abort();
    expect(await pending).toEqual({ ok: false, aborted: true });
  });
});

describe("نصوص الواجهة آمنة (الطريقة المحفوظة، البند ٣)", () => {
  const ALL: Array<[string, string]> = [
    ...Object.entries(FINN_ERROR_AR),
    ...Object.entries(FINN_FALLBACK_REASON_AR),
  ];

  it("القائمة ليست فارغة", () => {
    expect(ALL.length).toBeGreaterThanOrEqual(17);
  });

  it.each(ALL)("«%s» عربيّ ولا يطابق نمط المصادقة/السرّ", (_key, message) => {
    expect(message).toMatch(/[؀-ۿ]/);
    // `userFacingError` يعيد رسالة الجلسة لكل نصٍّ يشبه سرًّا أو مصادقة.
    expect(userFacingError(new Error(message))).not.toBe(
      userFacingError(new Error("Unauthorized: invalid token")),
    );
    expect(message).not.toMatch(/authenticat|unauthor|token|jwt|bearer|api[\s_-]?key|forbidden/i);
  });

  it("الكاشف يحمرّ على رسالة مصادقة مزروعة (المادة ٣٠)", () => {
    const planted = "Unauthorized: Invalid token";
    expect(userFacingError(new Error(planted))).toBe(
      userFacingError(new Error("Unauthorized: invalid token")),
    );
  });

  it("classifyFinnHttpError لا يمنح 'unknown' لما له رمز", () => {
    expect(classifyFinnHttpError(404, null)).toBe("not_found");
    expect(classifyFinnHttpError(418, "teapot")).toBe("unknown");
  });

  it("describeFinnReadiness: الجاهزية منطقية وصادقة", () => {
    const base = { gpt: true, gptModel: "gpt-4.1", fallback: true, paused: false };
    expect(describeFinnReadiness(base).label).toBe("GPT مهيّأ");
    expect(describeFinnReadiness({ ...base, gpt: false }).label).toBe("يعمل بالاحتياطي");
    expect(describeFinnReadiness({ ...base, paused: true }).tone).toBe("off");
    expect(describeFinnReadiness({ ...base, gpt: false, fallback: false }).label).toBe(
      "لا محرّك مهيّأ",
    );
    // الإيقاف يغلب كل شيء: لا تُقال «مهيّأ» وهو متوقف.
    expect(describeFinnReadiness({ ...base, paused: true }).label).not.toMatch(/مهيّأ$/);
  });
});
