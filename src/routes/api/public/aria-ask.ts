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

const AnchorSchema = z.object({
  kind: z.string().max(40),
  id: z.string().max(120),
  label: z.string().max(200).optional(),
});
const TurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(2000),
  ts: z.string().optional(),
  anchors: z.array(AnchorSchema).max(6).optional(),
});
const WidgetSchema = z.object({
  id: z.string().max(120),
  kind: z.string().max(30),
  label: z.string().max(160),
  value: z.unknown().optional(),
  hint: z.string().max(240).optional(),
});
const PageSchema = z.object({
  path: z.string().max(400).optional(),
  title: z.string().max(200).optional(),
  section: z.string().max(120).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  selected: z.record(z.string(), z.unknown()).nullable().optional(),
});
const ContextSchema = z
  .object({
    page: PageSchema.optional(),
    widgets: z.array(WidgetSchema).max(24).optional(),
    anchors: z.array(AnchorSchema).max(12).optional(),
    locale: z.enum(["ar", "en", "mixed"]).optional(),
  })
  .optional();

const Input = z.object({
  question: z.string().trim().min(1).max(600),
  lang: z.enum(["ar", "en"]).optional(),
  context: ContextSchema,
  history: z.array(TurnSchema).max(12).optional(),
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
        const lovableKey = key;

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

        // Build a compact, model-friendly context block from what the
        // current page registered with the ARIA Global Context Engine.
        function buildContextBlock(): string {
          const c = data.context;
          const h = data.history ?? [];
          if (!c && !h.length) return "";
          const parts: string[] = [];
          if (c?.page) {
            const p = c.page;
            const pageLine = [
              p.title ? `title=${p.title}` : null,
              p.path ? `path=${p.path}` : null,
              p.section ? `section=${p.section}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            parts.push(`# CURRENT PAGE\n${pageLine || "(unknown)"}`);
            if (p.filters && Object.keys(p.filters).length) {
              parts.push(`# ACTIVE FILTERS\n${JSON.stringify(p.filters).slice(0, 1200)}`);
            }
            if (p.selected) {
              parts.push(`# SELECTED OBJECT\n${JSON.stringify(p.selected).slice(0, 1200)}`);
            }
          }
          if (c?.widgets?.length) {
            const lines = c.widgets.slice(0, 20).map((w) => {
              const v = w.value === undefined ? "" : ` = ${JSON.stringify(w.value).slice(0, 200)}`;
              const hint = w.hint ? ` — ${w.hint}` : "";
              return `- [${w.kind}] ${w.label}${v}${hint}`;
            });
            parts.push(`# LIVE WIDGETS / KPIs ON SCREEN\n${lines.join("\n")}`);
          }
          if (c?.anchors?.length) {
            parts.push(
              `# REFERENCEABLE ANCHORS (resolve "this" / "that" / "the previous X" from these)\n${c.anchors
                .map((a) => `- ${a.kind}: ${a.label ?? a.id} (${a.id})`)
                .join("\n")}`,
            );
          }
          if (h.length) {
            parts.push(
              `# RECENT CONVERSATION (oldest → newest)\n${h
                .slice(-8)
                .map((t) => `${t.role.toUpperCase()}: ${t.text.slice(0, 400)}`)
                .join("\n")}`,
            );
          }
          parts.push(
            "GROUND every claim in the sections above. If a required datum is not present, say once: \"Data unavailable / بيانات غير متوفرة\" and stop. Never invent numbers, names, dates, or sources.",
          );
          return parts.join("\n\n");
        }
        const contextBlock = buildContextBlock();
        const systemForCall = contextBlock ? `${SYSTEM}\n\n${contextBlock}` : SYSTEM;

        async function callModel(model: string, maxTokens: number) {
          const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Lovable-API-Key": lovableKey,
              "X-Lovable-AIG-SDK": "nexios-public-aria",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              max_completion_tokens: maxTokens,
              messages: [
                { role: "system", content: systemForCall },
                { role: "user", content: data.question },
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
