/**
 * Smart command center — ONE resilient state source for every zone
 * (counters, agents council, approval line, urgent/SLA, region pulse).
 * Live rows win; the reference simulation serves silence («بيانات لا
 * تفرغ»). Counters are DERIVED from the same arrays the zones render —
 * a header can never contradict its board (the governance lesson).
 */
import { createServerFn } from "@tanstack/react-start";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import { REGIONS } from "@/lib/regions";
import type { CommandCenterState, CommandSeverity } from "@/lib/exec/showcase-simulation.server";

export type { CommandCenterState, CommandSeverity };

async function fetchCommandCenterLive(supabase: {
  from: (t: string) => any;
}): Promise<CommandCenterState> {
  const [agentsRes, evRes, aiRes, urgentRes, supportRes, sitesRes, incidentsRes, complianceRes] =
    await Promise.all([
      supabase
        .from("intelligence_agents")
        .select("id,name_ar,role,focus_area,status")
        .order("name_ar")
        .limit(12),
      supabase
        .from("evolution_proposals")
        .select("id,title_ar,priority,status,created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("aria_improvement_proposals")
        .select("id,area,proposal_ar,impact,status,created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("urgent_tasks")
        .select("id,title_ar,department,priority,status,due_at,sla_hours,is_simulation")
        .neq("status", "مغلق")
        .order("due_at", { ascending: true })
        .limit(12),
      supabase
        .from("support_requests")
        .select("id,status,is_simulation")
        .neq("status", "مغلق")
        .limit(50),
      supabase.from("sec_sites").select("id,circle_id,status"),
      supabase.from("sec_incidents").select("id,status,severity").neq("status", "resolved"),
      supabase.from("hcis_compliance_status").select("region_code,status"),
    ]);

  const sevOfImpact = (v: string | null): CommandSeverity =>
    v === "حرج" || v === "critical" || v === "immediate"
      ? "critical"
      : v === "عالٍ" || v === "high" || v === "urgent"
        ? "high"
        : "medium";

  const agents = (
    (agentsRes.data ?? []) as Array<{
      id: string;
      name_ar: string;
      role: string | null;
      focus_area: string | null;
      status: string;
    }>
  ).map((a) => ({
    id: a.id,
    name_ar: a.name_ar,
    role: a.role ?? a.focus_area ?? "وكيل تنفيذي",
    status: (a.status === "active"
      ? "active"
      : a.status === "processing"
        ? "processing"
        : "idle") as "active" | "processing" | "idle",
    task_ar: a.focus_area,
    done_today: 0,
    severity: (a.status === "active" ? "healthy" : "idle") as CommandSeverity,
  }));

  const pipeline = [
    ...(
      (evRes.data ?? []) as Array<{
        id: string;
        title_ar: string;
        priority: string | null;
        status: string;
        created_at: string;
      }>
    ).map((p) => ({
      id: p.id,
      title_ar: p.title_ar,
      stage: (p.status === "approved" || p.status === "معتمد"
        ? "approved"
        : p.status === "prepared"
          ? "prepared"
          : "proposed") as "proposed" | "prepared" | "approved",
      severity: sevOfImpact(p.priority),
      agent_ar: "محرك التطور",
      created_at: p.created_at,
    })),
    ...(
      (aiRes.data ?? []) as Array<{
        id: string;
        area: string;
        proposal_ar: string;
        impact: string;
        status: string;
        created_at: string;
      }>
    ).map((p) => ({
      id: p.id,
      title_ar: p.proposal_ar,
      stage: (p.status === "معتمد" ? "approved" : "proposed") as
        | "proposed"
        | "prepared"
        | "approved",
      severity: sevOfImpact(p.impact),
      agent_ar: `آريا — ${p.area}`,
      created_at: p.created_at,
    })),
  ].slice(0, 12);

  const urgentRows = (urgentRes.data ?? []) as Array<{
    id: string;
    title_ar: string;
    department: string | null;
    status: string;
    due_at: string | null;
    sla_hours: number | null;
    is_simulation: boolean | null;
  }>;
  const urgent = urgentRows
    .filter((u) => u.due_at)
    .map((u) => ({
      id: u.id,
      title_ar: u.title_ar,
      department: u.department ?? "—",
      due_at: u.due_at!,
      sla_hours: u.sla_hours ?? 24,
      status: u.status,
    }));

  // Region pulse derived from live boards (best-effort mapping).
  const complianceRows = (complianceRes.data ?? []) as Array<{
    region_code: string;
    status: string;
  }>;
  // Constitution art. 4: regions.ts is the ONLY geographic source.
  const regionIds = REGIONS.map((r) => r.id);
  const openIncidents = ((incidentsRes.data ?? []) as Array<{ severity: string }>).length;
  const regions = regionIds.map((region_id, i) => {
    const rows = complianceRows.filter((r) => r.region_code === region_id);
    const assessed = rows.filter((r) => r.status !== "not_assessed");
    const pct = assessed.length
      ? Math.round(
          (assessed.filter((r) => r.status === "compliant" || r.status === "in_progress").length /
            assessed.length) *
            100,
        )
      : 0;
    const inc = i === 0 ? openIncidents : 0;
    return {
      region_id,
      assets_active: ((sitesRes.data ?? []) as unknown[]).length * 8,
      incidents_open: inc,
      compliance_pct: pct,
      severity: (inc > 3 ? "critical" : inc > 0 ? "medium" : "healthy") as CommandSeverity,
      last_pulse_at: new Date().toISOString(),
    };
  });

  const supportRows = (supportRes.data ?? []) as Array<{ is_simulation?: boolean | null }>;
  return {
    source: "database",
    // The badge tracks the ROWS, not the transport: seeded showcase rows
    // arrive via the database yet remain simulation (const. art. 6).
    simulation:
      urgentRows.some((u) => u.is_simulation === true) ||
      supportRows.some((s) => s.is_simulation === true),
    agents,
    pipeline,
    urgent,
    regions,
    counters: {
      agents_active: agents.filter((a) => a.status !== "idle").length,
      proposals_pending: pipeline.filter((p) => p.stage !== "approved").length,
      urgent_open: urgent.length,
      support_processing: ((supportRes.data ?? []) as unknown[]).length,
      done_today: agents.reduce((s, a) => s + a.done_today, 0),
      compliance_avg: regions.length
        ? Math.round(regions.reduce((s, r) => s + r.compliance_pct, 0) / regions.length)
        : 0,
    },
  };
}

export const getCommandCenterState = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<CommandCenterState> => {
    const { buildCommandCenterSimulation, resilient } =
      await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "command-center",
      () => fetchCommandCenterLive(context.supabase as { from: (t: string) => any }),
      (s) => s.agents.length === 0 && s.pipeline.length === 0 && s.urgent.length === 0,
      () => buildCommandCenterSimulation(Date.now()),
    );
  });
