/**
 * Public ARIA voice endpoint — powers the landing hero AND the Executive
 * Voice Tour. Same voice identity as the authenticated chatbot: reads
 * `ARIA_ELEVENLABS_VOICE_ID` from the shared voice config so tour audio
 * is acoustically identical to the ARIA chatbot.
 *
 * ONE voice, always: there is deliberately NO fallback provider. If
 * ElevenLabs is unavailable the endpoint returns 502 and the client stays
 * silent — a different voice would break ARIA's identity mid-session.
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
  text: z.string().trim().min(1).max(4000),
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

async function synthesizeWithElevenLabs(
  text: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<Response | null> {
  // HARD-LOCKED canonical voice — no env / client override.
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${ARIA_ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: ARIA_ELEVENLABS_MODEL,
      voice_settings: ARIA_ELEVENLABS_VOICE_SETTINGS,
    }),
    signal,
  });
  if (!r.ok) {
    const detail = (await r.text().catch(() => "")).slice(0, 240);
    console.error("[public/aria-tts] elevenlabs", r.status, detail);
    return null;
  }
  return r;
}

export const Route = createFileRoute("/api/public/aria-tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const elevenKey = process.env.ELEVENLABS_API_KEY;

          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return Response.json({ error: "invalid_json" }, { status: 400 });
          }
          const parsed = Input.safeParse(body);
          if (!parsed.success) {
            return Response.json({ error: "invalid_input" }, { status: 400 });
          }

          const ip = clientIp(request);
          const rate = await enforceRateLimit(`pub-aria-tts:${ip}`, 30, 60);
          if (rate.unavailable) return rateLimitUnavailableResponse();
          if (!rate.allowed) return rateLimitResponse();

          let text = parsed.data.text;
          try {
            text = await diacritizeForTts(text);
          } catch (e) {
            console.error("[public/aria-tts] diacritize", e instanceof Error ? e.message : e);
          }

          if (elevenKey) {
            try {
              const el = await synthesizeWithElevenLabs(text, elevenKey, request.signal);
              if (el) {
                const audio = await el.arrayBuffer();
                return new Response(audio, {
                  status: 200,
                  headers: {
                    "Content-Type": "audio/mpeg",
                    "Content-Length": String(audio.byteLength),
                    "Cache-Control": "no-store",
                    "X-ARIA-Voice-Provider": "elevenlabs",
                  },
                });
              }
            } catch (e) {
              console.error("[public/aria-tts] elevenlabs", e instanceof Error ? e.message : e);
            }
          }

          // Owner voice policy: NO fallback provider — the audible voice is
          // exclusively ElevenLabs Layan. A failed segment stays silent.
          return Response.json({ error: "tts_failed" }, { status: 502 });
        } catch (e) {
          console.error("[public/aria-tts] unhandled", e instanceof Error ? e.message : e);
          return Response.json({ error: "tts_failed" }, { status: 502 });
        }
      },
    },
  },
});
