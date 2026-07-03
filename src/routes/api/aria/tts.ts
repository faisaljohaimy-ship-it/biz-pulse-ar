/**
 * ARIA voice — server TTS route.
 * POST /api/aria/tts { text }  → audio/mpeg stream (ElevenLabs multilingual v2).
 * Optional env: ELEVENLABS_VOICE_ID (defaults to "Sarah" — Arabic-capable female).
 * Rate limit: 40 requests / 5 minutes per IP.
 */
import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah — multilingual, warm female
const MAX_CHARS = 600;
const RATE_LIMIT = 40;
const RATE_WINDOW_MS = 5 * 60 * 1000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (b.count >= RATE_LIMIT) return false;
  b.count += 1;
  return true;
}

export const Route = createFileRoute("/api/aria/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "tts_unconfigured" }, { status: 503 });
        }
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        if (!rateLimit(ip)) {
          return Response.json({ error: "rate_limited" }, { status: 429 });
        }
        let body: { text?: unknown };
        try {
          body = (await request.json()) as { text?: unknown };
        } catch {
          return Response.json({ error: "bad_json" }, { status: 400 });
        }
        const rawText = typeof body.text === "string" ? body.text.trim() : "";
        if (!rawText) {
          return Response.json({ error: "empty_text" }, { status: 400 });
        }
        if (rawText.length > MAX_CHARS) {
          return Response.json({ error: "text_too_long" }, { status: 400 });
        }
        const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
        const upstream = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_22050_32`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "content-type": "application/json",
              accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text: rawText,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.55,
                similarity_boost: 0.8,
                style: 0.25,
                speed: 0.92,
              },
            }),
          },
        );
        if (!upstream.ok || !upstream.body) {
          const msg = await upstream.text().catch(() => "");
          return Response.json(
            { error: "tts_upstream", status: upstream.status, detail: msg.slice(0, 200) },
            { status: 502 },
          );
        }
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": "audio/mpeg",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
