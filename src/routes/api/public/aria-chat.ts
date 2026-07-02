/**
 * ARIA Chat — streaming conversational endpoint.
 *
 * Additive to /api/public/aria-ask (unchanged). Streams tokens as SSE
 * `data:` lines with `{ type: "delta"|"done"|"error", text?, message? }`.
 *
 * Uses the Lovable AI Gateway (LOVABLE_API_KEY) with google/gemini-2.5-flash.
 * System prompt is Arabic-first, injects the route registry and current
 * page context so ARIA can discuss the platform intelligently.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";
import { getPageEntry, listPages } from "@/lib/aria/page-registry";

const TurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(4000),
});

const Input = z.object({
  message: z.string().trim().min(1).max(2000),
  lang: z.enum(["ar", "en"]).optional(),
  page: z.string().max(400).optional(),
  history: z.array(TurnSchema).max(20).optional(),
  userName: z.string().max(80).optional(),
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

function buildSystemPrompt(page: string | undefined, lang: "ar" | "en", userName?: string) {
  const entry = getPageEntry(page || "/");
  const pages = listPages()
    .map((p) => `- ${p.path}  ·  ${p.title_en} — ${p.purpose_en}`)
    .join("\n");
  const langLine =
    lang === "en"
      ? "The user is currently addressing you in English — respond in English."
      : "المستخدم يخاطبك حالياً بالعربية — أجيبي بالعربية الفصحى الأنيقة.";
  const nameLine = userName
    ? (lang === "en" ? `Address the user by name when natural: ${userName}.` : `نادِ المستخدم باسمه عند المناسبة: ${userName}.`)
    : "";
  return [
    "أنتِ آريا (ARIA) — المساعدة التنفيذية الرقمية لمنصة NEXIOS AI OS.",
    "تتحدثين العربية الفصحى الأنيقة افتراضياً وتبدّلين للإنجليزية إذا خاطبك المستخدم بها.",
    "أسلوبك: موجز، دافئ، تنفيذي، ذكي، لا تقولين أبداً «كنموذج لغوي» أو ما يشبهه.",
    "تستطيعين الإجابة عن أي سؤال — معرفة عامة، أعمال، تقنية، حسابات، صياغة — كمساعدة تنفيذية من الطراز الأول.",
    "بالإضافة إلى معرفة عميقة بمنصة NEXIOS AI OS ومكوناتها.",
    "",
    "أقسام المنصة (route registry):",
    pages,
    "",
    `الصفحة الحالية للمستخدم: ${page || "/"} — ${entry.title_en} (${entry.purpose_en}).`,
    langLine,
    nameLine,
    "قواعد: كوني موجزة (3–6 جمل غالباً) إلا إذا طُلب التفصيل. استخدمي علامات ترقيم واضحة لتسهيل التلاوة الصوتية.",
  ]
    .filter(Boolean)
    .join("\n");
}

function sse(payload: object): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export const Route = createFileRoute("/api/public/aria-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(sse({ type: "error", message: "missing_api_key" }), {
            status: 500,
            headers: { "Content-Type": "text/event-stream" },
          });
        }

        let body: unknown;
        try { body = await request.json(); }
        catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
        const parsed = Input.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "invalid_input", detail: parsed.error.flatten() }, { status: 400 });
        }
        const data = parsed.data;
        const lang: "ar" | "en" = data.lang ?? "ar";

        const ip = clientIp(request);
        const rate = await enforceRateLimit(`pub-aria-chat:${ip}`, 30, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();

        const system = buildSystemPrompt(data.page, lang, data.userName);
        const history = (data.history ?? []).slice(-20).map((t) => ({
          role: t.role,
          content: t.text,
        }));
        const messages = [
          { role: "system" as const, content: system },
          ...history,
          { role: "user" as const, content: data.message },
        ];

        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages,
              stream: true,
            }),
          });
        } catch {
          return new Response(sse({ type: "error", message: "upstream_unreachable" }), {
            status: 502,
            headers: { "Content-Type": "text/event-stream" },
          });
        }

        if (!upstream.ok || !upstream.body) {
          const status = upstream.status;
          const message =
            status === 429
              ? (lang === "en"
                  ? "I need a moment — traffic is high, please retry shortly."
                  : "أحتاج لحظة، الضغط مرتفع — أعد المحاولة بعد قليل.")
              : status === 402
                ? (lang === "en"
                    ? "AI credits are exhausted — please refresh billing."
                    : "الرصيد نفد — يرجى تجديد الاشتراك.")
                : (lang === "en"
                    ? "Momentary hiccup — please retry."
                    : "خلل مؤقت — أعد المحاولة.");
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              const enc = new TextEncoder();
              controller.enqueue(enc.encode(sse({ type: "delta", text: message })));
              controller.enqueue(enc.encode(sse({ type: "done" })));
              controller.close();
            },
          });
          return new Response(stream, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              "X-Accel-Buffering": "no",
            },
          });
        }

        // Transform OpenAI-style SSE → our simple {type,text} SSE.
        const enc = new TextEncoder();
        const dec = new TextDecoder();
        const reader = upstream.body.getReader();

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            let buf = "";
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const raw of lines) {
                  const line = raw.trim();
                  if (!line.startsWith("data:")) continue;
                  const payload = line.slice(5).trim();
                  if (!payload || payload === "[DONE]") continue;
                  try {
                    const j = JSON.parse(payload) as {
                      choices?: Array<{ delta?: { content?: string } }>;
                    };
                    const delta = j.choices?.[0]?.delta?.content;
                    if (delta) {
                      controller.enqueue(enc.encode(sse({ type: "delta", text: delta })));
                    }
                  } catch { /* ignore malformed */ }
                }
              }
              controller.enqueue(enc.encode(sse({ type: "done" })));
            } catch {
              controller.enqueue(enc.encode(sse({ type: "error", message: "stream_error" })));
            } finally {
              controller.close();
            }
          },
          cancel(reason) { return reader.cancel(reason); },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
