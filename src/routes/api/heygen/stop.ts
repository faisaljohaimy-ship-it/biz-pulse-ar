/**
 * POST /api/heygen/stop — no-op endpoint kept for API stability.
 *
 * The official HeyGen Streaming Avatar SDK (@heygen/streaming-avatar) closes
 * sessions client-side via `streamingAvatar.stopAvatar()`. The browser SDK
 * owns the session lifecycle once the access token is exchanged, so the
 * server side has nothing to tear down. We keep this route so callers that
 * still POST here during teardown receive a successful response.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/heygen/stop")({
  server: {
    handlers: {
      POST: async () => Response.json({ ok: true }),
    },
  },
});
