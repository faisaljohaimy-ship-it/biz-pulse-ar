/**
 * GET /api/heygen/status — reports whether the HeyGen Interactive Avatar
 * integration is *actually usable*. The dock uses this to decide whether
 * to register the streaming-video avatar provider.
 *
 * We don't just check `HEYGEN_API_KEY`; HeyGen v1 streaming endpoints can
 * return 410 Gone (sunset). When that happens the integration is effectively
 * disabled and the dock must fall back to R3F/SVG. The probe result is
 * cached in-memory for 5 minutes per worker so we don't burn quota.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifySupabaseUser } from "@/lib/hook-auth.server";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/rate-limit.server";

type Probe = { configured: boolean; reason?: string; ts: number };
let cached: Probe | null = null;
const TTL_MS = 5 * 60_000;

async function probe(): Promise<Probe> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) return { configured: false, reason: "missing_key", ts: Date.now() };
  try {
    const res = await fetch("https://api.heygen.com/v1/streaming.create_token", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    });
    if (res.status === 410) {
      return { configured: false, reason: "sunset", ts: Date.now() };
    }
    if (!res.ok && res.status !== 429) {
      return { configured: false, reason: `upstream_${res.status}`, ts: Date.now() };
    }
    return { configured: true, ts: Date.now() };
  } catch {
    return { configured: false, reason: "network", ts: Date.now() };
  }
}

export const Route = createFileRoute("/api/heygen/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifySupabaseUser(request);
        if (auth instanceof Response) return auth;
        const rl = await enforceRateLimit(`heygen-status:${auth.userId}`, 10, 60);
        if (rl.unavailable) return rateLimitUnavailableResponse();
        if (!rl.allowed) return rateLimitResponse();

        if (!cached || Date.now() - cached.ts > TTL_MS) {
          cached = await probe();
        }
        return Response.json({
          configured: cached.configured,
          provider: "heygen",
          reason: cached.reason ?? null,
        });
      },
    },
  },
});

