import { createFileRoute } from "@tanstack/react-router";
import { resolveGoogleGeminiModel } from "@/lib/ai-gateway.server";
import { GEMINI_EMBEDDING_MODEL } from "@/lib/sadeed/gemini-embeddings.server";
import { isGeminiRagReady } from "@/lib/sadeed/rag.server";

export const Route = createFileRoute("/api/chat/health")({
  server: {
    handlers: {
      GET: async () => {
        const geminiPresent = Boolean(
          process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim(),
        );
        const elevenLabsPresent = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
        const provider = geminiPresent ? "google-gemini" : null;
        const model = geminiPresent ? resolveGoogleGeminiModel() : null;
        return Response.json(
          {
            ok: true,
            provider,
            model,
            key_present: geminiPresent,
            rag_embedding_model: GEMINI_EMBEDDING_MODEL,
            rag_ready: isGeminiRagReady(),
            voice_configured: elevenLabsPresent,
            transcription_configured: geminiPresent,
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
