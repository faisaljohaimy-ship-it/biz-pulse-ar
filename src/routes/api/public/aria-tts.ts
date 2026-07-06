/**
 * Public ARIA voice endpoint — powers the landing hero AND the Executive
 * Voice Tour. Same voice identity as the authenticated chatbot: reads
 * `ARIA_ELEVENLABS_VOICE_ID` from the shared voice config so tour audio
 * is acoustically identical to the ARIA chatbot. Falls back to the
 * Lovable AI Gateway only if ElevenLabs is unavailable.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";
import { diacritizeForTts } from "@/lib/aria/tts-diacritize.server";
import {
  ARIA_ELEVENLABS_VOICE_ID,
  ARIA_ELEVENLABS_VOICE_SETTINGS,
  ARIA_ELEVENLABS_MODEL,
} from "@/lib/aria/voice-config";

const Input = z.object({
  text: z.string().trim().min(1).max(1200),
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

async function synthesizeWithElevenLabs(text: string, apiKey: string): Promise<Response | null> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? ARIA_ELEVENLABS_VOICE_ID;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: ARIA_ELEVENLABS_MODEL,
      voice_settings: ARIA_ELEVENLABS_VOICE_SETTINGS,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) {
    const detail = (await r.text().catch(() => "")).slice(0, 240);
    console.error("[public/aria-tts] elevenlabs", r.status, detail);
    return null;
  }
  return r;
}

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

export const Route = createFileRoute("/api/public/aria-tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const elevenKey = process.env.ELEVENLABS_API_KEY;
        const lovableKey = process.env.LOVABLE_API_KEY;
        if (!elevenKey && !lovableKey) {
          return Response.json({ error: "tts_unconfigured" }, { status: 500 });
        }

        let body: unknown;
        try { body = await request.json(); }
        catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
        const parsed = Input.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "invalid_input" }, { status: 400 });
        }

        const ip = clientIp(request);
        const rate = await enforceRateLimit(`pub-aria-tts:${ip}`, 30, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();

        const text = await diacritizeForTts(parsed.data.text);

        // Prefer ElevenLabs (canonical ARIA voice — same as the chatbot).
        if (elevenKey) {
          try {
            const el = await synthesizeWithElevenLabs(text, elevenKey);
            if (el) {
              const audio = await el.arrayBuffer();
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
            console.error("[public/aria-tts] elevenlabs", e instanceof Error ? e.message : e);
          }
        }

        // Fallback: Lovable AI Gateway.
        if (lovableKey) {
          try {
            const gw = await synthesizeWithGateway(text, lovableKey);
            if (gw) {
              const audio = await gw.arrayBuffer();
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

        return Response.json({ error: "tts_failed" }, { status: 502 });
      },
    },
  },
});
