// Cron-triggered self-evolution tick. Runs one analyze-only cycle of the
// ARIA Self-Evolution Engine and persists the report to
// `aria_evolution_cycles`. Guarded by CRON_HOOK_SECRET. Never applies code.

import { createFileRoute } from "@tanstack/react-router";
import { verifyCronHookSecret } from "@/lib/hook-auth.server";

export const Route = createFileRoute("/api/public/hooks/self-evolution-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronHookSecret(request);
        if (denied) return denied;

        const { runSelfEvolution } = await import("@/lib/aria/self-evolution");
        const { persistEvolutionCycle } = await import("@/lib/aria/self-evolution/persist.server");

        try {
          const report = await runSelfEvolution({ enableApply: false });
          const persisted = await persistEvolutionCycle(report, "cron");
          const persistErr = "error" in persisted ? persisted.error : null;
          return new Response(
            JSON.stringify({
              ok: true,
              decision: report.decision,
              readiness_score: report.readinessScore,
              issues: report.issues.length,
              persisted: !persistErr,
              persist_error: persistErr,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return new Response(JSON.stringify({ ok: false, error: msg.slice(0, 300) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
