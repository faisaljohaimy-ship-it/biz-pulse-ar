/**
 * GET /api/heygen/status — reports whether the LiveAvatar (HeyGen
 * next-gen) integration is configured. The dock uses this to decide
 * whether to register the streaming-video avatar provider.
 *
 * LiveAvatar is the official successor to HeyGen Interactive Avatar.
 * Auth uses `LIVEAVATAR_API_KEY` from https://app.liveavatar.com/developers.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/heygen/status")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          configured: Boolean(process.env.LIVEAVATAR_API_KEY),
          provider: "liveavatar",
        });
      },
    },
  },
});
