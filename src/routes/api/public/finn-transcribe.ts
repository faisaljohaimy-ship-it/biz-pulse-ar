/** Public, rate-limited FINN speech-to-text — native Google Gemini only. */
import { createFileRoute } from "@tanstack/react-router";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";
import {
  MAX_GEMINI_AUDIO_BYTES,
  transcribeWithGemini,
} from "@/lib/finn/gemini-transcription.server";

function clientIp(request: Request): string {
  if (process.env.TRUST_PROXY_HEADERS?.trim().toLowerCase() !== "true") return "shared";
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
    "shared"
  );
}

export const Route = createFileRoute("/api/public/finn-transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rate = await enforceRateLimit(`pub-finn-transcribe:${clientIp(request)}`, 18, 300);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();
        const form = await request.formData().catch(() => null);
        const audio = form?.get("audio");
        if (!(audio instanceof File) || audio.size === 0) {
          return Response.json({ ok: false, error: "audio_required" }, { status: 400 });
        }
        if (audio.size > MAX_GEMINI_AUDIO_BYTES) {
          return Response.json({ ok: false, error: "audio_too_large" }, { status: 413 });
        }
        try {
          const result = await transcribeWithGemini(audio, { signal: request.signal });
          return Response.json({
            ok: true,
            text: result.text,
            lang: /[\u0600-\u06FF]/.test(result.text) ? "ar" : "en",
            provider: result.provider,
            model: result.model,
          });
        } catch (error) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          console.error("[public/finn-transcribe] Gemini transcription failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          return Response.json(
            { ok: false, error: "voice_understanding_unavailable" },
            { status: 502 },
          );
        }
      },
    },
  },
});
