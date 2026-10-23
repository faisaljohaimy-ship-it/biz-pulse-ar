/**
 * The only fake in the integration tier: a scripted `MockLanguageModelV3`
 * that calls tools in the order a real model would, and records every tool
 * result it was shown — so tests judge what the model actually saw.
 */
import { MockLanguageModelV3 } from "ai/test";

export type Prompt = Array<{ role: string; content: unknown }>;
export type Step = { tool: string; input: unknown } | { text: string };
export type SeenToolResult = { toolName: string; value: unknown };

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

/** كل نتائج الأدوات التي رآها النموذج في مطالبةٍ ما، بترتيبها. */
export function toolResults(prompt: Prompt): SeenToolResult[] {
  const out: SeenToolResult[] = [];
  for (const message of prompt) {
    if (message.role !== "tool" || !Array.isArray(message.content)) continue;
    for (const part of message.content as Array<Record<string, unknown>>) {
      if (part.type !== "tool-result") continue;
      const output = part.output as { type?: string; value?: unknown } | undefined;
      out.push({ toolName: String(part.toolName), value: output?.value ?? output });
    }
  }
  return out;
}

export function scriptedModel(steps: Step[]) {
  const seen: SeenToolResult[][] = [];
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      const prompt = options.prompt as unknown as Prompt;
      seen.push(toolResults(prompt));
      const step = steps[Math.min(calls, steps.length - 1)]!;
      calls += 1;
      if ("tool" in step) {
        return {
          content: [
            {
              type: "tool-call" as const,
              toolCallId: `tc-${calls}`,
              toolName: step.tool,
              input: JSON.stringify(step.input),
            },
          ],
          finishReason: { unified: "tool-calls" as const, raw: undefined },
          usage,
          warnings: [],
        };
      }
      return {
        content: [{ type: "text" as const, text: step.text }],
        finishReason: { unified: "stop" as const, raw: undefined },
        usage,
        warnings: [],
      };
    },
  });
  return {
    model,
    seen,
    get calls() {
      return calls;
    },
  };
}

export const marker = (label: string) =>
  `INTEGRATION ${label} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** السيناريو المرجعي: قراءة البلاغات ثم طلب إنشاء بلاغ ثم ملخّص. */
export function operationsScript(incidentTitle: string): Step[] {
  return [
    { tool: "sql_read", input: { table: "sec_incidents", columns: ["ref", "org_id"], limit: 50 } },
    {
      tool: "sec_create_incident",
      input: {
        category: "integration",
        title_ar: "بلاغ تكامل",
        title_en: incidentTitle,
        severity: "high",
        priority: "high",
      },
    },
    { text: "Operations brief: incidents read; one incident proposed for approval." },
  ];
}
