import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============= TYPES =============
export type SecSite = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  lat: number | null;
  lng: number | null;
  sensitivity: string;
  status: string;
  guards_count: number;
  notes: string | null;
  updated_at: string;
  circle_id: string | null;
};
export type SecIncident = {
  id: string;
  ref: string;
  site_id: string | null;
  category: string;
  title_ar: string;
  title_en: string;
  severity: string;
  status: string;
  owner: string | null;
  reported_at: string;
  resolved_at: string | null;
  response_minutes: number | null;
  root_cause: string | null;
  ai_summary: string | null;
};
export type SecPatrol = {
  id: string;
  ref: string;
  site_id: string | null;
  team: string;
  route: string;
  status: string;
  checkpoints_total: number;
  checkpoints_done: number;
  started_at: string | null;
  ended_at: string | null;
};
export type SecVisitor = {
  id: string;
  ref: string;
  site_id: string | null;
  full_name: string;
  organization: string | null;
  host: string;
  purpose: string | null;
  badge_no: string | null;
  check_in_at: string;
  check_out_at: string | null;
  status: string;
};
export type SecContractor = {
  id: string;
  ref: string;
  name: string;
  contract_no: string;
  workers_count: number;
  compliance_score: number;
  status: string;
  expires_at: string | null;
};
export type SecPermit = {
  id: string;
  ref: string;
  site_id: string | null;
  work_type: string;
  contractor: string;
  risk_level: string;
  status: string;
  starts_at: string;
  ends_at: string;
  approver: string | null;
  notes: string | null;
};
export type SecAsset = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  kind: string;
  site_id: string | null;
  health: number;
  status: string;
  last_seen_at: string;
};
export type SecCctvAlert = {
  id: string;
  ref: string;
  site_id: string | null;
  camera_code: string;
  alert_type: string;
  confidence: number;
  status: string;
  detected_at: string;
  acknowledged_by: string | null;
};
export type SecSection = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  head: string | null;
  staff_count: number;
};
export type SecCircle = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  manager: string | null;
  lat: number | null;
  lng: number | null;
  staff_count: number;
};
export type SecBuilding = {
  id: string;
  site_id: string | null;
  code: string;
  name_ar: string;
  name_en: string;
  floors: number;
  status: string;
};
export type SecCamera = {
  id: string;
  building_id: string | null;
  site_id: string | null;
  code: string;
  kind: string;
  status: string;
  health: number;
  resolution: string | null;
  last_seen_at: string;
};
export type SecGate = {
  id: string;
  building_id: string | null;
  site_id: string | null;
  code: string;
  kind: string;
  status: string;
  health: number;
  events_today: number;
  last_event_at: string;
};
export type SecSensor = {
  id: string;
  building_id: string | null;
  site_id: string | null;
  code: string;
  sensor_type: string;
  status: string;
  reading: number | null;
  threshold: number | null;
  unit: string | null;
  last_reading_at: string;
};
export type SecControlRoom = {
  id: string;
  circle_id: string | null;
  code: string;
  name_ar: string;
  name_en: string;
  operators_count: number;
  screens_count: number;
  shift_lead: string | null;
  status: string;
};
export type SecPatrolTeam = {
  id: string;
  circle_id: string | null;
  code: string;
  name_ar: string;
  leader: string | null;
  members_count: number;
  vehicle_plate: string | null;
  status: string;
};
export type SecWorkOrder = {
  id: string;
  ref: string;
  site_id: string | null;
  building_id: string | null;
  asset_kind: string;
  asset_code: string | null;
  kind: "preventive" | "corrective";
  title_ar: string;
  title_en: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  contractor: string | null;
  opened_at: string;
  due_at: string | null;
  closed_at: string | null;
  notes: string | null;
};
export type SecProject = {
  id: string;
  ref: string;
  circle_id: string | null;
  name_ar: string;
  name_en: string;
  kind: string;
  status: string;
  progress: number;
  budget_sar: number;
  spent_sar: number;
  starts_at: string | null;
  ends_at: string | null;
  manager: string | null;
  contractor: string | null;
  health: "green" | "amber" | "red";
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
    sites: number;
    incidents_open: number;
    incidents_critical: number;
    patrols_active: number;
    visitors_inside: number;
    permits_active: number;
    cctv_new: number;
    assets_offline: number;
    contractors_active: number;
  };
};

export const getSecOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecOverview> => {
    const { supabase } = context;
    const [sites, incidents, patrols, visitors, contractors, permits, assets, cctv] =
      await Promise.all([
        supabase.from("sec_sites").select("*").order("code"),
        supabase
          .from("sec_incidents")
          .select("*")
          .order("reported_at", { ascending: false })
          .limit(200),
        supabase
          .from("sec_patrols")
          .select("*")
          .order("started_at", { ascending: false, nullsFirst: false })
          .limit(200),
        supabase
          .from("sec_visitors")
          .select("*")
          .order("check_in_at", { ascending: false })
          .limit(200),
        supabase.from("sec_contractors").select("*").order("name"),
        supabase
          .from("sec_permits")
          .select("*")
          .order("starts_at", { ascending: false })
          .limit(200),
        supabase.from("sec_assets").select("*").order("code"),
        supabase
          .from("sec_cctv_alerts")
          .select("*")
          .order("detected_at", { ascending: false })
          .limit(200),
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
      incidents: I,
      patrols: P,
      visitors: V,
      contractors: C,
      permits: PM,
      assets: A,
      cctv: CCTV,
      counts: {
        sites: (sites.data ?? []).length,
        incidents_open: I.filter((i) => i.status !== "resolved" && i.status !== "closed").length,
        incidents_critical: I.filter((i) => i.severity === "critical" && i.status !== "closed")
          .length,
        patrols_active: P.filter((p) => p.status === "active").length,
        visitors_inside: V.filter((v) => v.status === "inside" || v.status === "overdue").length,
        permits_active: PM.filter((p) => p.status === "active" || p.status === "approved").length,
        cctv_new: CCTV.filter((c) => c.status === "new").length,
        assets_offline: A.filter((a) => a.status === "offline" || a.status === "degraded").length,
        contractors_active: C.filter((c) => c.status === "active").length,
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
    const [
      sections,
      circles,
      sites,
      buildings,
      cameras,
      gates,
      sensors,
      controlRooms,
      patrolTeams,
    ] = await Promise.all([
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
      (
        camerasByBuilding.get(c.building_id) ??
        camerasByBuilding.set(c.building_id, []).get(c.building_id)!
      ).push(c);
    }
    const gatesByBuilding = new Map<string, SecGate[]>();
    for (const g of (gates.data ?? []) as SecGate[]) {
      if (!g.building_id) continue;
      (
        gatesByBuilding.get(g.building_id) ??
        gatesByBuilding.set(g.building_id, []).get(g.building_id)!
      ).push(g);
    }
    const sensorsByBuilding = new Map<string, SecSensor[]>();
    for (const s of (sensors.data ?? []) as SecSensor[]) {
      if (!s.building_id) continue;
      (
        sensorsByBuilding.get(s.building_id) ??
        sensorsByBuilding.set(s.building_id, []).get(s.building_id)!
      ).push(s);
    }
    const buildingsBySite = new Map<string, SecBuilding[]>();
    for (const b of (buildings.data ?? []) as SecBuilding[]) {
      if (!b.site_id) continue;
      (buildingsBySite.get(b.site_id) ?? buildingsBySite.set(b.site_id, []).get(b.site_id)!).push(
        b,
      );
    }
    const sitesByCircle = new Map<string, SecSite[]>();
    for (const s of (sites.data ?? []) as SecSite[]) {
      if (!s.circle_id) continue;
      (sitesByCircle.get(s.circle_id) ?? sitesByCircle.set(s.circle_id, []).get(s.circle_id)!).push(
        s,
      );
    }
    const controlRoomsByCircle = new Map<string, SecControlRoom[]>();
    for (const cr of (controlRooms.data ?? []) as SecControlRoom[]) {
      if (!cr.circle_id) continue;
      (
        controlRoomsByCircle.get(cr.circle_id) ??
        controlRoomsByCircle.set(cr.circle_id, []).get(cr.circle_id)!
      ).push(cr);
    }
    const teamsByCircle = new Map<string, SecPatrolTeam[]>();
    for (const t of (patrolTeams.data ?? []) as SecPatrolTeam[]) {
      if (!t.circle_id) continue;
      (teamsByCircle.get(t.circle_id) ?? teamsByCircle.set(t.circle_id, []).get(t.circle_id)!).push(
        t,
      );
    }

    return {
      region: {
        name_ar: "إدارة الأمن الصناعي بالمنطقة الغربية",
        name_en: "Western Region Industrial Security",
      },
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
    const { data } = await context.supabase
      .from("sec_projects")
      .select("*")
      .order("ends_at", { ascending: true });
    return (data ?? []) as SecProject[];
  });

export const getWorkOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecWorkOrder[]> => {
    const { data } = await context.supabase
      .from("sec_work_orders")
      .select("*")
      .order("opened_at", { ascending: false });
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

// Executive KPIs moved to a focused module; re-exported so `@/lib/sec.functions`
// stays the single import surface for existing consumers.
export {
  ExecKpisSchema,
  fetchExecKpiSources,
  computeExecKpis,
  getExecKpis,
  getPublicKpis,
  getExecTimeseries,
} from "./sec-exec-kpis.functions";
export type {
  ExecKpis,
  ExecKpiSources,
  PublicKpis,
  ExecTimeseriesPoint,
  ExecTimeseries,
} from "./sec-exec-kpis.functions";
