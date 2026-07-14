/** Report the truthful avatar-provider state without minting vendor tokens. */
import { createFileRoute } from "@tanstack/react-router";
import { verifySupabaseUser } from "@/lib/hook-auth.server";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";

export const Route = createFileRoute("/api/heygen/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifySupabaseUser(request);
        if (auth instanceof Response) return auth;

        const rate = await enforceRateLimit(`heygen-status:${auth.userId}`, 10, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();

        return Response.json({
          configured: false,
          provider: "heygen",
          reason: "liveavatar_client_not_installed",
          fallback: "r3f",
        });
      },
    },
  },
});
