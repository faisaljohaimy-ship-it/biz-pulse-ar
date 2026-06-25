import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AuditEntry = {
  actor_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
};

/**
 * Persist a structured audit record. Failures never throw — audit must not
 * break the underlying operation. Errors are logged for ops review.
 */
export async function audit(
  supabase: SupabaseClient<Database>,
  entry: AuditEntry,
): Promise<void> {
  try {
    const row = {
      actor_id: entry.actor_id ?? null,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id ?? null,
      changes: {
        before: entry.before ?? null,
        after: entry.after ?? null,
        metadata: entry.metadata ?? {},
      } as Record<string, unknown>,
    };
    // audit_logs schema in this project: actor_id, action, resource_type,
    // resource_id, changes (jsonb), created_at, occurred_at, id.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("audit_logs").insert(row);
    if (error) console.error("[audit] insert failed", error.message);
  } catch (err) {
    console.error("[audit] threw", err);
  }
}
