// Enterprise event admission — explicitly gated by a server activation watermark.
// Scheduling/activation is separate. Importing this module starts no worker.
// An event is acknowledged only after all matching workflow admissions resolve.
// A durable existing run may still be in flight; acknowledgement is NOT a claim
// of workflow completion or exactly-once external side effects.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { triggerWorkflow } from "@/lib/exec/workflow-engine.server";

const MAX_EVENTS_PER_TICK = 10;

export type ConsumeResult = {
  events_processed: number;
  workflows_started: number;
  errors: number;
};

export async function consumePendingEvents(
  adminClient: SupabaseClient<Database>,
  actorId: string,
  orgId: string,
  serverActivationWatermark: string | undefined,
): Promise<ConsumeResult> {
  const result: ConsumeResult = { events_processed: 0, workflows_started: 0, errors: 0 };
  // Never infer activation from "now" and accidentally replay imported history.
  // Require an explicit timestamp with timezone from trusted server configuration.
  const watermark =
    typeof serverActivationWatermark === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      serverActivationWatermark,
    )
      ? Date.parse(serverActivationWatermark)
      : NaN;
  if (!Number.isFinite(watermark) || watermark > Date.now()) {
    return { ...result, errors: 1 };
  }
  const activationAt = new Date(watermark).toISOString();

  try {
    const { data: pending, error: pendingError } = await adminClient
      .from("enterprise_events")
      .select("id, topic, payload_json, org_id, occurred_at")
      .eq("org_id", orgId)
      .eq("status", "pending")
      .gte("occurred_at", activationAt)
      .order("occurred_at", { ascending: true })
      .limit(MAX_EVENTS_PER_TICK);
    if (pendingError) return { ...result, errors: 1 };

    for (const ev of pending ?? []) {
      try {
        if (ev.org_id !== orgId || !(Date.parse(ev.occurred_at) >= watermark)) {
          result.errors++;
          continue;
        }
        const { data: workflows, error: workflowError } = await adminClient
          .from("workflows")
          .select("id")
          .eq("org_id", orgId)
          .eq("enabled", true)
          .eq("trigger_topic", ev.topic);
        if (workflowError) {
          result.errors++;
          continue;
        }
        // Standby is not consumption. A later enabled matching workflow may act.
        if (!workflows?.length) continue;

        let admitted = true;
        for (const wf of workflows) {
          try {
            const admission = await triggerWorkflow(adminClient, {
              workflowId: wf.id,
              triggeredBy: actorId,
              triggerEvent: ev.topic,
              payload:
                ev.payload_json &&
                typeof ev.payload_json === "object" &&
                !Array.isArray(ev.payload_json)
                  ? ev.payload_json
                  : {},
              idempotencyKey: `event:${ev.id}:${wf.id}`,
            });
            if (admission.created === true) result.workflows_started++;
            if (
              !admission.runId ||
              !["queued", "running", "waiting_approval", "succeeded"].includes(admission.status)
            ) {
              admitted = false;
              result.errors++;
              continue;
            }
          } catch {
            admitted = false;
            result.errors++;
          }
        }
        if (!admitted) continue;

        // Compare-and-set acknowledgement: count only the worker which actually
        // changed the pending row. Never use markEvent's error-swallowing helper.
        const { data: marked, error: markError } = await adminClient
          .from("enterprise_events")
          .update({ status: "processed", processed_at: new Date().toISOString(), error: null })
          .eq("org_id", orgId)
          .eq("id", ev.id)
          .eq("status", "pending")
          .gte("occurred_at", activationAt)
          .select("id")
          .maybeSingle();
        if (markError) result.errors++;
        else if (marked?.id === ev.id) result.events_processed++;
      } catch {
        // Query exceptions and failed acknowledgements retain the pending row.
        result.errors++;
      }
    }
    return result;
  } catch {
    return { ...result, errors: result.errors + 1 };
  }
}
