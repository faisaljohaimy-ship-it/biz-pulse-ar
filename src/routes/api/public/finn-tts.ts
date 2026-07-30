/**
 * Public FINN voice endpoint — powers the landing hero AND the Executive
 * Voice Tour. Same voice identity as the authenticated chatbot: reads
 * `FINN_ELEVENLABS_VOICE_ID` from the shared voice config so tour audio
 * is acoustically identical to the FINN chatbot.
 *
 * ONE voice, always: there is deliberately NO fallback provider. If
 * ElevenLabs is unavailable the endpoint returns 502 and the client stays
 * silent — a different voice would break FINN's identity mid-session.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";
import { diacritizeForTts } from "@/lib/finn/tts-diacritize.server";
import { revalidateSpeakableText } from "@/lib/finn/output/finalize";
import { buildFinnGreetingClockSpeech } from "@/lib/finn/makkah-clock";
import { arabicNumberWords } from "@/lib/finn/pronunciation";
import { FINN_CONVERSATION_GREETING_AR_TTS } from "@/lib/finn/conversation-greeting";
import {
  ALLOWED_ELEVEN_VOICE_IDS,
  FINN_ELEVENLABS_VOICE_ID,
  FINN_ELEVENLABS_VOICE_SETTINGS,
  FINN_ELEVENLABS_MODEL,
} from "@/lib/finn/voice-config";

const Input = z.object({
  text: z.string().trim().min(1).max(4000),
  // Specialist-agent voice (ElevenLabs premade), honored ONLY when it is in
  // the server whitelist; anything else uses the canonical Layan voice.
  voiceId: z.string().trim().max(64).optional(),
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
  requestedVoice?: string,
): Promise<Response | null> {
  // HARD-LOCKED canonical voice — no env / arbitrary client override. The
  // ONLY accepted deviation is a whitelisted specialist-agent premade voice.
  const voiceId =
    requestedVoice && ALLOWED_ELEVEN_VOICE_IDS.has(requestedVoice)
      ? requestedVoice
      : FINN_ELEVENLABS_VOICE_ID;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: FINN_ELEVENLABS_MODEL,
      voice_settings: FINN_ELEVENLABS_VOICE_SETTINGS,
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

function isAbort(e: unknown): boolean {
  return (e instanceof Error && (e.name === "AbortError" || /aborted/i.test(e.message))) || false;
}

export const Route = createFileRoute("/api/public/finn-tts")({
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
          // Greeting opener (Article 2): same server-side Makkah-clock
          // sentence as the authenticated route — the guest fallback speaks
          // the identical Gregorian date + time, once. No browser time.
          if (text === FINN_CONVERSATION_GREETING_AR_TTS) {
            text = `${buildFinnGreetingClockSpeech(new Date(), arabicNumberWords)} ${text}`;
          }
          try {
            text = await diacritizeForTts(text);
          } catch (e) {
            console.error("[public/aria-tts] diacritize", e instanceof Error ? e.message : e);
          }

          // Output-gateway revalidation at the HTTP boundary: block any
          // secret/protected leakage, redact PII, before synthesis.
          const rev = revalidateSpeakableText(text);
          if (!rev.ok || !rev.text.trim()) {
            return Response.json({ error: "unsafe_content" }, { status: 422 });
          }
          text = rev.text;

          if (elevenKey) {
            try {
              const el = await synthesizeWithElevenLabs(
                text,
                elevenKey,
                request.signal,
                parsed.data.voiceId,
              );
              if (el) {
                const audio = await el.arrayBuffer();
                return new Response(audio, {
                  status: 200,
                  headers: {
                    "Content-Type": "audio/mpeg",
                    "Content-Length": String(audio.byteLength),
                    "Cache-Control": "no-store",
                    "X-FINN-Voice-Provider": "elevenlabs",
                  },
                });
              }
            } catch (e) {
              if (isAbort(e) || request.signal.aborted) {
                return new Response(null, { status: 499 });
              }
              console.error("[public/aria-tts] elevenlabs", e instanceof Error ? e.message : e);
            }
          }

          // Owner voice policy: NO fallback provider — the audible voice is
          // exclusively ElevenLabs Layan. A failed segment stays silent.
          return Response.json({ error: "tts_failed" }, { status: 502 });
        } catch (e) {
          if (isAbort(e) || request.signal.aborted) {
            return new Response(null, { status: 499 });
          }
          console.error("[public/aria-tts] unhandled", e instanceof Error ? e.message : e);
          return Response.json({ error: "tts_failed" }, { status: 502 });
        }
      },
    },
  },
});
