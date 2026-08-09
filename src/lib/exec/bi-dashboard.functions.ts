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
  const [incRes, woRes, permitRes, compRes] = await Promise.all([
    supabase
      .from("sec_incidents")
      .select("id,severity,reported_at")
      .gte("reported_at", since)
      .limit(2000),
    // أوامر العمل والتصاريح كانت تُكتب صفرًا لكل يوم بلا استعلام أصلًا،
    // فيرسم المخطّط خطًّا مسطّحًا على الصفر ويُقرأ «لا عمل ولا تصاريح»
    // (المادة ٢٧). تُقاس الآن من مصدرها بدل أن تُختلق.
    supabase.from("sec_work_orders").select("id,opened_at").gte("opened_at", since).limit(2000),
    supabase.from("permits").select("id,created_at").gte("created_at", since).limit(2000),
    supabase.from("hcis_compliance_status").select("region_code,status"),
  ]);

  const incidents = (incRes.data ?? []) as Array<{ severity: string; reported_at: string }>;
  const dayOf = (v: unknown) => (typeof v === "string" ? v.slice(0, 10) : null);
  const countByDay = (rows: unknown[], col: string) => {
    const m = new Map<string, number>();
    for (const row of rows) {
      const key = dayOf((row as Record<string, unknown>)[col]);
      if (key) m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  };
  const woByDay = countByDay((woRes.data ?? []) as unknown[], "opened_at");
  const permitsByDay = countByDay((permitRes.data ?? []) as unknown[], "created_at");
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
  const allDays = new Set([...byDay.keys(), ...woByDay.keys(), ...permitsByDay.keys()]);
  const days = [...allDays].sort().map((date) => ({
    date,
    department: "الأمن الصناعي",
    incidents: byDay.get(date) ?? 0,
    work_orders: woByDay.get(date) ?? 0,
    permits: permitsByDay.get(date) ?? 0,
    // المادة ٢٧ — كان يُكتب `sla_met = sla_total = عدد البلاغات`: أي أن كل
    // بلاغٍ وقع داخل مهلته، فيُعرض «أداء SLA ١٠٠٪» أبدًا. ولا مهلة استجابة
    // مسجَّلة على `sec_incidents` أصلًا (لا هدف ولا استحقاق) — فلا عيّنة،
    // ومقامٌ صفري يُقرأ في الصفحة «لم يُقَس» لا «١٠٠٪».
    sla_met: 0,
    sla_total: 0,
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
