/**
 * GET /api/agents/fleet — public read-only snapshot of the thirteen-agent
 * reference simulation. The admin-gated live path is served by the
 * getAgentFleetState server function (which carries the caller's session);
 * this REST endpoint is the public, guest-safe surface and therefore always
 * returns the deterministic reference simulation, clearly tagged
 * is_simulation=true. No secrets, no writes.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/agents/fleet")({
  server: {
    handlers: {
      GET: async () => {
        const { buildFleetSimulation } = await import("@/lib/agents/fleet-simulation");
        const state = buildFleetSimulation();
        return Response.json(state, {
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/json; charset=utf-8",
          },
        });
      },
    },
  },
});
