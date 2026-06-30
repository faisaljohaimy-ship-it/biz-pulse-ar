/**
 * GET /api/public/health
 * Enterprise health probe — load balancers, uptime monitors, status pages.
 * Returns 200 when the service can answer; degraded subsystems are reported
 * in the JSON body so ops can alert without flipping the LB out of rotation.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

type SubsystemStatus = "ok" | "degraded" | "down" | "unknown";
interface Subsystem {
  status: SubsystemStatus;
  latency_ms?: number;
  detail?: string;
}

async function probe(fn: () => Promise<void>, timeoutMs = 2500): Promise<Subsystem> {
  const t0 = Date.now();
  try {
    await Promise.race([
      fn(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs)),
    ]);
    return { status: "ok", latency_ms: Date.now() - t0 };
  } catch (err) {
    return {
      status: "down",
      latency_ms: Date.now() - t0,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;

        const db: Subsystem = url && key
          ? await probe(async () => {
              const sb = createClient(url, key, {
                auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
              });
              const { error } = await sb.from("organizations").select("id").limit(1);
              if (error) throw error;
            })
          : { status: "unknown", detail: "missing supabase env" };

        const aiGateway: Subsystem = process.env.LOVABLE_API_KEY
          ? await probe(async () => {
              const r = await fetch("https://ai.gateway.lovable.dev/v1/models", {
                headers: { "Lovable-API-Key": process.env.LOVABLE_API_KEY! },
              });
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
            })
          : { status: "unknown", detail: "missing LOVABLE_API_KEY" };

        const subsystems = { db, ai_gateway: aiGateway };
        const overall: SubsystemStatus = Object.values(subsystems).some((s) => s.status === "down")
          ? "degraded"
          : "ok";

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
