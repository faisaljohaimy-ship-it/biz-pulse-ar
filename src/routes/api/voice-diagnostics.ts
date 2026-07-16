/**
 * Canonical ARIA voice diagnostics.
 *
 * This endpoint verifies the single server-side ElevenLabs TTS identity used
 * by ARIA. It intentionally does not mint realtime, Scribe, or Conversational
 * AI tokens: conversation ownership stays in the root-mounted ARIA copilot.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifySupabaseUser } from "@/lib/hook-auth.server";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";
import { ARIA_ELEVENLABS_MODEL, ARIA_ELEVENLABS_VOICE_ID } from "@/lib/aria/voice-config";

type Check = {
  id: "api_key" | "canonical_voice" | "canonical_runtime";
  label: string;
  status: "ok" | "missing" | "failed" | "skipped";
  detail?: string;
  fix?: string;
};

async function probeApiKey(apiKey: string | undefined): Promise<Check> {
  if (!apiKey) {
    return {
      id: "api_key",
      label: "ElevenLabs API key",
      status: "missing",
      fix: "Add ELEVENLABS_API_KEY as a protected deployment secret.",
    };
  }

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return {
        id: "api_key",
        label: "ElevenLabs API key",
        status: "failed",
        detail:
          response.status === 401
            ? "401 Unauthorized — key invalid or revoked."
            : `ElevenLabs returned HTTP ${response.status}.`,
        fix:
          response.status === 401
            ? "Rotate the key in ElevenLabs and update the deployment secret."
            : "Verify provider availability and the deployment network policy.",
      };
    }

    const payload = (await response.json()) as { subscription?: { tier?: string } };
    return {
      id: "api_key",
      label: "ElevenLabs API key",
      status: "ok",
      detail: `Authenticated${payload.subscription?.tier ? ` · ${payload.subscription.tier}` : ""}`,
    };
  } catch (error) {
    return {
      id: "api_key",
      label: "ElevenLabs API key",
      status: "failed",
      detail: error instanceof Error ? error.message : "Network error.",
      fix: "Verify provider availability and the deployment network policy.",
    };
  }
}

async function probeCanonicalVoice(apiKey: string | undefined): Promise<Check> {
  if (!apiKey) {
    return {
      id: "canonical_voice",
      label: "ARIA canonical voice",
      status: "skipped",
      detail: "API key missing — identity could not be verified.",
    };
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(ARIA_ELEVENLABS_VOICE_ID)}`,
      {
        headers: { "xi-api-key": apiKey },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) {
      return {
        id: "canonical_voice",
        label: "ARIA canonical voice",
        status: "failed",
        detail:
          response.status === 404
            ? "The locked ARIA voice is not available to this ElevenLabs account."
            : `ElevenLabs returned HTTP ${response.status}.`,
        fix: "Grant this account access to the locked ARIA voice; do not substitute another voice.",
      };
    }

    const payload = (await response.json()) as { name?: string };
    return {
      id: "canonical_voice",
      label: "ARIA canonical voice",
      status: "ok",
      detail: payload.name ? `${payload.name} · identity locked` : "Identity locked and reachable.",
    };
  } catch (error) {
    return {
      id: "canonical_voice",
      label: "ARIA canonical voice",
      status: "failed",
      detail: error instanceof Error ? error.message : "Network error.",
      fix: "Verify provider availability and retry without changing ARIA's voice identity.",
    };
  }
}

export const Route = createFileRoute("/api/voice-diagnostics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifySupabaseUser(request);
        if (auth instanceof Response) return auth;

        const limit = await enforceRateLimit(`voice-diag:${auth.userId}`, 10, 60);
        if (limit.unavailable) return rateLimitUnavailableResponse();
        if (!limit.allowed) return rateLimitResponse();

        const apiKey = process.env.ELEVENLABS_API_KEY;
        const apiKeyCheck = await probeApiKey(apiKey);
        const voiceCheck =
          apiKeyCheck.status === "ok"
            ? await probeCanonicalVoice(apiKey)
            : await probeCanonicalVoice(undefined);
        const ready = apiKeyCheck.status === "ok" && voiceCheck.status === "ok";
        const runtimeCheck: Check = {
          id: "canonical_runtime",
          label: "Governed ARIA TTS runtime",
          status: ready ? "ok" : "skipped",
          detail: ready
            ? `/api/aria/tts · ${ARIA_ELEVENLABS_MODEL} · authenticated · rate-limited`
            : "Runtime remains closed until the provider key and locked voice pass verification.",
        };

        return Response.json({
          ok: ready,
          mode: ready ? "canonical" : "unavailable",
          checks: [apiKeyCheck, voiceCheck, runtimeCheck],
          connector: {
            present: Boolean(apiKey),
            auth_type: "api_key",
            scopes_note:
              "The server secret is used only by the governed ARIA TTS endpoint and is never exposed to the browser.",
          },
          voice: {
            configured: true,
            identity: "ARIA · Layan",
            model: ARIA_ELEVENLABS_MODEL,
            id_masked: `${ARIA_ELEVENLABS_VOICE_ID.slice(0, 3)}…${ARIA_ELEVENLABS_VOICE_ID.slice(-3)}`,
          },
          live_voice_ready: ready,
          generated_at: new Date().toISOString(),
        });
      },
    },
  },
});
