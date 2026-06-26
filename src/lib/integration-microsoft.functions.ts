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
};

async function assertAdmin(ctx: { supabase: { rpc: typeof globalThis extends never ? never : any }; userId: string }) {
  const { data } = await (ctx.supabase as { rpc: (n: "has_role", p: { _user_id: string; _role: "admin" }) => Promise<{ data: boolean | null }> }).rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
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
