// Auto-split from sec.functions.ts — executive KPI schema, sources, compute,
// and server functions. Kept as a focused module; re-exported by sec.functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";

// ============= EXECUTIVE KPIs =============
// Zod schema is the canonical contract for the API output. The TS type below
// is inferred from it so the runtime and compile-time shapes never drift.
// Counting fields are required, finite, non-negative integers. Percentage/index
// fields (resolution_rate, health, completion, compliance, risk, safety,
// readiness) must also stay within 0..100. Money totals can grow large but
// must remain safe integers.
//
// المادة ٢٧ — الصدق العددي: المؤشر المشتق من مجموعة مصادر فارغة لا يُقاس،
// فيعود `null` («لم يُقَس») ولا يُختلق صفرًا يُقرأ كأداء منهار. العدّ يبقى
// صفرًا لأن «صفر صفوف» قياسٌ صحيح، أما المتوسط/النسبة فبلا عيّنة لا وجود له.
const nonNegInt = z.number().int().nonnegative().finite();
const pctInt = nonNegInt.max(100);
const nonNegIntOrNull = nonNegInt.nullable();
const pctIntOrNull = pctInt.nullable();
const moneyInt = z
  .number()
  .int()
  .nonnegative()
  .finite()
  .refine((n) => Number.isSafeInteger(n), { message: "must be a safe integer" });

export const ExecKpisSchema = z
  .object({
    incidents_total: nonNegInt,
    incidents_open: nonNegInt,
    incidents_critical: nonNegInt,
    incidents_resolution_rate: pctIntOrNull,
    mttr_minutes: nonNegIntOrNull,
    preventive_wo: nonNegInt,
    corrective_wo: nonNegInt,
    wo_open: nonNegInt,
    wo_closed: nonNegInt,
    projects_in_progress: nonNegInt,
    projects_completed: nonNegInt,
    projects_budget_total: moneyInt,
    projects_spent_total: moneyInt,
    cameras_total: nonNegInt,
    cameras_online: nonNegInt,
    cctv_health: pctIntOrNull,
    gates_total: nonNegInt,
    gates_online: nonNegInt,
    access_health: pctIntOrNull,
    sensors_total: nonNegInt,
    sensors_alarming: nonNegInt,
    // ٢٠٢٦/٠٨/٢٠ — قرار المالك: بطاقة «عدد تنبيهات الكاميرات» تُغذّى من
    // جدول تنبيهات CCTV نفسه (نفس معيار cctv_new في getSecOverview:
    // status === "new") — لا من الحساسات، فإعادة تسمية رقم الحساسات
    // «تنبيهات كاميرات» اختلاقٌ يخالف المادة ٢٧. sensors_alarming يبقى
    // في العقد كما هو.
    cctv_alerts_new: nonNegInt,
    sites_operational: nonNegInt,
    sites_total: nonNegInt,
    patrols_active: nonNegInt,
    patrol_completion: pctIntOrNull,
    visitors_inside: nonNegInt,
    permits_active: nonNegInt,
    contractors_active: nonNegInt,
    contractors_compliance: pctIntOrNull,
    // المخاطر مشتقة من صحة الكاميرات؛ فإن لم تُقَس تلك لم يُقَس هذان.
    risk_index: pctIntOrNull,
    safety_index: pctIntOrNull,
    // مركّب: أي طرف غير مقيس يجعل الجاهزية غير مقيسة.
    executive_readiness: pctIntOrNull,
  })
  .strict();

export type ExecKpis = z.infer<typeof ExecKpisSchema>;

// نص العرض الموحّد للمؤشر غير المقيس (المادة ٢٧). كل سطح يعرض حقلًا قد
// يكون `null` يستعمل هذين المُنسِّقين بدل `?? 0` — فالصفر ادّعاء قياس.
export const UNMEASURED_AR = "لم يُقَس";

/** نسبة مئوية للعرض، أو «لم يُقَس» إن لم تُقَس. */
export function pctOrUnmeasured(v: number | null | undefined): string {
  return v === null || v === undefined ? UNMEASURED_AR : `${v}%`;
}

/** عدد للعرض (مع لاحقة اختيارية)، أو «لم يُقَس» إن لم يُقَس. */
export function numOrUnmeasured(v: number | null | undefined, suffix = ""): string {
  return v === null || v === undefined ? UNMEASURED_AR : `${v}${suffix}`;
}

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
  projects: {
    status: string;
    progress: number;
    budget_sar: number;
    spent_sar: number;
    health: string;
  }[];
  // ٢٠٢٦/٠٨/٢٠ — مصدر «عدد تنبيهات الكاميرات». اختياري عمدًا: بنّاء
  // المحاكاة في showcase-simulation.server.ts ومستهلكو التقارير القدامى
  // (snapshot.server.ts) يمرّرون المصادر الإحدى عشرة القديمة كما هي؛
  // غيابه يُحتسب «صفر صفوف» وهو عدٌّ مقيس لا اختلاق (المادة ٢٧ — العدّ
  // صفرُه صادق). getExecKpis وgetExecDrilldown يجلبانه فعليًا دائمًا.
  cctv?: { status: string }[];
};

// Minimal shape of the authed Supabase client used by fetchExecKpiSources.
// Kept structural so tests can pass an in-memory stub without pulling the full
// supabase-js types — the real client (from `requireSupabaseAuth`) satisfies it.
// The optional `.eq(col, val)` link lets callers using the service-role client
// (which bypasses RLS) scope every query to a tenant's org_id.
type ExecKpiQuery = {
  eq?: (col: string, val: string) => Promise<{ data: unknown }>;
} & Promise<{ data: unknown }>;
type ExecKpiSupabase = {
  from: (table: string) => { select: (cols: string) => ExecKpiQuery };
};

export async function fetchExecKpiSources(
  supabase: ExecKpiSupabase,
  orgId?: string | null,
): Promise<ExecKpiSources> {
  const q = (table: string, cols: string): Promise<{ data: unknown }> => {
    const base = supabase.from(table).select(cols);
    if (orgId && typeof base.eq === "function") {
      return base.eq("org_id", orgId);
    }
    return base;
  };
  const [
    incidents,
    patrols,
    visitors,
    permits,
    contractors,
    sites,
    cameras,
    gates,
    sensors,
    workOrders,
    projects,
  ] = await Promise.all([
    q("sec_incidents", "severity,status,response_minutes"),
    q("sec_patrols", "status,checkpoints_done,checkpoints_total"),
    q("sec_visitors", "status"),
    q("sec_permits", "status"),
    q("sec_contractors", "status,compliance_score"),
    q("sec_sites", "status"),
    q("sec_cameras", "status,health"),
    q("sec_gates", "status,health"),
    q("sec_sensors", "status"),
    q("sec_work_orders", "kind,status"),
    q("sec_projects", "status,progress,budget_sar,spent_sar,health"),
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
  const {
    incidents: I,
    patrols: P,
    visitors: V,
    permits: PM,
    contractors: C,
    sites: S,
    cameras: CAM,
    gates: G,
    sensors: SEN,
    workOrders: WO,
    projects: PRJ,
  } = src;

  const incOpen = I.filter((i) => i.status !== "resolved" && i.status !== "closed").length;
  const incClosed = I.length - incOpen;
  const incCritical = I.filter((i) => i.severity === "critical" && i.status !== "closed").length;
  // المادة ٢٧: بلا بلاغ زمنه مسجَّل لا يوجد متوسط استجابة — null لا صفر
  // (صفر دقيقة استجابة ادّعاء أداء مثالي، وهو أخطر من غياب الرقم).
  const responded = I.filter((i) => i.response_minutes != null);
  const mttr = responded.length
    ? responded.reduce((s, i) => s + (i.response_minutes ?? 0), 0) / responded.length
    : null;
  const camOnline = CAM.filter((c) => c.status === "online").length;
  const gateOnline = G.filter((g) => g.status === "online").length;
  // بلا كاميرات مسجَّلة لا تُقاس صحة المنظومة — وليست منهارة عند الصفر.
  const cctvHealth = CAM.length
    ? Math.round(CAM.reduce((s, c) => s + c.health, 0) / CAM.length)
    : null;
  const accessHealth = G.length ? Math.round(G.reduce((s, g) => s + g.health, 0) / G.length) : null;
  const sensorsAlarming = SEN.filter((s) => s.status === "alarm" || s.status === "offline").length;
  // الدوريات: تُحسب النسبة من الدوريات ذات نقاط تفتيش فقط. دورية بمقام
  // صفري لا تُقاس، وإدخالها بصفر كان يخفض النسبة بقياسٍ لم يقع أصلًا؛
  // وإن لم تكن ثمة دورية قابلة للقياس فالنتيجة «لم يُقَس» لا صفر.
  const measurableP = P.filter((p) => p.checkpoints_total > 0);
  const patrolCompletion = measurableP.length
    ? Math.round(
        (measurableP.reduce((s, p) => s + p.checkpoints_done / p.checkpoints_total, 0) /
          measurableP.length) *
          100,
      )
    : null;
  const compliance = C.length
    ? Math.round(C.reduce((s, c) => s + c.compliance_score, 0) / C.length)
    : null;
  // بلا بلاغات لا توجد نسبة إغلاق (كان يُحسب 0/1 فيظهر 0% إنجاز مُختلق).
  const resolutionRate = I.length ? Math.round((incClosed / I.length) * 100) : null;
  // المخاطر تستهلك صحة الكاميرات؛ الصفر المُختلق كان يضيف 50 نقطة خطر وهمية.
  const riskIndexRaw =
    cctvHealth === null
      ? null
      : Math.min(100, incCritical * 15 + sensorsAlarming * 5 + (100 - cctvHealth) / 2);
  const safetyIndexRaw = riskIndexRaw === null ? null : Math.max(0, 100 - riskIndexRaw);
  // المركّب: أي طرف غير مقيس ⇐ الجاهزية غير مقيسة (لا متوسط فوق فراغ).
  const readinessParts = [cctvHealth, accessHealth, compliance, patrolCompletion, safetyIndexRaw];
  const executiveReadiness = readinessParts.some((v) => v === null)
    ? null
    : Math.round((readinessParts as number[]).reduce((s, v) => s + v, 0) / readinessParts.length);

  return {
    incidents_total: I.length,
    incidents_open: incOpen,
    incidents_critical: incCritical,
    incidents_resolution_rate: resolutionRate,
    mttr_minutes: mttr === null ? null : Math.round(mttr),
    preventive_wo: WO.filter((w) => w.kind === "preventive").length,
    corrective_wo: WO.filter((w) => w.kind === "corrective").length,
    wo_open: WO.filter((w) => w.status !== "closed" && w.status !== "cancelled").length,
    wo_closed: WO.filter((w) => w.status === "closed").length,
    projects_in_progress: PRJ.filter((p) => p.status === "in-progress").length,
    projects_completed: PRJ.filter((p) => p.status === "completed").length,
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
    // نفس معيار `cctv_new` في getSecOverview (sec.functions.ts): status === "new".
    cctv_alerts_new: (src.cctv ?? []).filter((c) => c.status === "new").length,
    sites_operational: S.filter((s) => s.status === "operational").length,
    sites_total: S.length,
    patrols_active: P.filter((p) => p.status === "active").length,
    patrol_completion: patrolCompletion,
    visitors_inside: V.filter((v) => v.status === "inside" || v.status === "overdue").length,
    permits_active: PM.filter((p) => p.status === "active" || p.status === "approved").length,
    contractors_active: C.filter((c) => c.status === "active").length,
    contractors_compliance: compliance,
    risk_index: riskIndexRaw === null ? null : Math.round(riskIndexRaw),
    safety_index: safetyIndexRaw === null ? null : Math.round(safetyIndexRaw),
    executive_readiness: executiveReadiness,
  };
}

export const getExecKpis = createServerFn({ method: "GET" })
  // Open showcase read: guests get the anon client (RLS decides). With no
  // visible rows at all, the built-in simulation sources fill the board
  // (doctrine «بيانات لا تفرغ» — CLAUDE.md).
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<ExecKpis> => {
    const { buildExecKpiSourcesSimulation, resilient } =
      await import("./exec/showcase-simulation.server");
    const supabase = context.supabase as unknown as ExecKpiSupabase;
    const sources = await resilient(
      "exec-kpis",
      // ٢٠٢٦/٠٨/٢٠ — تنبيهات CCTV تُجلب هنا بجوار المصادر الإحدى عشرة لا
      // داخل fetchExecKpiSources: عقد تلك الدالة (11 استعلامًا بإسقاطاتها
      // الموثقة) محروس باختبار، ومستهلكوها الآخرون لا يحتاجون التنبيهات.
      async () => {
        const [base, cctv] = await Promise.all([
          fetchExecKpiSources(supabase),
          supabase.from("sec_cctv_alerts").select("status"),
        ]);
        return { ...base, cctv: (cctv.data ?? []) as { status: string }[] };
      },
      (s) => Object.values(s).every((rows) => Array.isArray(rows) && rows.length === 0),
      () => ({ ...buildExecKpiSourcesSimulation(), cctv: buildExecCctvSimulation() }),
    );
    return computeExecKpis(sources);
  });

// ============= PUBLIC KPIS =============
// Aggregate-only counts for the public homepage strip. No PII — just numbers.
// Uses the admin client (server-only, loaded inside handler) to bypass RLS
// safely because only COUNT(*) is returned.
export type PublicKpis = {
  incidents_total: number;
  incidents_open: number;
  incidents_critical: number;
  incidents_resolution_rate: number;
  work_orders_active: number;
  projects_in_progress: number;
  permits_active: number;
  maintenance_pending: number;
  risk_level: "low" | "elevated" | "critical";
  generated_at: string;
};

/**
 * Public marketing KPIs for the anonymous landing page (MissionControlStrip).
 *
 * SECURITY: this endpoint is intentionally unauthenticated, so it MUST NOT
 * query real tenant data. Previously it aggregated counts across
 * `sec_incidents` / `sec_work_orders` / `sec_projects` / `sec_permits` with
 * the service-role client and no `org_id` filter, which leaked live
 * cross-tenant operational posture (open/critical incident counts) to any
 * anonymous internet visitor. That is competitive and adversarial signal
 * for an industrial physical-security product.
 *
 * The public strip is a marketing surface, not an operations dashboard —
 * real numbers belong behind auth + org scope in `/sec/*`. We return a
 * fixed, plausible synthetic snapshot here. If richer public metrics are
 * ever needed, add an authenticated variant scoped through
 * `is_org_member(org_id,'viewer')` against the RLS-scoped client.
 */
export const getPublicKpis = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicKpis> => {
    return {
      incidents_total: 128,
      incidents_open: 6,
      incidents_critical: 0,
      incidents_resolution_rate: 95,
      work_orders_active: 18,
      projects_in_progress: 4,
      permits_active: 12,
      maintenance_pending: 9,
      risk_level: "low",
      generated_at: new Date().toISOString(),
    };
  },
);

// ============= EXECUTIVE TIME SERIES =============
// Daily buckets of incidents, work orders, patrols and resolution over a window.
// Used by the Live Executive Dashboard charts. RLS-scoped as the caller.
export type ExecTimeseriesPoint = {
  day: string; // YYYY-MM-DD (UTC)
  incidents_total: number;
  incidents_critical: number;
  incidents_high: number;
  incidents_resolved: number;
  work_orders_opened: number;
  work_orders_closed: number;
  patrols_completed: number;
  avg_response_minutes: number | null;
};

export type ExecTimeseries = {
  from: string;
  to: string;
  days: number;
  points: ExecTimeseriesPoint[];
  totals: {
    incidents: number;
    incidents_resolved: number;
    // المادة ٢٧: بلا بلاغات في النافذة لا توجد نسبة إغلاق — null لا صفر.
    resolution_rate: number | null; // 0..100 أو null إن لم يُقَس
    work_orders_opened: number;
    work_orders_closed: number;
    patrols_completed: number;
    avg_response_minutes: number | null;
  };
};

// السلسلة الزمنية التنفيذية — أختها `getExecKpis` فوقها تحت
// `optionalSupabaseAuth` منذ البداية، وهما تُقرآن في الشاشة نفسها.
// قراءة عرض على شاشة يفتحها زائر: `optionalSupabaseAuth` — سياسات RLS
// للـ`anon` هي ما يقرر ما يُرى، لا خطأ مصادقة يوقف الشاشة.
export const getExecTimeseries = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input: { days?: number } | undefined) =>
    z.object({ days: z.number().int().min(1).max(180).default(30) }).parse(input ?? {}),
  )
  .handler(async ({ context, data }): Promise<ExecTimeseries> => {
    const { supabase } = context;
    const days = data.days;
    const to = new Date();
    const from = new Date(to.getTime() - days * 86_400_000);
    const fromIso = from.toISOString();

    const [incRes, woOpened, woClosed, patrolRes] = await Promise.all([
      supabase
        .from("sec_incidents")
        .select("reported_at,resolved_at,severity,status,response_minutes")
        .gte("reported_at", fromIso)
        .limit(5000),
      supabase.from("sec_work_orders").select("opened_at").gte("opened_at", fromIso).limit(5000),
      supabase
        .from("sec_work_orders")
        .select("closed_at")
        .not("closed_at", "is", null)
        .gte("closed_at", fromIso)
        .limit(5000),
      supabase
        .from("sec_patrols")
        .select("ended_at,status")
        .not("ended_at", "is", null)
        .gte("ended_at", fromIso)
        .limit(5000),
    ]);

    const buckets = new Map<string, ExecTimeseriesPoint>();
    for (let i = 0; i <= days; i++) {
      const d = new Date(from.getTime() + i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, {
        day: key,
        incidents_total: 0,
        incidents_critical: 0,
        incidents_high: 0,
        incidents_resolved: 0,
        work_orders_opened: 0,
        work_orders_closed: 0,
        patrols_completed: 0,
        avg_response_minutes: null,
      });
    }

    const respSum = new Map<string, { sum: number; n: number }>();

    for (const row of incRes.data ?? []) {
      const key = (row.reported_at as string).slice(0, 10);
      const b = buckets.get(key);
      if (!b) continue;
      b.incidents_total += 1;
      if (row.severity === "critical") b.incidents_critical += 1;
      if (row.severity === "high") b.incidents_high += 1;
      if (row.status === "resolved" || row.status === "closed") b.incidents_resolved += 1;
      if (typeof row.response_minutes === "number") {
        const cur = respSum.get(key) ?? { sum: 0, n: 0 };
        cur.sum += row.response_minutes;
        cur.n += 1;
        respSum.set(key, cur);
      }
    }
    for (const [key, agg] of respSum) {
      const b = buckets.get(key);
      if (b && agg.n > 0) b.avg_response_minutes = Math.round(agg.sum / agg.n);
    }
    for (const row of woOpened.data ?? []) {
      const key = (row.opened_at as string).slice(0, 10);
      const b = buckets.get(key);
      if (b) b.work_orders_opened += 1;
    }
    for (const row of woClosed.data ?? []) {
      const key = (row.closed_at as string).slice(0, 10);
      const b = buckets.get(key);
      if (b) b.work_orders_closed += 1;
    }
    for (const row of patrolRes.data ?? []) {
      if (row.status !== "completed") continue;
      const key = (row.ended_at as string).slice(0, 10);
      const b = buckets.get(key);
      if (b) b.patrols_completed += 1;
    }

    const points = Array.from(buckets.values()).sort((a, b) => a.day.localeCompare(b.day));
    const incidents = points.reduce((s, p) => s + p.incidents_total, 0);
    const incidents_resolved = points.reduce((s, p) => s + p.incidents_resolved, 0);
    const wo_opened = points.reduce((s, p) => s + p.work_orders_opened, 0);
    const wo_closed = points.reduce((s, p) => s + p.work_orders_closed, 0);
    const patrols = points.reduce((s, p) => s + p.patrols_completed, 0);
    const respAll = Array.from(respSum.values());
    const avg =
      respAll.length === 0
        ? null
        : Math.round(
            respAll.reduce((s, a) => s + a.sum, 0) /
              Math.max(
                1,
                respAll.reduce((s, a) => s + a.n, 0),
              ),
          );

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      days,
      points,
      totals: {
        incidents,
        incidents_resolved,
        resolution_rate:
          incidents === 0 ? null : Math.round((incidents_resolved / incidents) * 100),
        work_orders_opened: wo_opened,
        work_orders_closed: wo_closed,
        patrols_completed: patrols,
        avg_response_minutes: avg,
      },
    };
  });

// ============= EXECUTIVE DRILLDOWN =============
// ٢٠٢٦/٠٨/٢٠ — قرار المالك (الملاحظات الحمراء): كل بطاقة رقمية في اللوحة
// التنفيذية تُفتح على الصفوف الحقيقية خلف رقمها. المادة ٢٧ تحكم البناء:
// كل مقياس يعيد نفس الصفوف التي عدّها computeExecKpis بنفس المعايير حرفيًّا
// — لا عيّنة «مشابهة» ولا صفوف مزخرفة. المصدر الفارغ يعيد rows: []
// ومجموعًا صادقًا (أو null لما لم يُقَس)، والمحاكاة المرجعية تُقدَّم فقط
// حين تسقط القاعدة كلها — بنفس لحظة سقوط لوحة المؤشرات نفسها، فلا يرى
// الزائر بطاقة تقول 0 ونافذة تعرض صفوفًا.

export const EXEC_DRILL_METRICS = [
  "incidents_total",
  "incidents_open",
  "incidents_critical",
  "incidents_resolution",
  "mttr",
  "wo_open",
  "wo_closed",
  "projects_in_progress",
  "projects_completed",
  "cameras_connected",
  "gates_online",
  "cctv_alerts_new",
  "patrols_active",
  "patrol_completion",
  "visitors_inside",
  "permits_active",
  "contractors_active",
] as const;
export type ExecDrillMetric = (typeof EXEC_DRILL_METRICS)[number];

export interface ExecDrillRow {
  id: string;
  title_ar: string;
  subtitle_ar?: string;
  status_ar?: string;
  tone?: "danger" | "warning" | "success" | "default";
  value?: string;
}

export interface ExecDrilldown {
  metric: ExecDrillMetric;
  title_ar: string;
  rows: ExecDrillRow[];
  total: number | null;
  note_ar?: string;
  /** شارة الصدق: الصفوف من المحاكاة المرجعية لا من صفوف القاعدة الحية. */
  is_simulation?: boolean;
}

// نفس جداول fetchExecKpiSources بإسقاطات موسَّعة (أسماء/عناوين) — أسماء
// الأعمدة مطابقة حرفيًّا لما في supabase/migrations/20260621195540 و
// 20260623130131؛ عمود خاطئ يُفرغ الاستعلام صامتًا. sites/sensors تبقيان
// بإسقاط الحالة فقط: لا بطاقة لهما، لكن حضورهما يجعل معيار «القاعدة كلها
// فارغة» مطابقًا لمعيار getExecKpis فلا تفترق البطاقة عن نافذتها.
export type ExecDrillSources = {
  incidents: {
    id: string;
    ref: string;
    title_ar: string;
    severity: string;
    status: string;
    response_minutes: number | null;
  }[];
  patrols: {
    id: string;
    ref: string;
    team: string;
    route: string;
    status: string;
    checkpoints_done: number;
    checkpoints_total: number;
  }[];
  visitors: {
    id: string;
    ref: string;
    full_name: string;
    organization: string | null;
    status: string;
  }[];
  permits: {
    id: string;
    ref: string;
    work_type: string;
    contractor: string;
    risk_level: string;
    status: string;
  }[];
  contractors: {
    id: string;
    ref: string;
    name: string;
    contract_no: string;
    workers_count: number;
    compliance_score: number;
    status: string;
  }[];
  cameras: { id: string; code: string; status: string; health: number }[];
  gates: { id: string; code: string; status: string; health: number }[];
  workOrders: { id: string; ref: string; title_ar: string; kind: string; status: string }[];
  projects: {
    id: string;
    ref: string;
    name_ar: string;
    contractor: string | null;
    status: string;
    progress: number;
    health: string;
  }[];
  cctv: {
    id: string;
    ref: string;
    camera_code: string;
    alert_type: string;
    status: string;
    confidence: number;
  }[];
  sites: { status: string }[];
  sensors: { status: string }[];
};

export async function fetchExecDrillSources(supabase: ExecKpiSupabase): Promise<ExecDrillSources> {
  const q = (table: string, cols: string): Promise<{ data: unknown }> =>
    supabase.from(table).select(cols);
  const [
    incidents,
    patrols,
    visitors,
    permits,
    contractors,
    cameras,
    gates,
    workOrders,
    projects,
    cctv,
    sites,
    sensors,
  ] = await Promise.all([
    q("sec_incidents", "id,ref,title_ar,severity,status,response_minutes"),
    q("sec_patrols", "id,ref,team,route,status,checkpoints_done,checkpoints_total"),
    q("sec_visitors", "id,ref,full_name,organization,status"),
    q("sec_permits", "id,ref,work_type,contractor,risk_level,status"),
    q("sec_contractors", "id,ref,name,contract_no,workers_count,compliance_score,status"),
    // لا عمود اسم في sec_cameras/sec_gates — `code` هو المعرّف المعروض.
    q("sec_cameras", "id,code,status,health"),
    q("sec_gates", "id,code,status,health"),
    q("sec_work_orders", "id,ref,title_ar,kind,status"),
    q("sec_projects", "id,ref,name_ar,contractor,status,progress,health"),
    q("sec_cctv_alerts", "id,ref,camera_code,alert_type,status,confidence"),
    q("sec_sites", "status"),
    q("sec_sensors", "status"),
  ]);
  return {
    incidents: (incidents.data ?? []) as ExecDrillSources["incidents"],
    patrols: (patrols.data ?? []) as ExecDrillSources["patrols"],
    visitors: (visitors.data ?? []) as ExecDrillSources["visitors"],
    permits: (permits.data ?? []) as ExecDrillSources["permits"],
    contractors: (contractors.data ?? []) as ExecDrillSources["contractors"],
    cameras: (cameras.data ?? []) as ExecDrillSources["cameras"],
    gates: (gates.data ?? []) as ExecDrillSources["gates"],
    workOrders: (workOrders.data ?? []) as ExecDrillSources["workOrders"],
    projects: (projects.data ?? []) as ExecDrillSources["projects"],
    cctv: (cctv.data ?? []) as ExecDrillSources["cctv"],
    sites: (sites.data ?? []) as ExecDrillSources["sites"],
    sensors: (sensors.data ?? []) as ExecDrillSources["sensors"],
  };
}

/* ── محاكاة النافذة التفصيلية ─────────────────────────────────────────────
   تُشتق من نفس بنّاء المحاكاة الذي تسقط إليه المؤشرات
   (buildExecKpiSourcesSimulation) صفًّا بصفّ، فالأعداد في النافذة تطابق
   أرقام البطاقات المحاكاة دائمًا. صفوف ذلك البنّاء بلا أسماء (إسقاطات
   عدّ فقط)، فالأسماء هنا محتوى عرضٍ حتمي بنفس صوت بقية المحاكاة —
   وresilient يسِمها كلها is_simulation=true. */

const pickSim = <T>(pool: readonly T[], i: number): T => pool[i % pool.length]!;

const SIM_INCIDENT_TITLES = [
  "تسرّب غاز محتمل — منطقة الخزانات",
  "إنذار تسلق سياج — المحيط الشمالي",
  "محاولة دخول ببطاقة منتهية",
  "عدم ارتداء معدات الوقاية",
  "انقطاع بث كاميرا مراقبة",
  "بوابة عالقة في وضع الفتح",
  "رصد حركة غير معتادة بعد الدوام",
  "تجاوز سرعة داخل الموقع",
] as const;
const SIM_CONTRACTOR_NAMES = [
  "شركة الإنشاءات المتقدمة",
  "المقاول الوطني للطاقة",
  "أعمال الارتفاعات المحدودة",
  "شركة الصيانة الصناعية",
  "صيانة الشبكات الموحدة",
  "الحلول الكهروميكانيكية",
  "النظافة والدعم اللوجستي",
  "خدمات العزل والطلاء",
] as const;
const SIM_FIRST_NAMES = [
  "خالد",
  "سارة",
  "فهد",
  "نورة",
  "عبدالله",
  "ريم",
  "سلطان",
  "لمى",
  "بدر",
  "هند",
  "ماجد",
  "أفنان",
] as const;
const SIM_LAST_NAMES = [
  "العتيبي",
  "الحربي",
  "القحطاني",
  "الدوسري",
  "الشهري",
  "الشمري",
  "الغامدي",
  "المطيري",
  "الزهراني",
  "السبيعي",
  "عسيري",
  "الرشيدي",
] as const;
const SIM_PATROL_TEAMS = ["فريق الصقر", "فريق النمر", "فريق العقاب", "فريق الفهد"] as const;
const SIM_PATROL_ROUTES = [
  "المحيط الغربي",
  "الحلقة الداخلية",
  "المحيط الشمالي",
  "بوابات الجنوب",
  "المحيط الشرقي",
] as const;
const SIM_WO_PREVENTIVE = [
  "صيانة وقائية لكاميرات المحيط",
  "فحص دوري لبوابات الدخول",
  "معايرة حساسات كشف التسلل",
  "اختبار مولد الطوارئ",
  "تنظيف عدسات الكاميرات الحرارية",
  "فحص أنظمة الإنذار المبكر",
] as const;
const SIM_WO_CORRECTIVE = [
  "إصلاح كاميرا متوقفة عن البث",
  "استبدال قارئ بطاقات معطّل",
  "إصلاح إنارة المحيط الجنوبي",
  "معالجة عطل بوابة المقاولين",
] as const;
const SIM_PROJECT_NAMES = [
  "توسعة نظام المراقبة للمنطقة الغربية",
  "ترقية أنظمة التحكم بالدخول",
  "شبكة كشف التسلل المحيطي",
  "مركز القيادة الاحتياطي",
  "أتمتة بوابات الشحن",
] as const;
const SIM_PERMIT_TYPES = [
  "أعمال ساخنة",
  "أعمال كهربائية",
  "عمل على ارتفاع",
  "دخول مساحة محصورة",
] as const;
const SIM_PERMIT_RISKS = ["high", "medium", "low"] as const;
const SIM_VISITOR_ORGS = [
  "شركة المراجعة الوطنية",
  "هيئة التقييس الخليجية",
  "مكتب الاستشارات الهندسية",
  "الخدمات الطبية المساندة",
  ...SIM_CONTRACTOR_NAMES,
] as const;

/** تنبيهات CCTV المحاكاة — مصدر واحد لمؤشر البطاقة ولصفوف النافذة معًا. */
export function buildExecCctvSimulation(): ExecDrillSources["cctv"] {
  return [
    {
      id: "sim-cv1",
      ref: "CV-901",
      camera_code: "CAM-E-12",
      alert_type: "motion",
      status: "new",
      confidence: 0.92,
    },
    {
      id: "sim-cv2",
      ref: "CV-900",
      camera_code: "CAM-PTZ-7",
      alert_type: "loitering",
      status: "new",
      confidence: 0.81,
    },
    {
      id: "sim-cv3",
      ref: "CV-899",
      camera_code: "CAM-N-4",
      alert_type: "intrusion",
      status: "dispatched",
      confidence: 0.77,
    },
    {
      id: "sim-cv4",
      ref: "CV-898",
      camera_code: "CAM-S-2",
      alert_type: "camera_offline",
      status: "resolved",
      confidence: 1,
    },
  ];
}

export function buildExecDrillSourcesSimulation(kpi: ExecKpiSources): ExecDrillSources {
  return {
    incidents: kpi.incidents.map((r, i) => ({
      id: `sim-drill-inc-${i + 1}`,
      ref: `INC-${2400 + i}`,
      title_ar: pickSim(SIM_INCIDENT_TITLES, i),
      severity: r.severity,
      status: r.status,
      response_minutes: r.response_minutes,
    })),
    patrols: kpi.patrols.map((r, i) => ({
      id: `sim-drill-pt-${i + 1}`,
      ref: `PTR-${80 + i}`,
      team: pickSim(SIM_PATROL_TEAMS, i),
      route: pickSim(SIM_PATROL_ROUTES, i),
      status: r.status,
      checkpoints_done: r.checkpoints_done,
      checkpoints_total: r.checkpoints_total,
    })),
    visitors: kpi.visitors.map((r, i) => ({
      id: `sim-drill-vis-${i + 1}`,
      ref: `VIS-${500 + i}`,
      // زوج (اسم أول i، اسم أخير 7i+⌊i/12⌋) لا يتكرر قبل 144 صفًّا.
      full_name: `${pickSim(SIM_FIRST_NAMES, i)} ${pickSim(SIM_LAST_NAMES, i * 7 + Math.floor(i / 12))}`,
      organization: pickSim(SIM_VISITOR_ORGS, i),
      status: r.status,
    })),
    permits: kpi.permits.map((r, i) => ({
      id: `sim-drill-pm-${i + 1}`,
      ref: `PTW-SIM-${String(i + 1).padStart(3, "0")}`,
      work_type: pickSim(SIM_PERMIT_TYPES, i),
      contractor: pickSim(SIM_CONTRACTOR_NAMES, i),
      risk_level: pickSim(SIM_PERMIT_RISKS, i),
      status: r.status,
    })),
    contractors: kpi.contractors.map((r, i) => ({
      id: `sim-drill-con-${i + 1}`,
      ref: `CTR-${11 + i}`,
      name: pickSim(SIM_CONTRACTOR_NAMES, i),
      contract_no: `C-2025-${String(i + 11).padStart(2, "0")}`,
      workers_count: 15 + i * 9,
      compliance_score: r.compliance_score,
      status: r.status,
    })),
    cameras: kpi.cameras.map((r, i) => ({
      id: `sim-drill-cam-${i + 1}`,
      code: `CAM-${String(i + 1).padStart(3, "0")}`,
      status: r.status,
      health: r.health,
    })),
    gates: kpi.gates.map((r, i) => ({
      id: `sim-drill-gate-${i + 1}`,
      code: `GT-${String(i + 1).padStart(2, "0")}`,
      status: r.status,
      health: r.health,
    })),
    workOrders: kpi.workOrders.map((r, i) => ({
      id: `sim-drill-wo-${i + 1}`,
      ref: `WO-${1400 + i}`,
      title_ar:
        r.kind === "corrective" ? pickSim(SIM_WO_CORRECTIVE, i) : pickSim(SIM_WO_PREVENTIVE, i),
      kind: r.kind,
      status: r.status,
    })),
    projects: kpi.projects.map((r, i) => ({
      id: `sim-drill-prj-${i + 1}`,
      ref: `PRJ-${21 + i}`,
      name_ar: pickSim(SIM_PROJECT_NAMES, i),
      contractor: pickSim(SIM_CONTRACTOR_NAMES, i + 1),
      status: r.status,
      progress: r.progress,
      health: r.health,
    })),
    cctv: buildExecCctvSimulation(),
    sites: kpi.sites.map((s) => ({ status: s.status })),
    sensors: kpi.sensors.map((s) => ({ status: s.status })),
  };
}

/* ── حساب النافذة التفصيلية ─────────────────────────────────────────────── */

const DRILL_TITLES_AR: Record<ExecDrillMetric, string> = {
  incidents_total: "إجمالي البلاغات",
  incidents_open: "البلاغات المفتوحة",
  incidents_critical: "البلاغات الحرجة",
  incidents_resolution: "نسبة حل البلاغات",
  mttr: "متوسط زمن الاستجابة (MTTR)",
  wo_open: "أوامر عمل مفتوحة",
  wo_closed: "أوامر عمل مغلقة",
  projects_in_progress: "مشاريع جارية",
  projects_completed: "مشاريع مكتملة",
  cameras_connected: "الكاميرات المتصلة",
  gates_online: "أنظمة التحكم بالدخول",
  cctv_alerts_new: "تنبيهات الكاميرات الجديدة",
  patrols_active: "دوريات نشطة",
  patrol_completion: "إنجاز الدوريات",
  visitors_inside: "زوّار بالداخل",
  permits_active: "تصاريح فعّالة",
  contractors_active: "مقاولون نشطون",
};

const INCIDENT_STATUS_AR: Record<string, string> = {
  open: "مفتوح",
  investigating: "قيد التحقيق",
  contained: "محتوى",
  resolved: "محلول",
  closed: "مغلق",
};
const SEVERITY_AR: Record<string, string> = {
  critical: "حرجة",
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};
const WO_STATUS_AR: Record<string, string> = {
  open: "مفتوح",
  assigned: "مُسنَد",
  "in-progress": "قيد التنفيذ",
  in_progress: "قيد التنفيذ",
  "on-hold": "معلّق",
  closed: "مغلق",
  cancelled: "ملغى",
};
const DEVICE_STATUS_AR: Record<string, string> = {
  online: "متصلة",
  offline: "غير متصلة",
  degraded: "متدهورة",
  maintenance: "قيد الصيانة",
};
const PATROL_STATUS_AR: Record<string, string> = {
  scheduled: "مجدولة",
  active: "نشطة",
  completed: "مكتملة",
  missed: "فائتة",
};
const ALERT_TYPE_AR: Record<string, string> = {
  motion: "رصد حركة",
  loitering: "تسكّع",
  intrusion: "تسلل",
  camera_offline: "انقطاع كاميرا",
  tamper: "عبث بالكاميرا",
};
const RISK_AR: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  critical: "حرجة",
};

// سقف العرض داخل النافذة: المجموع يبقى صادقًا على كامل المجموعة، والقصّ
// يُصرَّح به في note_ar — لا يُقتطع الرقم نفسه أبدًا (المادة ٢٧).
const MAX_DRILL_ROWS = 60;

function incidentTone(i: { severity: string; status: string }): NonNullable<ExecDrillRow["tone"]> {
  if (i.severity === "critical" && i.status !== "closed") return "danger";
  if (i.status !== "resolved" && i.status !== "closed") return "warning";
  return "success";
}

function incidentRow(i: ExecDrillSources["incidents"][number]): ExecDrillRow {
  return {
    id: i.id,
    title_ar: i.title_ar,
    subtitle_ar: `${i.ref} · خطورة ${SEVERITY_AR[i.severity] ?? i.severity}`,
    status_ar: INCIDENT_STATUS_AR[i.status] ?? i.status,
    tone: incidentTone(i),
  };
}

function deviceRow(
  d: { id: string; code: string; status: string; health: number },
  kindAr: string,
): ExecDrillRow {
  return {
    id: d.id,
    title_ar: d.code,
    subtitle_ar: kindAr,
    // كلمة الحالة مع الشكل — الاتصال لا يُحمل على اللون وحده أبدًا.
    status_ar: DEVICE_STATUS_AR[d.status] ?? d.status,
    tone: d.status === "online" ? "success" : d.status === "offline" ? "danger" : "warning",
    value: `${d.health}%`,
  };
}

// المعطّل أولًا — هو ما فُتحت النافذة لأجله.
const DEVICE_ORDER: Record<string, number> = { offline: 0, degraded: 1, maintenance: 2, online: 3 };
const byDeviceStatus = (a: { status: string; code: string }, b: { status: string; code: string }) =>
  (DEVICE_ORDER[a.status] ?? 9) - (DEVICE_ORDER[b.status] ?? 9) || a.code.localeCompare(b.code);

export function computeExecDrilldown(
  metric: ExecDrillMetric,
  src: ExecDrillSources,
): ExecDrilldown {
  const simulated = (src as { is_simulation?: boolean }).is_simulation === true;
  const finish = (rows: ExecDrillRow[], total: number | null, note_ar?: string): ExecDrilldown => {
    const capped = rows.length > MAX_DRILL_ROWS;
    const capNote = capped ? `يُعرض أول ${MAX_DRILL_ROWS} صفًا من أصل ${rows.length}` : undefined;
    return {
      metric,
      title_ar: DRILL_TITLES_AR[metric],
      rows: capped ? rows.slice(0, MAX_DRILL_ROWS) : rows,
      total,
      note_ar: [note_ar, capNote].filter(Boolean).join(" — ") || undefined,
      ...(simulated ? { is_simulation: true } : {}),
    };
  };

  const I = src.incidents;
  switch (metric) {
    // معايير البلاغات الأربعة منسوخة حرفيًّا من computeExecKpis — أي
    // انحراف يجعل النافذة تعدّ غير ما عدّته البطاقة.
    case "incidents_total":
      return finish(I.map(incidentRow), I.length, `${I.length} بلاغًا مسجّلًا`);
    case "incidents_open": {
      const rows = I.filter((i) => i.status !== "resolved" && i.status !== "closed");
      return finish(rows.map(incidentRow), rows.length, `${rows.length} بلاغًا غير مُغلق`);
    }
    case "incidents_critical": {
      const rows = I.filter((i) => i.severity === "critical" && i.status !== "closed");
      return finish(rows.map(incidentRow), rows.length, `${rows.length} بلاغًا حرجًا قائمًا`);
    }
    case "incidents_resolution": {
      const done = I.filter((i) => i.status === "resolved" || i.status === "closed");
      const rate = I.length ? Math.round((done.length / I.length) * 100) : null;
      return finish(
        done.map(incidentRow),
        rate,
        rate === null
          ? "لا بلاغات مسجّلة — النسبة لم تُقَس"
          : `${done.length} محلولة أو مغلقة من أصل ${I.length} — ${rate}%`,
      );
    }
    case "mttr": {
      const responded = I.filter((i) => i.response_minutes != null);
      const avg = responded.length
        ? Math.round(
            responded.reduce((s, i) => s + (i.response_minutes ?? 0), 0) / responded.length,
          )
        : null;
      return finish(
        responded.map((i) => ({
          ...incidentRow(i),
          value: `${i.response_minutes} د`,
          tone: (i.response_minutes ?? 0) <= 15 ? "success" : "warning",
        })),
        avg,
        avg === null
          ? "لا بلاغ بزمن استجابة مسجّل — المتوسط لم يُقَس"
          : `متوسط ${avg} دقيقة عبر ${responded.length} بلاغًا (الهدف ≤ 15 د)`,
      );
    }
    case "wo_open": {
      const rows = src.workOrders.filter((w) => w.status !== "closed" && w.status !== "cancelled");
      return finish(
        rows.map((w) => ({
          id: w.id,
          title_ar: w.title_ar,
          subtitle_ar: `${w.ref} · ${w.kind === "preventive" ? "وقائية" : "تصحيحية"}`,
          status_ar: WO_STATUS_AR[w.status] ?? w.status,
          tone: w.status === "on-hold" ? "warning" : "default",
        })),
        rows.length,
        `${rows.length} أمر عمل قائمًا`,
      );
    }
    case "wo_closed": {
      const rows = src.workOrders.filter((w) => w.status === "closed");
      return finish(
        rows.map((w) => ({
          id: w.id,
          title_ar: w.title_ar,
          subtitle_ar: `${w.ref} · ${w.kind === "preventive" ? "وقائية" : "تصحيحية"}`,
          status_ar: "مغلق",
          tone: "success",
        })),
        rows.length,
        `${rows.length} أمر عمل مغلقًا`,
      );
    }
    case "projects_in_progress":
    case "projects_completed": {
      const wanted = metric === "projects_completed" ? "completed" : "in-progress";
      const rows = src.projects.filter((p) => p.status === wanted);
      const toneOf = (h: string): ExecDrillRow["tone"] =>
        h === "red"
          ? "danger"
          : h === "amber" || h === "watch"
            ? "warning"
            : h === "green" || h === "on_track" || h === "done"
              ? "success"
              : "default";
      return finish(
        rows.map((p) => ({
          id: p.id,
          title_ar: p.name_ar,
          subtitle_ar: p.contractor ? `${p.ref} · ${p.contractor}` : p.ref,
          status_ar: wanted === "completed" ? "مكتمل" : "جارٍ",
          tone: wanted === "completed" ? "success" : toneOf(p.health),
          value: `${p.progress}%`,
        })),
        rows.length,
        wanted === "completed" ? `${rows.length} مشروعًا مكتملًا` : `${rows.length} مشروعًا جاريًا`,
      );
    }
    case "cameras_connected": {
      const online = src.cameras.filter((c) => c.status === "online").length;
      return finish(
        [...src.cameras].sort(byDeviceStatus).map((c) => deviceRow(c, "كاميرا مراقبة")),
        online,
        src.cameras.length
          ? `${online} متصلة من أصل ${src.cameras.length} كاميرا`
          : "لا كاميرات مسجّلة",
      );
    }
    case "gates_online": {
      const online = src.gates.filter((g) => g.status === "online").length;
      return finish(
        [...src.gates].sort(byDeviceStatus).map((g) => deviceRow(g, "بوابة تحكم بالدخول")),
        online,
        src.gates.length ? `${online} متصلة من أصل ${src.gates.length} بوابة` : "لا بوابات مسجّلة",
      );
    }
    case "cctv_alerts_new": {
      // نفس معيار cctv_new في getSecOverview: status === "new".
      const rows = src.cctv.filter((c) => c.status === "new");
      return finish(
        rows.map((c) => ({
          id: c.id,
          title_ar: `${ALERT_TYPE_AR[c.alert_type] ?? c.alert_type} — ${c.camera_code}`,
          subtitle_ar: c.ref,
          status_ar: "جديد",
          tone: c.alert_type === "intrusion" ? "danger" : "warning",
          value: `ثقة ${Math.round(c.confidence * 100)}%`,
        })),
        rows.length,
        `${rows.length} تنبيهًا جديدًا بانتظار الفرز`,
      );
    }
    case "patrols_active": {
      const rows = src.patrols.filter((p) => p.status === "active");
      return finish(
        rows.map((p) => ({
          id: p.id,
          title_ar: p.team,
          subtitle_ar: `${p.ref} · ${p.route}`,
          status_ar: "نشطة",
          value: `${p.checkpoints_done}/${p.checkpoints_total} نقطة`,
        })),
        rows.length,
        `${rows.length} دورية في الميدان الآن`,
      );
    }
    case "patrol_completion": {
      // الدوريات القابلة للقياس فقط (مقام > 0) — نفس معيار computeExecKpis.
      const rows = src.patrols.filter((p) => p.checkpoints_total > 0);
      const pct = rows.length
        ? Math.round(
            (rows.reduce((s, p) => s + p.checkpoints_done / p.checkpoints_total, 0) / rows.length) *
              100,
          )
        : null;
      return finish(
        rows.map((p) => ({
          id: p.id,
          title_ar: p.team,
          subtitle_ar: `${p.ref} · ${p.route}`,
          status_ar: PATROL_STATUS_AR[p.status] ?? p.status,
          tone: p.status === "completed" ? "success" : p.status === "missed" ? "danger" : "default",
          value: `${p.checkpoints_done}/${p.checkpoints_total} نقطة`,
        })),
        pct,
        pct === null
          ? "لا دورية بنقاط تفتيش قابلة للقياس — النسبة لم تُقَس"
          : `إنجاز ${pct}% عبر ${rows.length} دورية قابلة للقياس`,
      );
    }
    case "visitors_inside": {
      const rows = src.visitors.filter((v) => v.status === "inside" || v.status === "overdue");
      return finish(
        rows.map((v) => ({
          id: v.id,
          title_ar: v.full_name,
          subtitle_ar: v.organization ? `${v.ref} · ${v.organization}` : v.ref,
          status_ar: v.status === "overdue" ? "متأخر عن الخروج" : "بالداخل",
          tone: v.status === "overdue" ? "warning" : "default",
        })),
        rows.length,
        `${rows.length} زائرًا داخل المواقع الآن`,
      );
    }
    case "permits_active": {
      const rows = src.permits.filter((p) => p.status === "active" || p.status === "approved");
      return finish(
        rows.map((p) => ({
          id: p.id,
          title_ar: p.work_type,
          subtitle_ar: `${p.ref} · ${p.contractor} · خطورة ${RISK_AR[p.risk_level] ?? p.risk_level}`,
          status_ar: p.status === "approved" ? "معتمد" : "فعّال",
          tone:
            p.risk_level === "critical"
              ? "danger"
              : p.risk_level === "high"
                ? "warning"
                : "default",
        })),
        rows.length,
        `${rows.length} تصريح عمل ساريًا`,
      );
    }
    case "contractors_active": {
      // قرار المالك: «من هم المقاولون» — الاسم هو العنوان، والامتثال قيمة
      // الصف (عمود compliance_score موجود في sec_contractors).
      const rows = src.contractors.filter((c) => c.status === "active");
      return finish(
        rows.map((c) => ({
          id: c.id,
          title_ar: c.name,
          subtitle_ar: `${c.contract_no} · ${c.workers_count} عاملًا`,
          status_ar: "نشط",
          tone:
            c.compliance_score >= 90 ? "success" : c.compliance_score < 75 ? "warning" : "default",
          value: `الامتثال ${c.compliance_score}%`,
        })),
        rows.length,
        `${rows.length} مقاولًا نشطًا`,
      );
    }
  }
}

// قراءة عرض على شاشة يفتحها زائر ⇒ optionalSupabaseAuth (لا Unauthorized
// للزائر أبدًا)، وresilient بنفس عقد لوحة المؤشرات: مهلة 4 ثوانٍ — فشل أو
// timeout أو قاعدة فارغة كليًّا ⇐ محاكاة مرجعية موسومة، وصفوف القاعدة
// الحية تفوز دائمًا متى وصلت.
export const getExecDrilldown = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input: { metric: ExecDrillMetric }) =>
    z.object({ metric: z.enum(EXEC_DRILL_METRICS) }).parse(input),
  )
  .handler(async ({ context, data }): Promise<ExecDrilldown> => {
    const { buildExecKpiSourcesSimulation, resilient } =
      await import("./exec/showcase-simulation.server");
    const sources = await resilient(
      `exec-drill-${data.metric}`,
      () => fetchExecDrillSources(context.supabase as unknown as ExecKpiSupabase),
      // نفس معيار getExecKpis: المحاكاة فقط حين لا صفّ مرئيًّا في أي مصدر —
      // فتتبدل البطاقات والنوافذ معًا لا كلٌّ على حدة.
      (s) => Object.values(s).every((rows) => Array.isArray(rows) && rows.length === 0),
      () => buildExecDrillSourcesSimulation(buildExecKpiSourcesSimulation()),
    );
    return computeExecDrilldown(data.metric, sources);
  });
