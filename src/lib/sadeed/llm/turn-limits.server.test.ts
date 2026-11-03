// @vitest-environment node
/** سقف خطوات الأدوات — وحدةً. الإدماج في المعالج يُثبته `chat-step-cap.test.ts`. */
import { describe, expect, it } from "vitest";
import {
  MAX_STEPS_DEEP,
  MAX_STEPS_TEXT_DEFAULT,
  lastStepAnswers,
  maxStepsFor,
} from "@/lib/sadeed/llm/turn-limits.server";

describe("maxStepsFor", () => {
  it("الافتراض: 4 للنص والصوت، 8 للعميق", () => {
    expect(maxStepsFor("text", {})).toBe(4);
    expect(maxStepsFor("voice", {})).toBe(4);
    expect(maxStepsFor("deep", {})).toBe(8);
    expect(MAX_STEPS_TEXT_DEFAULT).toBe(4);
    expect(MAX_STEPS_DEEP).toBe(8);
  });

  it("SADEED_MAX_STEPS_TEXT (2..8) يتجاوز النص والصوت وحدهما", () => {
    for (let n = 2; n <= 8; n++) {
      const env = { SADEED_MAX_STEPS_TEXT: String(n) };
      expect(maxStepsFor("text", env), `text/${n}`).toBe(n);
      expect(maxStepsFor("voice", env), `voice/${n}`).toBe(n);
      expect(maxStepsFor("deep", env), `deep/${n}`).toBe(8);
    }
    expect(maxStepsFor("text", { SADEED_MAX_STEPS_TEXT: " 6 " })).toBe(6);
  });

  it("ما خرج عن النطاق أو لم يكن عددًا صحيحًا خالصًا يُهمَل (4) — لا يُقصّ", () => {
    for (const bad of [
      "0",
      "1",
      "9",
      "10",
      "99",
      "-3",
      "4.5",
      "4e0",
      "0x4",
      "abc",
      "",
      "  ",
      "٤",
      "04x",
    ]) {
      expect(maxStepsFor("text", { SADEED_MAX_STEPS_TEXT: bad }), JSON.stringify(bad)).toBe(4);
    }
  });

  it("يُقرأ عند كل نداء", () => {
    const env: Record<string, string | undefined> = {};
    expect(maxStepsFor("text", env)).toBe(4);
    env.SADEED_MAX_STEPS_TEXT = "7";
    expect(maxStepsFor("text", env)).toBe(7);
    delete env.SADEED_MAX_STEPS_TEXT;
    expect(maxStepsFor("text", env)).toBe(4);
  });
});

describe("lastStepAnswers — آخر خطوةٍ مسموحة تكتب الجواب", () => {
  it("تمنع الأدوات عند الخطوة maxSteps-1 فصاعدًا ولا تمسّ ما قبلها", () => {
    const prepare = lastStepAnswers(4);
    expect(prepare({ stepNumber: 0 })).toBeUndefined();
    expect(prepare({ stepNumber: 2 })).toBeUndefined();
    expect(prepare({ stepNumber: 3 })).toEqual({ toolChoice: "none" });
    expect(prepare({ stepNumber: 4 })).toEqual({ toolChoice: "none" });
    expect(lastStepAnswers(8)({ stepNumber: 6 })).toBeUndefined();
    expect(lastStepAnswers(8)({ stepNumber: 7 })).toEqual({ toolChoice: "none" });
  });

  // بالـSDK الحقيقي ونموذجٍ مبرمَج يطلب أداةً ما دام مسموحًا له بها: بلا `prepareStep` يقف
  // الدور عند السقف على نداء أدواتٍ ونصّه فارغ؛ ومعه يكتب النموذج جوابه في الخطوة الأخيرة.
  describe("بالـSDK الحقيقي", () => {
    const usage = {
      inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: 0 },
    };
    const toolChoices: unknown[] = [];

    async function turn(cap: number, withPrepare: boolean) {
      const { generateText, stepCountIs, tool } = await import("ai");
      const { MockLanguageModelV3 } = await import("ai/test");
      const { z } = await import("zod");
      let executed = 0;
      toolChoices.length = 0;
      const model = new MockLanguageModelV3({
        doGenerate: async (options) => {
          toolChoices.push(options.toolChoice ?? null);
          const forbidden = (options.toolChoice as { type?: string } | undefined)?.type === "none";
          if (forbidden) {
            return {
              content: [{ type: "text" as const, text: "الجواب من نتائج الأدوات." }],
              finishReason: { unified: "stop" as const, raw: undefined },
              usage,
              warnings: [],
            };
          }
          return {
            content: [
              {
                type: "tool-call" as const,
                toolCallId: `tc-${toolChoices.length}`,
                toolName: "probe",
                input: "{}",
              },
            ],
            finishReason: { unified: "tool-calls" as const, raw: undefined },
            usage,
            warnings: [],
          };
        },
      });
      const result = await generateText({
        model,
        prompt: "سؤال",
        tools: {
          probe: tool({
            description: "x",
            inputSchema: z.object({}),
            execute: async () => {
              executed += 1;
              return { ok: true };
            },
          }),
        },
        stopWhen: stepCountIs(cap),
        ...(withPrepare ? { prepareStep: lastStepAnswers(cap) } : {}),
      });
      return { result, executed };
    }

    it("بلا prepareStep: الدور يقف عند السقف ونصّه فارغ (العطل الذي يمنعه)", async () => {
      const { result, executed } = await turn(3, false);
      expect(result.steps).toHaveLength(3);
      expect(result.text).toBe("");
      expect(executed).toBe(3);
    });

    it("مع prepareStep: آخر خطوة بلا أدوات وتُنتج الجواب، وما قبلها كما هي", async () => {
      const { result, executed } = await turn(3, true);
      expect(result.steps).toHaveLength(3);
      expect(result.text).toBe("الجواب من نتائج الأدوات.");
      expect(executed).toBe(2);
      expect(toolChoices.map((c) => (c as { type?: string } | null)?.type ?? null)).toEqual([
        "auto",
        "auto",
        "none",
      ]);
    });
  });
});
