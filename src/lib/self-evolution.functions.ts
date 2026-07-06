/**
 * Server-function wrappers for the ARIA Self-Evolution Engine.
 *
 * - `runSelfEvolutionFn`: runs one analyze-only cycle and persists it to
 *   `aria_evolution_cycles` (unless `persist:false`).
 * - `listEvolutionCyclesFn`: paginated cycle history for the operator UI.
 *
 * Both are auth-gated. The engine itself never mutates production code.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformAdmin } from "@/lib/authz.server";
import { runSelfEvolution } from "@/lib/aria/self-evolution";

const RunInput = z
  .object({
    enableApply: z.boolean().optional(),
    persist: z.boolean().optional(),
  })
  .optional();

export const runSelfEvolutionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RunInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.userId);
    const report = await runSelfEvolution({
      enableApply: data?.enableApply ?? false,
    });
    let persistedId: string | null = null;
    let persistError: string | null = null;
    if (data?.persist !== false) {
      const { persistEvolutionCycle } = await import(
        "@/lib/aria/self-evolution/persist.server"
      );
      const out = await persistEvolutionCycle(report, "manual");
      if ("error" in out) persistError = out.error;
      else persistedId = out.id;
    }
    return {
      report: JSON.parse(JSON.stringify(report)) as JsonValue,
      persistedId,
      persistError,
    };
  });

const ListInput = z
  .object({
    limit: z.number().int().min(1).max(100).optional(),
  })
  .optional();

export const listEvolutionCyclesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ListInput.parse(data))
  .handler(async ({ data, context }) => {
    const limit = data?.limit ?? 25;
    const { data: rows, error } = await context.supabase
      .from("aria_evolution_cycles")
      .select(
        "id, started_at, finished_at, trigger, decision, readiness_score, issues_count, critical_count, applied_count, deferred_count, reasons",
      )
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return { cycles: rows ?? [] };
  });

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };
