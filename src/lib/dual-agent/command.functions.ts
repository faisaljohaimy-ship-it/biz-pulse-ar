import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OrgInput, FnnTaskInput, readCommandOverview, dispatchFnnTask } from "./command.server";

export const getDualAgentOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OrgInput.parse(input))
  .handler(({ context, data }) => readCommandOverview(context, data));

export const executeFnnTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FnnTaskInput.parse(input))
  .handler(({ context, data }) => dispatchFnnTask(context, data));
