/** Authenticated SADEED speech-to-text — native Google Gemini only. */
import { createFileRoute } from "@tanstack/react-router";
import { verifySupabaseUser } from "@/lib/hook-auth.server";
import { aiDisabledResponse, enforceAiQuota } from "@/lib/governance/ai-quota.server";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";
import {
  MAX_GEMINI_AUDIO_BYTES,
  transcribeWithGemini,
} from "@/lib/sadeed/gemini-transcription.server";

const ARABIC_RANGE = /[\u0600-\u06FF]/;

export const Route = createFileRoute("/api/voice-stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // مفتاح الإيقاف الفوري أوّلًا — متزامن، قبل أي شبكة.
        const off = aiDisabledResponse("stt");
        if (off) return off;
        const auth = await verifySupabaseUser(request);
        if (auth instanceof Response) return auth;
        const rate = await enforceRateLimit(`voice-stt:${auth.userId}`, 60, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();
        // السقفان اليوميان (الهوية والمشروع) قبل أي نداء نموذج؛ يفشلان مغلقين.
        const quota = await enforceAiQuota({
          surface: "stt",
          identity: auth.userId,
          deadlineMs: 2_000,
        });
        if (quota) return quota;

        const form = await request.formData().catch(() => null);
        const audio = form?.get("audio");
        if (!(audio instanceof File) || audio.size < 300) {
          return Response.json({ error: "audio_required" }, { status: 400 });
        }
        if (audio.size > MAX_GEMINI_AUDIO_BYTES) {
          return Response.json({ error: "audio_too_large" }, { status: 413 });
        }
        try {
          const result = await transcribeWithGemini(audio, { signal: request.signal });
          return Response.json({
            text: result.text,
            lang: ARABIC_RANGE.test(result.text) ? "ar" : "en",
            provider: result.provider,
            model: result.model,
          });
        } catch (error) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          console.error("[voice-stt] Gemini transcription failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          return Response.json({ error: "stt_unavailable" }, { status: 502 });
        }
      },
    },
  },
});
