import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/chat/health — tiny probe used by AriaCopilot on mount to render a
 * connectivity dot. Never returns the actual secret; only whether it exists.
 */
export const Route = createFileRoute("/api/chat/health")({
  server: {
    handlers: {
      GET: async () => {
        // key_present must mirror chat.ts's guard: EITHER provider key works.
        const keyPresent = !!(process.env.LOVABLE_API_KEY || process.env.OPENROUTER_API_KEY);
        return Response.json({
          ok: true,
          model: "google/gemini-3-flash-preview",
          key_present: keyPresent,
        });
      },
    },
  },
});
