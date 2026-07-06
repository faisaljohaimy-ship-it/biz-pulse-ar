// Public health endpoint — GET /api/health
// Small, cheap probe used by the readiness scorecard, uptime monitors,
// and the "ALL SYSTEMS NOMINAL" status strips. No PII, no secrets.
import { createFileRoute } from "@tanstack/react-router";

const BOOT_AT = Date.now();

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const uptimeSeconds = Math.round((Date.now() - BOOT_AT) / 1000);
        return Response.json(
          {
            ok: true,
            service: "nexios",
            timestamp: new Date().toISOString(),
            uptime_seconds: uptimeSeconds,
            checks: {
              runtime: "ok",
              lovable_ai_key: process.env.LOVABLE_API_KEY ? "present" : "missing",
              supabase_url: process.env.SUPABASE_URL ? "present" : "missing",
              // Deliberately do NOT return the actual key values.
            },
          },
          {
            status: 200,
            headers: {
              "Cache-Control": "no-store, max-age=0",
            },
          },
        );
      },
    },
  },
});
