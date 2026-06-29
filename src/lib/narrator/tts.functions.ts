/**
 * ARIA Voice — server function that proxies text to the Lovable AI Gateway
 * text-to-speech endpoint. Keeps LOVABLE_API_KEY server-side. Returns
 * base64-encoded MP3 audio so the client can play it via a data URI.
 *
 * Replaceable speech engine: only this function talks to the provider.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().default("alloy"),
  instructions: z.string().max(500).optional(),
});

export const ariaSpeak = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: data.text,
        voice: data.voice,
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
