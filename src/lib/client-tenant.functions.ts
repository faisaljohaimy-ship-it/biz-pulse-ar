// Simulated reference client — auth-gated server functions.
// Every returned row already carries is_simulation = true at the DB level
// (enforced by CHECK constraints in the migration). Middleware requires
// an authenticated session; RLS policies scope reads to org members.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ClientTenantSummary = {
  id: string;
  tenant_code: string;
  name_ar: string;
  name_en: string;
  industry_ar: string;
  region_ar: string;
  ribbon_text_ar: string;
  is_simulation: boolean;
  is_default_view: boolean;
};

export type ClientTenantOverview = {
  tenant: ClientTenantSummary | null;
  counts: {
    sites: number;
    personnel: number;
    incidents_total: number;
    incidents_new: number;
    incidents_in_progress: number;
    incidents_pending_approval: number;
    incidents_approved: number;
    incidents_closed: number;
    work_orders_total: number;
    work_orders_open: number;
    work_orders_in_progress: number;
    work_orders_completed: number;
    work_orders_verified: number;
    work_orders_overdue: number;
  };
};

// List every tenant the current user can read. Used by the tenant switcher.
export const listClientTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClientTenantSummary[]> => {
    const { data, error } = await context.supabase
      .from("client_profile")
      .select(
        "id, tenant_code, name_ar, name_en, industry_ar, region_ar, ribbon_text_ar, is_simulation, is_default_view",
      )
      .order("is_default_view", { ascending: false })
      .order("name_ar");
    if (error) throw new Error(error.message);
    return (data ?? []) as ClientTenantSummary[];
  });

// Full overview for the active tenant — the SAME queries production would use.
export const getClientTenantOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClientTenantOverview> => {
    const sb = context.supabase;

    // 1) Active tenant (default view). Small table; single row expected.
    const { data: tenant } = await sb
      .from("client_profile")
      .select(
        "id, tenant_code, name_ar, name_en, industry_ar, region_ar, ribbon_text_ar, is_simulation, is_default_view",
      )
      .eq("is_default_view", true)
      .maybeSingle();

    if (!tenant) {
      return {
        tenant: null,
        counts: emptyCounts(),
      };
    }

    // 2) Aggregate counts via head+count — no row payload transferred.
    const nowIso = new Date().toISOString();
    const [
      sitesCount,
      personnelCount,
      incTotal,
      incNew,
      incInProgress,
      incPending,
      incApproved,
      incClosed,
      woTotal,
      woOpen,
      woInProgress,
      woCompleted,
      woVerified,
      woOverdue,
    ] = await Promise.all([
      sb.from("client_sites").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      sb.from("client_personnel").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      sb.from("client_incidents").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      sb.from("client_incidents").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "new"),
      sb.from("client_incidents").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "in_progress"),
      sb.from("client_incidents").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "pending_approval"),
      sb.from("client_incidents").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "approved"),
      sb.from("client_incidents").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "closed"),
      sb.from("client_work_orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      sb.from("client_work_orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "open"),
      sb.from("client_work_orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "in_progress"),
      sb.from("client_work_orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "completed"),
      sb.from("client_work_orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "verified"),
      sb.from("client_work_orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).in("status", ["open", "in_progress", "on_hold"]).lt("due_at", nowIso),
    ]);

    return {
      tenant: tenant as ClientTenantSummary,
      counts: {
        sites: sitesCount.count ?? 0,
        personnel: personnelCount.count ?? 0,
        incidents_total: incTotal.count ?? 0,
        incidents_new: incNew.count ?? 0,
        incidents_in_progress: incInProgress.count ?? 0,
        incidents_pending_approval: incPending.count ?? 0,
        incidents_approved: incApproved.count ?? 0,
        incidents_closed: incClosed.count ?? 0,
        work_orders_total: woTotal.count ?? 0,
        work_orders_open: woOpen.count ?? 0,
        work_orders_in_progress: woInProgress.count ?? 0,
        work_orders_completed: woCompleted.count ?? 0,
        work_orders_verified: woVerified.count ?? 0,
        work_orders_overdue: woOverdue.count ?? 0,
      },
    };
  });

function emptyCounts(): ClientTenantOverview["counts"] {
  return {
    sites: 0, personnel: 0,
    incidents_total: 0, incidents_new: 0, incidents_in_progress: 0,
    incidents_pending_approval: 0, incidents_approved: 0, incidents_closed: 0,
    work_orders_total: 0, work_orders_open: 0, work_orders_in_progress: 0,
    work_orders_completed: 0, work_orders_verified: 0, work_orders_overdue: 0,
  };
}
