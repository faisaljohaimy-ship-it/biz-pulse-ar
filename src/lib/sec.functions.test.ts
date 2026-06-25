import { describe, it, expect } from "vitest";
import { computeExecKpis, fetchExecKpiSources, type ExecKpiSources } from "./sec.functions";

const empty: ExecKpiSources = {
  incidents: [],
  patrols: [],
  visitors: [],
  permits: [],
  contractors: [],
  sites: [],
  cameras: [],
  gates: [],
  sensors: [],
  workOrders: [],
  projects: [],
};

const sample: ExecKpiSources = {
  incidents: [
    { severity: "critical", status: "open", response_minutes: 10 },
    { severity: "critical", status: "closed", response_minutes: 30 },
    { severity: "high", status: "resolved", response_minutes: 20 },
    { severity: "low", status: "open", response_minutes: null },
  ],
  patrols: [
    { status: "active", checkpoints_done: 5, checkpoints_total: 10 },
    { status: "active", checkpoints_done: 10, checkpoints_total: 10 },
    { status: "completed", checkpoints_done: 0, checkpoints_total: 0 },
  ],
  visitors: [
    { status: "inside" },
    { status: "overdue" },
    { status: "checked_out" },
  ],
  permits: [
    { status: "active" },
    { status: "approved" },
    { status: "expired" },
  ],
  contractors: [
    { status: "active", compliance_score: 80 },
    { status: "active", compliance_score: 90 },
    { status: "suspended", compliance_score: 40 },
  ],
  sites: [
    { status: "operational" },
    { status: "operational" },
    { status: "maintenance" },
  ],
  cameras: [
    { status: "online", health: 90 },
    { status: "online", health: 70 },
    { status: "offline", health: 0 },
  ],
  gates: [
    { status: "online", health: 100 },
    { status: "online", health: 80 },
  ],
  sensors: [
    { status: "ok" },
    { status: "alarm" },
    { status: "offline" },
  ],
  workOrders: [
    { kind: "preventive", status: "open" },
    { kind: "preventive", status: "closed" },
    { kind: "corrective", status: "in_progress" },
    { kind: "corrective", status: "cancelled" },
  ],
  projects: [
    { status: "in-progress", progress: 50, budget_sar: 1_000_000, spent_sar: 400_000, health: "green" },
    { status: "completed", progress: 100, budget_sar: 500_000, spent_sar: 480_000, health: "green" },
  ],
};

describe("computeExecKpis", () => {
  it("returns zeroed, deterministic shape for empty sources", () => {
    const k = computeExecKpis(empty);
    // resolution rate uses (closed / (total || 1)) → 0 when nothing exists
    expect(k.incidents_total).toBe(0);
    expect(k.incidents_resolution_rate).toBe(0);
    expect(k.cctv_health).toBe(0);
    expect(k.access_health).toBe(0);
    expect(k.patrol_completion).toBe(0);
    expect(k.contractors_compliance).toBe(0);
    expect(k.risk_index).toBe(50); // (100 - 0) / 2
    expect(k.safety_index).toBe(50);
    expect(k.executive_readiness).toBe(10); // round((0+0+0+0+50)/5)
  });

  it("computes exact KPI values from sample sources (snapshot of the contract)", () => {
    const k = computeExecKpis(sample);
    expect(k).toEqual({
      incidents_total: 4,
      incidents_open: 2, // statuses not resolved/closed
      incidents_critical: 1, // critical && not closed
      incidents_resolution_rate: 50, // 2 closed/resolved of 4
      mttr_minutes: 20, // avg of 10, 30, 20
      preventive_wo: 2,
      corrective_wo: 2,
      wo_open: 2, // open + in_progress
      wo_closed: 1,
      projects_in_progress: 1,
      projects_completed: 1,
      projects_budget_total: 1_500_000,
      projects_spent_total: 880_000,
      cameras_total: 3,
      cameras_online: 2,
      cctv_health: 53, // round((90+70+0)/3)
      gates_total: 2,
      gates_online: 2,
      access_health: 90,
      sensors_total: 3,
      sensors_alarming: 2,
      sites_operational: 2,
      sites_total: 3,
      patrols_active: 2,
      patrol_completion: 50, // ((0.5 + 1.0 + 0)/3)*100
      visitors_inside: 2,
      permits_active: 2,
      contractors_active: 2,
      contractors_compliance: 70, // round((80+90+40)/3)
      risk_index: 49, // min(100, 1*15 + 2*5 + (100-53)/2) = 15+10+23.5 = 48.5 → 49
      safety_index: 51,
      executive_readiness: 63, // round((53+90+70+50+51)/5) = round(62.8)
    });
  });

  it("is deterministic — repeated calls return identical results", () => {
    expect(computeExecKpis(sample)).toEqual(computeExecKpis(sample));
  });
});

describe("fetchExecKpiSources", () => {
  it("queries the 11 sec_* tables with the documented column projections (RLS-safe)", async () => {
    const calls: { table: string; cols: string }[] = [];
    const fixtures: Record<string, unknown[]> = {
      sec_incidents: sample.incidents,
      sec_patrols: sample.patrols,
      sec_visitors: sample.visitors,
      sec_permits: sample.permits,
      sec_contractors: sample.contractors,
      sec_sites: sample.sites,
      sec_cameras: sample.cameras,
      sec_gates: sample.gates,
      sec_sensors: sample.sensors,
      sec_work_orders: sample.workOrders,
      sec_projects: sample.projects,
    };
    const supabase = {
      from(table: string) {
        return {
          async select(cols: string) {
            calls.push({ table, cols });
            return { data: fixtures[table] ?? [] };
          },
        };
      },
    };

    const sources = await fetchExecKpiSources(supabase);
    expect(calls).toEqual(
      expect.arrayContaining([
        { table: "sec_incidents", cols: "severity,status,response_minutes" },
        { table: "sec_patrols", cols: "status,checkpoints_done,checkpoints_total" },
        { table: "sec_visitors", cols: "status" },
        { table: "sec_permits", cols: "status" },
        { table: "sec_contractors", cols: "status,compliance_score" },
        { table: "sec_sites", cols: "status" },
        { table: "sec_cameras", cols: "status,health" },
        { table: "sec_gates", cols: "status,health" },
        { table: "sec_sensors", cols: "status" },
        { table: "sec_work_orders", cols: "kind,status" },
        { table: "sec_projects", cols: "status,progress,budget_sar,spent_sar,health" },
      ]),
    );
    expect(calls).toHaveLength(11);
    // pipeline produces the same KPIs as the pure compute on the same fixtures
    expect(computeExecKpis(sources)).toEqual(computeExecKpis(sample));
  });

  it("treats RLS-filtered (empty) results as zero rows without throwing", async () => {
    const supabase = {
      from() {
        return { async select() { return { data: null }; } };
      },
    };
    const sources = await fetchExecKpiSources(supabase);
    expect(sources).toEqual(empty);
    expect(computeExecKpis(sources)).toEqual(computeExecKpis(empty));
  });
});
