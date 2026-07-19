/**
 * POST /api/aria/tts — ARIA's ONLY spoken-voice endpoint.
 *
 * Non-negotiable voice policy (owner directive): the audible ARIA voice is
 * EXCLUSIVELY ElevenLabs "Layan" (ARIA_ELEVENLABS_VOICE_ID), generated here
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
  ARIA_ELEVENLABS_MODEL,
  ARIA_ELEVENLABS_VOICE_ID,
  ARIA_ELEVENLABS_VOICE_SETTINGS,
} from "@/lib/aria/voice-config";

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
          return jsonError("ARIA data service is not configured.", 503);
        }
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authorization } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) return jsonError("Authentication is invalid.", 401);

        const rate = await enforceRateLimit(`aria-tts:${userData.user.id}`, 40, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return jsonError("ARIA voice rate limit exceeded.", 429);

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
        // including ARIA's own speech, which never sends voiceId — uses
        // Layan exclusively.
        const requestedVoice =
          body &&
          typeof body === "object" &&
          typeof (body as { voiceId?: unknown }).voiceId === "string"
            ? (body as { voiceId: string }).voiceId.trim()
            : "";
        const voiceId = ALLOWED_ELEVEN_VOICE_IDS.has(requestedVoice)
          ? requestedVoice
          : ARIA_ELEVENLABS_VOICE_ID;

        const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
        if (!apiKey) return jsonError("ARIA voice (ElevenLabs) is not configured.", 503);

        let upstream: Response;
        try {
          upstream = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
              },
              body: JSON.stringify({
                text,
                model_id: ARIA_ELEVENLABS_MODEL,
                voice_settings: ARIA_ELEVENLABS_VOICE_SETTINGS,
              }),
              signal: request.signal,
            },
          );
        } catch (error) {
          if (request.signal.aborted) return jsonError("TTS request was cancelled.", 499);
          console.error("[api/aria/tts] ElevenLabs request failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          return jsonError("ARIA voice service is unavailable.", 502);
        }

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          console.warn("[api/aria/tts] ElevenLabs rejected request", {
            status: upstream.status,
            detail: detail.slice(0, 200),
          });
          return jsonError("ARIA voice generation failed.", 502, {
            providerStatus: upstream.status,
          });
        }

        // Stream the MP3 straight through — first audible byte as early as
        // the provider emits it.
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": upstream.headers.get("content-type") || "audio/mpeg",
            "X-ARIA-Voice-ID": voiceId,
            "X-ARIA-Voice-Model": ARIA_ELEVENLABS_MODEL,
            "X-ARIA-Voice-Provider": "elevenlabs",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
