/**
 * Voice diagnostics — explicit, no-silent-fail probe of the ElevenLabs
 * voice stack. Returns structured per-check results so the Voice Setup
 * wizard can show the executive exactly which layer is broken.
 *
 * Never returns the API key, agent ID, or any token. Authenticated only.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifySupabaseUser } from "@/lib/hook-auth.server";
import { enforceRateLimit, rateLimitResponse, rateLimitUnavailableResponse } from "@/lib/governance/rate-limit.server";

type Check = {
  id: string;
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
      fix: "Link the ElevenLabs connector in Settings → Connectors, or add ELEVENLABS_API_KEY.",
    };
  }
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(8_000),
    });
    if (r.status === 401) {
      return { id: "api_key", label: "ElevenLabs API key", status: "failed", detail: "401 Unauthorized — key invalid or revoked.", fix: "Rotate the key in the ElevenLabs dashboard and re-link the connector." };
    }
    if (!r.ok) {
      return { id: "api_key", label: "ElevenLabs API key", status: "failed", detail: `HTTP ${r.status}` };
    }
    const j = (await r.json()) as { subscription?: { tier?: string; character_limit?: number; character_count?: number } };
    const tier = j.subscription?.tier ?? "unknown";
    return { id: "api_key", label: "ElevenLabs API key", status: "ok", detail: `tier=${tier}` };
  } catch (e) {
    return { id: "api_key", label: "ElevenLabs API key", status: "failed", detail: e instanceof Error ? e.message : "network error" };
  }
}

async function probeAgent(apiKey: string | undefined, agentId: string | undefined): Promise<Check> {
  if (!agentId) {
    return {
      id: "agent_id",
      label: "Conversational agent",
      status: "missing",
      detail: "ELEVENLABS_AGENT_ID not configured — live two-way conversation disabled; STT-only mode is in effect.",
      fix: "Create a Conversational AI agent at elevenlabs.io/app/conversational-ai, then save its ID as ELEVENLABS_AGENT_ID.",
    };
  }
  if (!apiKey) {
    return { id: "agent_id", label: "Conversational agent", status: "skipped", detail: "API key missing — cannot validate agent." };
  }
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}`, {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(8_000),
    });
    if (r.status === 404) {
      return { id: "agent_id", label: "Conversational agent", status: "failed", detail: "Agent ID not found in this ElevenLabs account.", fix: "Check the agent ID matches the account the API key belongs to." };
    }
    if (!r.ok) {
      return { id: "agent_id", label: "Conversational agent", status: "failed", detail: `HTTP ${r.status}` };
    }
    const j = (await r.json()) as { name?: string };
    return { id: "agent_id", label: "Conversational agent", status: "ok", detail: j.name ? `agent="${j.name}"` : "agent reachable" };
  } catch (e) {
    return { id: "agent_id", label: "Conversational agent", status: "failed", detail: e instanceof Error ? e.message : "network error" };
  }
}

async function probeScribeToken(apiKey: string | undefined): Promise<Check> {
  if (!apiKey) return { id: "scribe_token", label: "Realtime STT token mint", status: "skipped" };
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return { id: "scribe_token", label: "Realtime STT token mint", status: "failed", detail: `HTTP ${r.status} ${t.slice(0, 140)}` };
    }
    const j = (await r.json()) as { token?: string };
    return { id: "scribe_token", label: "Realtime STT token mint", status: j.token ? "ok" : "failed", detail: j.token ? "single-use token issued" : "no token in response" };
  } catch (e) {
    return { id: "scribe_token", label: "Realtime STT token mint", status: "failed", detail: e instanceof Error ? e.message : "network error" };
  }
}

async function probeConvaiToken(apiKey: string | undefined, agentId: string | undefined): Promise<Check> {
  if (!apiKey || !agentId) return { id: "convai_token", label: "Conversation token mint", status: "skipped" };
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`, {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return { id: "convai_token", label: "Conversation token mint", status: "failed", detail: `HTTP ${r.status} ${t.slice(0, 140)}` };
    }
    const j = (await r.json()) as { token?: string };
    return { id: "convai_token", label: "Conversation token mint", status: j.token ? "ok" : "failed" };
  } catch (e) {
    return { id: "convai_token", label: "Conversation token mint", status: "failed", detail: e instanceof Error ? e.message : "network error" };
  }
}

export const Route = createFileRoute("/api/voice-diagnostics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifySupabaseUser(request);
        if (auth instanceof Response) return auth;
        const rl = await enforceRateLimit(`voice-diag:${auth.userId}`, 10, 60);
        if (rl.unavailable) return rateLimitUnavailableResponse();
        if (!rl.allowed) return rateLimitResponse();

        const apiKey = process.env.ELEVENLABS_API_KEY;
        const agentId = process.env.ELEVENLABS_AGENT_ID;

        const checks: Check[] = [];
        checks.push(await probeApiKey(apiKey));
        checks.push(await probeAgent(apiKey, agentId));
        checks.push(await probeScribeToken(apiKey));
        checks.push(await probeConvaiToken(apiKey, agentId));

        const hasFailure = checks.some((c) => c.status === "failed" || (c.status === "missing" && c.id === "api_key"));
        const mode: "conversation" | "scribe" | "unavailable" =
          checks.find((c) => c.id === "convai_token")?.status === "ok"
            ? "conversation"
            : checks.find((c) => c.id === "scribe_token")?.status === "ok"
              ? "scribe"
              : "unavailable";

        const mask = (v: string | undefined) =>
          !v ? null : v.length <= 6 ? "•".repeat(v.length) : `${v.slice(0, 3)}…${v.slice(-3)}`;

        return Response.json({
          ok: !hasFailure,
          mode,
          checks,
          connector: {
            present: Boolean(apiKey),
            auth_type: "api_key",
            scopes_note: "ElevenLabs uses API-key auth — permissions are derived from the key's plan/quota (no Lovable-managed OAuth scopes).",
          },
          agent: {
            configured: Boolean(agentId),
            id_masked: mask(agentId),
          },
          live_voice_ready: mode === "conversation",
          generated_at: new Date().toISOString(),
        });
      },
    },
  },
});
