import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/chat/health")({
  server: {
    handlers: {
      GET: async () => {
        const keyPresent = Boolean(
          process.env.OPENAI_API_KEY?.trim() ||
            process.env.GEMINI_API_KEY?.trim() ||
            process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
            process.env.ANTHROPIC_API_KEY?.trim() ||
            process.env.LOVABLE_API_KEY?.trim() ||
            process.env.OPENROUTER_API_KEY?.trim(),
        );
        return Response.json(
          {
            ok: true,
            model: "aria-router",
            key_present: keyPresent,
            voice_configured: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
            transcription_configured: Boolean(
              process.env.OPENAI_API_KEY?.trim(),
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
