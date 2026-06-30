import { createFileRoute } from "@tanstack/react-router";
import { httpFetch } from "@/lib/api/http.server";
import { isApiError, toApiErrorShape } from "@/lib/api";
import { verifySupabaseUser } from "@/lib/hook-auth.server";
import {
  enforceRateLimit,
  rateLimitUnavailableResponse,
  rateLimitResponse,
} from "@/lib/governance/rate-limit.server";

export const Route = createFileRoute("/api/voice-token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: only signed-in executives may mint ElevenLabs tokens.
        const auth = await verifySupabaseUser(request);
        if (auth instanceof Response) return auth;
        // Per-user rate limit — cap token minting to 20/min.
        const { allowed, unavailable } = await enforceRateLimit(
          `voice-token:${auth.userId}`,
          20,
          60,
        );
        if (unavailable) return rateLimitUnavailableResponse();
        if (!allowed) return rateLimitResponse();

        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "ELEVENLABS_API_KEY not configured" }, { status: 500 });
        }

        // Request a single-use realtime scribe token (no agent required for STT).
        // For full conversational voice agents the user must create an agent in
        // ElevenLabs and supply ELEVENLABS_AGENT_ID; we then issue a conversation token.
        const agentId = process.env.ELEVENLABS_AGENT_ID;

        try {
          if (agentId) {
            const r = await httpFetch(
              `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
              { headers: { "xi-api-key": apiKey }, label: "elevenlabs/convai-token", timeoutMs: 10_000 },
            );
            if (!r.ok) {
              const text = await r.text().catch(() => "");
              console.error("[api/voice-token] conversation token", r.status, text.slice(0, 240));
              return Response.json({ error: "voice_token_failed", status: r.status }, { status: r.status });
            }
            const data = (await r.json()) as { token: string };
            return Response.json({ kind: "conversation", token: data.token, agentId });
          }

          const r = await httpFetch(
            "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
            { method: "POST", headers: { "xi-api-key": apiKey }, label: "elevenlabs/scribe-token", timeoutMs: 10_000 },
          );
          if (!r.ok) {
            const text = await r.text().catch(() => "");
            console.error("[api/voice-token] scribe token", r.status, text.slice(0, 240));
            return Response.json({ error: "voice_token_failed", status: r.status }, { status: r.status });
          }
          const data = (await r.json()) as { token: string };
          return Response.json({ kind: "scribe", token: data.token });
        } catch (err) {
          const shape = isApiError(err) ? err.toJSON() : toApiErrorShape(err);
          console.error("[api/voice-token]", shape.code, shape.message);
          return Response.json({ error: shape.message, code: shape.code }, { status: shape.status });
        }
      },
    },
  },
});
