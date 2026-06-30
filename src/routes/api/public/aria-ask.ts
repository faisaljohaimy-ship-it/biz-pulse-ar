/**
 * Public ARIA ask endpoint — bilingual one-shot Q&A for the landing
 * hero. No authentication (this powers the marketing-page ARIA badge);
 * protected by a strict per-IP rate limit and short input cap.
 *
 * Routes through Lovable AI Gateway with `openai/gpt-5` to match the
 * ARIA Engineering Charter ("ARIA = GPT-5"). Returns strict JSON:
 *   { text_ar: string, text_en: string, mode: "concise" }
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";

const Input = z.object({
  question: z.string().trim().min(1).max(600),
  lang: z.enum(["ar", "en"]).optional(),
});

function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
    "anon"
  );
}

const SYSTEM = `You are ARIA — the Executive AI of NEXIOS / NEXUS AI OS (Industrial Security, Western Region of Saudi Arabia).

REGISTER & TONE — non-negotiable:
• Speak with the gravitas of a senior C-suite advisor briefing a board: precise, calm, decisive, dignified, never casual.
• Mirror the user's language automatically. Arabic → فصحى رسمية راقية بصياغة تنفيذية موجزة (لا عامية، لا انفعال، استخدم صيغ المخاطبة المحترمة مثل "تفضّلوا"، "نُفيدكم"، "بناءً على ما تقدّم"). English → formal executive English (full sentences, no contractions, no slang, no filler).
• Never say "as an AI", never apologize for being a model, never hedge with "I think / maybe / I'm not sure". State the position; if unknown, say so once in one composed line.
• Do not fabricate numbers, names, dates, KPIs, or sources.

FORMAT:
• 2–4 sentences. 40–80 spoken words. No headings, no bullet lists unless the user explicitly requests them.
• You MAY close with at most ONE concise, courteous follow-up question.
• Reply in BOTH Arabic and English. Return ONLY strict JSON: {"text_ar":"...","text_en":"..."}.`;

export const Route = createFileRoute("/api/public/aria-ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return Response.json({ error: "missing_lovable_api_key" }, { status: 500 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const parsed = Input.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "invalid_input", detail: parsed.error.flatten() }, { status: 400 });
        }
        const data = parsed.data;

        const ip = clientIp(request);
        const rate = await enforceRateLimit(`pub-aria-ask:${ip}`, 12, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();

        async function callModel(model: string, maxTokens: number) {
          const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              max_completion_tokens: maxTokens,
              messages: [
                { role: "system", content: SYSTEM },
                { role: "user", content: parsed.data.question },
              ],
              response_format: { type: "json_object" },
            }),
            signal: AbortSignal.timeout(40_000),
          });
          return r;
        }

        async function extract(r: Response) {
          const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
          const raw = j.choices?.[0]?.message?.content ?? "";
          let p: { text_ar?: string; text_en?: string } = {};
          try { p = JSON.parse(raw); } catch { p = {}; }
          return { ar: (p.text_ar ?? "").trim(), en: (p.text_en ?? "").trim() };
        }

        try {
          // Primary: GPT-5 with enough budget for reasoning + JSON output.
          let r = await callModel("openai/gpt-5", 2400);
          if (!r.ok) {
            const detail = (await r.text().catch(() => "")).slice(0, 240);
            console.error("[public/aria-ask] gateway gpt-5", r.status, detail);
            if (r.status === 429 || r.status === 402) {
              return Response.json({ error: "ask_failed", status: r.status }, { status: r.status });
            }
            // Fall through to fallback model.
            r = await callModel("openai/gpt-5-mini", 1200);
            if (!r.ok) {
              const d2 = (await r.text().catch(() => "")).slice(0, 240);
              console.error("[public/aria-ask] gateway gpt-5-mini", r.status, d2);
              return Response.json({ error: "ask_failed", status: r.status }, { status: 502 });
            }
          }
          let { ar, en } = await extract(r);
          if (!ar && !en) {
            // Empty output (often: reasoning consumed budget). Retry on mini.
            const r2 = await callModel("openai/gpt-5-mini", 1200);
            if (r2.ok) ({ ar, en } = await extract(r2));
          }
          if (!ar && !en) {
            return Response.json({ error: "empty_response" }, { status: 502 });
          }
          return Response.json({
            text_ar: ar || en,
            text_en: en || ar,
            mode: "concise" as const,
          });
        } catch (e) {
          console.error("[public/aria-ask]", e instanceof Error ? e.message : e);
          return Response.json({ error: "network_error" }, { status: 502 });
        }
      },
    },
  },
});
