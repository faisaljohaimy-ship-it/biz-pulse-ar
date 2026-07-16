// Executive Scenario — admin-only server function to run the narrated day.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformAdmin, getCurrentOrgIdForUser } from "@/lib/authz.server";

export const runExecutiveScenarioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { day?: string }) =>
    z
      .object({
        day: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runExecutiveScenario } = await import("./exec-scenario.server");
    // SECURITY: derive the target org from the authenticated caller only —
    // never trust a client-supplied orgId on a service-role (RLS-bypassing) path.
    const orgId = await getCurrentOrgIdForUser(context.userId);
    if (!orgId) throw new Error("No org for current user");
    return await runExecutiveScenario(supabaseAdmin, {
      orgId,
      userId: context.userId,
      day: data.day,
    });
  });
