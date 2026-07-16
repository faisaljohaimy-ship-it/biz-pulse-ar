// Public API for the Simulation Engine.
// Admin-only server functions to trigger seed / validate / status.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformAdmin, getCurrentOrgIdForUser } from "@/lib/authz.server";

export const runSimulationSeedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { seed?: number }) =>
    z.object({ seed: z.number().int().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runSimulationSeed } = await import("./sim.seeder.server");
    // SECURITY: the target org is always derived from the authenticated caller's
    // own membership — never taken from client input. A client-supplied orgId
    // combined with the service-role client would allow cross-tenant writes.
    const orgId = await getCurrentOrgIdForUser(context.userId);
    if (!orgId) throw new Error("No org for current user");
    return await runSimulationSeed(supabaseAdmin, {
      orgId,
      seed: data.seed,
      userId: context.userId,
    });
  });

export const validateSimulationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { validateSimulation } = await import("./sim.seeder.server");
    const orgId = await getCurrentOrgIdForUser(context.userId);
    if (!orgId) throw new Error("No org for current user");
    return await validateSimulation(supabaseAdmin, orgId);
  });

export const getSimulationStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await getCurrentOrgIdForUser(context.userId);
    if (!orgId) return { orgId: null, tables: {} as Record<string, number> };
    const { supabase } = context;
    const tables = [
      "sim_departments",
      "sim_employees",
      "sim_buses",
      "sim_near_misses",
      "sim_inspections",
      "sim_risks",
      "sim_corrective_actions",
      "sim_meetings",
      "sim_notifications",
      "sim_daily_ops",
      "sim_history",
    ];
    const counts: Record<string, number> = {};
    for (const t of tables) {
      // biome-ignore lint/suspicious/noExplicitAny: table names come from a runtime list
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table name is selected from the fixed list above
      const { count } = await (supabase as any)
        .from(t)
        .select("id", { count: "exact", head: true });
      counts[t] = count ?? 0;
    }
    return { orgId, tables: counts };
  });
