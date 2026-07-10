/**
 * ARIA Voice — server function that proxies text to the Lovable AI Gateway
 * text-to-speech endpoint. Keeps LOVABLE_API_KEY server-side. Returns
 * base64-encoded MP3 audio so the client can play it via a data URI.
 *
 * Replaceable speech engine: only this function talks to the provider.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Voice is PINNED server-side — clients cannot pick a voice, so the narrator
// always sounds the same. (Any `voice` key sent by a caller is stripped.)
const NARRATOR_VOICE = "alloy";

const Input = z.object({
  text: z.string().min(1).max(4000),
  instructions: z.string().max(500).optional(),
});

export const ariaSpeak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("@/lib/governance/rate-limit.server");
    const rate = await enforceRateLimit(`aria-speak:${context.userId}`, 30, 60);
    if (rate.unavailable) throw new Error("rate_limit_unavailable");
    if (!rate.allowed) throw new Error("rate_limited");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "nexios-aria-tts",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: data.text,
        voice: NARRATOR_VOICE,
        response_format: "mp3",
        ...(data.instructions ? { instructions: data.instructions } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`TTS failed: ${res.status} ${errText}`);
    }

    const buf = await res.arrayBuffer();
    // Buffer is available in the Worker runtime via nodejs_compat.
    const base64 = Buffer.from(buf).toString("base64");
    return { audio_base64: base64, mime: "audio/mpeg" };
  });
