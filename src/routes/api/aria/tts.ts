import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  enforceRateLimit,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";
import {
  ARIA_ELEVENLABS_MODEL,
  ARIA_ELEVENLABS_VOICE_ID,
  ARIA_ELEVENLABS_VOICE_SETTINGS,
} from "@/lib/aria/voice-config";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
} as const;

function jsonError(
  error: string,
  status: number,
  extra: Record<string, unknown> = {},
) {
  return Response.json(
    { ok: false, error, ...extra },
    { status, headers: JSON_HEADERS },
  );
}

export const Route = createFileRoute("/api/aria/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentLength = Number(
          request.headers.get("content-length") ?? "0",
        );
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
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (userError || !userData.user)
          return jsonError("Authentication is invalid.", 401);

        const rate = await enforceRateLimit(
          `aria-tts:${userData.user.id}`,
          40,
          60,
        );
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed)
          return jsonError("ARIA voice rate limit exceeded.", 429);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError("Invalid JSON body.", 400);
        }
        const text =
          body &&
          typeof body === "object" &&
          typeof (body as { text?: unknown }).text === "string"
            ? (body as { text: string }).text.trim()
            : "";
        if (!text || text.length > 4_000) {
          return jsonError(
            "TTS text must contain between 1 and 4,000 characters.",
            400,
          );
        }

        const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
        if (!apiKey)
          return jsonError("ARIA voice provider is not configured.", 503);

        let upstream: Response;
        try {
          upstream = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ARIA_ELEVENLABS_VOICE_ID)}/stream?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: {
                Accept: "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": apiKey,
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
          if (request.signal.aborted)
            return jsonError("TTS request was cancelled.", 499);
          console.error("[api/aria/tts] ElevenLabs request failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          return jsonError("ARIA voice provider is unavailable.", 502);
        }

        if (!upstream.ok || !upstream.body) {
          const providerReason = (await upstream.text().catch(() => "")).slice(
            0,
            240,
          );
          console.warn("[api/aria/tts] provider rejected request", {
            status: upstream.status,
            reason: providerReason,
          });
          return jsonError("ARIA voice generation failed.", 502, {
            providerStatus: upstream.status,
          });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type":
              upstream.headers.get("content-type") || "audio/mpeg",
            "X-ARIA-Voice-ID": ARIA_ELEVENLABS_VOICE_ID,
          },
        });
      },
    },
  },
});
