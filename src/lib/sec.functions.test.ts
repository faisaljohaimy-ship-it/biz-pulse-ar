import { describe, it, expect } from "vitest";
import { computeExecKpis, fetchExecKpiSources, ExecKpisSchema, type ExecKpiSources } from "./sec.functions";


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
      risk_index: 49, // round(min(100, 1*15 + 2*5 + (100-53)/2)) = round(48.5)
      safety_index: 52, // round(100 - 48.5)
      executive_readiness: 63, // round((53+90+70+50+51.5)/5)

    });
  });

  it("is deterministic — repeated calls return identical results", () => {
    expect(computeExecKpis(sample)).toEqual(computeExecKpis(sample));
  });

  // ============ EDGE CASES ============

  function makeSources(overrides: Partial<ExecKpiSources>): ExecKpiSources {
    return { ...empty, ...overrides };
  }

  function assertInvariants(k: ReturnType<typeof computeExecKpis>) {
    // Range invariants: every percentage / index must be 0..100 and finite
    const pct = [
      k.incidents_resolution_rate,
      k.cctv_health,
      k.access_health,
      k.patrol_completion,
      k.contractors_compliance,
      k.risk_index,
      k.safety_index,
      k.executive_readiness,
    ];
    for (const v of pct) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    // Mirror invariant
    expect(k.risk_index + k.safety_index).toBeGreaterThanOrEqual(99);
    expect(k.risk_index + k.safety_index).toBeLessThanOrEqual(101);
    // Counts must be non-negative integers
    const counts = [
      k.incidents_total, k.incidents_open, k.incidents_critical,
      k.preventive_wo, k.corrective_wo, k.wo_open, k.wo_closed,
      k.projects_in_progress, k.projects_completed,
      k.cameras_total, k.cameras_online, k.gates_total, k.gates_online,
      k.sensors_total, k.sensors_alarming, k.sites_total, k.sites_operational,
      k.patrols_active, k.visitors_inside, k.permits_active, k.contractors_active,
      k.mttr_minutes,
    ];
    for (const c of counts) {
      expect(Number.isInteger(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(0);
    }
  }

  it("clamps risk_index at 100 under extreme critical/sensor load", () => {
    const k = computeExecKpis(makeSources({
      incidents: Array.from({ length: 50 }, () => ({ severity: "critical", status: "open", response_minutes: 5 })),
      sensors: Array.from({ length: 30 }, () => ({ status: "alarm" })),
      cameras: [{ status: "offline", health: 0 }],
    }));
    expect(k.risk_index).toBe(100);
    expect(k.safety_index).toBe(0);
    assertInvariants(k);
  });

  it("returns max readiness (~100) when all subsystems are perfect", () => {
    const k = computeExecKpis(makeSources({
      incidents: [],
      sensors: Array.from({ length: 10 }, () => ({ status: "ok" })),
      cameras: Array.from({ length: 5 }, () => ({ status: "online", health: 100 })),
      gates: Array.from({ length: 3 }, () => ({ status: "online", health: 100 })),
      patrols: [{ status: "active", checkpoints_done: 10, checkpoints_total: 10 }],
      contractors: [{ status: "active", compliance_score: 100 }],
    }));
    expect(k.cctv_health).toBe(100);
    expect(k.access_health).toBe(100);
    expect(k.patrol_completion).toBe(100);
    expect(k.contractors_compliance).toBe(100);
    expect(k.risk_index).toBe(0);
    expect(k.safety_index).toBe(100);
    expect(k.executive_readiness).toBe(100);
    assertInvariants(k);
  });

  it("tolerates missing/null response_minutes without NaN in mttr", () => {
    const k = computeExecKpis(makeSources({
      incidents: [
        { severity: "low", status: "open", response_minutes: null },
        { severity: "low", status: "open", response_minutes: null },
      ],
    }));
    expect(k.mttr_minutes).toBe(0);
    expect(Number.isFinite(k.mttr_minutes)).toBe(true);
    assertInvariants(k);
  });

  it("ignores zero checkpoints_total without producing NaN in patrol_completion", () => {
    const k = computeExecKpis(makeSources({
      patrols: [
        { status: "active", checkpoints_done: 0, checkpoints_total: 0 },
        { status: "active", checkpoints_done: 0, checkpoints_total: 0 },
      ],
    }));
    expect(k.patrol_completion).toBe(0);
    assertInvariants(k);
  });

  it("does not crash on negative / out-of-domain values (defensive)", () => {
    const k = computeExecKpis(makeSources({
      incidents: [{ severity: "critical", status: "open", response_minutes: -5 }],
      cameras: [{ status: "online", health: -10 }, { status: "online", health: 150 }],
      gates: [{ status: "online", health: -50 }],
      contractors: [{ status: "active", compliance_score: -20 }],
      patrols: [{ status: "active", checkpoints_done: 20, checkpoints_total: 10 }], // >100%
    }));
    // values may go out-of-spec but must not be NaN/Infinity; risk/safety/readiness clamped
    expect(Number.isFinite(k.cctv_health)).toBe(true);
    expect(Number.isFinite(k.access_health)).toBe(true);
    expect(Number.isFinite(k.contractors_compliance)).toBe(true);
    expect(k.risk_index).toBeGreaterThanOrEqual(0);
    expect(k.risk_index).toBeLessThanOrEqual(100);
    expect(k.safety_index).toBeGreaterThanOrEqual(0);
    expect(k.safety_index).toBeLessThanOrEqual(100);
  });

  it("handles very large project budgets without precision loss up to Number.MAX_SAFE_INTEGER bounds", () => {
    const big = 1e12;
    const k = computeExecKpis(makeSources({
      projects: [
        { status: "in-progress", progress: 10, budget_sar: big, spent_sar: big / 2, health: "green" },
        { status: "completed", progress: 100, budget_sar: big, spent_sar: big, health: "green" },
      ],
    }));
    expect(k.projects_budget_total).toBe(2 * big);
    expect(k.projects_spent_total).toBe(1.5 * big);
    expect(Number.isSafeInteger(k.projects_budget_total)).toBe(true);
    assertInvariants(k);
  });

  it("weights different incident severities consistently (only critical drives risk)", () => {
    const lowOnly = computeExecKpis(makeSources({
      incidents: Array.from({ length: 20 }, () => ({ severity: "low", status: "open", response_minutes: 1 })),
    }));
    const critOnly = computeExecKpis(makeSources({
      incidents: Array.from({ length: 2 }, () => ({ severity: "critical", status: "open", response_minutes: 1 })),
    }));
    // 20 low-severity open incidents must NOT raise risk above 2 critical ones
    expect(critOnly.risk_index).toBeGreaterThan(lowOnly.risk_index);
    assertInvariants(lowOnly);
    assertInvariants(critOnly);
  });

  it("counts cancelled work orders as neither open nor closed", () => {
    const k = computeExecKpis(makeSources({
      workOrders: [
        { kind: "preventive", status: "cancelled" },
        { kind: "corrective", status: "closed" },
        { kind: "corrective", status: "open" },
      ],
    }));
    expect(k.wo_open).toBe(1);
    expect(k.wo_closed).toBe(1);
    assertInvariants(k);
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

describe("ExecKpisSchema (API contract)", () => {
  const validCases: Record<string, ExecKpiSources> = {
    empty,
    sample,
    perfect: {
      ...empty,
      cameras: [{ status: "online", health: 100 }],
      gates: [{ status: "online", health: 100 }],
      patrols: [{ status: "active", checkpoints_done: 10, checkpoints_total: 10 }],
      contractors: [{ status: "active", compliance_score: 100 }],
    },
    maxLoad: {
      ...empty,
      incidents: Array.from({ length: 50 }, () => ({ severity: "critical", status: "open", response_minutes: 5 })),
      sensors: Array.from({ length: 30 }, () => ({ status: "alarm" })),
      cameras: [{ status: "offline", health: 0 }],
    },
  };

  for (const [name, src] of Object.entries(validCases)) {
    it(`passes strict schema for "${name}" sources`, () => {
      const k = computeExecKpis(src);
      const parsed = ExecKpisSchema.parse(k);
      expect(parsed).toEqual(k);
    });
  }

  it("rejects null / undefined fields in any KPI", () => {
    const k = computeExecKpis(sample) as Record<string, unknown>;
    for (const key of Object.keys(k)) {
      const broken = { ...k, [key]: null };
      expect(() => ExecKpisSchema.parse(broken)).toThrow();
      const broken2 = { ...k };
      delete broken2[key];
      expect(() => ExecKpisSchema.parse(broken2)).toThrow();
    }
  });

  it("rejects NaN, Infinity, negatives, and non-integers", () => {
    const base = computeExecKpis(sample);
    const variants = [
      { ...base, incidents_total: Number.NaN },
      { ...base, mttr_minutes: Number.POSITIVE_INFINITY },
      { ...base, cameras_online: -1 },
      { ...base, cctv_health: 50.5 },
      { ...base, risk_index: 101 },
      { ...base, executive_readiness: 150 },
      { ...base, safety_index: -0.0001 },
    ];
    for (const v of variants) {
      expect(() => ExecKpisSchema.parse(v)).toThrow();
    }
  });

  it("rejects unknown / extra fields (strict)", () => {
    const k = computeExecKpis(sample);
    expect(() => ExecKpisSchema.parse({ ...k, unknown_field: 1 })).toThrow();
  });

  it("rejects unsafe-integer money totals", () => {
    const k = computeExecKpis(sample);
    expect(() => ExecKpisSchema.parse({ ...k, projects_budget_total: Number.MAX_SAFE_INTEGER + 2 })).toThrow();
  });

  it("schema-validated output matches the same keys as compute output", () => {
    const k = computeExecKpis(sample);
    const parsed = ExecKpisSchema.parse(k);
    expect(Object.keys(parsed).sort()).toEqual(Object.keys(k).sort());
  });
});
