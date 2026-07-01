// Server-only: builds an Executive Snapshot from live sec_* tables.
// Used by both the PDF and Excel generators to guarantee parity.

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeExecKpis, fetchExecKpiSources, type ExecKpis } from "@/lib/sec.functions";

export type SnapshotRange = "24h" | "7d" | "30d";

export type IncidentRow = {
  id: string;
  ref: string | null;
  title: string | null;
  severity: string | null;
  status: string | null;
  site: string | null;
  reported_at: string | null;
  response_minutes: number | null;
};

export type WorkOrderRow = {
  id: string;
  ref: string | null;
  title: string | null;
  kind: string | null;
  status: string | null;
  priority: string | null;
  due_at: string | null;
};

export type PermitRow = {
  id: string;
  ref: string | null;
  type: string | null;
  status: string | null;
  contractor: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

export type PatrolRow = {
  id: string;
  ref: string | null;
  status: string | null;
  team: string | null;
  started_at: string | null;
  checkpoints_done: number | null;
  checkpoints_total: number | null;
};

export type ExecutiveSnapshot = {
  generatedAt: string;
  range: SnapshotRange;
  rangeFromIso: string;
  kpis: ExecKpis;
  incidents: IncidentRow[];
  workOrders: WorkOrderRow[];
  permits: PermitRow[];
  patrols: PatrolRow[];
  totals: {
    incidents: number;
    workOrders: number;
    permits: number;
    patrols: number;
  };
};

function rangeStart(range: SnapshotRange): Date {
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : 24 * 30;
  return new Date(Date.now() - hours * 3600_000);
}

const ROW_LIMIT = 200;

export async function buildExecutiveSnapshot(
  supabase: SupabaseClient,
  opts: { range: SnapshotRange; orgId?: string | null },
): Promise<ExecutiveSnapshot> {
  const from = rangeStart(opts.range).toISOString();
  const orgId = opts.orgId ?? null;

  // KPIs use the existing tested aggregator. When `orgId` is provided the
  // aggregator scopes each source query by org — required whenever the caller
  // passes the service-role client (which bypasses RLS).
  const sources = await fetchExecKpiSources(
    supabase as unknown as Parameters<typeof fetchExecKpiSources>[0],
    orgId,
  );
  const kpis = computeExecKpis(sources);

  const incQ = supabase
    .from("sec_incidents")
    .select("id,ref,title,severity,status,site,reported_at,response_minutes")
    .gte("reported_at", from)
    .order("reported_at", { ascending: false })
    .limit(ROW_LIMIT);
  const woQ = supabase
    .from("sec_work_orders")
    .select("id,ref,title,kind,status,priority,due_at,created_at")
    .gte("created_at", from)
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);
  const pmQ = supabase
    .from("sec_permits")
    .select("id,ref,type,status,contractor,starts_at,ends_at,created_at")
    .gte("created_at", from)
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);
  const patQ = supabase
    .from("sec_patrols")
    .select("id,ref,status,team,started_at,checkpoints_done,checkpoints_total")
    .gte("started_at", from)
    .order("started_at", { ascending: false })
    .limit(ROW_LIMIT);

  const [inc, wo, pm, pat] = await Promise.all([
    orgId ? incQ.eq("org_id", orgId) : incQ,
    orgId ? woQ.eq("org_id", orgId) : woQ,
    orgId ? pmQ.eq("org_id", orgId) : pmQ,
    orgId ? patQ.eq("org_id", orgId) : patQ,
  ]);

  return {
    generatedAt: new Date().toISOString(),
    range: opts.range,
    rangeFromIso: from,
    kpis,
    incidents: (inc.data ?? []) as IncidentRow[],
    workOrders: (wo.data ?? []) as WorkOrderRow[],
    permits: (pm.data ?? []) as PermitRow[],
    patrols: (pat.data ?? []) as PatrolRow[],
    totals: {
      incidents: inc.data?.length ?? 0,
      workOrders: wo.data?.length ?? 0,
      permits: pm.data?.length ?? 0,
      patrols: pat.data?.length ?? 0,
    },
  };
}
