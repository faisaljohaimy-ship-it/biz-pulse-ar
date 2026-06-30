/**
 * POST /api/heygen/token — mints a short-lived HeyGen Streaming Avatar
 * session token for the signed-in executive and returns the per-persona
 * avatar/voice map assembled from server env. The HeyGen API key NEVER
 * leaves the worker.
 *
 * Authenticated route — only sits behind a Lovable session. We do not
 * gate on a role because every authenticated executive may use ARIA.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  HEYGEN_DEFAULT_AVATAR_ID,
  HEYGEN_PERSONA_IDS,
  type HeygenPersonaMap,
} from "@/lib/digital-humans/heygen-map";

const HEYGEN_TOKEN_URL = "https://api.heygen.com/v1/streaming.create_token";

function buildPersonaMap(): HeygenPersonaMap {
  const fallback = process.env.HEYGEN_DEFAULT_AVATAR_ID ?? HEYGEN_DEFAULT_AVATAR_ID;
  const map: HeygenPersonaMap = {};
  for (const id of HEYGEN_PERSONA_IDS) {
    const envKey = id.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    map[id] = {
      avatarId: process.env[`HEYGEN_AVATAR_${envKey}`] ?? fallback,
      voiceId: process.env[`HEYGEN_VOICE_${envKey}`] ?? process.env.HEYGEN_DEFAULT_VOICE_ID,
    };
  }
  return map;
}

async function requireAuthedUser(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) return null;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const sb = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${m[1]}` } },
  });
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

export const Route = createFileRoute("/api/heygen/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.HEYGEN_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "heygen_not_configured" }), {
            status: 503,
            headers: { "content-type": "application/json" },
          });
        }
        const userId = await requireAuthedUser(request);
        if (!userId) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }
        const res = await fetch(HEYGEN_TOKEN_URL, {
          method: "POST",
          headers: { "x-api-key": apiKey, "content-type": "application/json" },
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          return new Response(JSON.stringify({ error: "heygen_token_failed", status: res.status, body: body.slice(0, 500) }), {
            status: 502,
            headers: { "content-type": "application/json" },
          });
        }
        const json = (await res.json()) as { data?: { token?: string } };
        const token = json.data?.token;
        if (!token) {
          return new Response(JSON.stringify({ error: "heygen_token_missing" }), {
            status: 502,
            headers: { "content-type": "application/json" },
          });
        }
        return Response.json({
          token,
          avatars: buildPersonaMap(),
          defaultAvatarId: process.env.HEYGEN_DEFAULT_AVATAR_ID ?? HEYGEN_DEFAULT_AVATAR_ID,
          serverUrl: process.env.HEYGEN_SERVER_URL,
        });
      },
    },
  },
});
