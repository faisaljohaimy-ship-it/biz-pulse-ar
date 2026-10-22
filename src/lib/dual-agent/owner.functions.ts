import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isFnnOwner, requireFnnOwner } from "./owner.server";
import { readFnnAutomation, automationReportPlan } from "./automation.server";
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
    if (
      /تقرير.*تشغيل|حالة.*(?:أتمتة|اتمتة|اتمته|تشغيل)|automation\s*status|operational\s*report/i.test(
        data.message,
      )
    ) {
      const status = await readFnnAutomation(context);
      return {
        plan: automationReportPlan(status),
        source: "scheduled_report" as const,
        executed: false as const,
      };
    }
    const plan = prepareFnnPlan(data.message);
    return { plan, source: "deterministic" as const, executed: false as const };
  });
