/**
 * Server-function wrapper around the ARIA Self-Evolution Engine.
 *
 * Auth-gated: only authenticated users can invoke it. Runs in analyze-only
 * mode by default; the engine itself never mutates production code.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runSelfEvolution } from "@/lib/aria/self-evolution";

const InputSchema = z
  .object({
    enableApply: z.boolean().optional(),
  })
  .optional();

export const runSelfEvolutionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const report = await runSelfEvolution({
      enableApply: data?.enableApply ?? false,
    });
    // Serialize through JSON to strip unknown-typed evidence bags.
    return JSON.parse(JSON.stringify(report)) as Record<string, unknown>;
  });
