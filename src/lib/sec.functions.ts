import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


// ============= TYPES =============
export type SecSite = {
  id: string; code: string; name_ar: string; name_en: string;
  lat: number | null; lng: number | null; sensitivity: string; status: string;
  guards_count: number; notes: string | null; updated_at: string;
  circle_id: string | null;
};
export type SecIncident = {
  id: string; ref: string; site_id: string | null; category: string;
  title_ar: string; title_en: string; severity: string; status: string;
  owner: string | null; reported_at: string; resolved_at: string | null;
  response_minutes: number | null; root_cause: string | null; ai_summary: string | null;
};
export type SecPatrol = {
  id: string; ref: string; site_id: string | null; team: string; route: string;
  status: string; checkpoints_total: number; checkpoints_done: number;
  started_at: string | null; ended_at: string | null;
};
export type SecVisitor = {
  id: string; ref: string; site_id: string | null; full_name: string;
  organization: string | null; host: string; purpose: string | null; badge_no: string | null;
  check_in_at: string; check_out_at: string | null; status: string;
};
export type SecContractor = {
  id: string; ref: string; name: string; contract_no: string;
  workers_count: number; compliance_score: number; status: string; expires_at: string | null;
};
export type SecPermit = {
  id: string; ref: string; site_id: string | null; work_type: string;
  contractor: string; risk_level: string; status: string;
  starts_at: string; ends_at: string; approver: string | null; notes: string | null;
};
export type SecAsset = {
  id: string; code: string; name_ar: string; name_en: string; kind: string;
  site_id: string | null; health: number; status: string; last_seen_at: string;
};
export type SecCctvAlert = {
  id: string; ref: string; site_id: string | null; camera_code: string;
  alert_type: string; confidence: number; status: string; detected_at: string;
  acknowledged_by: string | null;
};
export type SecSection = {
  id: string; code: string; name_ar: string; name_en: string;
  head: string | null; staff_count: number;
};
export type SecCircle = {
  id: string; code: string; name_ar: string; name_en: string;
  manager: string | null; lat: number | null; lng: number | null; staff_count: number;
};
export type SecBuilding = {
  id: string; site_id: string | null; code: string; name_ar: string; name_en: string;
  floors: number; status: string;
};
export type SecCamera = {
  id: string; building_id: string | null; site_id: string | null; code: string;
  kind: string; status: string; health: number; resolution: string | null; last_seen_at: string;
};
export type SecGate = {
  id: string; building_id: string | null; site_id: string | null; code: string;
  kind: string; status: string; health: number; events_today: number; last_event_at: string;
};
export type SecSensor = {
  id: string; building_id: string | null; site_id: string | null; code: string;
  sensor_type: string; status: string; reading: number | null; threshold: number | null;
  unit: string | null; last_reading_at: string;
};
export type SecControlRoom = {
  id: string; circle_id: string | null; code: string; name_ar: string; name_en: string;
  operators_count: number; screens_count: number; shift_lead: string | null; status: string;
};
export type SecPatrolTeam = {
  id: string; circle_id: string | null; code: string; name_ar: string;
  leader: string | null; members_count: number; vehicle_plate: string | null; status: string;
};
export type SecWorkOrder = {
  id: string; ref: string; site_id: string | null; building_id: string | null;
  asset_kind: string; asset_code: string | null; kind: "preventive" | "corrective";
  title_ar: string; title_en: string; priority: string; status: string;
  assigned_to: string | null; contractor: string | null;
  opened_at: string; due_at: string | null; closed_at: string | null; notes: string | null;
};
export type SecProject = {
  id: string; ref: string; circle_id: string | null; name_ar: string; name_en: string;
  kind: string; status: string; progress: number;
  budget_sar: number; spent_sar: number;
  starts_at: string | null; ends_at: string | null;
  manager: string | null; contractor: string | null; health: "green" | "amber" | "red";
};

export type SecOverview = {
  sites: SecSite[];
  incidents: SecIncident[];
  patrols: SecPatrol[];
  visitors: SecVisitor[];
  contractors: SecContractor[];
  permits: SecPermit[];
  assets: SecAsset[];
  cctv: SecCctvAlert[];
  counts: {
    sites: number; incidents_open: number; incidents_critical: number;
    patrols_active: number; visitors_inside: number; permits_active: number;
    cctv_new: number; assets_offline: number; contractors_active: number;
  };
};

export const getSecOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecOverview> => {
    const { supabase } = context;
    const [sites, incidents, patrols, visitors, contractors, permits, assets, cctv] = await Promise.all([
      supabase.from("sec_sites").select("*").order("code"),
      supabase.from("sec_incidents").select("*").order("reported_at", { ascending: false }).limit(200),
      supabase.from("sec_patrols").select("*").order("started_at", { ascending: false, nullsFirst: false }).limit(200),
      supabase.from("sec_visitors").select("*").order("check_in_at", { ascending: false }).limit(200),
      supabase.from("sec_contractors").select("*").order("name"),
      supabase.from("sec_permits").select("*").order("starts_at", { ascending: false }).limit(200),
      supabase.from("sec_assets").select("*").order("code"),
      supabase.from("sec_cctv_alerts").select("*").order("detected_at", { ascending: false }).limit(200),
    ]);
    const I = (incidents.data ?? []) as SecIncident[];
    const P = (patrols.data ?? []) as SecPatrol[];
    const V = (visitors.data ?? []) as SecVisitor[];
    const C = (contractors.data ?? []) as SecContractor[];
    const PM = (permits.data ?? []) as SecPermit[];
    const A = (assets.data ?? []) as SecAsset[];
    const CCTV = (cctv.data ?? []) as SecCctvAlert[];
    return {
      sites: (sites.data ?? []) as SecSite[],
      incidents: I, patrols: P, visitors: V, contractors: C,
      permits: PM, assets: A, cctv: CCTV,
      counts: {
        sites: (sites.data ?? []).length,
        incidents_open: I.filter(i => i.status !== "resolved" && i.status !== "closed").length,
        incidents_critical: I.filter(i => i.severity === "critical" && i.status !== "closed").length,
        patrols_active: P.filter(p => p.status === "active").length,
        visitors_inside: V.filter(v => v.status === "inside" || v.status === "overdue").length,
        permits_active: PM.filter(p => p.status === "active" || p.status === "approved").length,
        cctv_new: CCTV.filter(c => c.status === "new").length,
        assets_offline: A.filter(a => a.status === "offline" || a.status === "degraded").length,
        contractors_active: C.filter(c => c.status === "active").length,
      },
    };
  });

// ============= TWIN TREE =============
export type TwinTree = {
  region: { name_ar: string; name_en: string };
  sections: SecSection[];
  circles: (SecCircle & {
    sites: (SecSite & {
      buildings: (SecBuilding & {
        cameras: SecCamera[];
        gates: SecGate[];
        sensors: SecSensor[];
      })[];
    })[];
    control_rooms: SecControlRoom[];
    patrol_teams: SecPatrolTeam[];
  })[];
};

export const getTwinTree = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TwinTree> => {
    const { supabase } = context;
    const [sections, circles, sites, buildings, cameras, gates, sensors, controlRooms, patrolTeams] = await Promise.all([
      supabase.from("sec_sections").select("*").order("code"),
      supabase.from("sec_circles").select("*").order("code"),
      supabase.from("sec_sites").select("*").order("code"),
      supabase.from("sec_buildings").select("*").order("code"),
      supabase.from("sec_cameras").select("*").order("code"),
      supabase.from("sec_gates").select("*").order("code"),
      supabase.from("sec_sensors").select("*").order("code"),
      supabase.from("sec_control_rooms").select("*").order("code"),
      supabase.from("sec_patrol_teams").select("*").order("code"),
    ]);

    const camerasByBuilding = new Map<string, SecCamera[]>();
    for (const c of (cameras.data ?? []) as SecCamera[]) {
      if (!c.building_id) continue;
      (camerasByBuilding.get(c.building_id) ?? camerasByBuilding.set(c.building_id, []).get(c.building_id)!).push(c);
    }
    const gatesByBuilding = new Map<string, SecGate[]>();
    for (const g of (gates.data ?? []) as SecGate[]) {
      if (!g.building_id) continue;
      (gatesByBuilding.get(g.building_id) ?? gatesByBuilding.set(g.building_id, []).get(g.building_id)!).push(g);
    }
    const sensorsByBuilding = new Map<string, SecSensor[]>();
    for (const s of (sensors.data ?? []) as SecSensor[]) {
      if (!s.building_id) continue;
      (sensorsByBuilding.get(s.building_id) ?? sensorsByBuilding.set(s.building_id, []).get(s.building_id)!).push(s);
    }
    const buildingsBySite = new Map<string, SecBuilding[]>();
    for (const b of (buildings.data ?? []) as SecBuilding[]) {
      if (!b.site_id) continue;
      (buildingsBySite.get(b.site_id) ?? buildingsBySite.set(b.site_id, []).get(b.site_id)!).push(b);
    }
    const sitesByCircle = new Map<string, SecSite[]>();
    for (const s of (sites.data ?? []) as SecSite[]) {
      if (!s.circle_id) continue;
      (sitesByCircle.get(s.circle_id) ?? sitesByCircle.set(s.circle_id, []).get(s.circle_id)!).push(s);
    }
    const controlRoomsByCircle = new Map<string, SecControlRoom[]>();
    for (const cr of (controlRooms.data ?? []) as SecControlRoom[]) {
      if (!cr.circle_id) continue;
      (controlRoomsByCircle.get(cr.circle_id) ?? controlRoomsByCircle.set(cr.circle_id, []).get(cr.circle_id)!).push(cr);
    }
    const teamsByCircle = new Map<string, SecPatrolTeam[]>();
    for (const t of (patrolTeams.data ?? []) as SecPatrolTeam[]) {
      if (!t.circle_id) continue;
      (teamsByCircle.get(t.circle_id) ?? teamsByCircle.set(t.circle_id, []).get(t.circle_id)!).push(t);
    }

    return {
      region: { name_ar: "إدارة الأمن الصناعي بالمنطقة الغربية", name_en: "Western Region Industrial Security" },
      sections: (sections.data ?? []) as SecSection[],
      circles: ((circles.data ?? []) as SecCircle[]).map((c) => ({
        ...c,
        sites: (sitesByCircle.get(c.id) ?? []).map((s) => ({
          ...s,
          buildings: (buildingsBySite.get(s.id) ?? []).map((b) => ({
            ...b,
            cameras: camerasByBuilding.get(b.id) ?? [],
            gates: gatesByBuilding.get(b.id) ?? [],
            sensors: sensorsByBuilding.get(b.id) ?? [],
          })),
        })),
        control_rooms: controlRoomsByCircle.get(c.id) ?? [],
        patrol_teams: teamsByCircle.get(c.id) ?? [],
      })),
    };
  });

// ============= PROJECTS & MAINTENANCE =============
export const getProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecProject[]> => {
    const { data } = await context.supabase.from("sec_projects").select("*").order("ends_at", { ascending: true });
    return (data ?? []) as SecProject[];
  });

export const getWorkOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecWorkOrder[]> => {
    const { data } = await context.supabase.from("sec_work_orders").select("*").order("opened_at", { ascending: false });
    return (data ?? []) as SecWorkOrder[];
  });

export const getSections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecSection[]> => {
    const { data } = await context.supabase.from("sec_sections").select("*").order("code");
    return (data ?? []) as SecSection[];
  });

export const getCircles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecCircle[]> => {
    const { data } = await context.supabase.from("sec_circles").select("*").order("code");
    return (data ?? []) as SecCircle[];
  });

// ============= EXECUTIVE KPIs =============
export type ExecKpis = {
  incidents_total: number;
  incidents_open: number;
  incidents_critical: number;
  incidents_resolution_rate: number;
  mttr_minutes: number;
  preventive_wo: number;
  corrective_wo: number;
  wo_open: number;
  wo_closed: number;
  projects_in_progress: number;
  projects_completed: number;
  projects_budget_total: number;
  projects_spent_total: number;
  cameras_total: number;
  cameras_online: number;
  cctv_health: number;
  gates_total: number;
  gates_online: number;
  access_health: number;
  sensors_total: number;
  sensors_alarming: number;
  sites_operational: number;
  sites_total: number;
  patrols_active: number;
  patrol_completion: number;
  visitors_inside: number;
  permits_active: number;
  contractors_active: number;
  contractors_compliance: number;
  risk_index: number;
  safety_index: number;
  executive_readiness: number;
};

export type ExecKpiSources = {
  incidents: { severity: string; status: string; response_minutes: number | null }[];
  patrols: { status: string; checkpoints_done: number; checkpoints_total: number }[];
  visitors: { status: string }[];
  permits: { status: string }[];
  contractors: { status: string; compliance_score: number }[];
  sites: { status: string }[];
  cameras: { status: string; health: number }[];
  gates: { status: string; health: number }[];
  sensors: { status: string }[];
  workOrders: { kind: string; status: string }[];
  projects: { status: string; progress: number; budget_sar: number; spent_sar: number; health: string }[];
};

// Minimal shape of the authed Supabase client used by fetchExecKpiSources.
// Kept structural so tests can pass an in-memory stub without pulling the full
// supabase-js types — the real client (from `requireSupabaseAuth`) satisfies it.
type ExecKpiSupabase = {
  from: (table: string) => { select: (cols: string) => Promise<{ data: unknown }> };
};

export async function fetchExecKpiSources(supabase: ExecKpiSupabase): Promise<ExecKpiSources> {
  const [incidents, patrols, visitors, permits, contractors, sites, cameras, gates, sensors, workOrders, projects] = await Promise.all([
    supabase.from("sec_incidents").select("severity,status,response_minutes"),
    supabase.from("sec_patrols").select("status,checkpoints_done,checkpoints_total"),
    supabase.from("sec_visitors").select("status"),
    supabase.from("sec_permits").select("status"),
    supabase.from("sec_contractors").select("status,compliance_score"),
    supabase.from("sec_sites").select("status"),
    supabase.from("sec_cameras").select("status,health"),
    supabase.from("sec_gates").select("status,health"),
    supabase.from("sec_sensors").select("status"),
    supabase.from("sec_work_orders").select("kind,status"),
    supabase.from("sec_projects").select("status,progress,budget_sar,spent_sar,health"),
  ]);
  return {
    incidents: (incidents.data ?? []) as ExecKpiSources["incidents"],
    patrols: (patrols.data ?? []) as ExecKpiSources["patrols"],
    visitors: (visitors.data ?? []) as ExecKpiSources["visitors"],
    permits: (permits.data ?? []) as ExecKpiSources["permits"],
    contractors: (contractors.data ?? []) as ExecKpiSources["contractors"],
    sites: (sites.data ?? []) as ExecKpiSources["sites"],
    cameras: (cameras.data ?? []) as ExecKpiSources["cameras"],
    gates: (gates.data ?? []) as ExecKpiSources["gates"],
    sensors: (sensors.data ?? []) as ExecKpiSources["sensors"],
    workOrders: (workOrders.data ?? []) as ExecKpiSources["workOrders"],
    projects: (projects.data ?? []) as ExecKpiSources["projects"],
  };
}

export function computeExecKpis(src: ExecKpiSources): ExecKpis {
  const { incidents: I, patrols: P, visitors: V, permits: PM, contractors: C, sites: S, cameras: CAM, gates: G, sensors: SEN, workOrders: WO, projects: PRJ } = src;

  const incTotal = I.length || 1;
  const incOpen = I.filter(i => i.status !== "resolved" && i.status !== "closed").length;
  const incClosed = I.length - incOpen;
  const incCritical = I.filter(i => i.severity === "critical" && i.status !== "closed").length;
  const mttr = I.filter(i => i.response_minutes != null).reduce((s, i, _, a) => s + (i.response_minutes ?? 0) / (a.length || 1), 0);
  const camOnline = CAM.filter(c => c.status === "online").length;
  const gateOnline = G.filter(g => g.status === "online").length;
  const cctvHealth = CAM.length ? Math.round(CAM.reduce((s, c) => s + c.health, 0) / CAM.length) : 0;
  const accessHealth = G.length ? Math.round(G.reduce((s, g) => s + g.health, 0) / G.length) : 0;
  const sensorsAlarming = SEN.filter(s => s.status === "alarm" || s.status === "offline").length;
  const patrolCompletion = P.length
    ? Math.round(P.reduce((s, p) => s + (p.checkpoints_total ? (p.checkpoints_done / p.checkpoints_total) : 0), 0) / P.length * 100)
    : 0;
  const compliance = C.length ? Math.round(C.reduce((s, c) => s + c.compliance_score, 0) / C.length) : 0;
  const resolutionRate = Math.round((incClosed / incTotal) * 100);
  const riskIndex = Math.min(100, incCritical * 15 + sensorsAlarming * 5 + (100 - cctvHealth) / 2);
  const safetyIndex = Math.max(0, 100 - riskIndex);
  const executiveReadiness = Math.round((cctvHealth + accessHealth + compliance + patrolCompletion + safetyIndex) / 5);

  return {
    incidents_total: I.length,
    incidents_open: incOpen,
    incidents_critical: incCritical,
    incidents_resolution_rate: resolutionRate,
    mttr_minutes: Math.round(mttr),
    preventive_wo: WO.filter(w => w.kind === "preventive").length,
    corrective_wo: WO.filter(w => w.kind === "corrective").length,
    wo_open: WO.filter(w => w.status !== "closed" && w.status !== "cancelled").length,
    wo_closed: WO.filter(w => w.status === "closed").length,
    projects_in_progress: PRJ.filter(p => p.status === "in-progress").length,
    projects_completed: PRJ.filter(p => p.status === "completed").length,
    projects_budget_total: PRJ.reduce((s, p) => s + Number(p.budget_sar), 0),
    projects_spent_total: PRJ.reduce((s, p) => s + Number(p.spent_sar), 0),
    cameras_total: CAM.length,
    cameras_online: camOnline,
    cctv_health: cctvHealth,
    gates_total: G.length,
    gates_online: gateOnline,
    access_health: accessHealth,
    sensors_total: SEN.length,
    sensors_alarming: sensorsAlarming,
    sites_operational: S.filter(s => s.status === "operational").length,
    sites_total: S.length,
    patrols_active: P.filter(p => p.status === "active").length,
    patrol_completion: patrolCompletion,
    visitors_inside: V.filter(v => v.status === "inside" || v.status === "overdue").length,
    permits_active: PM.filter(p => p.status === "active" || p.status === "approved").length,
    contractors_active: C.filter(c => c.status === "active").length,
    contractors_compliance: compliance,
    risk_index: Math.round(riskIndex),
    safety_index: Math.round(safetyIndex),
    executive_readiness: executiveReadiness,
  };
}

export const getExecKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExecKpis> => {
    // RLS applies: context.supabase is the authed user's client (publishable key
    // + bearer token) injected by requireSupabaseAuth. Service role is never
    // used here, so policies on sec_* tables filter rows as the caller.
    const sources = await fetchExecKpiSources(context.supabase as unknown as ExecKpiSupabase);
    return computeExecKpis(sources);
  });

