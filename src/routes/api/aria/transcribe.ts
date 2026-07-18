import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  enforceRateLimit,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";
import {
  bytesToBase64,
  extractGeminiText,
  normalizeGeminiTranscript,
} from "@/lib/aria/gemini-audio";
import { ARIA_GEMINI_FLASH_MODEL } from "@/lib/aria/voice-config";

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_AUDIO_BYTES + 1024 * 1024;
const AUDIO_TYPES = new Set([
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
  "video/mp4",
]);

const HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
} as const;

function errorResponse(
  error: string,
  status: number,
  extra: Record<string, unknown> = {},
): Response {
  return Response.json(
    { ok: false, error, ...extra },
    { status, headers: HEADERS },
  );
}

function safeModel(value: string | undefined): string {
  const normalized = value?.trim() ?? "";
  return /^[a-z0-9][a-z0-9._-]{2,80}$/i.test(normalized)
    ? normalized
    : ARIA_GEMINI_FLASH_MODEL;
}

export const Route = createFileRoute("/api/aria/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentLength = Number(
          request.headers.get("content-length") ?? "0",
        );
        if (
          Number.isFinite(contentLength) &&
          contentLength > MAX_MULTIPART_BYTES
        ) {
          return errorResponse("Voice recording is too large.", 413);
        }
        if (
          !request.headers
            .get("content-type")
            ?.toLowerCase()
            .includes("multipart/form-data")
        ) {
          return errorResponse(
            "Voice input must use multipart/form-data.",
            415,
          );
        }

        const authorization = request.headers.get("authorization")?.trim();
        if (!authorization || !/^Bearer\s+\S{20,8192}$/i.test(authorization)) {
          return errorResponse("Authentication is required.", 401);
        }
        const supabaseUrl = process.env.SUPABASE_URL?.trim();
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
        if (!supabaseUrl || !supabaseKey) {
          return errorResponse("ARIA data service is not configured.", 503);
        }
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authorization } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user)
          return errorResponse("Authentication is invalid.", 401);

        const rate = await enforceRateLimit(
          `aria-transcribe:${data.user.id}`,
          30,
          60,
        );
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed)
          return errorResponse("Voice transcription rate limit exceeded.", 429);

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return errorResponse("Voice request is invalid.", 400);
        }
        const audio = form.get("audio");
        if (!(audio instanceof File) || audio.size === 0) {
          return errorResponse("Voice recording is missing.", 400);
        }
        if (audio.size > MAX_AUDIO_BYTES) {
          return errorResponse("Voice recording is too large.", 413);
        }
        const mediaType = audio.type.split(";", 1)[0]!.toLowerCase();
        if (!AUDIO_TYPES.has(mediaType)) {
          return errorResponse("Voice recording type is not supported.", 415);
        }

        const apiKey = (
          process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
        )?.trim();
        if (!apiKey) {
          return errorResponse(
            "Gemini voice understanding is not configured.",
            503,
          );
        }
        const model = safeModel(process.env.GEMINI_TRANSCRIBE_MODEL);
        const inlineAudio = bytesToBase64(
          new Uint8Array(await audio.arrayBuffer()),
        );

        let upstream: Response;
        try {
          upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [
                      {
                        text: "حوّل الكلام المسموع إلى نص بدقة. أعد نص المتحدث فقط من دون شرح أو Markdown. حافظ على الأسماء والأرقام واللغة كما نُطقت. إذا لم يوجد كلام مفهوم فأعد الرمز <NO_SPEECH> فقط.",
                      },
                      {
                        inlineData: {
                          mimeType: mediaType,
                          data: inlineAudio,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0,
                  maxOutputTokens: 2_048,
                },
              }),
              signal: request.signal,
            },
          );
        } catch (transcriptionError) {
          if (request.signal.aborted)
            return errorResponse("Voice transcription was cancelled.", 499);
          console.error("[api/aria/transcribe] Gemini unavailable", {
            error:
              transcriptionError instanceof Error
                ? transcriptionError.message
                : String(transcriptionError),
          });
          return errorResponse(
            "Gemini voice understanding is unavailable.",
            502,
          );
        }

        const payload = await upstream.json().catch(() => null);
        if (!upstream.ok) {
          console.warn("[api/aria/transcribe] Gemini rejected recording", {
            status: upstream.status,
          });
          return errorResponse("Gemini voice transcription failed.", 502, {
            providerStatus: upstream.status,
          });
        }
        const text = normalizeGeminiTranscript(extractGeminiText(payload));
        if (!text) return errorResponse("No speech was detected.", 422);
        return Response.json(
          { ok: true, text: text.slice(0, 10_000) },
          {
            status: 200,
            headers: {
              ...HEADERS,
              "X-ARIA-Transcription-Model": model,
              "X-ARIA-Transcription-Provider": "gemini",
            },
          },
        );
      },
    },
  },
});
