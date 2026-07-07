/**
 * Public ARIA streaming endpoint — bilingual streaming answer for the
 * landing hero. Streams plain text as Server-Sent Events so the client
 * can render tokens as they arrive and start TTS on the first sentence.
 *
 * Wire format (per event):
 *   data: {"delta":"..."}\n\n
 *   data: {"error":"..."}\n\n
 *   data: {"done":true}\n\n
 *
 * Public / unauthenticated. Protected by strict per-IP rate limit.
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

const GATEWAY_TIMEOUT_MS = 45_000;

const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

function sseError(code: string, status: number) {
  return new Response(`data: ${JSON.stringify({ error: code })}\n\ndata: ${JSON.stringify({ done: true })}\n\n`, {
    status,
    headers: SSE_HEADERS,
  });
}

function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
    "anon"
  );
}

function buildSystem(lang: "ar" | "en"): string {
  if (lang === "ar") {
    return [
      "أنتِ آريا — المساعدة التنفيذية للنكسيوس (NEXIOS).",
      "أجيبي بإيجاز تنفيذي واضح ومباشر. استخدمي فقرات قصيرة أو نقاط عند اللزوم.",
      "التزمي بالعربية الفصحى المُشكَّلة قدر الإمكان لأجل النطق الصحيح.",
      "لا تختلقي أرقاماً أو مصادر. إن لم تتوفر البيانات قولي: بيانات غير متوفرة.",
      "ابدئي الإجابة فوراً دون تمهيد.",
    ].join("\n");
  }
  return [
    "You are ARIA — the executive AI assistant for NEXIOS.",
    "Answer concisely and executively. Short paragraphs or bullet points when useful.",
    "Do not invent numbers or sources. If data is unavailable, say so once.",
    "Start the answer immediately with no preamble.",
  ].join("\n");
}

export const Route = createFileRoute("/api/public/aria-stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          console.error("[public/aria-stream] missing LOVABLE_API_KEY");
          return sseError("missing_provider_key", 500);
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return sseError("invalid_json", 400);
        }
        const parsed = Input.safeParse(body);
        if (!parsed.success) return sseError("invalid_input", 400);
        const { question } = parsed.data;
        const lang: "ar" | "en" = parsed.data.lang ?? (/[\u0600-\u06FF]/.test(question) ? "ar" : "en");

        const ip = clientIp(request);
        const rate = await enforceRateLimit(`pub-aria-stream:${ip}`, 20, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();

        const system = buildSystem(lang);

        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Lovable-API-Key": key,
              "X-Lovable-AIG-SDK": "nexios-public-aria-stream",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-5-mini",
              stream: true,
              max_completion_tokens: 900,
              messages: [
                { role: "system", content: system },
                { role: "user", content: question },
              ],
            }),
            signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
          });
        } catch (err) {
          console.error("[public/aria-stream] fetch failed", err instanceof Error ? err.message : String(err));
          return sseError("network_error", 502);
        }

        if (!upstream.ok || !upstream.body) {
          const detail = (await upstream.text().catch(() => "")).slice(0, 240);
          console.error("[public/aria-stream] gateway", upstream.status, detail);
          const code =
            upstream.status === 402 ? "quota_exceeded"
            : upstream.status === 429 ? "rate_limited"
            : upstream.status === 401 || upstream.status === 403 ? "provider_auth_failed"
            : "provider_error";
          return sseError(code, upstream.status);
        }

        const enc = new TextEncoder();
        const dec = new TextDecoder();
        const reader = upstream.body.getReader();

        const stream = new ReadableStream({
          async start(controller) {
            let buf = "";
            let emitted = false;
            const send = (obj: Record<string, unknown>) => {
              controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
            };
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const chunks = buf.split("\n\n");
                buf = chunks.pop() ?? "";
                for (const chunk of chunks) {
                  const line = chunk.trim();
                  if (!line.startsWith("data:")) continue;
                  const payload = line.slice(5).trim();
                  if (!payload || payload === "[DONE]") continue;
                  try {
                    const j = JSON.parse(payload) as {
                      choices?: { delta?: { content?: string } }[];
                    };
                    const delta = j.choices?.[0]?.delta?.content;
                    if (typeof delta === "string" && delta.length > 0) {
                      emitted = true;
                      send({ delta });
                    }
                  } catch { /* ignore malformed line */ }
                }
              }
              if (!emitted) send({ error: "empty_response" });
              send({ done: true });
            } catch (err) {
              console.error("[public/aria-stream] stream error", err instanceof Error ? err.message : String(err));
              send({ error: "stream_error" });
              send({ done: true });
            } finally {
              try { controller.close(); } catch { /* ignore */ }
            }
          },
          cancel() {
            reader.cancel().catch(() => { /* ignore */ });
          },
        });

        return new Response(stream, { headers: SSE_HEADERS });
      },
    },
  },
});
