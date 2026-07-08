// Stabilization hook: executes every enabled workflow once with topic-aware
// default payloads so the engine, event bus, audit trail, and step runs are
// observably populated. Guarded by CRON_HOOK_SECRET (timing-safe). The
// legacy SUPABASE_PUBLISHABLE_KEY guard was removed because that key is
// public and shipped to browsers.

import { createFileRoute } from "@tanstack/react-router";
import { verifyCronHookSecret } from "@/lib/hook-auth.server";

function defaultPayloadForTopic(topic: string | null | undefined): Record<string, unknown> {
  const base = { source: "runtime.bootstrap", triggered_at: new Date().toISOString() };
  switch (topic) {
    case "sec.incident.created":
    case "sec.incident.p1":
      return {
        ...base,
        severity: topic === "sec.incident.p1" ? "P1" : "P3",
        category: "security",
        site: "jeddah-hq",
      };
    case "sec.contractor.created":
      return { ...base, contractor: { name: "Bootstrap", company: "N/A" } };
    case "sec.permit.created":
      return { ...base, permit_type: "hot_work", site: "jeddah-hq", duration_hours: 4 };
    case "sec.work_order.created":
      return { ...base, priority: "medium", category: "preventive" };
    case "sec.patrol.overdue":
      return { ...base, route: "perimeter-north", overdue_minutes: 15 };
    case "sec.visitor.created":
      return { ...base, visitor: { name: "Bootstrap" }, host: "operations" };
    case "sec.inspection.requested":
      return { ...base, scope: "monthly", site: "jeddah-hq" };
    case "risk.assessment.requested":
      return { ...base, scope: "western-region" };
    case "exec.brief.requested":
      return { ...base, period: "24h", audience: "executive" };
    case "schedule.daily.kpi":
      return { ...base, window: "rolling_24h" };
    default:
      return base;
  }
}

export const Route = createFileRoute("/api/public/hooks/runtime-bootstrap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronHookSecret(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { triggerWorkflow } = await import("@/lib/exec/workflow-engine.server");

        // Use any org member as triggered_by (FK to auth.users)
        const { data: member } = await supabaseAdmin
          .from("org_members")
          .select("user_id")
          .limit(1)
          .maybeSingle();
        const triggeredBy = member?.user_id;
        if (!triggeredBy) {
          return new Response(JSON.stringify({ error: "no_org_member_user" }), {
            status: 412,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: wfs, error: wErr } = await supabaseAdmin
          .from("workflows")
          .select("id, name, trigger_topic")
          .eq("enabled", true);
        if (wErr) {
          return new Response(JSON.stringify({ error: wErr.message }), { status: 500 });
        }

        const results: Array<{
          workflowId: string;
          name: string;
          status: string;
          runId?: string;
          error?: string;
        }> = [];
        for (const w of wfs ?? []) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res = await triggerWorkflow(supabaseAdmin as any, {
              workflowId: w.id as string,
              triggeredBy: triggeredBy as string,
              triggerEvent: "runtime.bootstrap",
              payload: defaultPayloadForTopic(w.trigger_topic as string | null),
              idempotencyKey: `bootstrap-${w.id}-${Date.now()}`,
            });
            results.push({
              workflowId: w.id as string,
              name: w.name as string,
              status: res.status,
              runId: res.runId,
            });
          } catch (e) {
            results.push({
              workflowId: w.id as string,
              name: w.name as string,
              status: "engine_error",
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        const summary = {
          total: results.length,
          succeeded: results.filter((r) => r.status === "succeeded").length,
          failed: results.filter((r) => r.status === "failed").length,
          rolled_back: results.filter((r) => r.status === "rolled_back").length,
          waiting_approval: results.filter((r) => r.status === "waiting_approval").length,
          engine_error: results.filter((r) => r.status === "engine_error").length,
        };

        return new Response(JSON.stringify({ summary, results }, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
