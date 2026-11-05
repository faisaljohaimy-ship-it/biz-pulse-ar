/**
 * Public incident sink for the client watchdog.
 * Articles 19, 21, 26 of src/lib/sadeed/constitution.ts.
 *
 * Called by `installSadeedWatchdog()` via sendBeacon. Anonymous — no auth.
 * MUST be defensive: rate-limited, size-capped, kind-whitelisted,
 * and every request is logged into the executive audit trail (Article 26).
 */
import { createFileRoute } from "@tanstack/react-router";
import { readPublicIncidentBody } from "@/lib/sadeed/public-incident-body.server";

const ALLOWED_KINDS = new Set([
  "unhandled_error",
  "unhandled_rejection",
  "video_error",
  "audio_error",
  "autoplay_blocked",
  "offline",
  "chat_stream_error",
  "tts_failure",
  "ci_security_gap_regression",
  "aria_voice_latency_regression",
  "aria_corpus_stale",
]);

interface IncomingIncident {
  kind?: string;
  detail?: string;
  url?: string;
  device_class?: string;
  viewport?: { w?: number; h?: number };
  ts?: number;
}

function clientBucketKey(request: Request): string {
  // Prefer Cloudflare's trusted cf-connecting-ip. On Workers, X-Forwarded-For is
  // attacker-controlled, so relying on it lets a client rotate the header into a
  // fresh bucket every request and defeat the cap. cf-connecting-ip cannot be
  // spoofed by the client; fall back to XFF/x-real-ip only off-Cloudflare.
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const ip =
    cf || fwd.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
  return `aria-incident:${ip}`;
}

export const Route = createFileRoute("/api/public/hooks/sadeed-incident")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const cl = Number(request.headers.get("content-length") ?? "0");
        if (cl > 4096) return new Response("payload too large", { status: 413 });

        // Article 26 (c): rate-limit BEFORE parsing the body.
        const { logSadeedAction } = await import("@/lib/sadeed/audit-log.server");
        const { allowIncidentDuringStorageOutage } =
          await import("@/lib/sadeed/public-incident-limit.server");
        const bucket = clientBucketKey(request);

        // The legacy audit helper fails open when the RPC is unreachable.
        // Public anonymous traffic must stay bounded in that case, without
        // changing the normal database-backed 60/60 quota or hiding outages.
        let allowed: boolean;
        try {
          const { enforceRateLimit } = await import("@/lib/governance/rate-limit.server");
          const decision = await enforceRateLimit(bucket, 60, 60);
          allowed = decision.unavailable
            ? allowIncidentDuringStorageOutage(bucket)
            : decision.allowed;
        } catch {
          console.error("[aria-incident] quota store unavailable; using bounded fallback");
          allowed = allowIncidentDuringStorageOutage(bucket);
        }
        if (!allowed) {
          void logSadeedAction({
            action: "public.aria-incident.throttled",
            actor: "public-webhook",
            surface: "api/public/hooks/aria-incident",
            articleRefs: ["Article 26"],
            status: "warn",
            input: { bucket },
            latencyMs: Date.now() - startedAt,
          });
          return new Response("rate limited", { status: 429, headers: { "Retry-After": "60" } });
        }

        const parsed = await readPublicIncidentBody(request);
        if (!parsed.ok) return new Response(parsed.message, { status: parsed.status });
        const body = parsed.value as IncomingIncident;

        const kind = String(body.kind ?? "").slice(0, 40);
        if (!ALLOWED_KINDS.has(kind)) return new Response("bad kind", { status: 400 });

        const detail = String(body.detail ?? "").slice(0, 500);
        const url = body.url ? String(body.url).slice(0, 200) : null;
        const device = ["mobile", "tablet", "desktop", "ci"].includes(String(body.device_class))
          ? String(body.device_class)
          : "desktop";

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("finn_public_incidents").insert({
            kind,
            detail: detail.slice(0, 500),
            device_class: device,
            url,
          });
        } catch (err) {
          // Beacon is fire-and-forget; never surface a 500 to the client when
          // the sink is misconfigured (missing service role, RLS drift, etc.).
          console.error("[aria-incident] sink insert failed", err);
        }

        void logSadeedAction({
          action: "public.aria-incident.received",
          actor: "public-webhook",
          surface: "api/public/hooks/aria-incident",
          route: url,
          articleRefs: ["Article 19", "Article 21", "Article 26"],
          status: "ok",
          input: { kind, device_class: device },
          latencyMs: Date.now() - startedAt,
        });

        return new Response("ok", { status: 202 });
      },
    },
  },
});
