import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Operational live adapter — READ-ONLY.
 *
 * Reads operational counters straight from the security tables so executive
 * surfaces prefer real, tenant-scoped observations over demo fixtures:
 *
 *   - openIncidents  ← count(sec_incidents WHERE resolved_at IS NULL)
 *   - activeAlerts   ← count(sec_cctv_alerts WHERE acknowledged_by IS NULL)
 *
 * Scoping is automatic: the authenticated Supabase client is bound by RLS to
 * the caller's organisation, so no org filter is needed here. Head + exact
 * count means no row payload crosses the wire.
 *
 * Graceful by design: any error, or an unauthenticated visitor whom RLS
 * denies, yields `null` for that counter and the deck falls back to the
 * simulation value (kept tagged «محاكاة»). The live path can therefore only
 * improve the display, never break it.
 */
export type OperationalLive = {
  /** Open incidents, or null when live data is unavailable (use sim). */
  openIncidents: number | null;
  /** Unacknowledged CCTV alerts, or null when unavailable (use sim). */
  activeAlerts: number | null;
  /** Operational/total sites from sec_sites, or null when unavailable. */
  operationalSites: number | null;
  totalSites: number | null;
  /** Sum of assigned site guards; a real operational headcount, not an estimate. */
  fieldStaff: number | null;
  /** Tasks moved to done since local midnight (UTC storage comparison). */
  completedTasks: number | null;
  activePatrols: number | null;
  activeContractors: number | null;
  offlineAssets: number | null;
  totalAssets: number | null;
  /** Last successful observation timestamp. */
  observedAt: string | null;
};

async function headCount(
  table: "sec_incidents" | "sec_cctv_alerts",
  nullColumn: "resolved_at" | "acknowledged_by",
): Promise<number | null> {
  try {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .is(nullColumn, null);
    if (error || count == null) return null;
    return count;
  } catch {
    return null;
  }
}

export function useOperationalLive(): OperationalLive {
  const [live, setLive] = useState<OperationalLive>({
    openIncidents: null,
    activeAlerts: null,
    operationalSites: null,
    totalSites: null,
    fieldStaff: null,
    completedTasks: null,
    activePatrols: null,
    activeContractors: null,
    offlineAssets: null,
    totalAssets: null,
    observedAt: null,
  });

  useEffect(() => {
    let active = true;
    const observe = async () => {
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const [
        openIncidents,
        activeAlerts,
        sitesResult,
        tasksResult,
        patrolsResult,
        contractorsResult,
        offlineAssetsResult,
        totalAssetsResult,
      ] = await Promise.all([
        headCount("sec_incidents", "resolved_at"),
        headCount("sec_cctv_alerts", "acknowledged_by"),
        supabase.from("sec_sites").select("status,guards_count"),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "done")
          .gte("updated_at", dayStart.toISOString()),
        supabase
          .from("sec_patrols")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("sec_contractors")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("sec_assets")
          .select("id", { count: "exact", head: true })
          .in("status", ["offline", "degraded"]),
        supabase.from("sec_assets").select("id", { count: "exact", head: true }),
      ]);
      const sites = sitesResult.error ? null : sitesResult.data;
      const totalSites = sites?.length ?? null;
      const operationalSites = sites
        ? sites.filter((site) => !["offline", "closed", "decommissioned"].includes(site.status))
            .length
        : null;
      const fieldStaff = sites
        ? sites.reduce((total, site) => total + Math.max(0, site.guards_count ?? 0), 0)
        : null;
      const completedTasks = tasksResult.error ? null : (tasksResult.count ?? 0);
      const activePatrols = patrolsResult.error ? null : (patrolsResult.count ?? 0);
      const activeContractors = contractorsResult.error ? null : (contractorsResult.count ?? 0);
      const offlineAssets = offlineAssetsResult.error ? null : (offlineAssetsResult.count ?? 0);
      const totalAssets = totalAssetsResult.error ? null : (totalAssetsResult.count ?? 0);
      if (active) {
        const hasObservation = [
          openIncidents,
          activeAlerts,
          operationalSites,
          totalSites,
          fieldStaff,
          completedTasks,
          activePatrols,
          activeContractors,
          offlineAssets,
          totalAssets,
        ].some((value) => value != null);
        setLive({
          openIncidents,
          activeAlerts,
          operationalSites,
          totalSites,
          fieldStaff,
          completedTasks,
          activePatrols,
          activeContractors,
          offlineAssets,
          totalAssets,
          observedAt: hasObservation ? new Date().toISOString() : null,
        });
      }
    };
    void observe();
    const interval = window.setInterval(() => void observe(), 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return live;
}
