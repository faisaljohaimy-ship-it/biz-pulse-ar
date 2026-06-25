import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type EnterpriseEvent = {
  topic: string;
  payload: Record<string, unknown>;
  source?: string;
  actor_id?: string | null;
  correlation_id?: string | null;
};

/**
 * Publish a single enterprise event. Insert into enterprise_events; Supabase
 * Realtime fans out to subscribers (workflow triggers + UI observers).
 * Returns the event id, or null on failure (logged, never thrown).
 */
export async function publishEvent(
  supabase: SupabaseClient<Database>,
  ev: EnterpriseEvent,
): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("enterprise_events")
      .insert({
        topic: ev.topic,
        payload_json: ev.payload,
        source: ev.source ?? "system",
        actor_id: ev.actor_id ?? null,
        correlation_id: ev.correlation_id ?? null,
      })
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
  await (supabase as any)
    .from("enterprise_events")
    .update({
      status,
      processed_at: new Date().toISOString(),
      error: error ?? null,
    })
    .eq("id", id);
}
