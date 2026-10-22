import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listCodeBundles, readCodeBundle, saveCodeBundle } from "./code-workspace.server";

export const listFnnCodeBundles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listCodeBundles(context));
export const readFnnCodeBundle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => input)
  .handler(async ({ context, data }) => readCodeBundle(context, data));
export const saveFnnCodeBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => input)
  .handler(async ({ context, data }) => saveCodeBundle(context, data));
