/**
 * POST /api/heygen/token — mints a LiveAvatar session token (FULL mode)
 * bound to the requested executive persona. LiveAvatar is the official
 * next-generation HeyGen Streaming Avatar platform.
 *
 * Request:  { personaId?: string, language?: "ar" | "en" }
 * Response: HeygenSession (see src/lib/digital-humans/heygen-map.ts)
 *
 * The LiveAvatar API key never leaves the worker. Non-public `/api/*`
 * — Lovable's published-site auth gate applies, so only signed-in
 * executives reach this handler.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  HEYGEN_DEFAULT_AVATAR_ID,
  HEYGEN_DEFAULT_VOICE_ID,
  HEYGEN_PERSONA_IDS,
  LIVEAVATAR_API_URL,
  type HeygenSession,
} from "@/lib/digital-humans/heygen-map";

function envKey(personaId: string) {
  return personaId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

/**
 * Read avatar/voice for a persona from env. Prefer LIVEAVATAR_* but
 * fall back to legacy HEYGEN_* names so existing deployments keep
 * working without re-keying every persona.
 */
function resolvePersona(personaId: string): { avatarId: string; voiceId?: string } {
  const key = envKey(personaId);
  const avatarId =
    process.env[`LIVEAVATAR_AVATAR_${key}`] ??
    process.env[`HEYGEN_AVATAR_${key}`] ??
    process.env.LIVEAVATAR_DEFAULT_AVATAR_ID ??
    process.env.HEYGEN_DEFAULT_AVATAR_ID ??
    HEYGEN_DEFAULT_AVATAR_ID;
  const voiceId =
    process.env[`LIVEAVATAR_VOICE_${key}`] ??
    process.env[`HEYGEN_VOICE_${key}`] ??
    process.env.LIVEAVATAR_DEFAULT_VOICE_ID ??
    process.env.HEYGEN_DEFAULT_VOICE_ID ??
    HEYGEN_DEFAULT_VOICE_ID;
  return { avatarId, voiceId };
}

export const Route = createFileRoute("/api/heygen/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LIVEAVATAR_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "liveavatar_not_configured" }, { status: 503 });
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
          const res = await fetch(`${LIVEAVATAR_API_URL}/v1/sessions/token`, {
            method: "POST",
            headers: {
              "X-API-KEY": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              mode: "FULL",
              avatar_id: avatarId,
              is_sandbox: process.env.LIVEAVATAR_SANDBOX === "true",
              avatar_persona: {
                ...(voiceId ? { voice_id: voiceId } : {}),
                language,
              },
              interactivity_type: "CONVERSATIONAL",
            }),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error("[liveavatar/token]", res.status, text.slice(0, 300));
            return Response.json(
              { error: "liveavatar_token_failed", status: res.status, detail: text.slice(0, 300) },
              { status: 502 },
            );
          }
          const json = (await res.json()) as {
            data?: { session_token?: string; session_id?: string };
          };
          const sessionToken = json.data?.session_token;
          const sessionId = json.data?.session_id ?? "";
          if (!sessionToken) {
            return Response.json({ error: "liveavatar_token_missing" }, { status: 502 });
          }
          const payload: HeygenSession = {
            sessionToken,
            sessionId,
            personaId,
            avatarId,
            voiceId,
            language,
            apiUrl: LIVEAVATAR_API_URL,
          };
          return Response.json(payload);
        } catch (err) {
          console.error("[liveavatar/token] fatal", err);
          return Response.json({ error: "liveavatar_token_exception" }, { status: 500 });
        }
      },
    },
  },
});
