/**
 * POST /api/heygen/stop — no-op endpoint kept for API stability.
 *
 * The legacy browser SDK has been removed. There is no remote session to stop;
 * this compatibility route lets older clients finish teardown harmlessly.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/heygen/stop")({
  server: {
    handlers: {
      POST: async () => Response.json({ ok: true }),
    },
  },
});
