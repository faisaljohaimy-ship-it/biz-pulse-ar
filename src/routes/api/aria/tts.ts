/**
 * ARIA voice — server TTS route.
 * POST /api/aria/tts { text } → audio/mpeg stream (ElevenLabs).
 * Voice identity is HARD-LOCKED to the canonical ARIA voice from
 * `@/lib/aria/voice-config` — no env override, no client override.
 * Requires an authenticated Supabase user; rate limit 40 req / 5 min per user.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifySupabaseUser } from "@/lib/hook-auth.server";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";
import { diacritizeForTts } from "@/lib/aria/tts-diacritize.server";
import {
  ARIA_ELEVENLABS_VOICE_ID,
  ARIA_ELEVENLABS_VOICE_SETTINGS,
  ARIA_ELEVENLABS_MODEL,
} from "@/lib/aria/voice-config";

const MAX_CHARS = 4_000;
const RATE_LIMIT = 40;
const RATE_WINDOW_SECONDS = 5 * 60;
const BodySchema = z.object({
  text: z.string().trim().min(1).max(MAX_CHARS),
  preserveDiacritics: z.boolean().optional(),
});

export const Route = createFileRoute("/api/aria/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Authenticated-only ElevenLabs. Anonymous callers get 403 immediately
        // and no ElevenLabs call is made. The client then stays SILENT — there
        // is NO browser-speech fallback anywhere (voice constitution: ElevenLabs
        // only; failure means silence, never a different/robotic voice).
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
          return Response.json({ error: "auth_required" }, { status: 403 });
        }

        const auth = await verifySupabaseUser(request);
        if (auth instanceof Response) {
          return Response.json({ error: "auth_required" }, { status: 403 });
        }

        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "tts_unconfigured" }, { status: 503 });
        }
        const { allowed, unavailable } = await enforceRateLimit(
          `aria-tts:${auth.userId}`,
          RATE_LIMIT,
          RATE_WINDOW_SECONDS,
        );
        if (unavailable) return rateLimitUnavailableResponse();
        if (!allowed) return rateLimitResponse();

        const parsed = BodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "bad_json" }, { status: 400 });
        }
        const { text: rawText, preserveDiacritics = true } = parsed.data;
        const preTts = preserveDiacritics
          ? rawText
          : rawText.replace(/[\u064B-\u0652\u0670\u0671]/g, "");
        // Auto-diacritize unvocalized Arabic (display text unaffected).
        const ttsText = await diacritizeForTts(preTts);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);
        try {
          const upstream = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${ARIA_ELEVENLABS_VOICE_ID}/stream?output_format=mp3_22050_32&optimize_streaming_latency=3`,
            {
              method: "POST",
              headers: {
                "xi-api-key": apiKey,
                "content-type": "application/json",
                accept: "audio/mpeg",
              },
              body: JSON.stringify({
                text: ttsText,
                model_id: ARIA_ELEVENLABS_MODEL,
                voice_settings: ARIA_ELEVENLABS_VOICE_SETTINGS,
              }),
              signal: controller.signal,
            },
          );
          if (!upstream.ok || !upstream.body) {
            const detail = await upstream.text().catch(() => "");
            let providerStatus: string | undefined;
            let providerReason: string | undefined;
            try {
              const payload = JSON.parse(detail) as {
                detail?: { status?: string; message?: string };
              };
              providerStatus = payload.detail?.status;
              providerReason = payload.detail?.message;
            } catch {
              // Provider occasionally returns a non-JSON body.
            }
            return Response.json(
              {
                error: "tts_upstream",
                status: upstream.status,
                providerStatus,
                providerReason: providerReason ?? detail.slice(0, 200),
              },
              { status: 502 },
            );
          }
          return new Response(upstream.body, {
            status: 200,
            headers: {
              "content-type": "audio/mpeg",
              "cache-control": "no-store",
              "x-content-type-options": "nosniff",
            },
          });
        } catch (error) {
          const timedOut = error instanceof DOMException && error.name === "AbortError";
          return Response.json(
            { error: timedOut ? "tts_timeout" : "tts_unavailable" },
            { status: 503 },
          );
        } finally {
          clearTimeout(timeout);
        }
      },
    },
  },
});
