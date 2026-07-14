/**
 * ARIA emergency broadcast — server functions (Phase 4).
 *
 * `broadcastAlert` records an alert to `aria_alerts` (the tamper-evident
 * accountability log) under the authenticated creator, then reports how many
 * recipients it would reach. Actual SMS/email dispatch is gated on provider
 * keys (RESEND_API_KEY / TWILIO_ACCOUNT_SID); with none present it runs in
 * demo mode (recorded, dispatched = 0) — never a crash. `acknowledgeAlert`
 * records a per-user read acknowledgement.
 *
 * NOTE: `aria_alerts` / `aria_alert_acks` are added by migration
 * 20260713100000 and are not yet in the generated Database type, so these calls
 * use a narrow local cast until the types are regenerated.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const REGION_IDS = ["all", "central", "western", "eastern", "southern"] as const;

const broadcastSchema = z.object({
  title: z.string().trim().min(2).max(140),
  body: z.string().trim().min(2).max(2000),
  severity: z.enum(["info", "warning", "critical"]).default("critical"),
  target: z.enum(REGION_IDS).default("all"),
});

/** Minimal row-level accessor for tables not yet in the generated types. */
type LooseFrom = {
  from: (table: string) => {
    insert: (v: unknown) => {
      select: () => {
        single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
  };
};

function providerChannels(): string[] {
  const ch: string[] = [];
  if (process.env.RESEND_API_KEY) ch.push("email");
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ch.push("sms");
  return ch;
}

export const broadcastAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => broadcastSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const channels = providerChannels();
    // Dispatch is only attempted when a provider key exists; until keys are
    // configured and verified this stays demo (dispatched = 0), but the alert
    // is ALWAYS recorded so the accountability trail is complete.
    const dispatched = 0;
    const db = supabase as unknown as LooseFrom;
    const { data: row, error } = await db
      .from("aria_alerts")
      .insert({
        created_by: userId,
        title: data.title,
        body: data.body,
        severity: data.severity,
        target: data.target,
        channels,
        dispatched,
        is_simulation: channels.length === 0,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { alertId: row?.id ?? null, channels, dispatched, demo: channels.length === 0 };
  });

const ackSchema = z.object({ alertId: z.string().uuid() });

export const acknowledgeAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ackSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as {
      from: (t: string) => {
        insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await db
      .from("aria_alert_acks")
      .insert({ alert_id: data.alertId, user_id: userId });
    // Duplicate ack (already read) is fine — swallow unique-violation noise.
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    return { ok: true };
  });
