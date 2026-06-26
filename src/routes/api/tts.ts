import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { httpFetch } from "@/lib/api/http.server";
import { isApiError, toApiErrorShape } from "@/lib/api";

const BodySchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/).optional(),
  preserveDiacritics: z.boolean().optional(),
  stability: z.number().min(0).max(1).optional(),
  similarityBoost: z.number().min(0).max(1).optional(),
  style: z.number().min(0).max(1).optional(),
  speed: z.number().min(0.7).max(1.2).optional(),
});

const DEFAULT_VOICE = "pNInz6obpgDQGcFmaJgB"; // Adam — deep multilingual male

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "ELEVENLABS_API_KEY not configured" }, { status: 500 });
        }

        const parsed = BodySchema.safeParse(await request.json());
        if (!parsed.success) {
          return Response.json({ error: parsed.error.message }, { status: 400 });
        }

        const {
          text,
          voiceId = DEFAULT_VOICE,
          preserveDiacritics = true,
          stability = 0.55,
          similarityBoost = 0.8,
          style = 0.3,
          speed = 1.0,
        } = parsed.data;

        // CRITICAL: We must NOT normalize/strip Arabic diacritics (tashkeel) when the user wants
        // فصيح pronunciation. The harakat are in the Unicode range U+064B..U+0652 plus U+0670 and
        // U+0671 (and shadda U+0651). Passing them through verbatim lets eleven_multilingual_v2
        // disambiguate words like دخَلَ vs دخُلَ.
        const cleanText = preserveDiacritics
          ? text
          : text.replace(/[\u064B-\u0652\u0670\u0671]/g, "");

        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
        try {
          const r = await httpFetch(url, {
            method: "POST",
            headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              text: cleanText,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability,
                similarity_boost: similarityBoost,
                style,
                use_speaker_boost: true,
                speed,
              },
            }),
            label: "elevenlabs/tts",
            timeoutMs: 30_000,
            retries: 1,
          });

          if (!r.ok) {
            const err = await r.text();
            return Response.json({ error: err || `TTS failed: ${r.status}` }, { status: r.status });
          }

          const audio = await r.arrayBuffer();
          return new Response(audio, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Length": String(audio.byteLength),
              "Cache-Control": "no-store",
            },
          });
        } catch (err) {
          const shape = isApiError(err) ? err.toJSON() : toApiErrorShape(err);
          console.error("[api/tts]", shape.code, shape.message);
          return Response.json({ error: shape.message, code: shape.code }, { status: shape.status });
        }
      },
    },
  },
});
