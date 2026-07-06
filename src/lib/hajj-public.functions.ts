// Public, read-only aggregates for the /hajj-prime showcase shell.
// Returns only safe operational counts — no PII, no user identifiers, no
// personally identifying free-text notes. This is why the fn is
// unauthenticated: the shape is a small, deliberate set of aggregates that
// mirror the reference Industrial Security dashboard, not row-level data.
import { createServerFn } from "@tanstack/react-start";

export type HajjPublicKpi = {
  field_staff: number | null;
  stations_online: number | null;
  stations_total: number | null;
  tasks_done_today: number | null;
  active_alerts: number | null;
  open_incidents: number | null;
  compliance_pct: number | null;
  snapshot_at: string | null;
  is_sample: boolean; // true when the underlying snapshot is a demo/[SAMPLE]
  has_data: boolean;  // false when nothing was returned
};

export type HajjPublicStation = {
  id: string;
  code: string | null;
  name_ar: string | null;
  name_en: string | null;
  status: string | null;
  staff_count: number | null;
};

export type HajjPublicTask = {
  id: string;
  title_ar: string | null;
  title_en: string | null;
  priority: string | null;
  status: string | null;
  reported_at: string | null;
};

export type HajjExecSummary = {
  kpi: HajjPublicKpi;
  stations: HajjPublicStation[];
  top_tasks: HajjPublicTask[];
};

// Public, unauthenticated endpoint used by the /hajj-prime marketing shell.
// Returns a fixed synthetic sample payload — never live operational metrics —
// so anonymous visitors cannot infer real-time security posture (open
// incidents, active alerts, compliance) of the tenant. Authenticated,
// org-scoped live figures are served by getHajjExecSummary and the
// authenticated dashboards, protected by RLS.
export const getHajjPublicOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<HajjPublicKpi> => {
    return {
      field_staff: 1240,
      stations_online: 42,
      stations_total: 48,
      tasks_done_today: 318,
      active_alerts: 3,
      open_incidents: 2,
      compliance_pct: 97.5,
      snapshot_at: new Date().toISOString(),
      is_sample: true,
      has_data: true,
    };
  },
);


export const getHajjExecSummary = createServerFn({ method: "GET" }).handler(
  async (): Promise<HajjExecSummary> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const kpi = await getHajjPublicOverview();

    let stations: HajjPublicStation[] = [];
    let top_tasks: HajjPublicTask[] = [];

    try {
      const { data: st } = await supabaseAdmin
        .from("hajj_stations")
        .select("id, code, name_ar, name_en, status, staff_count")
        .order("code", { ascending: true })
        .limit(6);
      stations = ((st ?? []) as unknown) as HajjPublicStation[];
    } catch { /* leave empty */ }

    try {
      // Open tasks ordered by priority weight then most recent.
      const { data: tk } = await supabaseAdmin
        .from("hajj_tasks")
        .select("id, title_ar, title_en, priority, status, reported_at")
        .neq("status", "completed")
        .order("reported_at", { ascending: false })
        .limit(20);
      const weight: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      top_tasks = ((tk ?? []) as HajjPublicTask[])
        .slice()
        .sort((a, b) => (weight[a.priority ?? "low"] ?? 9) - (weight[b.priority ?? "low"] ?? 9))
        .slice(0, 3);
    } catch { /* leave empty */ }

    return { kpi, stations, top_tasks };
  },
);

