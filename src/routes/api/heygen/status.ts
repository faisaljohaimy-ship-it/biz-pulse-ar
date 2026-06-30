/**
 * GET /api/heygen/status — reports whether the HeyGen Interactive Avatar
 * integration is configured. The dock uses this to decide whether to
 * register the streaming-video avatar provider.
 *
 * Accepts either `HEYGEN_API_KEY` (preferred) or the legacy
 * `LIVEAVATAR_API_KEY` env name so existing deployments keep working.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/heygen/status")({
  server: {
    handlers: {
      GET: async () => {
        const configured = Boolean(
          process.env.HEYGEN_API_KEY || process.env.LIVEAVATAR_API_KEY,
        );
        return Response.json({ configured, provider: "heygen" });
      },
    },
  },
});
