/**
 * The legacy HeyGen Streaming Avatar browser client was removed after vendor
 * deprecation. Keep the endpoint contract explicit and fail closed until the
 * LiveAvatar adapter is implemented; never mint paid tokens for an unusable
 * client. ARIA continues through the local SVG/R3F provider.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifySupabaseExecutive } from "@/lib/hook-auth.server";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";

export const Route = createFileRoute("/api/heygen/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifySupabaseExecutive(request);
        if (auth instanceof Response) return auth;

        const rate = await enforceRateLimit(`heygen-token:${auth.userId}`, 10, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();

        return Response.json(
          {
            error: "heygen_provider_disabled",
            reason: "liveavatar_client_not_installed",
            fallback: "r3f",
          },
          { status: 501 },
        );
      },
    },
  },
});
