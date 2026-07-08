/**
 * askAgent — Executive Conversation Mode (Phase 10).
 *
 * ARIA and every persona behave like a real Executive AI assistant:
 * concise, decisive, conversational. Full executive reports are
 * generated ONLY when the user explicitly asks for one (briefing,
 * full report, detailed analysis, board meeting, …). Otherwise
 * answers stay at 2–4 sentences / 40–80 spoken words with at most
 * ONE optional follow-up question.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  question: z.string().min(1).max(2000),
  persona: z.object({
    id: z.string().min(1).max(64),
    name_ar: z.string().min(1).max(120),
    name_en: z.string().min(1).max(120),
    title_ar: z.string().min(1).max(160),
    title_en: z.string().min(1).max(160),
  }),
  lang: z.enum(["ar", "en"]).default("ar"),
});

const REPORT_TRIGGERS = [
  // English
  "executive briefing",
  "full report",
  "detailed analysis",
  "explain everything",
  "presentation mode",
  "board meeting",
  "deep dive",
  "complete report",
  // Arabic
  "إحاطة تنفيذية",
  "احاطة تنفيذية",
  "تقرير كامل",
  "تقرير تفصيلي",
  "تحليل تفصيلي",
  "اشرح كل شيء",
  "اشرح كل شي",
  "وضع العرض",
  "اجتماع مجلس",
  "تقرير شامل",
];

function detectReportMode(q: string): boolean {
  const s = q.toLowerCase();
  return REPORT_TRIGGERS.some((t) => s.includes(t.toLowerCase()));
}

export const askAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { enforceRateLimit } = await import("@/lib/governance/rate-limit.server");
    const rate = await enforceRateLimit(`ask-agent:${context.userId}`, 40, 60);
    if (rate.unavailable) throw new Error("rate_limit_unavailable");
    if (!rate.allowed) throw new Error("rate_limited");

    const reportMode = detectReportMode(data.question);

    const personaLine = `You are ${data.persona.name_en} (${data.persona.name_ar}) — ${data.persona.title_en} / ${data.persona.title_ar} within NEXUS AI OS, Industrial Security Department (Western Region).`;
    const domainLine = `Stay strictly inside Industrial Security (incidents, patrols, CCTV, access, visitors, permits, contractors, vehicles, work orders, KPIs, risks, compliance).`;
    const truthLine = `NEVER fabricate numbers, names, statuses, dates, or KPIs. If a runtime data point is missing, say so in one short line.`;

    const conciseRules = `EXECUTIVE CONVERSATION MODE — DEFAULT.
• Answer ONLY what was asked. No preamble, no recap, no "as an AI".
• 2–4 sentences max. 40–80 spoken words. Direct, professional, human.
• Do NOT append Recommendations / Confidence / Evidence / Timeline / Operational Summary sections.
• You MAY end with at most ONE short follow-up question (e.g. "Want the full report?"). Never ask multiple.
• Tone: calm, decisive, executive. No filler.`;

    const reportRules = `EXECUTIVE REPORT MODE — the user explicitly requested a full briefing.
Produce a structured executive report with: Situation, Key Metrics, Top Risks, Recommendations, Next Actions.
Still grounded in real runtime data only — no fabrication. Keep each section tight.`;

    const system = `${personaLine}
${domainLine}
${truthLine}
${reportMode ? reportRules : conciseRules}
Answer in BOTH Arabic and English. Return ONLY strict JSON: {"text_ar":"...","text_en":"..."}.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "nexios-ask-agent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // ARIA Engineering Charter: ARIA = GPT-5. gpt-5 family only accepts
        // the default temperature, so we omit it. Reasoning tokens count
        // toward output — keep headroom.
        model: "openai/gpt-5",
        max_completion_tokens: reportMode ? 1600 : 600,
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.question },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[ask-agent] gateway", res.status, err.slice(0, 240));
      throw new Error(`ask-agent_failed_${res.status}`);
    }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = j.choices?.[0]?.message?.content ?? "{}";
    let parsed: { text_ar?: string; text_en?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { [data.lang === "ar" ? "text_ar" : "text_en"]: raw };
    }
    const ar = (parsed.text_ar ?? "").trim();
    const en = (parsed.text_en ?? "").trim();
    return {
      text_ar: ar || en,
      text_en: en || ar,
      mode: reportMode ? ("report" as const) : ("concise" as const),
    };
  });
