/**
 * POST /api/heygen/token — mints a short-lived HeyGen Streaming Avatar
 * access token. The browser SDK exchanges this for a LiveKit session.
 *
 * Official endpoint per HeyGen Streaming Avatar SDK 2.1.1 README:
 *   POST https://api.heygen.com/v1/streaming.create_token
 *   header: x-api-key: <HEYGEN_API_KEY>
 *
 * Request:  { personaId?: string, language?: "ar" | "en" }
 * Response: HeygenSession (see src/lib/digital-humans/heygen-map.ts)
 *
 * The API key never leaves the worker. Non-public `/api/*` — Lovable's
 * published-site auth gate applies, so only signed-in executives reach
 * this handler.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  HEYGEN_API_URL,
  HEYGEN_DEFAULT_AVATAR_ID,
  HEYGEN_DEFAULT_VOICE_ID,
  HEYGEN_PERSONA_IDS,
  type HeygenSession,
} from "@/lib/digital-humans/heygen-map";

function envKey(personaId: string) {
  return personaId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

/** Read avatar/voice for a persona from env, with LIVEAVATAR_* fallbacks. */
function resolvePersona(personaId: string): { avatarId: string; voiceId?: string } {
  const key = envKey(personaId);
  const avatarId =
    process.env[`HEYGEN_AVATAR_${key}`] ??
    process.env[`LIVEAVATAR_AVATAR_${key}`] ??
    process.env.HEYGEN_DEFAULT_AVATAR_ID ??
    process.env.LIVEAVATAR_DEFAULT_AVATAR_ID ??
    HEYGEN_DEFAULT_AVATAR_ID;
  const voiceId =
    process.env[`HEYGEN_VOICE_${key}`] ??
    process.env[`LIVEAVATAR_VOICE_${key}`] ??
    process.env.HEYGEN_DEFAULT_VOICE_ID ??
    process.env.LIVEAVATAR_DEFAULT_VOICE_ID ??
    HEYGEN_DEFAULT_VOICE_ID;
  return { avatarId, voiceId: voiceId || undefined };
}

export const Route = createFileRoute("/api/heygen/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.HEYGEN_API_KEY ?? process.env.LIVEAVATAR_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "heygen_not_configured" }, { status: 503 });
        }
        const body = (await request.json().catch(() => ({}))) as {
          personaId?: string;
          language?: "ar" | "en";
        };
        const personaId =
          body.personaId && HEYGEN_PERSONA_IDS.includes(body.personaId)
            ? body.personaId
            : HEYGEN_PERSONA_IDS[0] ?? "aria";
        const language: "ar" | "en" = body.language === "ar" ? "ar" : "en";
        const { avatarId, voiceId } = resolvePersona(personaId);

        try {
          const res = await fetch(`${HEYGEN_API_URL}/v1/streaming.create_token`, {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "Content-Type": "application/json",
            },
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error("[heygen/token]", res.status, text.slice(0, 300));
            return Response.json(
              { error: "heygen_token_failed", status: res.status, detail: text.slice(0, 300) },
              { status: 502 },
            );
          }
          const json = (await res.json()) as { data?: { token?: string } };
          const sessionToken = json.data?.token;
          if (!sessionToken) {
            return Response.json({ error: "heygen_token_missing" }, { status: 502 });
          }
          const payload: HeygenSession = {
            sessionToken,
            personaId,
            avatarId,
            voiceId,
            language,
          };
          return Response.json(payload);
        } catch (err) {
          console.error("[heygen/token] fatal", err);
          return Response.json({ error: "heygen_token_exception" }, { status: 500 });
        }
      },
    },
  },
});
