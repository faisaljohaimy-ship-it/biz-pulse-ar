import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type EventSeverity = "debug" | "info" | "notice" | "warn" | "error" | "critical";

export type EnterpriseEvent = {
  topic: string;
  payload?: Record<string, unknown>;
  source?: string;
  severity?: EventSeverity;
  actor_id?: string | null;
  org_id?: string | null;
  correlation_id?: string | null;
  subject_type?: string | null;
  subject_id?: string | null;
  duration_ms?: number | null;
  inputs?: Record<string, unknown> | null;
  outputs?: Record<string, unknown> | null;
  metrics?: Record<string, unknown> | null;
  status?: "pending" | "processed" | "dead";
};

/**
 * Publish a single enterprise event. Insert into enterprise_events; Supabase
 * Realtime fans out to subscribers (workflow triggers + UI observers). A
 * server trigger mirrors every insert into audit_logs (immutable trail).
 * Returns the event id, or null on failure (logged, never thrown).
 */
export async function publishEvent(
  supabase: SupabaseClient<Database>,
  ev: EnterpriseEvent,
): Promise<string | null> {
  try {
    const row: Record<string, unknown> = {
      topic: ev.topic,
      payload_json: ev.payload ?? {},
      source: ev.source ?? "system",
      severity: ev.severity ?? "info",
      actor_id: ev.actor_id ?? null,
      correlation_id: ev.correlation_id ?? null,
      subject_type: ev.subject_type ?? null,
      subject_id: ev.subject_id ?? null,
      duration_ms: ev.duration_ms ?? null,
      inputs_json: ev.inputs ?? {},
      outputs_json: ev.outputs ?? {},
      metrics_json: ev.metrics ?? {},
      status: ev.status ?? "processed",
    };
    if (ev.org_id) row.org_id = ev.org_id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("enterprise_events")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      console.error("[event-bus] publish failed", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.error("[event-bus] publish threw", err);
    return null;
  }
}

/** Fire-and-forget variant — never awaits, never throws. */
export function publishEventAsync(supabase: SupabaseClient<Database>, ev: EnterpriseEvent): void {
  void publishEvent(supabase, ev).catch(() => undefined);
}

/**
 * Mark an event processed (handler succeeded) or dead (after retries).
 */
export async function markEvent(
  supabase: SupabaseClient<Database>,
  id: string,
  status: "processed" | "dead",
  error?: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from("enterprise_events")
    .update({
      status,
      processed_at: new Date().toISOString(),
      error: error ?? null,
    })
    .eq("id", id);
  if (updateError) {
    // Surface the failure: a silently-dropped mark leaves the event stuck as
    // unprocessed and it may be redelivered indefinitely.
    console.error(`[event-bus] markEvent(${id}, ${status}) failed:`, updateError.message);
  }
}
