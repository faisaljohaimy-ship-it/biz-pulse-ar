/**
 * Persist a Self-Evolution cycle report to `aria_evolution_cycles`.
 * Server-only. Uses the admin client because writes come from either the
 * cron hook (no session) or an authenticated operator.
 */
import type { EvolutionReport } from "./types";

export type CycleTrigger = "cron" | "manual" | "bootstrap";

export async function persistEvolutionCycle(
  report: EvolutionReport,
  trigger: CycleTrigger,
): Promise<{ id: string } | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const critical = report.issues.filter((i) => i.severity === "critical").length;
  const { data, error } = await supabaseAdmin
    .from("aria_evolution_cycles")
    .insert({
      started_at: report.startedAt,
      finished_at: report.finishedAt,
      trigger,
      decision: report.decision,
      readiness_score: Number(report.readinessScore.toFixed(3)),
      issues_count: report.issues.length,
      critical_count: critical,
      applied_count: report.applied.length,
      deferred_count: report.deferred.length,
      reasons: [...report.reasons],
      report: JSON.parse(JSON.stringify(report)),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id as string };
}
