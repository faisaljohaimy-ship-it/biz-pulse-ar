import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MicrosoftIntegrationRow = {
  id: string;
  org_id: string;
  tenant_id: string | null;
  client_id: string | null;
  redirect_uris: string[];
  default_site_id: string | null;
  default_team_id: string | null;
  default_channel_id: string | null;
  notes: string | null;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_error: string | null;
  last_test_user: string | null;
  updated_at: string;
  sync_outlook_enabled: boolean;
  sync_sharepoint_enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
};

export type MicrosoftSyncLogRow = {
  id: string;
  org_id: string;
  kind: "outlook" | "sharepoint" | "manual";
  status: "ok" | "error" | "skipped";
  items_count: number;
  duration_ms: number | null;
  error: string | null;
  details: string;
  started_at: string;
};

async function assertAdmin(ctx: { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin role required");
}

export const getMicrosoftIntegration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("integration_microsoft")
      .select("*")
      .maybeSingle();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return (data ?? null) as MicrosoftIntegrationRow | null;
  });

const upsertSchema = z.object({
  tenant_id: z.string().trim().max(200).nullable().optional(),
  client_id: z.string().trim().max(200).nullable().optional(),
  redirect_uris: z.array(z.string().trim().url({ message: "Each redirect URI must be a valid URL" }).max(500)).max(20),
  default_site_id: z.string().trim().max(300).nullable().optional(),
  default_team_id: z.string().trim().max(200).nullable().optional(),
  default_channel_id: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const upsertMicrosoftIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { ...data, updated_by: context.userId };
    // Try update first; if no row exists, insert.
    const { data: existing } = await context.supabase
      .from("integration_microsoft")
      .select("id")
      .maybeSingle();

    if (existing?.id) {
      const { data: updated, error } = await context.supabase
        .from("integration_microsoft")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return updated as MicrosoftIntegrationRow;
    }

    const { data: inserted, error } = await context.supabase
      .from("integration_microsoft")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted as MicrosoftIntegrationRow;
  });

export type ConnectionTestResult = {
  ok: boolean;
  status: number;
  user?: { displayName?: string; userPrincipalName?: string; mail?: string };
  error?: string;
};

export const testMicrosoftConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConnectionTestResult> => {
    await assertAdmin(context);
    const lovableKey = process.env.LOVABLE_API_KEY;
    const outlookKey = process.env.MICROSOFT_OUTLOOK_API_KEY;
    if (!lovableKey || !outlookKey) {
      const result: ConnectionTestResult = { ok: false, status: 0, error: "Microsoft Outlook connector not linked" };
      await context.supabase.from("integration_microsoft").update({
        last_tested_at: new Date().toISOString(),
        last_test_status: "missing_connector",
        last_test_error: result.error,
        last_test_user: null,
      }).gte("id", "00000000-0000-0000-0000-000000000000");
      return result;
    }
    let result: ConnectionTestResult;
    try {
      const r = await fetch("https://connector-gateway.lovable.dev/microsoft_outlook/me", {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": outlookKey,
        },
      });
      const text = await r.text();
      let body: { displayName?: string; userPrincipalName?: string; mail?: string; error?: { message?: string } } = {};
      try { body = JSON.parse(text); } catch { /* non-JSON */ }
      if (!r.ok) {
        result = { ok: false, status: r.status, error: body?.error?.message ?? text.slice(0, 500) };
      } else {
        result = { ok: true, status: r.status, user: { displayName: body.displayName, userPrincipalName: body.userPrincipalName, mail: body.mail } };
      }
    } catch (e) {
      result = { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
    }
    await context.supabase.from("integration_microsoft").update({
      last_tested_at: new Date().toISOString(),
      last_test_status: result.ok ? "ok" : "error",
      last_test_error: result.ok ? null : (result.error ?? null),
      last_test_user: result.user?.userPrincipalName ?? result.user?.mail ?? null,
    }).gte("id", "00000000-0000-0000-0000-000000000000");
    return result;
  });

const syncSettingsSchema = z.object({
  sync_outlook_enabled: z.boolean(),
  sync_sharepoint_enabled: z.boolean(),
  sync_interval_minutes: z.number().int().min(5).max(1440),
});

async function ensureSyncSecretSeeded() {
  const secret = process.env.MICROSOFT_SYNC_HOOK_SECRET;
  if (!secret) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("set_microsoft_sync_secret", { _secret: secret });
}

export const updateMicrosoftSyncSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => syncSettingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: existing, error: selErr } = await context.supabase
      .from("integration_microsoft")
      .select("id")
      .maybeSingle();
    if (selErr && selErr.code !== "PGRST116") throw new Error(selErr.message);
    if (!existing?.id) throw new Error("Save the integration settings first");

    const { data: updated, error } = await context.supabase
      .from("integration_microsoft")
      .update(data)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await ensureSyncSecretSeeded();
    return updated as MicrosoftIntegrationRow;
  });

export const listMicrosoftSyncLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("integration_microsoft_sync_log")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return (data ?? []) as MicrosoftSyncLogRow[];
  });

export const triggerMicrosoftSyncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; status: number; body: string }> => {
    await assertAdmin(context);
    const secret = process.env.MICROSOFT_SYNC_HOOK_SECRET;
    if (!secret) throw new Error("Sync hook not configured");
    await ensureSyncSecretSeeded();
    const base = process.env.PUBLIC_SITE_URL || process.env.SITE_URL || "https://biz-pulse-ar.lovable.app";
    const { httpFetch } = await import("@/lib/api/http.server");
    const r = await httpFetch(`${base.replace(/\/$/, "")}/api/public/hooks/microsoft-sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: "{}",
      label: "microsoft-sync hook",
      retries: 1,
      timeoutMs: 20_000,
    });
    const body = await r.text();
    return { ok: r.ok, status: r.status, body: body.slice(0, 2000) };
  });


