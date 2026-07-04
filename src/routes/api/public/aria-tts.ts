/**
 * Public ARIA voice endpoint — bilingual TTS for the landing hero.
 * No auth (powers the public ARIA badge). Strict per-IP rate limit
 * and a short text cap. Streams ElevenLabs `eleven_multilingual_v2`
 * with the executive female voice (Sarah).
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";

const Input = z.object({
  text: z.string().trim().min(1).max(1200),
});

const DEFAULT_VOICE = "gVzwmdZzRgBrNjXaTmi5"; // ARIA canonical — Layan (The Professional, ar-SA)


async function synthesizeWithGateway(text: string, key: string): Promise<Response | null> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "nexios-public-aria-tts",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini-tts",
      input: text,
      voice: "nova",
      response_format: "mp3",
      instructions: "Formal executive bilingual voice. Calm, clear, premium, and concise.",
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) {
    const detail = (await r.text().catch(() => "")).slice(0, 240);
    console.error("[public/aria-tts] gateway", r.status, detail);
    return null;
  }
  return r;
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

export const Route = createFileRoute("/api/public/aria-tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lovableKey = process.env.LOVABLE_API_KEY;
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!lovableKey && !apiKey) {
          return Response.json({ error: "tts_unconfigured" }, { status: 500 });
        }
        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
        const parsed = Input.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "invalid_input" }, { status: 400 });
        }

        const ip = clientIp(request);
        const rate = await enforceRateLimit(`pub-aria-tts:${ip}`, 15, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();

        const text = parsed.data.text;
        if (lovableKey) {
          try {
            const gatewayAudio = await synthesizeWithGateway(text, lovableKey);
            if (gatewayAudio) {
              const audio = await gatewayAudio.arrayBuffer();
              return new Response(audio, {
                status: 200,
                headers: {
                  "Content-Type": "audio/mpeg",
                  "Content-Length": String(audio.byteLength),
                  "Cache-Control": "no-store",
                },
              });
            }
          } catch (e) {
            console.error("[public/aria-tts] gateway", e instanceof Error ? e.message : e);
          }
        }

        if (!apiKey) return Response.json({ error: "tts_failed" }, { status: 502 });

        const voiceId = process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE;
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.8,
                style: 0.45,
                use_speaker_boost: true,
                speed: 1.0,
              },
            }),
            signal: AbortSignal.timeout(30_000),
          });

          if (!r.ok) {
            const detail = (await r.text().catch(() => "")).slice(0, 240);
            console.error("[public/aria-tts] provider", r.status, detail);
            return Response.json({ error: "tts_failed", status: r.status }, { status: 502 });
          }
          const audio = await r.arrayBuffer();
          return new Response(audio, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Length": String(audio.byteLength),
              "Cache-Control": "no-store",
            },
          });
        } catch (e) {
          console.error("[public/aria-tts]", e instanceof Error ? e.message : e);
          return Response.json({ error: "network_error" }, { status: 502 });
        }
      },
    },
  },
});
