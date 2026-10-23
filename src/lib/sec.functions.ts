import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";

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
  // ٢٠٢٦/٠٨/٢٧ — صفوف «تقرير البلاغات» الحقيقية بلا عنوان إنجليزي ولا شدة:
  // غير مقيسين ⇒ null، والشدة تُعرض «غير مصنف» (المادة ٢٧ — لا اختلاق).
  title_en: string | null;
  severity: string | null;
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
  // `null` أولوية غير مقيسة في المصدر (تصدير SAP) — تُعرض «لم تُحدَّد».
  priority: string | null;
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
  /**
   * **`null` صحّةٌ لم تُقَس، لا صحّةٌ سليمة (المادة ٢٧).**
   *
   * وُسِّع النوع عند استيراد تصدير المشاريع (٢٠٢٦/٠٨/٣٠): المصدر يصرّح
   * بتصنيف المخاطر وتحليل التأخّر في **158 مشروعًا من 697** فقط. فلو بقي
   * النوع ثلاثيًّا لَوجب اختيار لونٍ لـ539 مشروعًا لم يُقيَّم أيٌّ منها —
   * و«أخضر» على مشروعٍ لم يُنظر فيه هو عين الادّعاء الذي تمنعه المادة.
   */
  health: "green" | "amber" | "red" | null;
  /** منطقة العمليات كما في المصدر (COA/EOA/WOA/SOA/SEC) بالعربية. */
  area_ar?: string | null;
  /** موقع المشروع بالعربية. */
  location_ar?: string | null;
  /** خطّ الأعمال بالعربية. */
  business_ar?: string | null;
  /**
   * يسمه `markSimulation` على كل بديل `resilient` غير مجمّد. مصرَّحٌ به في
   * النوع كي تستطيع الصفحة عرض الشارة — بغيره يُعرض تصديرٌ تمثيلي كأنه
   * قياسٌ حيّ، وهو ما تمنعه العقيدة.
   */
  is_simulation?: boolean;
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
    // ٢٠٢٦/٠٨/٢٧ — «الحرجة» فوق صفوف لم تُقَس شدّتها «لم يُقَس» (null)
    // لا صفرًا (المادة ٢٧). القيمة عدد حين تكون الشدة مقيسة.
    incidents_critical: number | null;
    patrols_active: number;
    visitors_inside: number;
    permits_active: number;
    cctv_new: number;
    assets_offline: number;
    contractors_active: number;
  };
};

export const getSecOverview = createServerFn({ method: "GET" })
  // Open showcase read (anon RLS decides); simulation fills an empty board.
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<SecOverview> => {
    const { buildSecOverviewSimulation, resilient } =
      await import("./exec/showcase-simulation.server");
    return resilient(
      "sec-overview",
      () => fetchSecOverview(context.supabase),
      (v) =>
        v.sites.length === 0 &&
        v.incidents.length === 0 &&
        v.patrols.length === 0 &&
        v.assets.length === 0,
      // ٢٠٢٦/٠٨/٢٧ — أمر المالك: بلاغات البديل («آخر البلاغات» وعدّاداها)
      // من مجموعة «تقرير البلاغات» الحقيقية (3,427 صفًّا فعليًّا):
      // - القائمة أحدث 200 صف (مرآة سقف الاستعلام الحي)؛
      // - `incidents_open` محسوب من كامل المجموعة (2,284)؛
      // - `incidents_critical` **null ⇒ «لم يُقَس»**: المصدر بلا شدة،
      //   والصفر ادّعاء قياس (المادة ٢٧).
      // بقية النطاقات (دوريات/زوار/تصاريح/أصول/كاميرات…) محاكاتها كما هي؛
      // الصفوف الحقيقية مجمّدة فلا يسمها `markSimulation`.
      async () => {
        const sim = buildSecOverviewSimulation(Date.now());
        const { REAL_SEC_INCIDENTS, REAL_INCIDENT_COUNTS } =
          await import("./exec/event-report.real.server");
        return {
          ...sim,
          incidents: [...REAL_SEC_INCIDENTS],
          counts: {
            ...sim.counts,
            incidents_open: REAL_INCIDENT_COUNTS.open,
            incidents_critical: null,
          },
        };
      },
    );
  });

async function fetchSecOverview(
  // Structural: the RLS client injected by optional auth.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (t: string) => any },
): Promise<SecOverview> {
  {
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
  }
}

// ============= TWIN TREE =============
export type TwinTree = {
  /** Explicit provenance: never present sample data as live telemetry. */
  dataSource?: "live" | "simulation";
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
  // Open showcase read; «بيانات لا تفرغ»: unreachable/empty hierarchy ⇒
  // built-in Western-region twin simulation (live rows always win).
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<TwinTree> => {
    const { buildTwinTreeSimulation, resilient } =
      await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "twin-tree",
      async () => ({
        ...(await fetchTwinTree(context.supabase as { from: (t: string) => any })),
        dataSource: "live" as const,
      }),
      (t) => t.circles.length === 0 && t.sections.length === 0,
      () => ({
        ...(buildTwinTreeSimulation(Date.now()) as unknown as TwinTree),
        dataSource: "simulation" as const,
      }),
    );
  });

async function fetchTwinTree(supabase: { from: (t: string) => any }): Promise<TwinTree> {
  const [sections, circles, sites, buildings, cameras, gates, sensors, controlRooms, patrolTeams] =
    await Promise.all([
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
    (buildingsBySite.get(b.site_id) ?? buildingsBySite.set(b.site_id, []).get(b.site_id)!).push(b);
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
      name_ar: "إدارة الأمن الصناعي — جميع المناطق",
      name_en: "Industrial Security — All Regions",
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
}

// ============= PROJECTS & MAINTENANCE =============
// أربع قراءات عرض: `/sec/projects` و`/sec/sections` وشبكة الصيانة. كانت
// خلف `requireSupabaseAuth` فكان الزائر يرى الجداول فارغة وبطاقات الرأس
// أصفارًا. القاعدة نفسها المطبَّقة في `getSecOverview` فوق: القراءة
// `optionalSupabaseAuth` (سياسات RLS للـ`anon` هي ما يقرر)، والفراغ يُملأ
// بالمحاكاة المرجعية — وصفوف القاعدة الحيّة تفوز متى وصلت.
export const getProjects = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<SecProject[]> => {
    const { resilient } = await import("./exec/showcase-simulation.server");
    return resilient(
      "sec-projects",
      async () => {
        const { data } = await context.supabase
          .from("sec_projects")
          .select("*")
          .order("ends_at", { ascending: true });
        return (data ?? []) as SecProject[];
      },
      (rows) => rows.length === 0,
      // ٢٠٢٦/٠٨/٣٠ — أمر المالك: بديل المشاريع صار مجموعة تصدير «Projects
      // Data» (697 مشروعًا) بدل المولّد الاصطناعي. الصفوف الحيّة من القاعدة
      // تظلّ تفوز متى وصلت؛ هذه تنهض حين تفرغ أو تتأخّر.
      async () => {
        const { REAL_SEC_PROJECTS } = await import("./exec/projects-report.real.server");
        return [...REAL_SEC_PROJECTS];
      },
    );
  });

export const getWorkOrders = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<SecWorkOrder[]> => {
    const { resilient } = await import("./exec/showcase-simulation.server");
    // البديل: مجموعة تصدير SAP المستوردة (249 أمرًا، ٢٠٢٦/٠٩/٠٢) لا
    // المحاكاة المولّدة — إنتاجيةٌ بإقرار المالك، صفوفها مجمّدة بلا شارة.
    // وهي بلا هوية أشخاص لأي نداء (SEC-01، ٢٠٢٦/١٠/١٣): لا منشئ، والموكَّل
    // والمعتمِد والمقاول `null`، والملاحظات محجوبة — يحرسه
    // `maintenance-identity.contract.test.ts` على الحمولة نفسها.
    const { REAL_SEC_WORK_ORDERS } = await import("./exec/maintenance-report.real.server");
    return resilient(
      "sec-work-orders",
      async () => {
        const { data } = await context.supabase
          .from("sec_work_orders")
          .select("*")
          .order("opened_at", { ascending: false });
        return (data ?? []) as SecWorkOrder[];
      },
      (rows) => rows.length === 0,
      () => REAL_SEC_WORK_ORDERS as unknown as SecWorkOrder[],
    );
  });

export const getSections = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<SecSection[]> => {
    const { buildTwinTreeSimulation, resilient } =
      await import("./exec/showcase-simulation.server");
    return resilient(
      "sec-sections",
      async () => {
        const { data } = await context.supabase.from("sec_sections").select("*").order("code");
        return (data ?? []) as SecSection[];
      },
      (rows) => rows.length === 0,
      // نفس شجرة التوأم التي تغذّي `/sec/twin` — قسمٌ واحد لا قسمان
      // متضاربان بين شاشتين تقرآن الشيء نفسه.
      () => buildTwinTreeSimulation(Date.now()).sections as SecSection[],
    );
  });

export const getCircles = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<SecCircle[]> => {
    const { buildTwinTreeSimulation, resilient } =
      await import("./exec/showcase-simulation.server");
    return resilient(
      "sec-circles",
      async () => {
        const { data } = await context.supabase.from("sec_circles").select("*").order("code");
        return (data ?? []) as SecCircle[];
      },
      (rows) => rows.length === 0,
      () =>
        buildTwinTreeSimulation(Date.now()).circles.map(
          ({ sites: _s, control_rooms: _c, patrol_teams: _p, ...circle }) => circle as SecCircle,
        ),
    );
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
  // المادة ٢٧ — مُنسِّقا العرض الموحّدان لما لم يُقَس، بجوار مصدرهما.
  UNMEASURED_AR,
  pctOrUnmeasured,
  numOrUnmeasured,
} from "./sec-exec-kpis.functions";
export type {
  ExecKpis,
  ExecKpiSources,
  PublicKpis,
  ExecTimeseriesPoint,
  ExecTimeseries,
} from "./sec-exec-kpis.functions";
