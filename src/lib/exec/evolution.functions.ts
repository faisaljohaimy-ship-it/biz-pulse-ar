/**
 * Self-evolving intelligence organization (/intelligence) — ONE resilient
 * state source for the agent council, the proposals pipeline, and the
 * evolution log. Live rows win; the reference simulation serves silence
 * («بيانات لا تفرغ»). Reads are guest-safe (optionalSupabaseAuth); the
 * approve/reject decision remains a human-gated write on the page itself
 * (constitution art. 8).
 */
import { createServerFn } from "@tanstack/react-start";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import type { EvolutionState } from "@/lib/exec/showcase-simulation.server";

export type { EvolutionState };

async function fetchEvolutionLive(supabase: { from: (t: string) => any }): Promise<EvolutionState> {
  const [agentsRes, propRes, logRes] = await Promise.all([
    supabase
      .from("intelligence_agents")
      .select("id,name_ar,name_en,role,focus_area,status")
      .order("created_at"),
    supabase
      .from("evolution_proposals")
      .select("id,agent_id,title_ar,title_en,description_ar,priority,status,created_at,decided_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("evolution_log")
      .select("id,proposal_id,summary_ar,applied_at")
      .order("applied_at", { ascending: false })
      .limit(50),
  ]);

  const agents = (agentsRes.data ?? []) as EvolutionState["agents"];
  const proposals = (propRes.data ?? []) as EvolutionState["proposals"];
  const logs = (logRes.data ?? []) as EvolutionState["logs"];

  return {
    source: "database",
    // Seeded rows carry the simulation marker in their description text; if
    // every proposal is seeded showcase data the page still says so.
    simulation:
      proposals.length > 0 &&
      proposals.every((p) => (p.description_ar ?? "").includes("is_simulation=true")),
    agents,
    proposals,
    logs,
  };
}

export const getEvolutionState = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<EvolutionState> => {
    const { buildEvolutionSimulation, resilient } =
      await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "evolution",
      () => fetchEvolutionLive(context.supabase as { from: (t: string) => any }),
      (s) => s.agents.length === 0 && s.proposals.length === 0,
      () => buildEvolutionSimulation(Date.now()),
    );
  });
