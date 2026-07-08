/**
 * Public incident sink for the client watchdog.
 * Article III of docs/NEXUS_ENGINEERING_CONSTITUTION.md.
 *
 * Called by `installAriaWatchdog()` via sendBeacon. Anonymous — no auth.
 * MUST be defensive: reject oversized bodies, clamp values, never trust input.
 */
import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_KINDS = new Set([
  "unhandled_error",
  "unhandled_rejection",
  "video_error",
  "audio_error",
  "autoplay_blocked",
  "offline",
  "chat_stream_error",
  "tts_failure",
  // Article 21 — CI blocking-gate regressions land in the same public sink
  // so ARIA sees them in the operational incident stream.
  "ci_security_gap_regression",
]);

interface IncomingIncident {
  kind?: string;
  detail?: string;
  url?: string;
  device_class?: string;
  viewport?: { w?: number; h?: number };
  ts?: number;
}

export const Route = createFileRoute("/api/public/hooks/aria-incident")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cl = Number(request.headers.get("content-length") ?? "0");
        if (cl > 4096) return new Response("payload too large", { status: 413 });

        let body: IncomingIncident;
        try {
          body = (await request.json()) as IncomingIncident;
        } catch {
          return new Response("bad json", { status: 400 });
        }

        const kind = String(body.kind ?? "").slice(0, 40);
        if (!ALLOWED_KINDS.has(kind)) return new Response("bad kind", { status: 400 });

        const detail = String(body.detail ?? "").slice(0, 500);
        const url = body.url ? String(body.url).slice(0, 200) : null;
        const device = ["mobile", "tablet", "desktop", "ci"].includes(String(body.device_class))
          ? String(body.device_class)
          : "desktop";

        // Anonymous client crashes go to the isolated public log,
        // NOT the user-owned aria_incidents table (Constitution Art. 19).
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("aria_public_incidents").insert({
          kind,
          detail: detail.slice(0, 500),
          device_class: device,
          url,
        });

        return new Response("ok", { status: 202 });
      },
    },
  },
});
