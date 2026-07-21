/**
 * BI executive dashboard — ONE resilient state source for /bi.
 * Live rows win (sec_incidents / hcis_compliance_status mapped into the
 * same shape); the reference simulation serves silence («بيانات لا
 * تفرغ»). All page aggregates derive client-side from `days`.
 */
import { createServerFn } from "@tanstack/react-start";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import type { BiDashboardData } from "@/lib/exec/showcase-simulation.server";

export type { BiDashboardData };

async function fetchBiLive(supabase: { from: (t: string) => any }): Promise<BiDashboardData> {
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const [incRes, compRes] = await Promise.all([
    supabase
      .from("sec_incidents")
      .select("id,severity,reported_at")
      .gte("reported_at", since)
      .limit(2000),
    supabase.from("hcis_compliance_status").select("region_code,status"),
  ]);

  const incidents = (incRes.data ?? []) as Array<{ severity: string; reported_at: string }>;
  const byDay = new Map<string, number>();
  const heat: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  const sev: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const i of incidents) {
    const d = new Date(i.reported_at);
    const key = i.reported_at.slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
    heat[d.getUTCDay()]![d.getUTCHours()] += 1;
    if (sev[i.severity] !== undefined) sev[i.severity] += 1;
  }
  const heatMax = Math.max(1, ...heat.flat());
  const days = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      department: "الأمن الصناعي",
      incidents: count,
      work_orders: 0,
      permits: 0,
      sla_met: count,
      sla_total: count,
    }));

  const compRows = (compRes.data ?? []) as Array<{ region_code: string; status: string }>;
  const regionLabels: Record<string, string> = {
    central: "الوسطى",
    western: "الغربية",
    eastern: "الشرقية",
    southern: "الجنوبية",
  };
  const compliance = Object.entries(regionLabels).map(([region_id, label_ar]) => {
    const rows = compRows.filter((r) => r.region_code === region_id && r.status !== "not_assessed");
    const ok = rows.filter((r) => r.status === "compliant" || r.status === "in_progress").length;
    return { region_id, label_ar, pct: rows.length ? Math.round((ok / rows.length) * 100) : 0 };
  });

  return {
    source: "database",
    simulation: false,
    departments: ["الأمن الصناعي"],
    days,
    severity_mix: (["critical", "high", "medium", "low"] as const).map((severity) => ({
      severity,
      count: sev[severity] ?? 0,
    })),
    compliance,
    heatmap: heat.map((row) => row.map((v) => v / heatMax)),
  };
}

export const getBiDashboard = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<BiDashboardData> => {
    const { buildBiDashboardSimulation, resilient } =
      await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "bi-dashboard",
      () => fetchBiLive(context.supabase as { from: (t: string) => any }),
      (d) => d.days.length === 0,
      () => buildBiDashboardSimulation(Date.now()),
    );
  });
