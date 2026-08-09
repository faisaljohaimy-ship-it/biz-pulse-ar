import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "ask_sadeed",
  title: "Ask SADEED",
  description:
    "Send a natural-language question to SADEED, the Executive AI Engine, and receive an executive briefing (bilingual AR/EN). Read-only reasoning; does not mutate app state.",
  inputSchema: {
    question: z
      .string()
      .min(1)
      .max(2000)
      .describe("Executive question in Arabic or English (max 2000 chars)."),
    language: z.enum(["ar", "en"]).optional().describe("Preferred reply language."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ question, language }, ctx: ToolContext) => {
    // Per-caller rate limit — key off authenticated MCP identity when available,
    // otherwise a coarse client-id/anon bucket. Fails closed if backing store is down.
    const callerKey =
      (ctx?.isAuthenticated?.() && (ctx.getUserId?.() || ctx.getClientId?.())) ||
      ctx?.getClientId?.() ||
      "anon";
    try {
      const { enforceRateLimit, rateLimitResponse, rateLimitUnavailableResponse } =
        await import("@/lib/governance/rate-limit.server");
      const rate = await enforceRateLimit(`mcp-ask-sadeed:${callerKey}`, 20, 60);
      if (rate.unavailable) {
        const r = rateLimitUnavailableResponse();
        return {
          content: [{ type: "text", text: `Rate limit backend unavailable (${r.status}).` }],
          isError: true,
        };
      }
      if (!rate.allowed) {
        const r = rateLimitResponse();
        return {
          content: [{ type: "text", text: `Rate limit exceeded (${r.status}). Retry in 60s.` }],
          isError: true,
        };
      }
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Rate limit check failed: ${e instanceof Error ? e.message : String(e)}`,
          },
        ],
        isError: true,
      };
    }

    const geminiReady = Boolean(
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    );
    if (!geminiReady) {
      return {
        content: [{ type: "text", text: "SADEED is unavailable: Gemini is not configured." }],
        isError: true,
      };
    }
    const sys =
      language === "en"
        ? "You are SADEED, the Executive AI Engine. Reply concisely in English."
        : "أنت سَدِيد، المحرك التنفيذي للمنصة. أجب باختصار تنفيذي.";
    try {
      const [{ generateText }, { resolveSadeedGeminiRuntime }, { revalidateSpeakableText }] =
        await Promise.all([
          import("ai"),
          import("@/lib/sadeed/gemini-provider.server"),
          import("@/lib/sadeed/output/finalize"),
        ]);
      const runtime = resolveSadeedGeminiRuntime();
      const result = await generateText({
        model: runtime.provider(runtime.modelId),
        system: sys,
        prompt: question,
        maxOutputTokens: 2_000,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(40_000),
      });
      const validated = revalidateSpeakableText(result.text);
      const reply = validated.ok ? validated.text : "";
      if (!reply)
        return {
          content: [{ type: "text", text: "SADEED returned no safe text." }],
          isError: true,
        };
      return { content: [{ type: "text", text: reply }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      };
    }
  },
});
