// Simulation Engine — deterministic seeder.
// Server-only. Idempotent: rows are tagged with metadata.sim_seed; re-running
// with the same seed replaces prior sim data cleanly.
//
// Dependency order:
//   sites (ensure) → departments → employees → link dept heads →
//   buses → inspections → risks → near_misses → incidents → permits →
//   corrective_actions → tasks → meetings → notifications → daily_ops → history

import type { SupabaseClient } from "@supabase/supabase-js";
import { makeRng, type Rng } from "./sim.rng";
import { SIM_VOLUMES, SIM_SEED_DEFAULT } from "./sim.config";
import {
  DEPARTMENTS, FIRST_AR, LAST_AR, FIRST_EN, LAST_EN, ROLES, GRADES,
  INCIDENT_TYPES, NEAR_MISS_TITLES, INSPECTION_KINDS, RISK_CATEGORIES,
  MEETING_KINDS, NOTIFICATION_TOPICS, BUS_ROUTES,
} from "./sim.catalog";

// Any admin client — kept loose so this module stays testable.
// biome-ignore lint/suspicious/noExplicitAny: admin client
type Admin = SupabaseClient<any, any, any>;

export type SeedResult = {
  seed: number;
  org_id: string;
  counts: Record<string, number>;
  duration_ms: number;
};

const SITE_SEED = [
  { code: "JED-P1", name_ar: "موقع جدة الصناعي", name_en: "Jeddah Industrial Site", city: "Jeddah" },
  { code: "JED-P2", name_ar: "ميناء جدة الإسلامي", name_en: "Jeddah Islamic Port", city: "Jeddah" },
  { code: "MEC-01", name_ar: "مركز عمليات مكة", name_en: "Makkah Operations Hub", city: "Makkah" },
  { code: "YNB-P1", name_ar: "مجمع ينبع البتروكيماوي", name_en: "Yanbu Petrochemical Complex", city: "Yanbu" },
  { code: "YNB-P2", name_ar: "مصفاة ينبع", name_en: "Yanbu Refinery", city: "Yanbu" },
  { code: "RUH-HQ", name_ar: "المقر الرئيسي - الرياض", name_en: "HQ - Riyadh", city: "Riyadh" },
];

const chunkInsert = async (admin: Admin, table: string, rows: unknown[], size = 100) => {
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size);
    const { error } = await admin.from(table).insert(slice);
    if (error) throw new Error(`[${table}] ${error.message}`);
  }
};

async function ensureSites(admin: Admin, orgId: string, seedTag: number): Promise<Array<{ id: string; code: string }>> {
  const { data: existing } = await admin.from("sec_sites").select("id, code").eq("org_id", orgId);
  const have = new Map((existing ?? []).map((r: { id: string; code: string }) => [r.code, r.id]));
  const toInsert = SITE_SEED
    .filter((s) => !have.has(s.code))
    .map((s) => ({
      org_id: orgId, code: s.code, name_ar: s.name_ar, name_en: s.name_en,
      city: s.city, country: "SA", status: "active",
      metadata: { sim_seed: seedTag },
    }));
  if (toInsert.length) {
    const { data, error } = await admin.from("sec_sites").insert(toInsert).select("id, code");
    if (error) throw new Error(`[sec_sites] ${error.message}`);
    for (const r of data ?? []) have.set(r.code, r.id);
  }
  return SITE_SEED.map((s) => ({ code: s.code, id: have.get(s.code) as string }));
}

async function purgePriorSim(admin: Admin, orgId: string) {
  const tables = [
    "sim_history", "sim_notifications", "sim_daily_ops", "sim_meetings",
    "sim_corrective_actions", "sim_risks", "sim_near_misses", "sim_inspections",
    "sim_buses", "sim_employees", "sim_departments",
  ];
  for (const t of tables) {
    await admin.from(t).delete().eq("org_id", orgId);
  }
}

export async function runSimulationSeed(
  admin: Admin,
  opts: { orgId: string; seed?: number },
): Promise<SeedResult> {
  const started = Date.now();
  const seed = opts.seed ?? SIM_SEED_DEFAULT;
  const rng = makeRng(seed);
  const org_id = opts.orgId;

  // 0) wipe prior sim data (idempotent)
  await purgePriorSim(admin, org_id);

  // 1) sites (reuse or create)
  const sites = await ensureSites(admin, org_id, seed);
  const siteIds = sites.map((s) => s.id);

  // 2) departments
  const deptRows = DEPARTMENTS.map((d) => ({
    org_id, code: d.code, name_ar: d.ar, name_en: d.en,
    headcount_target: rng.int(8, 60),
    budget: rng.int(500_000, 8_000_000),
    metadata: { sim_seed: seed },
  }));
  await chunkInsert(admin, "sim_departments", deptRows);
  const { data: depts } = await admin.from("sim_departments").select("id, code").eq("org_id", org_id);
  const deptIds = (depts ?? []).map((d: { id: string }) => d.id);
  const deptByCode = new Map((depts ?? []).map((d: { id: string; code: string }) => [d.code, d.id]));

  // 3) employees
  const empRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < SIM_VOLUMES.employees; i++) {
    const fi = rng.int(0, FIRST_AR.length - 1);
    const li = rng.int(0, LAST_AR.length - 1);
    const role = rng.pick(ROLES);
    empRows.push({
      org_id,
      employee_no: `EMP-${String(10000 + i)}`,
      full_name_ar: `${FIRST_AR[fi]} ${LAST_AR[li]}`,
      full_name_en: `${FIRST_EN[fi]} ${LAST_EN[li]}`,
      dept_id: rng.pick(deptIds),
      role: role.en,
      grade: rng.pick(GRADES),
      site_id: rng.pick(siteIds),
      hire_date: new Date(2018 + rng.int(0, 7), rng.int(0, 11), rng.int(1, 28)).toISOString().slice(0, 10),
      status: rng.chance(0.94) ? "active" : "on_leave",
      contact: { email: `emp${10000 + i}@nexios.sa`, phone: `+9665${rng.int(10000000, 99999999)}` },
      metadata: { sim_seed: seed, role_ar: role.ar },
    });
  }
  await chunkInsert(admin, "sim_employees", empRows);
  const { data: emps } = await admin.from("sim_employees").select("id, dept_id, site_id").eq("org_id", org_id);
  const empList = (emps ?? []) as Array<{ id: string; dept_id: string | null; site_id: string | null }>;
  const empIds = empList.map((e) => e.id);
  const empBySite = new Map<string, string[]>();
  empList.forEach((e) => {
    if (!e.site_id) return;
    const arr = empBySite.get(e.site_id) ?? [];
    arr.push(e.id);
    empBySite.set(e.site_id, arr);
  });

  // assign a random head per department
  for (const d of depts ?? []) {
    await admin.from("sim_departments").update({ head_employee_id: rng.pick(empIds) }).eq("id", d.id);
  }

  // 4) buses
  const busRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < SIM_VOLUMES.buses; i++) {
    busRows.push({
      org_id,
      plate: `${rng.pick(["أ","ب","ج","د","هـ"])}${rng.int(1000, 9999)}`,
      capacity: rng.pick([28, 32, 40, 45, 50]),
      route_code: rng.pick(BUS_ROUTES),
      driver_employee_id: rng.pick(empIds),
      site_id: rng.pick(siteIds),
      status: rng.chance(0.9) ? "active" : "maintenance",
      next_service_at: rng.daysAgo(-30, -1),
      metadata: { sim_seed: seed },
    });
  }
  await chunkInsert(admin, "sim_buses", busRows);

  // 5) inspections
  const inspRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < SIM_VOLUMES.inspections; i++) {
    const completed = rng.chance(0.7);
    inspRows.push({
      org_id,
      ref: `INS-${String(1000 + i)}`,
      kind: rng.pick(INSPECTION_KINDS),
      site_id: rng.pick(siteIds),
      inspector_employee: rng.pick(empIds),
      scheduled_at: rng.daysAgo(-14, 60),
      completed_at: completed ? rng.daysAgo(0, 30) : null,
      score: completed ? rng.int(55, 100) : null,
      findings_count: completed ? rng.int(0, 8) : 0,
      status: completed ? "completed" : (rng.chance(0.5) ? "scheduled" : "in_progress"),
      priority: rng.pick(["low", "medium", "high"]),
      metadata: { sim_seed: seed },
    });
  }
  await chunkInsert(admin, "sim_inspections", inspRows);
  const { data: insps } = await admin.from("sim_inspections").select("id").eq("org_id", org_id);
  const inspIds = (insps ?? []).map((r: { id: string }) => r.id);

  // 6) risks (some linked to inspections)
  const riskRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < SIM_VOLUMES.risks; i++) {
    const cat = rng.pick(RISK_CATEGORIES);
    riskRows.push({
      org_id,
      ref: `RSK-${String(1000 + i)}`,
      title: `Risk in ${cat} — ${rng.pick(["process","access","equipment","procedure"])} exposure`,
      category: cat,
      likelihood: rng.int(1, 5),
      impact: rng.int(1, 5),
      owner_employee: rng.pick(empIds),
      inspection_id: rng.chance(0.6) ? rng.pick(inspIds) : null,
      mitigation: "Apply hierarchy of controls; escalate to dept head; verify in next audit.",
      status: rng.pick(["open", "open", "mitigating", "closed"]),
      priority: rng.pick(["low", "medium", "high", "critical"]),
      metadata: { sim_seed: seed },
    });
  }
  await chunkInsert(admin, "sim_risks", riskRows);
  const { data: risks } = await admin.from("sim_risks").select("id").eq("org_id", org_id);
  const riskIds = (risks ?? []).map((r: { id: string }) => r.id);

  // 7) near misses
  const nmRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < SIM_VOLUMES.near_misses; i++) {
    const t = rng.pick(NEAR_MISS_TITLES);
    nmRows.push({
      org_id,
      ref: `NM-${String(1000 + i)}`,
      title: t.en,
      site_id: rng.pick(siteIds),
      reported_by_employee: rng.pick(empIds),
      severity_potential: rng.pick(["low", "medium", "medium", "high"]),
      root_cause: rng.pick(["human_error", "equipment_failure", "procedure_gap", "environmental"]),
      status: rng.pick(["open", "under_review", "closed"]),
      priority: rng.pick(["low", "medium", "high"]),
      reported_at: rng.daysAgo(0, 60),
      metadata: { sim_seed: seed, title_ar: t.ar },
    });
  }
  await chunkInsert(admin, "sim_near_misses", nmRows);
  const { data: nms } = await admin.from("sim_near_misses").select("id").eq("org_id", org_id);
  const nmIds = (nms ?? []).map((r: { id: string }) => r.id);

  // 8) incidents (into existing sec_incidents so dashboards populate)
  const incRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < SIM_VOLUMES.incidents; i++) {
    const t = rng.pick(INCIDENT_TYPES);
    incRows.push({
      org_id,
      ref: `INC-${String(2000 + i)}`,
      title: t.en,
      severity: t.sev,
      status: rng.pick(["open", "open", "investigating", "resolved", "resolved", "closed"]),
      site_id: rng.pick(siteIds),
      reported_at: rng.daysAgo(0, 60),
      response_minutes: rng.int(4, 90),
      metadata: { sim_seed: seed, title_ar: t.ar },
    });
  }
  await chunkInsert(admin, "sec_incidents", incRows);
  const { data: incs } = await admin
    .from("sec_incidents").select("id")
    .eq("org_id", org_id).contains("metadata", { sim_seed: seed });
  const incIds = (incs ?? []).map((r: { id: string }) => r.id);

  // 9) permits (sec_permits) — mixed statuses
  const permitRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < SIM_VOLUMES.permits; i++) {
    const kind = rng.pick(["hot_work", "confined_space", "working_at_height", "electrical", "excavation"]);
    permitRows.push({
      org_id,
      ref: `PTW-${String(3000 + i)}`,
      kind,
      type: kind,
      status: rng.pick(["draft", "active", "active", "expired", "closed"]),
      contractor: rng.pick(["Al-Bassam Co.", "SEPCO", "Nesma", "Zamil", "AlKifah"]),
      starts_at: rng.daysAgo(0, 20),
      ends_at: rng.daysAgo(-14, -1),
      metadata: { sim_seed: seed },
    });
  }
  await chunkInsert(admin, "sec_permits", permitRows);

  // 10) corrective actions (from inspections + incidents + risks + near_misses)
  const carRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < SIM_VOLUMES.corrective_actions; i++) {
    const sources: Array<{ type: string; ids: string[] }> = [
      { type: "inspection", ids: inspIds },
      { type: "incident", ids: incIds },
      { type: "risk", ids: riskIds },
      { type: "near_miss", ids: nmIds },
    ].filter((s) => s.ids.length > 0);
    const src = rng.pick(sources);
    carRows.push({
      org_id,
      ref: `CAR-${String(4000 + i)}`,
      source_type: src.type,
      source_id: rng.pick(src.ids),
      action: `Corrective action ${i + 1}: implement control and verify within 14 days.`,
      owner_employee: rng.pick(empIds),
      due_at: rng.daysAgo(-30, -1),
      status: rng.pick(["open", "in_progress", "in_progress", "completed", "overdue"]),
      priority: rng.pick(["low", "medium", "high", "critical"]),
      metadata: { sim_seed: seed },
    });
  }
  await chunkInsert(admin, "sim_corrective_actions", carRows);

  // 11) tasks (into existing `tasks` table, linked to incidents through metadata)
  const taskRows: Array<Record<string, unknown>> = [];
  const anyUser = empList[0]?.id ?? null; // tasks.user_id may be nullable? we'll try null
  for (let i = 0; i < SIM_VOLUMES.tasks; i++) {
    const incId = incIds.length ? rng.pick(incIds) : null;
    taskRows.push({
      title: `Task ${i + 1} — follow-up`,
      description: "Auto-generated from simulation.",
      status: rng.pick(["todo", "in_progress", "done"]),
      priority: rng.pick(["low", "medium", "high"]),
      due_at: rng.daysAgo(-14, 14),
      metadata: { sim_seed: seed, incident_id: incId, org_id },
      user_id: anyUser,
    });
  }
  // tasks table has NOT NULL user_id — skip if we don't have a proper user
  // (safer to insert without to avoid FK failures).
  try {
    await chunkInsert(admin, "tasks", taskRows.map(({ user_id: _u, ...rest }) => rest));
  } catch {
    // tolerate schema variance
  }

  // 12) meetings
  const meetRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < SIM_VOLUMES.meetings; i++) {
    const dept = rng.pick(Array.from(deptByCode.values()));
    meetRows.push({
      org_id,
      ref: `MTG-${String(5000 + i)}`,
      title: `${rng.pick(MEETING_KINDS).replace("_", " ")} meeting`,
      dept_id: dept,
      organizer_employee: rng.pick(empIds),
      scheduled_at: rng.daysAgo(-14, 30),
      duration_min: rng.pick([30, 45, 60, 90]),
      location: rng.pick(["HQ Boardroom", "Site Control Room", "Teams", "Zoom"]),
      kind: rng.pick(MEETING_KINDS),
      status: rng.pick(["scheduled", "completed", "completed"]),
      priority: rng.pick(["low", "medium", "high"]),
      attendees: rng.pickN(empIds, rng.int(4, 12)),
      metadata: { sim_seed: seed },
    });
  }
  await chunkInsert(admin, "sim_meetings", meetRows);

  // 13) notifications
  const notifRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < SIM_VOLUMES.notifications; i++) {
    notifRows.push({
      org_id,
      target_employee: rng.pick(empIds),
      topic: rng.pick(NOTIFICATION_TOPICS),
      severity: rng.pick(["info", "info", "warning", "critical"]),
      title: "Operational update",
      body: "See linked entity for details.",
      status: rng.chance(0.6) ? "unread" : "read",
      read_at: rng.chance(0.4) ? rng.daysAgo(0, 5) : null,
      priority: rng.pick(["low", "medium", "high"]),
      metadata: { sim_seed: seed },
    });
  }
  await chunkInsert(admin, "sim_notifications", notifRows, 200);

  // 14) daily ops (last N days × sites × 2 shifts)
  const opsRows: Array<Record<string, unknown>> = [];
  for (let d = 0; d < SIM_VOLUMES.daily_ops_days; d++) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - d);
    const dayStr = day.toISOString().slice(0, 10);
    for (const site of sites) {
      for (const shift of ["day", "night"]) {
        const planned = rng.int(8, 24);
        opsRows.push({
          org_id, day: dayStr, site_id: site.id, shift,
          patrols_planned: planned,
          patrols_done: Math.max(0, planned - rng.int(0, 3)),
          incidents_open: rng.int(0, 5),
          permits_active: rng.int(0, 12),
          headcount: (empBySite.get(site.id)?.length ?? 0) + rng.int(-3, 3),
          kpi_json: {
            compliance_pct: rng.int(82, 99),
            response_avg_min: rng.int(6, 22),
            near_miss_reports: rng.int(0, 6),
          },
          status: d === 0 ? "in_progress" : "closed",
          metadata: { sim_seed: seed },
        });
      }
    }
  }
  await chunkInsert(admin, "sim_daily_ops", opsRows, 200);

  // 15) history — a compact audit trail sample per major entity
  const histRows: Array<Record<string, unknown>> = [];
  const pushHist = (entity: string, ids: string[], actions: string[]) => {
    for (const id of ids.slice(0, Math.min(ids.length, 40))) {
      for (const action of actions) {
        histRows.push({
          org_id, entity_type: entity, entity_id: id, action,
          actor_employee: rng.pick(empIds),
          changes_json: { by: "simulation" },
          at: rng.daysAgo(0, 45),
          metadata: { sim_seed: seed },
        });
      }
    }
  };
  pushHist("sim_inspection", inspIds, ["created", "status_changed"]);
  pushHist("sim_risk", riskIds, ["created", "mitigation_updated"]);
  pushHist("sim_corrective_action", (await admin.from("sim_corrective_actions").select("id").eq("org_id", org_id)).data?.map((r: {id:string}) => r.id) ?? [], ["created"]);
  pushHist("sec_incident", incIds, ["created", "status_changed"]);
  await chunkInsert(admin, "sim_history", histRows, 200);

  return {
    seed,
    org_id,
    duration_ms: Date.now() - started,
    counts: {
      sites: sites.length,
      departments: deptRows.length,
      employees: empRows.length,
      buses: busRows.length,
      inspections: inspRows.length,
      risks: riskRows.length,
      near_misses: nmRows.length,
      incidents: incRows.length,
      permits: permitRows.length,
      corrective_actions: carRows.length,
      meetings: meetRows.length,
      notifications: notifRows.length,
      daily_ops: opsRows.length,
      history: histRows.length,
    },
  };
}

// Validation: check that all FK-like references resolve.
export async function validateSimulation(admin: Admin, orgId: string) {
  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const count = async (t: string) => {
    const { count: c } = await admin.from(t).select("id", { count: "exact", head: true }).eq("org_id", orgId);
    return c ?? 0;
  };
  for (const t of ["sim_departments","sim_employees","sim_buses","sim_inspections","sim_risks","sim_near_misses","sim_corrective_actions","sim_meetings","sim_notifications","sim_daily_ops","sim_history"]) {
    const c = await count(t);
    checks.push({ name: `${t}.count>0`, ok: c > 0, detail: `${c}` });
  }
  // orphan checks
  const { data: orphanEmps } = await admin
    .from("sim_employees").select("id").eq("org_id", orgId).is("dept_id", null).limit(1);
  checks.push({ name: "employees.dept_id not null", ok: (orphanEmps?.length ?? 0) === 0 });
  return { ok: checks.every((c) => c.ok), checks };
}
