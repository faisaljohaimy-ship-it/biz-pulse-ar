import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "ask_aria",
  title: "Ask ARIA",
  description:
    "Send a natural-language question to ARIA, the NEXUS Executive AI Engine, and receive an executive briefing (bilingual AR/EN). Read-only reasoning; does not mutate app state.",
  inputSchema: {
    question: z.string().min(1).describe("Executive question in Arabic or English."),
    language: z.enum(["ar", "en"]).optional().describe("Preferred reply language."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ question, language }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        content: [{ type: "text", text: "ARIA is unavailable: LOVABLE_API_KEY is not configured." }],
        isError: true,
      };
    }
    const sys =
      language === "en"
        ? "You are ARIA, the Executive AI Engine of NEXUS AI OS. Reply concisely in English."
        : "أنت آريا، المحرك التنفيذي لنظام NEXUS AI OS. أجب باختصار تنفيذي.";
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: question },
          ],
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { content: [{ type: "text", text: `Gateway ${res.status}: ${t}` }], isError: true };
      }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const reply = data.choices?.[0]?.message?.content ?? "";
      return { content: [{ type: "text", text: reply }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      };
    }
  },
});
