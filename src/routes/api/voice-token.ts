import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/voice-token")({
  server: {
    handlers: {
      POST: async () => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Request a single-use realtime scribe token (no agent required for STT).
        // For full conversational voice agents the user must create an agent in ElevenLabs
        // and supply ELEVENLABS_AGENT_ID; we then issue a conversation token.
        const agentId = process.env.ELEVENLABS_AGENT_ID;

        try {
          if (agentId) {
            const r = await fetch(
              `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
              { headers: { "xi-api-key": apiKey } },
            );
            if (!r.ok) {
              const text = await r.text();
              return new Response(JSON.stringify({ error: text }), {
                status: r.status,
                headers: { "Content-Type": "application/json" },
              });
            }
            const data = (await r.json()) as { token: string };
            return Response.json({ kind: "conversation", token: data.token, agentId });
          }

          // Fallback: realtime STT token so the page still has something to demo.
          const r = await fetch(
            "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
            { method: "POST", headers: { "xi-api-key": apiKey } },
          );
          if (!r.ok) {
            const text = await r.text();
            return new Response(JSON.stringify({ error: text }), {
              status: r.status,
              headers: { "Content-Type": "application/json" },
            });
          }
          const data = (await r.json()) as { token: string };
          return Response.json({ kind: "scribe", token: data.token });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
