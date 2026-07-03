import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/chat/health — tiny probe used by AriaCopilot on mount to render a
 * connectivity dot. Never returns the actual secret; only whether it exists.
 */
export const Route = createFileRoute("/api/chat/health")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          ok: true,
          model: "google/gemini-3-flash-preview",
          key_present: !!process.env.LOVABLE_API_KEY,
        });
      },
    },
  },
});
