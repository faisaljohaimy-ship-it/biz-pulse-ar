// @vitest-environment node
/**
 * أدوات فِن على **الـSDK الحقيقي** (`streamText` + `stopWhen` + `tool`) بنموذجٍ مزروعٍ وحده.
 *
 * اختبارات `engine.server.test.ts` تحاكي `streamText` نفسه، فلا تثبت شكل أجزاء `tool-call` و
 * `tool-result` ولا أن الحلقة تستأنف بعد الأداة ولا أن النموذج يرى النتيجة. هذا الملف يثبتها:
 * النموذج وحده مزروع (`MockLanguageModelV3`)، وما عداه حقيقي — الـSDK وحلقة الخطوات وأداة
 * `platform_status` الفعلية وتطبيع الأجزاء وسلسلة السقوط.
 */
import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sim = vi.hoisted(() => ({ model: null as unknown }));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => ({ responses: () => sim.model }),
}));
vi.mock("@/lib/sadeed/gemini-provider.server", () => ({ resolveSadeedGeminiRuntimes: () => [] }));
vi.mock("@/lib/sadeed/backup-provider.server", () => ({
  createSadeedBackupModel: () => null,
  primaryCoolingDown: () => false,
  coolPrimary: () => undefined,
  primaryCooldownFor: () => 1_000,
}));
vi.mock("@/lib/governance/ai-quota.server", () => ({
  aiKillSwitchOn: () => false,
  assertAiEnabled: () => undefined,
}));

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

type Chunk = Record<string, unknown>;
const streamOf = (chunks: Chunk[]) => ({
  stream: simulateReadableStream({ chunks: chunks as never[] }),
});

/** نموذجٌ يطلب أداةً في خطوته الأولى ثم يكتب نصًّا — ويسجّل ما رآه في كل خطوة. */
function twoStepModel(toolName: string, toolInput: unknown) {
  const prompts: unknown[] = [];
  let call = 0;
  const model = new MockLanguageModelV3({
    doStream: async (options) => {
      prompts.push(options.prompt);
      call += 1;
      if (call === 1) {
        return streamOf([
          { type: "stream-start", warnings: [] },
          {
            type: "tool-call",
            toolCallId: "tc-1",
            toolName,
            input: JSON.stringify(toolInput),
          },
          { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
        ]);
      }
      return streamOf([
        { type: "stream-start", warnings: [] },
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: "قرأتُ الحالة." },
        { type: "text-end", id: "t1" },
        { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
      ]);
    },
  });
  return { model, prompts, calls: () => call };
}

let engine: typeof import("./engine.server");
beforeEach(async () => {
  vi.stubEnv("OPENAI_API_KEY", "sk-test-real-sdk-0123456789");
  vi.stubEnv("FINN_GITHUB_TOKEN", "");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  engine = await import("./engine.server");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function drain(events: AsyncGenerator<Record<string, unknown>>) {
  const out: Record<string, unknown>[] = [];
  for await (const e of events) out.push(e);
  return out;
}

describe("حلقة الأدوات بالـSDK الحقيقي", () => {
  it("platform_status: النموذج يطلبها ⇒ تُنفَّذ فعلًا ⇒ يرى نتيجتها ⇒ يكتب ⇒ done", async () => {
    const scripted = twoStepModel("platform_status", {});
    sim.model = scripted.model;
    const r = await engine.openFinnChatStream(
      [{ role: "user", content: "ما حالة المنصّة؟" }],
      new AbortController().signal,
    );
    if (!r.ok) throw new Error("expected ok");
    const events = await drain(r.events as AsyncGenerator<Record<string, unknown>>);

    expect(events).toEqual([
      { type: "tool", name: "platform_status", phase: "start" },
      { type: "tool", name: "platform_status", phase: "done" },
      { type: "delta", text: "قرأتُ الحالة." },
      { type: "done", truncated: false },
    ]);
    // الخطوة الثانية رأت نتيجة الأداة الحقيقية (لا نصًّا مختلقًا).
    expect(scripted.calls()).toBe(2);
    const second = JSON.stringify(scripted.prompts[1]);
    expect(second).toContain("platform_status");
    expect(second).toContain("in-process");
    expect(second).toContain("gptModel");
    // ولا مفتاح OpenAI ولا قيمة سرٍّ في ما رآه النموذج.
    expect(second).not.toContain("sk-test-real-sdk");
  });

  it("github_activity بلا مفتاح: الأداة تعيد not_configured صادقةً، والنموذج يراها ويكمل", async () => {
    const scripted = twoStepModel("github_activity", { view: "recent_commits" });
    sim.model = scripted.model;
    const r = await engine.openFinnChatStream(
      [{ role: "user", content: "ما آخر الالتزامات؟" }],
      new AbortController().signal,
    );
    if (!r.ok) throw new Error("expected ok");
    const events = await drain(r.events as AsyncGenerator<Record<string, unknown>>);
    // نتيجةٌ ok:false ⇒ المرحلة error (لا «تمّ» كاذبة).
    expect(events.slice(0, 2)).toEqual([
      { type: "tool", name: "github_activity", phase: "start" },
      { type: "tool", name: "github_activity", phase: "error" },
    ]);
    expect(JSON.stringify(scripted.prompts[1])).toContain("not_configured");
  });

  it("نموذجٌ يطلب أداةً غير مسجَّلة ⇒ لا تنفيذ ولا حدثَ باسمها، ولا انهيار", async () => {
    const scripted = twoStepModel("shell_exec", { cmd: "rm -rf /" });
    sim.model = scripted.model;
    const r = await engine.openFinnChatStream(
      [{ role: "user", content: "نفّذ شيئًا" }],
      new AbortController().signal,
    );
    // قد يردّ الـSDK بخطأ أداةٍ غير موجودة أو يكمل؛ المطلوب: لا حدث tool باسمٍ خارج القائمة،
    // ولا تنفيذ (لا أداة بهذا الاسم أصلًا).
    if (r.ok) {
      const events = await drain(r.events as AsyncGenerator<Record<string, unknown>>);
      expect(events.some((e) => e.type === "tool" && e.name === "shell_exec")).toBe(false);
    }
  });
});
