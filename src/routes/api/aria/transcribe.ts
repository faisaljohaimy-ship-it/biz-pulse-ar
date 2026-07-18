import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  enforceRateLimit,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";

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

function errorResponse(error: string, status: number): Response {
  return Response.json({ ok: false, error }, { status, headers: HEADERS });
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

        const openAiKey = process.env.OPENAI_API_KEY?.trim();
        if (!openAiKey) {
          return errorResponse("Voice transcription is not configured.", 503);
        }
        const upstreamForm = new FormData();
        upstreamForm.set("file", audio, audio.name.slice(0, 120));
        upstreamForm.set(
          "model",
          process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "gpt-4o-transcribe",
        );
        upstreamForm.set("language", "ar");
        upstreamForm.set("response_format", "json");

        let upstream: Response;
        try {
          upstream = await fetch(
            "https://api.openai.com/v1/audio/transcriptions",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${openAiKey}` },
              body: upstreamForm,
              signal: request.signal,
            },
          );
        } catch (transcriptionError) {
          if (request.signal.aborted)
            return errorResponse("Voice transcription was cancelled.", 499);
          console.error("[api/aria/transcribe] provider unavailable", {
            error:
              transcriptionError instanceof Error
                ? transcriptionError.message
                : String(transcriptionError),
          });
          return errorResponse("Voice transcription is unavailable.", 502);
        }
        if (!upstream.ok) {
          console.warn("[api/aria/transcribe] provider rejected recording", {
            status: upstream.status,
          });
          return errorResponse("Voice transcription failed.", 502);
        }
        const payload = (await upstream.json().catch(() => null)) as {
          text?: unknown;
        } | null;
        const text =
          typeof payload?.text === "string" ? payload.text.trim() : "";
        if (!text) return errorResponse("No speech was detected.", 422);
        return Response.json(
          { ok: true, text: text.slice(0, 10_000) },
          { status: 200, headers: HEADERS },
        );
      },
    },
  },
});
