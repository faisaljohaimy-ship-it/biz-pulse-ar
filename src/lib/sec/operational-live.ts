import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Operational live adapter — READ-ONLY.
 *
 * Reads two operational counters straight from the security tables so the
 * Sovereign Command Deck can show real numbers instead of the simulation
 * snapshot, without touching the database schema, RLS, or writing anything:
 *
 *   - openIncidents  ← count(sec_incidents WHERE resolved_at IS NULL)
 *   - activeAlerts   ← count(sec_cctv_alerts WHERE acknowledged_by IS NULL)
 *
 * Only these two are wired live because their "open/active" semantics are
 * expressed by nullable columns (resolved_at / acknowledged_by), so the
 * query is correct regardless of the free-text `status` values. The other
 * deck KPIs (compliance %, stations, field staff, completed tasks) have no
 * single authoritative table and stay on the tagged simulation snapshot.
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
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      const [openIncidents, activeAlerts] = await Promise.all([
        headCount("sec_incidents", "resolved_at"),
        headCount("sec_cctv_alerts", "acknowledged_by"),
      ]);
      if (active) setLive({ openIncidents, activeAlerts });
    })();
    return () => {
      active = false;
    };
  }, []);

  return live;
}
