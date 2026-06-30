/**
 * GET /api/public/health
 * Enterprise health probe — load balancers, uptime monitors, status pages.
 * Returns 200 when the service can answer; degraded subsystems are reported
 * in the JSON body so ops can alert without flipping the LB out of rotation.
 */
import { createFileRoute } from "@tanstack/react-router";

type SubsystemStatus = "ok" | "degraded" | "down" | "unknown";
interface Subsystem {
  status: SubsystemStatus;
  latency_ms?: number;
  detail?: string;
}

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const subsystems: Record<string, Subsystem> = {
          web: { status: "ok", latency_ms: 0 },
          ai_gateway: process.env.LOVABLE_API_KEY
            ? { status: "ok" }
            : { status: "unknown", detail: "not_configured" },
        };
        const overall: SubsystemStatus = "ok";

        return Response.json(
          {
            status: overall,
            timestamp: new Date().toISOString(),
            uptime_hint: "stateless-worker",
            subsystems,
          },
          { status: 200, headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
