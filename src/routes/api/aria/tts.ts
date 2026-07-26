/**
 * POST /api/aria/tts — FINN's ONLY spoken-voice endpoint.
 *
 * Non-negotiable voice policy (owner directive): the audible FINN voice is
 * EXCLUSIVELY ElevenLabs "Layan" (FINN_ELEVENLABS_VOICE_ID), generated here
 * server-side and streamed straight through. The ELEVENLABS_API_KEY secret
 * lives only in the server environment — it never reaches the client bundle
 * or the repository — and there is NO fallback to any other voice provider:
 * a failed segment stays silent (identity over substitution).
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { enforceRateLimit, rateLimitUnavailableResponse } from "@/lib/governance/rate-limit.server";
import {
  ALLOWED_ELEVEN_VOICE_IDS,
  FINN_ELEVENLABS_MODEL,
  FINN_ELEVENLABS_VOICE_ID,
  FINN_ELEVENLABS_VOICE_SETTINGS,
} from "@/lib/aria/voice-config";
import { synthesizeSafeSpeech, type SpeakExecutor } from "@/lib/aria/output/tts-adapter.server";
import { buildFinnGreetingClockSpeech } from "@/lib/aria/makkah-clock";
import { arabicNumberWords } from "@/lib/aria/pronunciation";
import { FINN_CONVERSATION_GREETING_AR_TTS } from "@/lib/aria/conversation-greeting";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
} as const;

/** Hard ceiling per synthesized segment (the client speaks sentence-by-sentence). */
const MAX_TTS_TEXT_CHARS = 4_000;

function jsonError(error: string, status: number, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, error, ...extra }, { status, headers: JSON_HEADERS });
}

export const Route = createFileRoute("/api/aria/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentLength = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(contentLength) && contentLength > 24_000) {
          return jsonError("TTS request is too large.", 413);
        }

        const authorization = request.headers.get("authorization")?.trim();
        if (!authorization?.startsWith("Bearer ")) {
          return jsonError("Authentication is required.", 401);
        }

        const supabaseUrl = process.env.SUPABASE_URL?.trim();
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
        if (!supabaseUrl || !supabaseKey) {
          return jsonError("FINN data service is not configured.", 503);
        }
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authorization } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) return jsonError("Authentication is invalid.", 401);

        const rate = await enforceRateLimit(`aria-tts:${userData.user.id}`, 40, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return jsonError("FINN voice rate limit exceeded.", 429);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError("Invalid JSON body.", 400);
        }
        const text =
          body && typeof body === "object" && typeof (body as { text?: unknown }).text === "string"
            ? (body as { text: string }).text.trim()
            : "";
        if (!text || text.length > MAX_TTS_TEXT_CHARS) {
          return jsonError(
            `TTS text must contain between 1 and ${MAX_TTS_TEXT_CHARS.toLocaleString("en-US")} characters.`,
            400,
          );
        }
        // Optional specialist-agent voice: honored ONLY when whitelisted
        // (ElevenLabs premade voices from voice-config). Anything else —
        // including FINN's own speech, which never sends voiceId — uses
        // Layan exclusively.
        const requestedVoice =
          body &&
          typeof body === "object" &&
          typeof (body as { voiceId?: unknown }).voiceId === "string"
            ? (body as { voiceId: string }).voiceId.trim()
            : "";
        const voiceId = ALLOWED_ELEVEN_VOICE_IDS.has(requestedVoice)
          ? requestedVoice
          : FINN_ELEVENLABS_VOICE_ID;

        const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
        if (!apiKey) return jsonError("FINN voice (ElevenLabs) is not configured.", 503);

        // The TTS HTTP boundary cannot trust a raw `text` field: the output
        // gateway re-validates (blocks secret/protected leakage, redacts PII)
        // and only the sanitized text reaches ElevenLabs.
        const speak: SpeakExecutor = async (safeText, vId, signal) => {
          try {
            const up = await fetch(
              `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vId)}/stream?output_format=mp3_44100_128`,
              {
                method: "POST",
                headers: {
                  "xi-api-key": apiKey,
                  "Content-Type": "application/json",
                  Accept: "audio/mpeg",
                },
                body: JSON.stringify({
                  text: safeText,
                  model_id: FINN_ELEVENLABS_MODEL,
                  voice_settings: FINN_ELEVENLABS_VOICE_SETTINGS,
                }),
                signal,
              },
            );
            if (!up.ok || !up.body) return { ok: false, status: up.status };
            return {
              ok: true,
              status: 200,
              audio: up.body,
              contentType: up.headers.get("content-type") || "audio/mpeg",
            };
          } catch {
            return { ok: false, status: 502 };
          }
        };

        // Greeting opener (Article 2): the canned conversation greeting gets
        // the LIVE Makkah clock sentence prepended SERVER-side — Gregorian
        // date then the time, once. Same clock source as <FINN_RUNTIME>;
        // browser time is never consulted. Hijri is display-only, not spoken.
        const speechText =
          text === FINN_CONVERSATION_GREETING_AR_TTS
            ? `${buildFinnGreetingClockSpeech(new Date(), arabicNumberWords)} ${text}`
            : text;

        const outcome = await synthesizeSafeSpeech(
          { text: speechText, voiceId },
          { speak },
          request.signal,
        );
        if (!outcome.spoken) {
          if (request.signal.aborted) return jsonError("TTS request was cancelled.", 499);
          if (outcome.reason === "blocked_content")
            return jsonError("تعذّر توليد صوت آمن لهذا المحتوى.", 422);
          if (outcome.reason === "empty") return jsonError("لا يوجد نص صالح للنطق.", 400);
          return jsonError("FINN voice generation failed.", 502);
        }
        const { result } = outcome;
        if (!result.ok || !result.audio) {
          return jsonError("FINN voice generation failed.", 502, { providerStatus: result.status });
        }

        return new Response(result.audio, {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": result.contentType || "audio/mpeg",
            "X-FINN-Voice-ID": voiceId,
            "X-FINN-Voice-Model": FINN_ELEVENLABS_MODEL,
            "X-FINN-Voice-Provider": "elevenlabs",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
