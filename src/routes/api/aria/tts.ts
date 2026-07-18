import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  enforceRateLimit,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";
import {
  extractGeminiAudio,
  playableGeminiAudio,
} from "@/lib/aria/gemini-audio";
import {
  ARIA_GEMINI_TTS_DIRECTION,
  ARIA_GEMINI_TTS_MODEL,
  ARIA_GEMINI_TTS_VOICE,
} from "@/lib/aria/voice-config";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
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

function safeModel(value: string | undefined, fallback: string): string {
  const normalized = value?.trim() ?? "";
  return /^[a-z0-9][a-z0-9._-]{2,80}$/i.test(normalized)
    ? normalized
    : fallback;
}

function safeVoice(value: string | undefined): string {
  const normalized = value?.trim() ?? "";
  return /^[a-z][a-z0-9_-]{1,40}$/i.test(normalized)
    ? normalized
    : ARIA_GEMINI_TTS_VOICE;
}

function upstreamErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "string" ? status.slice(0, 80) : undefined;
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

        const apiKey = (
          process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
        )?.trim();
        if (!apiKey) return jsonError("Gemini voice is not configured.", 503);

        const model = safeModel(
          process.env.GEMINI_TTS_MODEL,
          ARIA_GEMINI_TTS_MODEL,
        );
        const voice = safeVoice(process.env.GEMINI_TTS_VOICE);
        let upstream: Response;
        try {
          upstream = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/interactions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({
                model,
                input: `${ARIA_GEMINI_TTS_DIRECTION}\n\n${text}`,
                response_format: { type: "audio" },
                generation_config: {
                  speech_config: [{ voice }],
                },
                store: false,
              }),
              signal: request.signal,
            },
          );
        } catch (error) {
          if (request.signal.aborted)
            return jsonError("TTS request was cancelled.", 499);
          console.error("[api/aria/tts] Gemini request failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          return jsonError("Gemini voice is unavailable.", 502);
        }

        const payload = await upstream.json().catch(() => null);
        if (!upstream.ok) {
          console.warn("[api/aria/tts] Gemini rejected request", {
            status: upstream.status,
            code: upstreamErrorCode(payload),
          });
          return jsonError("Gemini voice generation failed.", 502, {
            providerStatus: upstream.status,
          });
        }

        const audioBlock = extractGeminiAudio(payload);
        if (!audioBlock) {
          console.warn("[api/aria/tts] Gemini returned no audio", {
            status: upstream.status,
          });
          return jsonError("Gemini returned no playable voice audio.", 502);
        }

        let playable: ReturnType<typeof playableGeminiAudio>;
        try {
          playable = playableGeminiAudio(audioBlock);
        } catch (error) {
          console.warn("[api/aria/tts] Gemini audio decode failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          return jsonError("Gemini returned invalid voice audio.", 502);
        }

        return new Response(playable.bytes.buffer as ArrayBuffer, {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": playable.contentType,
            "X-ARIA-Voice-ID": voice,
            "X-ARIA-Voice-Model": model,
            "X-ARIA-Voice-Provider": "gemini",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
