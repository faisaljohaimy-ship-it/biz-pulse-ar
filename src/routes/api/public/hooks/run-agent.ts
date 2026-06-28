// One-shot hook to execute a single agent via the production agent runtime.
// Guarded by SUPABASE_PUBLISHABLE_KEY apikey header + per-IP rate limit.

import { createFileRoute } from "@tanstack/react-router";
import {
  enforceRateLimit,
  clientBucketKey,
  rateLimitResponse,
} from "@/lib/governance/rate-limit.server";

export const Route = createFileRoute("/api/public/hooks/run-agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey =
          request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Cap per-IP at 10 agent runs / minute.
        const { allowed } = await enforceRateLimit(
          clientBucketKey(request, "run-agent"),
          10,
          60,
        );
        if (!allowed) return rateLimitResponse();

        let body: { agentId?: string; goalOverride?: string } = {};
        try {
          body = await request.json();
        } catch {
          body = {};
        }
        const agentId = body.agentId ?? "executive_briefer";

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { runAgent } = await import("@/lib/exec/agent-runtime.server");

        const { data: member } = await supabaseAdmin
          .from("org_members")
          .select("user_id")
          .in("role", ["admin", "owner"])
          .limit(1)
          .maybeSingle();
        const actorId = member?.user_id;
        if (!actorId) {
          return new Response(
            JSON.stringify({ error: "no_admin_org_member" }),
            { status: 412, headers: { "Content-Type": "application/json" } },
          );
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res = await runAgent(supabaseAdmin as any, {
            agentId,
            actorId: actorId as string,
            goalOverride: body.goalOverride ?? null,
            context: { source: "public.hook.run-agent" },
          });
          return new Response(JSON.stringify({ ok: true, result: res }, null, 2), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
