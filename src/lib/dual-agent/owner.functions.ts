import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isFnnOwner, requireFnnOwner } from "./owner.server";
import { prepareFnnPlan } from "@/lib/sadeed/orchestrator/fnn-plan";

export const getFnnOwnerAccess = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }) => ({ allowed: await isFnnOwner(context) }));

/** Independent FNN conversation. Planning is deterministic; execution stays approval-gated. */
export const askFnn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ message: z.string().trim().min(1).max(2000) })
      .strict()
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await requireFnnOwner(context);
    const plan = prepareFnnPlan(data.message);
    return { plan, source: "deterministic" as const, executed: false as const };
  });
