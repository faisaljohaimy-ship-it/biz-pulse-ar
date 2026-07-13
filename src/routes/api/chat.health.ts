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
        // the priority in ai-router.server.ts: Anthropic → OpenRouter → Lovable.
        // Never returns the secret itself — only which provider is active.
        const anthropic = !!process.env.ANTHROPIC_API_KEY;
        const openrouter = !!process.env.OPENROUTER_API_KEY;
        const lovable = !!process.env.LOVABLE_API_KEY;
        const provider = anthropic
          ? "anthropic"
          : openrouter
            ? "openrouter"
            : lovable
              ? "lovable"
              : null;
        const model = anthropic
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
