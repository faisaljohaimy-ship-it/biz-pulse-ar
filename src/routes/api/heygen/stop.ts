/**
 * POST /api/heygen/stop — terminates a LiveAvatar session using the
 * session token returned from /api/heygen/token. Called by the provider
 * when the persona swaps or the dock unmounts so we don't leak active
 * streaming sessions.
 */
import { createFileRoute } from "@tanstack/react-router";
import { LIVEAVATAR_API_URL } from "@/lib/digital-humans/heygen-map";

export const Route = createFileRoute("/api/heygen/stop")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          sessionToken?: string;
        };
        const sessionToken = body.sessionToken;
        if (!sessionToken) {
          return Response.json({ error: "session_token_required" }, { status: 400 });
        }
        try {
          const res = await fetch(`${LIVEAVATAR_API_URL}/v1/sessions`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              "Content-Type": "application/json",
            },
          });
          return Response.json({ ok: res.ok, status: res.status });
        } catch (err) {
          console.error("[liveavatar/stop]", err);
          return Response.json({ error: "liveavatar_stop_exception" }, { status: 500 });
        }
      },
    },
  },
});
