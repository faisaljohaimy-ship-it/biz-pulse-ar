/**
 * askAgent — server function that answers an executive's spoken question
 * as a specific Digital Human persona. Calls the Lovable AI Gateway and
 * returns BOTH Arabic and English text so the dock can speak in the
 * caller's locale while keeping a bilingual transcript.
 *
 * Strict scope: Industrial Security domain only. No fabrication; if the
 * agent does not know, it says so explicitly.
 */
import { createServerFn } from "@tanstack/react-start";
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

export const askAgent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const system = `You are ${data.persona.name_en} (${data.persona.name_ar}) — ${data.persona.title_en} / ${data.persona.title_ar} within NEXUS AI OS for the Industrial Security Department (Western Region).
Stay strictly inside the Industrial Security domain (incidents, patrols, CCTV, access control, visitors, permits, contractors, vehicles, work orders, KPIs, risks, compliance).
Tone: executive, decisive, calm. No filler, no apologies, no "as an AI".
NEVER fabricate numbers, names, statuses, dates, or KPIs. If you do not have a runtime data point, say so in one short line.
Answer the user's question concisely in BOTH Arabic and English (≤ 3 sentences each).
Return ONLY a strict JSON object of the form {"text_ar":"...","text_en":"..."}.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.question },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`ask-agent ${res.status} ${err}`);
    }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = j.choices?.[0]?.message?.content ?? "{}";
    let parsed: { text_ar?: string; text_en?: string } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { [data.lang === "ar" ? "text_ar" : "text_en"]: raw }; }
    const ar = (parsed.text_ar ?? "").trim();
    const en = (parsed.text_en ?? "").trim();
    return {
      text_ar: ar || en,
      text_en: en || ar,
    };
  });
