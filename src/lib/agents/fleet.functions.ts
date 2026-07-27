/**
 * Agent-fleet backend — ONE resilient read source for the thirteen-agent
 * surface. Live `agent_definitions` rows win (only an admin session can SELECT
 * them under RLS); every other case — guest, empty, timeout, error — resolves
 * to the deterministic reference simulation. Guests never see an error and the
 * board never hangs («بيانات لا تفرغ»; constitution art. 4, 23 & doctrine §4).
 *
 * READ-ONLY: this path only projects rows; it never writes. Activation to
 * write/execute is gated by the five-step ladder + human gate (art. 24).
 */
import { createServerFn } from "@tanstack/react-start";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import {
  buildFleetFromLiveRows,
  buildFleetSimulation,
  type AgentFleetState,
  type LiveAgentRow,
} from "@/lib/agents/fleet-simulation";

export type { AgentFleetState } from "@/lib/agents/fleet-simulation";

// The supabase client is loosely typed here (as the sibling resilient readers
// do) to avoid dragging the full generated Database type through this module.
async function fetchAgentFleetLive(supabase: {
  from: (t: string) => any;
}): Promise<AgentFleetState> {
  const { data, error } = await supabase
    .from("agent_definitions")
    .select("id,name,goal,enabled")
    .eq("enabled", true)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return buildFleetFromLiveRows((data ?? []) as LiveAgentRow[]);
}

export const getAgentFleetState = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<AgentFleetState> => {
    const { resilient } = await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "agent-fleet",
      () => fetchAgentFleetLive(context.supabase as { from: (t: string) => any }),
      (s) => s.agents.length === 0,
      () => buildFleetSimulation(),
    );
  });
