/**
 * ARIA voice — server TTS route.
 * POST /api/aria/tts { text }  → audio/mpeg stream (ElevenLabs multilingual v2).
 * Voice identity is HARD-LOCKED to the canonical ARIA voice from
 * `@/lib/aria/voice-config` — no env override, no client override.
 * Requires an authenticated Supabase user; rate limit 40 req / 5 min per user.
 */
import { createFileRoute } from "@tanstack/react-router";
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

const MAX_CHARS = 600;
const RATE_LIMIT = 40;
const RATE_WINDOW_SECONDS = 5 * 60;

export const Route = createFileRoute("/api/aria/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Option A: authenticated-only ElevenLabs. Anonymous callers get 403
        // immediately so the client silently falls back to browser speech —
        // no ElevenLabs call is made.
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

        let body: { text?: unknown };
        try {
          body = (await request.json()) as { text?: unknown };
        } catch {
          return Response.json({ error: "bad_json" }, { status: 400 });
        }
        const rawText = typeof body.text === "string" ? body.text.trim() : "";
        if (!rawText) {
          return Response.json({ error: "empty_text" }, { status: 400 });
        }
        if (rawText.length > MAX_CHARS) {
          return Response.json({ error: "text_too_long" }, { status: 400 });
        }
        // Auto-diacritize unvocalized Arabic (display text unaffected).
        const ttsText = await diacritizeForTts(rawText);
        const upstream = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${ARIA_ELEVENLABS_VOICE_ID}/stream?output_format=mp3_22050_32`,
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
          },
        );
        if (!upstream.ok || !upstream.body) {
          const msg = await upstream.text().catch(() => "");
          return Response.json(
            { error: "tts_upstream", status: upstream.status, detail: msg.slice(0, 200) },
            { status: 502 },
          );
        }
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": "audio/mpeg",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
