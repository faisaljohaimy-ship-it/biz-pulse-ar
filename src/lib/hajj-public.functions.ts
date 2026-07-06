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

export const getHajjPublicOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<HajjPublicKpi> => {
    // supabaseAdmin is server-only; load inside handler so it never ships to
    // the client bundle from this .functions.ts module.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const empty: HajjPublicKpi = {
      field_staff: null,
      stations_online: null,
      stations_total: null,
      tasks_done_today: null,
      active_alerts: null,
      open_incidents: null,
      compliance_pct: null,
      snapshot_at: null,
      is_sample: false,
      has_data: false,
    };

    try {
      // Latest KPI snapshot — safe aggregate columns only.
      const { data: kpi } = await supabaseAdmin
        .from("hajj_kpi_snapshots")
        .select(
          "field_staff, stations_online, stations_total, tasks_done, active_alerts, open_incidents, compliance_pct, snapshot_at, notes",
        )
        .order("snapshot_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!kpi) return empty;

      const notes = (kpi.notes ?? "") as string;
      const isSample = notes.includes("[SAMPLE]");

      return {
        field_staff: kpi.field_staff ?? null,
        stations_online: kpi.stations_online ?? null,
        stations_total: kpi.stations_total ?? null,
        tasks_done_today: kpi.tasks_done ?? null,
        active_alerts: kpi.active_alerts ?? null,
        open_incidents: kpi.open_incidents ?? null,
        compliance_pct:
          kpi.compliance_pct != null ? Number(kpi.compliance_pct) : null,
        snapshot_at: kpi.snapshot_at ?? null,
        is_sample: isSample,
        has_data: true,
      };
    } catch {
      return empty;
    }
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
      stations = (st ?? []) as HajjPublicStation[];
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

