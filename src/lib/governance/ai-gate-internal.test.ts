/**
 * البوّابة الداخلية سلوكيًّا (المرحلة ب-٢): مفتاح الإيقاف يمنع أي نداء مزوّد،
 * والسقف اليومي يُرمى برمزه، وتعذّر المخزن منعٌ لا سماح — في وحدات المكتبة
 * التي كانت تصل Gemini بلا بوّابة.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  calls: [] as string[],
  /** نتيجة كل دلو: `true` مسموح، `false` ممنوع، `"error"` تعذّر. */
  answer: ((_key: string) => true) as (key: string) => boolean | "error",
}));

const model = vi.hoisted(() => ({ calls: 0 }));

vi.mock("@/integrations/supabase/client.server", () => {
  const chain: unknown = new Proxy(() => chain, {
    get(_t, prop) {
      if (prop === "then") return (resolve: (v: unknown) => unknown) => resolve({ error: null });
      return () => chain;
    },
    apply: () => chain,
  });
  return {
    supabaseAdmin: {
      rpc: (_fn: string, args: { _bucket_key: string }) => {
        db.calls.push(args._bucket_key);
        const a = db.answer(args._bucket_key);
        if (a === "error") return Promise.resolve({ data: null, error: { message: "down" } });
        return Promise.resolve({ data: a, error: null });
      },
      from: () => chain,
    },
  };
});

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateText: async () => {
    model.calls++;
    return { text: '{"summary_ar":"x","recommendations":["y"],"risk_score":10}' };
  },
}));

vi.mock("@/lib/sadeed/gemini-provider.server", () => ({
  resolveSadeedGeminiRuntime: () => ({
    vendor: "google",
    modelId: "stub",
    provider: () => ({}),
  }),
  resolveSadeedGeminiRuntimes: () => [{ vendor: "google", modelId: "stub", provider: () => ({}) }],
}));

import { AiGateError, assertAiEnabled, assertAiQuota } from "@/lib/governance/ai-quota.server";
import { resetRateLimitStateForTests } from "@/lib/governance/rate-limit.server";

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
  db.calls = [];
  db.answer = () => true;
  model.calls = 0;
  resetRateLimitStateForTests();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function rejectsWithCode(p: Promise<unknown>, code: string) {
  let caught: unknown;
  try {
    await p;
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(AiGateError);
  expect((caught as AiGateError).code).toBe(code);
}

describe("assertAiEnabled / assertAiQuota", () => {
  it("المفتاح مرفوع ⇐ يُرمى ai_disabled متزامنًا بلا أي استعلام", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    expect(() => assertAiEnabled("chat")).toThrow(AiGateError);
    await rejectsWithCode(assertAiQuota({ surface: "chat", identity: "u1" }), "ai_disabled");
    expect(db.calls).toEqual([]);
  });

  it("المفتاح ساكن والدلاء تسمح ⇐ تمرّ، والدلاء هي دلاء HTTP نفسها", async () => {
    expect(() => assertAiEnabled("chat")).not.toThrow();
    await expect(assertAiQuota({ surface: "chat", identity: "u1" })).resolves.toBeUndefined();
    expect(db.calls[0]).toMatch(/^ai-daily-id:chat:\d{4}-\d{2}-\d{2}:u1$/);
    expect(db.calls[1]).toMatch(/^ai-daily-global:chat:\d{4}-\d{2}-\d{2}$/);
  });

  it("السقف العام مبلوغ ⇐ daily_global_cap بعد أن مرّت الهوية", async () => {
    db.answer = (key) => !key.startsWith("ai-daily-global:");
    await rejectsWithCode(assertAiQuota({ surface: "chat", identity: "u1" }), "daily_global_cap");
    expect(db.calls).toHaveLength(2);
  });

  it("سقف الهوية مبلوغ ⇐ daily_identity_cap قبل سؤال الدلو العام (لا استهلاك له)", async () => {
    db.answer = (key) => !key.startsWith("ai-daily-id:");
    await rejectsWithCode(assertAiQuota({ surface: "chat", identity: "u1" }), "daily_identity_cap");
    expect(db.calls).toHaveLength(1);
    expect(db.calls.some((k) => k.startsWith("ai-daily-global:"))).toBe(false);
  });

  it("المخزن يخطئ ⇐ quota_unavailable: منعٌ لا سماح", async () => {
    db.answer = () => "error";
    await rejectsWithCode(assertAiQuota({ surface: "chat", identity: "u1" }), "quota_unavailable");
  });
});

describe("تحليل البلاغ `sadeedAnalyseIncident`", () => {
  const incident = {
    ref: "INC-1",
    category: "intrusion",
    title_ar: "محاولة دخول",
    severity: "high",
  };

  it("المفتاح مرفوع ⇐ البديل الاستدلاليّ وصفر نداء نموذج", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "on");
    const { sadeedAnalyseIncident } = await import("@/lib/oms-sadeed.server");
    const out = await sadeedAnalyseIncident(incident, { identity: "u1" });
    expect(out.source).toBe("heuristic");
    expect(model.calls).toBe(0);
    expect(db.calls).toEqual([]);
  });

  it("السقف مبلوغ ⇐ البديل الاستدلاليّ، وصفر نداء نموذج", async () => {
    db.answer = () => false;
    const { sadeedAnalyseIncident } = await import("@/lib/oms-sadeed.server");
    const out = await sadeedAnalyseIncident(incident, { identity: "u1" });
    expect(out.source).toBe("heuristic");
    expect(model.calls).toBe(0);
  });

  it("البوّابة مفتوحة ⇐ النموذج يُستدعى مرّة والهوية تُحاسَب", async () => {
    const { sadeedAnalyseIncident } = await import("@/lib/oms-sadeed.server");
    const out = await sadeedAnalyseIncident(incident, { identity: "u7" });
    expect(out.source).toBe("gemini");
    expect(model.calls).toBe(1);
    expect(db.calls.some((k) => k.endsWith(":u7"))).toBe(true);
  });
});

describe("النسخ الصوتي `transcribeWithGemini` والشرح `explainRecommendation`", () => {
  it("المفتاح مرفوع ⇐ يُرمى قبل أي fetch أو نموذج", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "true");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new Error("must not be reached");
    });
    const { transcribeWithGemini } = await import("@/lib/sadeed/gemini-transcription.server");
    await rejectsWithCode(
      transcribeWithGemini(new Blob([new Uint8Array(400)], { type: "audio/webm" })),
      "ai_disabled",
    );
    expect(fetchSpy).not.toHaveBeenCalled();

    // التضمين: الدالّتان كلتاهما (طفرة الحارس M5 — حذف البوّابة من الثانية وحدها).
    const embeddings = await import("@/lib/sadeed/gemini-embeddings.server");
    const opts = { dimensions: 768, purpose: "document" } as never;
    await rejectsWithCode(embeddings.embedGeminiText("نصّ", opts), "ai_disabled");
    await rejectsWithCode(embeddings.embedGeminiBatch(["نصّ"], opts), "ai_disabled");
    expect(fetchSpy).not.toHaveBeenCalled();

    const { explainRecommendation } = await import("@/lib/sadeed/presence/explanation.server");
    await rejectsWithCode(
      explainRecommendation({
        recommendation_en: "Reinforce patrols",
        evidence: ["3 incidents"],
        priority: "high",
      } as never),
      "ai_disabled",
    );
    expect(model.calls).toBe(0);
  });
});

describe("أداة MCP `ask_sadeed`", () => {
  const ctx = {
    isAuthenticated: () => true,
    getUserId: () => "mcp-user-1",
    getClientId: () => "client-1",
  };

  it("المفتاح مرفوع ⇐ isError بلا حدّ ولا حصّة ولا نموذج", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const tool = (await import("@/lib/mcp/tools/ask-sadeed")).default as unknown as {
      handler: (
        input: { question: string; language?: "ar" | "en" },
        ctx: unknown,
      ) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;
    };
    const out = await tool.handler({ question: "ما الحالة؟" }, ctx);
    expect(out.isError).toBe(true);
    expect(out.content[0]?.text).toContain("ai_disabled");
    expect(model.calls).toBe(0);
    expect(db.calls).toEqual([]);
  });

  it("السقف العام مبلوغ ⇐ isError برمزه بعد حدّ الدقيقة، وصفر نداء نموذج", async () => {
    db.answer = (key) => !key.startsWith("ai-daily-global:");
    const tool = (await import("@/lib/mcp/tools/ask-sadeed")).default as unknown as {
      handler: (
        input: { question: string },
        ctx: unknown,
      ) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;
    };
    const out = await tool.handler({ question: "ما الحالة؟" }, ctx);
    expect(out.isError).toBe(true);
    expect(out.content[0]?.text).toContain("daily_global_cap");
    expect(db.calls[0]).toMatch(/^mcp-ask-sadeed:mcp-user-1$/);
    expect(model.calls).toBe(0);
  });

  it("البوّابة مفتوحة ⇐ يصل النموذج مرّة", async () => {
    const tool = (await import("@/lib/mcp/tools/ask-sadeed")).default as unknown as {
      handler: (
        input: { question: string },
        ctx: unknown,
      ) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;
    };
    const out = await tool.handler({ question: "ما الحالة؟" }, ctx);
    expect(out.isError).not.toBe(true);
    expect(model.calls).toBe(1);
  });
});
