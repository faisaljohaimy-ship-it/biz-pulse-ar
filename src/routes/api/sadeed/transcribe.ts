/** Authenticated SADEED transcription boundary — native Google Gemini only. */
import { createFileRoute } from "@tanstack/react-router";
import { verifySupabaseUser } from "@/lib/hook-auth.server";
import { aiDisabledResponse, enforceAiQuota } from "@/lib/governance/ai-quota.server";
import { enforceRateLimit, rateLimitUnavailableResponse } from "@/lib/governance/rate-limit.server";
import {
  MAX_GEMINI_AUDIO_BYTES,
  transcribeWithGemini,
} from "@/lib/sadeed/gemini-transcription.server";

const HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
} as const;

function errorResponse(error: string, status: number): Response {
  return Response.json({ ok: false, error }, { status, headers: HEADERS });
}

export const Route = createFileRoute("/api/sadeed/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // مفتاح الإيقاف الفوري أوّلًا — متزامن، قبل أي شبكة.
        const off = aiDisabledResponse("stt");
        if (off) return off;
        const auth = await verifySupabaseUser(request);
        if (auth instanceof Response) return auth;
        const rate = await enforceRateLimit(`sadeed-transcribe:${auth.userId}`, 30, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return errorResponse("Voice transcription rate limit exceeded.", 429);
        // السقفان اليوميان (الهوية والمشروع) قبل أي نداء نموذج؛ يفشلان مغلقين.
        const quota = await enforceAiQuota({
          surface: "stt",
          identity: auth.userId,
          deadlineMs: 2_000,
        });
        if (quota) return quota;

        const form = await request.formData().catch(() => null);
        const audio = form?.get("audio");
        if (!(audio instanceof File) || audio.size === 0) {
          return errorResponse("Voice recording is missing.", 400);
        }
        if (audio.size > MAX_GEMINI_AUDIO_BYTES) {
          return errorResponse("Voice recording is too large.", 413);
        }
        try {
          const result = await transcribeWithGemini(audio, { signal: request.signal });
          return Response.json(
            { ok: true, text: result.text },
            {
              status: 200,
              headers: {
                ...HEADERS,
                "X-SADEED-Transcription-Model": result.model,
                "X-SADEED-Transcription-Provider": result.provider,
              },
            },
          );
        } catch (error) {
          if (request.signal.aborted)
            return errorResponse("Voice transcription was cancelled.", 499);
          console.error("[api/sadeed/transcribe] Gemini transcription failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          return errorResponse("Gemini voice understanding is unavailable.", 502);
        }
      },
    },
  },
});
