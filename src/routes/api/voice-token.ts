/**
 * Retired token-minting compatibility endpoint.
 *
 * NEXIOS no longer starts a second ElevenLabs agent/Scribe conversation. Voice
 * input and output are owned by the root-mounted AriaCopilot, preventing a
 * second identity, memory, microphone, or speech runtime from drifting in.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifySupabaseUser } from "@/lib/hook-auth.server";

export const Route = createFileRoute("/api/voice-token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifySupabaseUser(request);
        if (auth instanceof Response) return auth;
        return Response.json(
          {
            error: "voice_token_runtime_retired",
            canonical_surface: "/assistant",
          },
          {
            status: 410,
            headers: {
              Deprecation: "true",
              "Cache-Control": "no-store",
            },
          },
        );
      },
    },
  },
});
