import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/chat/health")({
  server: {
    handlers: {
      GET: async () => {
        const geminiPresent = Boolean(
          process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim(),
        );
        const forceGemini = process.env.ARIA_FORCE_GEMINI_FLASH?.trim().toLowerCase() !== "false";
        const keyPresent = forceGemini
          ? geminiPresent
          : Boolean(
              geminiPresent ||
              process.env.OPENAI_API_KEY?.trim() ||
              process.env.ANTHROPIC_API_KEY?.trim() ||
              process.env.LOVABLE_API_KEY?.trim() ||
              process.env.OPENROUTER_API_KEY?.trim(),
            );
        const configuredModel = process.env.GEMINI_MODEL?.trim() ?? "";
        const model = /^[a-z0-9][a-z0-9._-]{2,80}$/i.test(configuredModel)
          ? configuredModel
          : "gemini-3.5-flash";
        return Response.json(
          {
            ok: true,
            provider: "gemini",
            model,
            key_present: keyPresent,
            // Voice policy: the audible ARIA voice is exclusively ElevenLabs
            // Layan; transcription is ElevenLabs Scribe first, Gemini fallback.
            voice_configured: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
            transcription_configured: Boolean(
              process.env.ELEVENLABS_API_KEY?.trim() || geminiPresent,
            ),
          },
          {
            headers: {
              "Cache-Control": "no-store",
              "Content-Type": "application/json; charset=utf-8",
            },
          },
        );
      },
    },
  },
});
