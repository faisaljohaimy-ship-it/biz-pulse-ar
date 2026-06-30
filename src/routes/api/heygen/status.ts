/**
 * GET /api/heygen/status — reports whether the HeyGen Interactive Avatar
 * integration is configured. The dock uses this to decide whether to
 * register the streaming-video avatar provider.
 *
 * HeyGen-only. Authenticates exclusively with `HEYGEN_API_KEY`.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/heygen/status")({
  server: {
    handlers: {
      GET: async () => {
        const configured = Boolean(process.env.HEYGEN_API_KEY);
        return Response.json({ configured, provider: "heygen" });
      },
    },
  },
});
