import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * ARIA Dual-Brain Router
 * - "gpt"    → OpenAI GPT-5 via Lovable AI Gateway (LOVABLE_API_KEY)
 * - "claude" → Anthropic Claude Sonnet via direct API (ANTHROPIC_API_KEY)
 * - "auto"   → Route by task: code/reason → claude; general/exec → gpt
 */

const Input = z.object({
  prompt: z.string().min(1),
  system: z.string().optional(),
  brain: z.enum(["gpt", "claude", "auto"]).default("auto"),
  task: z.enum(["code", "reason", "exec", "general", "detect"]).default("detect"),
  maxTokens: z.number().int().positive().max(4096).default(1400),
});

/** Heuristic task detection from prompt content (bilingual AR/EN). */
function detectTask(prompt: string): "code" | "reason" | "exec" | "general" {
  const p = prompt.toLowerCase();
  const codeHints = /\b(code|function|typescript|javascript|python|sql|bug|refactor|api|regex|stack trace|compile|build error|كود|برمج|دالة|خطأ برمج)\b|```/;
  const reasonHints = /\b(why|explain|analyze|compare|derive|prove|architecture|design pattern|trade[- ]?off|حلل|قارن|اشرح|استنتج|لماذا)\b/;
  const execHints = /\b(kpi|revenue|report|forecast|risk|incident|briefing|executive|strategy|decision|تنفيذي|تقرير|قرار|مخاطر|استراتيج)\b/;
  if (codeHints.test(p)) return "code";
  if (reasonHints.test(p)) return "reason";
  if (execHints.test(p)) return "exec";
  return "general";
}

async function callGpt(system: string | undefined, prompt: string, maxTokens: number) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: prompt },
  ];
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({ model: "openai/gpt-5", messages, max_tokens: maxTokens }),
  });
  if (!r.ok) throw new Error(`GPT ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return { brain: "gpt" as const, model: "openai/gpt-5", text: j.choices?.[0]?.message?.content ?? "" };
}

async function callClaude(system: string | undefined, prompt: string, maxTokens: number) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const text = Array.isArray(j.content)
    ? j.content.map((p: { type: string; text?: string }) => (p.type === "text" ? p.text ?? "" : "")).join("")
    : "";
  return { brain: "claude" as const, model: "claude-sonnet-4-5", text };
}

function resolveBrain(brain: "gpt" | "claude" | "auto", task: "code" | "reason" | "exec" | "general") {
  if (brain !== "auto") return brain;
  return task === "code" || task === "reason" ? "claude" : "gpt";
}

export const ariaDualBrain = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const task = data.task === "detect" ? detectTask(data.prompt) : data.task;
    const chosen = resolveBrain(data.brain, task);
    const started = Date.now();
    try {
      const res =
        chosen === "claude"
          ? await callClaude(data.system, data.prompt, data.maxTokens)
          : await callGpt(data.system, data.prompt, data.maxTokens);
      return { ok: true as const, ...res, ms: Date.now() - started };
    } catch (err) {
      // Fallback to the other brain once
      const other = chosen === "claude" ? "gpt" : "claude";
      try {
        const res =
          other === "claude"
            ? await callClaude(data.system, data.prompt, data.maxTokens)
            : await callGpt(data.system, data.prompt, data.maxTokens);
        return { ok: true as const, ...res, ms: Date.now() - started, fellBackFrom: chosen };
      } catch (err2) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : String(err),
          fallbackError: err2 instanceof Error ? err2.message : String(err2),
          ms: Date.now() - started,
        };
      }
    }
  });
