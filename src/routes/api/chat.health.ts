import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/chat/health")({
  server: {
    handlers: {
      GET: async () => {
        const geminiPresent = Boolean(
          process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim(),
        );
        const openaiPresent = Boolean(process.env.OPENAI_API_KEY?.trim());
        const anthropicPresent = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
        const lovablePresent = Boolean(process.env.LOVABLE_API_KEY?.trim());
        const openrouterPresent = Boolean(process.env.OPENROUTER_API_KEY?.trim());
        const elevenLabsPresent = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
        const keyPresent = Boolean(
          geminiPresent || openaiPresent || anthropicPresent || lovablePresent || openrouterPresent,
        );
        const provider = geminiPresent
          ? "gemini"
          : openaiPresent
            ? "openai"
            : lovablePresent
              ? "lovable"
              : anthropicPresent
                ? "anthropic"
                : openrouterPresent
                  ? "openrouter"
                  : null;
        const configuredModel = process.env.GEMINI_MODEL?.trim() ?? "";
        const model = /^[a-z0-9][a-z0-9._-]{2,80}$/i.test(configuredModel)
          ? configuredModel
          : "gemini-3.5-flash";
        return Response.json(
          {
            ok: true,
            provider,
            model,
            key_present: keyPresent,
            // Voice is available if Layan/ElevenLabs is configured or the
            // Lovable Gateway TTS fallback is active; UI must not hard-block
            // conversation mode on one provider while another can speak.
            voice_configured: Boolean(elevenLabsPresent || lovablePresent),
            transcription_configured: Boolean(elevenLabsPresent || geminiPresent || lovablePresent),
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
