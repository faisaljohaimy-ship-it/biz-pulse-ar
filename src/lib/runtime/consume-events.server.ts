// Enterprise Event Consumer — Wave 1.
//
// Reads pending events from `enterprise_events` and dispatches matching
// `workflows` (by `trigger_topic`) via the real workflow engine. Each event
// is marked processed/dead after dispatch. This is the bridge between DB
// triggers (producers) and the workflow engine (consumer).
//
// Called from the runtime pulse once per cycle.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { triggerWorkflow } from "@/lib/exec/workflow-engine.server";
import { markEvent } from "@/lib/exec/event-bus.server";

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
): Promise<ConsumeResult> {
  let processed = 0;
  let started = 0;
  let errors = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pending } = await (adminClient as any)
    .from("enterprise_events")
    .select("id, topic, payload_json, correlation_id, org_id")
    .eq("org_id", orgId)
    .eq("status", "pending")
    .order("occurred_at", { ascending: true })
    .limit(MAX_EVENTS_PER_TICK);

  if (!pending?.length) {
    return { events_processed: 0, workflows_started: 0, errors: 0 };
  }

  for (const ev of pending) {
    processed++;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: workflows } = await (adminClient as any)
        .from("workflows")
        .select("id")
        .eq("org_id", ev.org_id)
        .eq("enabled", true)
        .eq("trigger_topic", ev.topic);

      if (!workflows?.length) {
        await markEvent(adminClient, ev.id, "processed");
        continue;
      }

      for (const wf of workflows) {
        try {
          // Fire-and-forget: don't block the pulse on long-running workflows.
          // The engine writes its own status to workflow_runs; UI subscribes via realtime.
          void triggerWorkflow(adminClient, {
            workflowId: wf.id,
            triggeredBy: actorId,
            triggerEvent: ev.topic,
            payload: (ev.payload_json as Record<string, unknown>) ?? {},
            idempotencyKey: `event:${ev.id}:${wf.id}`,
          }).catch((err) => {
            console.error("[consume-events] workflow trigger failed", err);
          });
          started++;
        } catch (err) {
          errors++;
          console.error("[consume-events] dispatch error", err);
        }
      }
      await markEvent(adminClient, ev.id, "processed");
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      await markEvent(adminClient, ev.id, "dead", msg);
    }
  }

  return { events_processed: processed, workflows_started: started, errors };
}
