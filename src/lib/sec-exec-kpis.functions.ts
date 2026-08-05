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
    const sources = await resilient(
      "exec-kpis",
      () => fetchExecKpiSources(context.supabase as unknown as ExecKpiSupabase),
      (s) => Object.values(s).every((rows) => rows.length === 0),
      () => buildExecKpiSourcesSimulation(),
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

export const getExecTimeseries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
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
