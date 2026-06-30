/**
 * POST /api/heygen/token — mints a short-lived HeyGen Streaming Avatar
 * session token and returns the per-persona avatar/voice map assembled
 * from server env. The HeyGen API key NEVER leaves the worker.
 *
 * Non-public `/api/*` — Lovable's published-site auth gate applies, so
 * only signed-in executives reach this handler.
 */
import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/api/heygen/token")({
  server: {
    handlers: {
      POST: async () => {
        const apiKey = process.env.HEYGEN_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "heygen_not_configured" }, { status: 503 });
        }
        try {
          const res = await fetch(HEYGEN_TOKEN_URL, {
            method: "POST",
            headers: { "x-api-key": apiKey, "content-type": "application/json" },
          });
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            console.error("[heygen/token]", res.status, body.slice(0, 300));
            return Response.json(
              { error: "heygen_token_failed", status: res.status },
              { status: 502 },
            );
          }
          const json = (await res.json()) as { data?: { token?: string } };
          const token = json.data?.token;
          if (!token) {
            return Response.json({ error: "heygen_token_missing" }, { status: 502 });
          }
          return Response.json({
            token,
            avatars: buildPersonaMap(),
            defaultAvatarId: process.env.HEYGEN_DEFAULT_AVATAR_ID ?? HEYGEN_DEFAULT_AVATAR_ID,
            serverUrl: process.env.HEYGEN_SERVER_URL,
          });
        } catch (err) {
          console.error("[heygen/token] fatal", err);
          return Response.json({ error: "heygen_token_exception" }, { status: 500 });
        }
      },
    },
  },
});
