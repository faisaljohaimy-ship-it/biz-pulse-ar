// Enterprise Runtime Bootstrap — single hydration round-trip on login.
// Fans out all critical context queries in parallel. P95 target < 800ms.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RuntimeOrg = {
  id: string;
  name: string;
  region: string;
  role: string;
};

export type RuntimeUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type RuntimeBootstrap = {
  org: RuntimeOrg | null;
  user: RuntimeUser;
  counts: {
    sites: number;
    assets: number;
    incidents_open: number;
    incidents_critical: number;
    patrols_active: number;
    permits_active: number;
    visitors_inside: number;
    cctv_new: number;
    agents_enabled: number;
    workflows_enabled: number;
  };
  integrations: {
    microsoft_connected: boolean;
  };
  health: {
    realtime: "ready" | "degraded";
    ai_gateway: "ready" | "degraded";
    scheduler: "ready" | "degraded";
  };
  generated_at: string;
};

export const bootstrapEnterprise = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RuntimeBootstrap> => {
    const { supabase, userId } = context;

    const [
      profileRes,
      orgMemberRes,
      sitesRes,
      assetsRes,
      incidentsRes,
      patrolsRes,
      permitsRes,
      visitorsRes,
      cctvRes,
      agentsRes,
      workflowsRes,
      msRes,
    ] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url").eq("user_id", userId).maybeSingle(),
      supabase
        .from("org_members")
        .select("role, org_id, organizations:org_id(id, name, region)")
        .eq("user_id", userId)
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase.from("sec_sites").select("id", { count: "exact", head: true }),
      supabase.from("sec_assets").select("id, status", { count: "exact" }),
      supabase.from("sec_incidents").select("id, status, severity"),
      supabase.from("sec_patrols").select("id, status"),
      supabase.from("sec_permits").select("id, status"),
      supabase.from("sec_visitors").select("id, status"),
      supabase.from("sec_cctv_alerts").select("id, status"),
      supabase.from("agent_definitions").select("id, enabled"),
      supabase.from("workflows").select("id, enabled"),
      supabase.from("integration_microsoft").select("id, last_test_status").maybeSingle(),
    ]);

    const profile = profileRes.data;
    const orgRow = orgMemberRes.data as
      | { role: string; org_id: string; organizations: { id: string; name: string; region: string | null } | null }
      | null;

    const incidents = incidentsRes.data ?? [];
    const patrols = patrolsRes.data ?? [];
    const permits = permitsRes.data ?? [];
    const visitors = visitorsRes.data ?? [];
    const cctv = cctvRes.data ?? [];
    const agents = agentsRes.data ?? [];
    const workflows = workflowsRes.data ?? [];
    const assets = assetsRes.data ?? [];

    return {
      org: orgRow?.organizations
        ? {
            id: orgRow.organizations.id,
            name: orgRow.organizations.name,
            region: orgRow.organizations.region ?? "western",
            role: orgRow.role,
          }
        : null,
      user: {
        id: userId,
        email: (context.claims as { email?: string } | undefined)?.email ?? null,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      },
      counts: {
        sites: sitesRes.count ?? 0,
        assets: assetsRes.count ?? assets.length,
        incidents_open: incidents.filter((i) => i.status !== "resolved" && i.status !== "closed").length,
        incidents_critical: incidents.filter(
          (i) => i.severity === "critical" && i.status !== "closed",
        ).length,
        patrols_active: patrols.filter((p) => p.status === "active").length,
        permits_active: permits.filter((p) => p.status === "active" || p.status === "approved").length,
        visitors_inside: visitors.filter((v) => v.status === "inside" || v.status === "overdue").length,
        cctv_new: cctv.filter((c) => c.status === "new").length,
        agents_enabled: agents.filter((a) => a.enabled).length,
        workflows_enabled: workflows.filter((w) => w.enabled).length,
      },
      integrations: {
        microsoft_connected: msRes.data?.last_test_status === "success",
      },
      health: {
        realtime: "ready",
        ai_gateway: "ready",
        scheduler: "ready",
      },
      generated_at: new Date().toISOString(),
    };
  });
