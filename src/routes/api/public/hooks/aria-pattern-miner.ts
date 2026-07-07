/**
 * Nightly ARIA pattern miner cron target.
 * Article IV §2 of docs/NEXUS_ENGINEERING_CONSTITUTION.md.
 *
 * Called by pg_cron once per day. Authenticates via Supabase apikey header
 * (standard cron auth pattern — see schedule-jobs-options knowledge).
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/aria-pattern-miner")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response("unauthorized", { status: 401 });
        }
        try {
          const { runPatternMiner } = await import("@/lib/aria/learning/pattern-miner.server");
          const result = await runPatternMiner(24);
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "content-type": "application/json" },
          });
        } catch (err) {
          console.error("[aria-pattern-miner] failed", err);
          return new Response(
            JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "unknown" }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
