/**
 * Gateway STT — fallback / primary speech-to-text via Lovable AI Gateway
 * (`openai/gpt-4o-mini-transcribe`). Removes the hard dependency on
 * ElevenLabs Scribe for the executive voice loop.
 *
 * Accepts multipart/form-data with a single `audio` field (any browser-
 * supported container: webm/opus, mp4/aac, ogg). Returns `{ text, lang }`.
 *
 * Authenticated + rate-limited. Never logs audio bytes.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifySupabaseUser } from "@/lib/hook-auth.server";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";

const ARABIC_RANGE = /[\u0600-\u06FF]/;

export const Route = createFileRoute("/api/voice-stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifySupabaseUser(request);
        if (auth instanceof Response) return auth;

        const rate = await enforceRateLimit(`voice-stt:${auth.userId}`, 60, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return Response.json({ error: "missing_lovable_api_key" }, { status: 500 });
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "invalid_form_data" }, { status: 400 });
        }
        const audio = form.get("audio");
        if (!audio || typeof audio === "string" || typeof (audio as Blob).size !== "number") {
          return Response.json({ error: "audio_required" }, { status: 400 });
        }
        const blob = audio as Blob;
        const sizeBytes = blob.size;
        if (!sizeBytes || sizeBytes < 300) {
          return Response.json({ error: "audio_too_short" }, { status: 400 });
        }
        if (sizeBytes > 25 * 1024 * 1024) {
          return Response.json({ error: "audio_too_large" }, { status: 413 });
        }

        // Forward to Lovable AI Gateway transcription endpoint.
        const upstream = new FormData();
        const filename = audio instanceof File ? audio.name : "voice.webm";
        upstream.append("file", audio, filename);
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("response_format", "json");

        try {
          const r = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}` },
            body: upstream,
            signal: AbortSignal.timeout(45_000),
          });
          if (!r.ok) {
            const detail = (await r.text().catch(() => "")).slice(0, 240);
            console.error("[voice-stt] gateway", r.status, detail);
            return Response.json(
              { error: "stt_upstream_failed", status: r.status },
              { status: r.status === 429 ? 429 : 502 },
            );
          }
          const j = (await r.json()) as { text?: string };
          const text = (j.text ?? "").trim();
          return Response.json({
            text,
            lang: ARABIC_RANGE.test(text) ? "ar" : "en",
            provider: "lovable-gateway",
          });
        } catch (e) {
          console.error("[voice-stt]", e instanceof Error ? e.message : e);
          return Response.json({ error: "stt_network_error" }, { status: 502 });
        }
      },
    },
  },
});
