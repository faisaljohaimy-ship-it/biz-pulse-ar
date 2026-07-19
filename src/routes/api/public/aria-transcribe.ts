import { createFileRoute } from "@tanstack/react-router";
import {
  enforceRateLimit,
  rateLimitResponse,
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

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
} as const;

function errorResponse(error: string, status: number, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, error, ...extra }, { status, headers: JSON_HEADERS });
}

function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
    "anon"
  );
}

function langFor(text: string): "ar" | "en" {
  return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
}

async function transcribeWithLovableGateway(audio: File, signal: AbortSignal): Promise<string | null> {
  const key = process.env.LOVABLE_API_KEY?.trim();
  if (!key) return null;

  const upstream = new FormData();
  upstream.set("file", audio, audio.name || "aria-voice.webm");
  upstream.set("model", "openai/gpt-4o-mini-transcribe");
  upstream.set("response_format", "json");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "nexios-public-aria-stt",
    },
    body: upstream,
    signal,
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 240);
    console.warn("[public/aria-transcribe] gateway", response.status, detail);
    return null;
  }
  const payload = (await response.json().catch(() => null)) as { text?: unknown } | null;
  return typeof payload?.text === "string" ? payload.text.trim() : null;
}

async function transcribeWithElevenLabs(audio: File, signal: AbortSignal): Promise<string | null> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) return null;

  const form = new FormData();
  form.set("file", audio, audio.name || "aria-voice.webm");
  form.set("model_id", "scribe_v1");
  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body: form,
    signal,
  });
  if (!response.ok) {
    console.warn("[public/aria-transcribe] elevenlabs", response.status);
    return null;
  }
  const payload = (await response.json().catch(() => null)) as { text?: unknown } | null;
  return typeof payload?.text === "string" ? payload.text.trim() : null;
}

export const Route = createFileRoute("/api/public/aria-transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentLength = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
          return errorResponse("Voice recording is too large.", 413);
        }
        if (!request.headers.get("content-type")?.toLowerCase().includes("multipart/form-data")) {
          return errorResponse("Voice input must use multipart/form-data.", 415);
        }

        const rate = await enforceRateLimit(`pub-aria-transcribe:${clientIp(request)}`, 18, 300);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();

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
        if (audio.size > MAX_AUDIO_BYTES) return errorResponse("Voice recording is too large.", 413);
        const mediaType = audio.type.split(";", 1)[0]!.toLowerCase();
        if (!AUDIO_TYPES.has(mediaType)) {
          return errorResponse("Voice recording type is not supported.", 415);
        }

        try {
          const text =
            (await transcribeWithLovableGateway(audio, request.signal)) ||
            (await transcribeWithElevenLabs(audio, request.signal));
          if (!text) return errorResponse("No speech was detected.", 422);
          return Response.json(
            { ok: true, text: text.slice(0, 10_000), lang: langFor(text) },
            { status: 200, headers: JSON_HEADERS },
          );
        } catch (error) {
          if (request.signal.aborted) return errorResponse("Voice transcription was cancelled.", 499);
          console.error(
            "[public/aria-transcribe] failed",
            error instanceof Error ? error.message : String(error),
          );
          return errorResponse("Voice understanding is unavailable.", 502);
        }
      },
    },
  },
});