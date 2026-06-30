/**
 * GET /api/heygen/status — returns whether the HeyGen integration is
 * configured on this deployment. Used by the avatar selector to decide
 * whether to register the `heygen` provider. Never echoes the API key.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/heygen/status")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ configured: Boolean(process.env.HEYGEN_API_KEY) });
      },
    },
  },
});
