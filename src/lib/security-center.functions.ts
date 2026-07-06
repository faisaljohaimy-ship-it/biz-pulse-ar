// Security Center — RBAC matrix, audit logs, session snapshot, secret inventory.
// All operations RLS-scoped; role changes require admin platform role.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformAdmin, hasPlatformRole } from "@/lib/authz.server";

export type OrgRole = "owner" | "admin" | "manager" | "operator" | "viewer";
export const ORG_ROLES: OrgRole[] = ["owner", "admin", "manager", "operator", "viewer"];

export type MemberRow = {
  user_id: string;
  org_id: string;
  role: OrgRole;
  joined_at: string;
  email: string | null;
  display_name: string | null;
};

export type AuditRow = {
  id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  status: string;
  source: string;
  actor_id: string | null;
  actor_email: string | null;
  occurred_at: string;
  route: string | null;
  duration_ms: number | null;
};

export type SecurityOverview = {
  members: MemberRow[];
  totals: {
    members: number;
    by_role: Record<OrgRole, number>;
    audit_24h: number;
    audit_errors_24h: number;
  };
  is_platform_admin: boolean;
  current_user_id: string;
};

export const getSecurityOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecurityOverview> => {
    const supabase = context.supabase;
    const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: members } = await supabase
      .from("org_members")
      .select("user_id,org_id,role,joined_at")
      .order("joined_at", { ascending: true });

    // Resolve emails/names via profiles (RLS-scoped)
    const userIds = Array.from(new Set((members ?? []).map((m) => m.user_id)));
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id,email,display_name").in("id", userIds)
      : { data: [] as Array<{ id: string; email: string | null; display_name: string | null }> };
    const profMap = new Map(profs?.map((p) => [p.id, p]) ?? []);

    const rows: MemberRow[] = (members ?? []).map((m) => {
      const p = profMap.get(m.user_id);
      return {
        user_id: m.user_id,
        org_id: m.org_id,
        role: m.role as OrgRole,
        joined_at: m.joined_at,
        email: p?.email ?? null,
        display_name: p?.display_name ?? null,
      };
    });

    const by_role: Record<OrgRole, number> = { owner: 0, admin: 0, manager: 0, operator: 0, viewer: 0 };
    for (const r of rows) by_role[r.role] += 1;

    const { count: audit24 } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .gte("occurred_at", dayAgoIso);

    const { count: auditErr } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .gte("occurred_at", dayAgoIso)
      .eq("status", "error");

    const isAdmin = await hasPlatformRole(context.userId, "admin");

    return {
      members: rows,
      totals: {
        members: rows.length,
        by_role,
        audit_24h: audit24 ?? 0,
        audit_errors_24h: auditErr ?? 0,
      },
      is_platform_admin: isAdmin,
      current_user_id: context.userId,
    };
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuditRow[]> => {
    const supabase = context.supabase;
    const { data } = await supabase
      .from("audit_logs")
      .select("id,action,entity,entity_id,status,source,actor_id,occurred_at,route,duration_ms")
      .order("occurred_at", { ascending: false })
      .limit(100);

    const rows = data ?? [];
    const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter((x): x is string => Boolean(x))));
    const { data: profs } = actorIds.length
      ? await supabase.from("profiles").select("id,email").in("id", actorIds)
      : { data: [] as Array<{ id: string; email: string | null }> };
    const emailMap = new Map(profs?.map((p) => [p.id, p.email]) ?? []);

    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      entity_id: r.entity_id,
      status: r.status,
      source: r.source,
      actor_id: r.actor_id,
      actor_email: r.actor_id ? emailMap.get(r.actor_id) ?? null : null,
      occurred_at: r.occurred_at,
      route: r.route,
      duration_ms: r.duration_ms,
    }));
  });

const updateRoleSchema = z.object({
  user_id: z.string().uuid(),
  org_id: z.string().uuid(),
  role: z.enum(["owner", "admin", "manager", "operator", "viewer"]),
});

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateRoleSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Only platform admins OR org owners can change roles.
    const platformAdmin = await hasPlatformRole(context.userId, "admin");
    if (!platformAdmin) {
      const { data: myRow } = await context.supabase
        .from("org_members")
        .select("role")
        .eq("org_id", data.org_id)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!myRow || (myRow.role !== "owner" && myRow.role !== "admin")) {
        throw new Error("Forbidden: only org owners/admins or platform admins can change roles");
      }
    }

    // Prevent demoting the last owner
    if (data.role !== "owner") {
      const { count: ownerCount } = await context.supabase
        .from("org_members")
        .select("*", { count: "exact", head: true })
        .eq("org_id", data.org_id)
        .eq("role", "owner");
      const { data: target } = await context.supabase
        .from("org_members")
        .select("role")
        .eq("org_id", data.org_id)
        .eq("user_id", data.user_id)
        .maybeSingle();
      if (target?.role === "owner" && (ownerCount ?? 0) <= 1) {
        throw new Error("Cannot demote the only remaining owner");
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("org_members")
      .update({ role: data.role })
      .eq("org_id", data.org_id)
      .eq("user_id", data.user_id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Audit
    await supabaseAdmin.from("audit_logs").insert({
      action: "member.role.updated",
      entity: "org_members",
      entity_id: data.user_id,
      status: "ok",
      source: "security_center",
      actor_id: context.userId,
      user_id: data.user_id,
      org_id: data.org_id,
      changes: { role: data.role },
    });
    return updated;
  });

export type SecretInventoryItem = { name: string; category: string; configured: boolean };

export const getSecretInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecretInventoryItem[]> => {
    await requirePlatformAdmin(context.userId);
    const known: Array<{ name: string; category: string }> = [
      { name: "LOVABLE_API_KEY", category: "AI Gateway" },
      { name: "OPENAI_API_KEY", category: "AI Gateway" },
      { name: "MICROSOFT_OUTLOOK_API_KEY", category: "Microsoft" },
      { name: "MICROSOFT_ONEDRIVE_API_KEY", category: "Microsoft" },
      { name: "MICROSOFT_SHAREPOINT_API_KEY", category: "Microsoft" },
      { name: "MICROSOFT_TEAMS_API_KEY", category: "Microsoft" },
      { name: "MICROSOFT_SYNC_HOOK_SECRET", category: "Microsoft" },
      { name: "ELEVENLABS_API_KEY", category: "Voice" },
      { name: "RESEND_API_KEY", category: "Email" },
      { name: "SESSION_SECRET", category: "Auth" },
      { name: "SUPABASE_SERVICE_ROLE_KEY", category: "Platform" },
      { name: "POWER_BI_API_KEY", category: "Analytics" },
    ];
    return known.map((k) => ({ ...k, configured: Boolean(process.env[k.name]) }));
  });
