/**
 * Nightly ARIA pattern miner cron target.
 * Article IV §2 of docs/NEXUS_ENGINEERING_CONSTITUTION.md.
 *
 * Called by pg_cron once per day. Authenticated via CRON_HOOK_SECRET
 * (timing-safe) — the legacy SUPABASE_PUBLISHABLE_KEY guard was removed
 * because that key ships to browsers and would let anyone trigger
 * service-role writes across all users' data.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronHookSecret } from "@/lib/hook-auth.server";

export const Route = createFileRoute("/api/public/hooks/aria-pattern-miner")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronHookSecret(request);
        if (denied) return denied;
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
