import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AuditEntry = {
  actor_id?: string | null;
  org_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  source?: string;
  correlation_id?: string | null;
  status?: string;
  duration_ms?: number | null;
};

/**
 * حالة صحّة الأثر — **كم مرّة أخفقت الكتابة، ومتى، ولماذا.**
 *
 * الكتابة لا ترمي عمدًا (أثرٌ يكسر العملية التي يرصدها أسوأ من غيابه).
 * لكنّ الإخفاق كان يذهب إلى `console.error` وحده: فلو رفضت RLS الإدراج،
 * أو غاب عمود، لاستمرّ النظام يعمل **بلا أثرٍ إطلاقًا** ولا شيء يقول ذلك
 * — ويُقرأ جدولٌ فارغ «لم يقع شيء» وهو «لم يُسجَّل شيء». وهما نقيضان.
 *
 * فصار الإخفاق حالةً تُقرأ: يعدّها فحص الصحّة ويُظهرها بدل أن تُبتلع.
 */
let auditFailures = 0;
let lastAuditFailure: { at: string; message: string } | null = null;

export function auditHealth(): {
  readonly failures: number;
  readonly lastFailure: { at: string; message: string } | null;
} {
  return { failures: auditFailures, lastFailure: lastAuditFailure };
}

/** للاختبار وحده — يعيد العدّاد إلى الصفر. */
export function resetAuditHealth(): void {
  auditFailures = 0;
  lastAuditFailure = null;
}

function recordAuditFailure(message: string): void {
  auditFailures += 1;
  lastAuditFailure = { at: new Date().toISOString(), message };
}

/**
 * Persist a structured audit record into the immutable trail. Failures never
 * throw — audit must not break the underlying operation. The enterprise event
 * bus also mirrors events into this table via trigger; direct calls are for
 * actions that don't publish an event (e.g. fine-grained sub-steps).
 */
export async function audit(supabase: SupabaseClient<Database>, entry: AuditEntry): Promise<void> {
  try {
    const row: Record<string, unknown> = {
      actor_id: entry.actor_id ?? null,
      user_id: entry.actor_id ?? null, // backward-compat column
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id ?? null,
      entity: entry.resource_type, // backward-compat column
      entity_id: entry.resource_id ?? null,
      changes: {
        before: entry.before ?? null,
        after: entry.after ?? null,
      } as Record<string, unknown>,
      metadata: entry.metadata ?? {},
      source: entry.source ?? "system",
      correlation_id: entry.correlation_id ?? null,
      status: entry.status ?? "recorded",
      duration_ms: entry.duration_ms ?? null,
      occurred_at: new Date().toISOString(),
    };
    if (entry.org_id) row.org_id = entry.org_id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("audit_logs").insert(row);
    if (error) {
      recordAuditFailure(error.message);
      console.error("[audit] insert failed", error.message);
    }
  } catch (err) {
    recordAuditFailure(err instanceof Error ? err.message : String(err));
    console.error("[audit] threw", err);
  }
}
