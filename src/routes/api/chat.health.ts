import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/chat/health — tiny probe used by AriaCopilot on mount to render a
 * connectivity dot. Never returns the actual secret; only whether it exists.
 */
export const Route = createFileRoute("/api/chat/health")({
  server: {
    handlers: {
      GET: async () => {
        // Report the provider that WOULD actually serve a request, mirroring
        // the FREE-FIRST priority in ai-router.server.ts: Google → OpenAI →
        // Anthropic → OpenRouter → Lovable. Never returns the secret itself —
        // only which is active.
        const google = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
        const openai = !!process.env.OPENAI_API_KEY;
        const anthropic = !!process.env.ANTHROPIC_API_KEY;
        const openrouter = !!process.env.OPENROUTER_API_KEY;
        const lovable = !!process.env.LOVABLE_API_KEY;
        const provider = google
          ? "google-gemini"
          : openai
            ? "openai"
            : anthropic
              ? "anthropic"
              : openrouter
                ? "openrouter"
                : lovable
                  ? "lovable"
                  : null;
        const model = google
          ? "gemini-2.5-flash"
          : openai
            ? process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini"
            : anthropic
              ? "claude-3-5-sonnet-latest"
              : openrouter
                ? "anthropic/claude-3.5-sonnet"
                : lovable
                  ? "google/gemini-3-flash-preview"
                  : null;
        return Response.json({ ok: true, provider, model, key_present: !!provider });
      },
    },
  },
});
