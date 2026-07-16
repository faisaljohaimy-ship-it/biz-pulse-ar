import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeExecutiveMetrics, type ExecutiveMetric } from "./intelligence/metrics";

export type FabricSnapshot = {
  metrics: ExecutiveMetric[];
  counts: {
    events: number;
    openAlerts: number;
    forgotten: number;
    overdue: number;
  };
  topAlerts: Array<{
    id: string;
    severity: string;
    title: string;
    title_en: string | null;
    owner: string | null;
    route: string | null;
    business_impact_score: number;
    source: string | null;
    created_at: string;
  }>;
  forgotten: Array<{
    id: string;
    kind: string;
    title: string;
    title_en: string | null;
    owner: string | null;
    department: string | null;
    days_silent: number;
    overdue_days: number;
    decision_route: string | null;
  }>;
  sources: Array<{ id: string; label: string; available: boolean }>;
};

export const getFabricSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FabricSnapshot> => {
    const { supabase } = context;
    const [events, alerts, tasks] = await Promise.all([
      supabase
        .from("intelligence_events")
        .select(
          "id,kind,status,impact,progress,due_at,last_update,created_at,title,title_en,owner,department,decision_route",
        )
        .order("last_update", { ascending: false })
        .limit(200),
      supabase
        .from("intelligence_alerts")
        .select(
          "id,severity,title,title_en,owner,route,source,business_impact_score,resolved_at,created_at",
        )
        .order("business_impact_score", { ascending: false })
        .limit(200),
      supabase.from("tasks").select("status,created_at,updated_at").limit(200),
    ]);

    const eventRows = events.data ?? [];
    const alertRows = alerts.data ?? [];
    const taskRows = tasks.data ?? [];

    const metrics = computeExecutiveMetrics({
      events: eventRows.map((e) => ({
        kind: e.kind,
        status: e.status,
        impact: e.impact,
        progress: e.progress,
        due_at: e.due_at,
        last_update: e.last_update,
        created_at: e.created_at,
      })),
      alerts: alertRows.map((a) => ({
        severity: a.severity,
        business_impact_score: a.business_impact_score,
        resolved_at: a.resolved_at,
      })),
      tasks: taskRows.map((t) => ({
        status: t.status,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
    });

    const day = 86_400_000;
    const now = Date.now();
    const forgotten = eventRows
      .map((e) => {
        const days_silent = Math.round((now - new Date(e.last_update).getTime()) / day);
        const overdue_days = e.due_at
          ? Math.max(0, Math.round((now - new Date(e.due_at).getTime()) / day))
          : 0;
        return {
          id: e.id,
          kind: e.kind,
          title: e.title,
          title_en: e.title_en,
          owner: e.owner,
          department: e.department,
          days_silent,
          overdue_days,
          decision_route: e.decision_route,
          status: e.status,
        };
      })
      .filter((e) => e.status === "forgotten" || e.days_silent >= 7 || e.overdue_days > 0)
      .sort((a, b) => b.days_silent - a.days_silent)
      .slice(0, 20)
      .map(({ status: _s, ...rest }) => rest);

    const openAlerts = alertRows.filter((a) => !a.resolved_at);

    return {
      metrics,
      counts: {
        events: eventRows.length,
        openAlerts: openAlerts.length,
        forgotten: forgotten.length,
        overdue: forgotten.filter((f) => f.overdue_days > 0).length,
      },
      topAlerts: openAlerts.slice(0, 10).map((a) => ({
        id: a.id,
        severity: a.severity,
        title: a.title,
        title_en: a.title_en,
        owner: a.owner,
        route: a.route,
        business_impact_score: a.business_impact_score,
        source: a.source,
        created_at: a.created_at,
      })),
      forgotten,
      sources: [
        { id: "supabase", label: "Lovable Cloud", available: true },
        {
          id: "powerbi",
          label: "Microsoft Power BI",
          available: Boolean(process.env.POWERBI_TENANT_ID && process.env.POWERBI_CLIENT_ID),
        },
        { id: "sap", label: "SAP", available: false },
        { id: "ms365", label: "Microsoft 365", available: false },
        { id: "teams", label: "Microsoft Teams", available: false },
        { id: "sharepoint", label: "SharePoint", available: false },
      ],
    };
  });

const EventInput = z.object({
  kind: z.enum([
    "decision",
    "initiative",
    "commitment",
    "risk",
    "recommendation",
    "meeting",
    "dependency",
    "escalation",
    "board_action",
  ]),
  title: z.string().min(1).max(280),
  title_en: z.string().max(280).optional(),
  owner: z.string().max(120).optional(),
  department: z.string().max(120).optional(),
  source: z.string().max(120).optional(),
  status: z.enum(["open", "in_progress", "blocked", "done", "forgotten"]).default("open"),
  impact: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  progress: z.number().int().min(0).max(100).default(0),
  due_at: z.string().datetime().optional(),
  decision_route: z.string().max(120).optional(),
});

export const createIntelligenceEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => EventInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error, data: row } = await supabase
      .from("intelligence_events")
      .insert({ ...data, user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

const AlertInput = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  title: z.string().min(1).max(280),
  title_en: z.string().max(280).optional(),
  detail: z.string().max(1000).optional(),
  owner: z.string().max(120).optional(),
  route: z.string().max(120).optional(),
  source: z.string().max(60).default("manual"),
  business_impact_score: z.number().int().min(0).max(100).default(50),
  related_event: z.string().uuid().optional(),
});

export const createIntelligenceAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AlertInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error, data: row } = await supabase
      .from("intelligence_alerts")
      .insert({ ...data, user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const resolveAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("intelligence_alerts")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Twin signals — real per-node counts that feed the Digital Twin orbital scene.
 * Every value is derived from Supabase tables the user owns (RLS-scoped).
 */
export type TwinSignals = {
  departments: number;
  events: number;
  agents: number;
  integrations: number;
  automations: number;
  documents: number;
  criticalRisks: number;
  boardActions: number;
  intelligenceSignals: number;
  executionVelocity: number; // 0-100
  generatedAt: string;
};

export const getTwinSignals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TwinSignals> => {
    const { supabase } = context;
    const [events, alerts, tasks, docs] = await Promise.all([
      supabase
        .from("intelligence_events")
        .select("kind,status,impact,department,source,created_at,updated_at")
        .limit(2000),
      supabase.from("intelligence_alerts").select("severity,resolved_at,source").limit(1000),
      supabase.from("tasks").select("status,assigned_agent,updated_at,created_at").limit(2000),
      supabase.from("knowledge_docs").select("id", { count: "exact", head: true }),
    ]);

    const ev = events.data ?? [];
    const al = alerts.data ?? [];
    const tk = tasks.data ?? [];

    const departments = new Set(ev.map((e) => e.department).filter((d): d is string => !!d)).size;
    const agents = new Set(tk.map((t) => t.assigned_agent).filter((a): a is string => !!a)).size;
    const integrations = new Set(
      [...ev.map((e) => e.source), ...al.map((a) => a.source)].filter((s): s is string => !!s),
    ).size;
    const automations = tk.length;
    const criticalRisks =
      ev.filter((e) => e.kind === "risk" && e.impact === "critical" && e.status !== "done").length +
      al.filter((a) => a.severity === "critical" && !a.resolved_at).length;
    const boardActions = ev.filter((e) => e.kind === "board_action" && e.status !== "done").length;
    const intelligenceSignals = ev.length + al.filter((a) => !a.resolved_at).length;

    const day = 86_400_000;
    const cutoff = Date.now() - 14 * day;
    const created14 = tk.filter((t) => new Date(t.created_at).getTime() >= cutoff).length;
    const done14 = tk.filter(
      (t) => t.status === "done" && new Date(t.updated_at).getTime() >= cutoff,
    ).length;
    const executionVelocity =
      created14 === 0
        ? done14 > 0
          ? 100
          : 70
        : Math.min(100, Math.round((done14 / created14) * 100));

    return {
      departments,
      events: ev.length,
      agents,
      integrations,
      automations,
      documents: docs.count ?? 0,
      criticalRisks,
      boardActions,
      intelligenceSignals,
      executionVelocity,
      generatedAt: new Date().toISOString(),
    };
  });

/* ────────── Predictive Intelligence Engine ────────── */

export type Prediction = {
  id: string;
  kind: "anomaly" | "forecast" | "opportunity" | "risk" | "recommendation";
  title_ar: string;
  title_en: string;
  detail_ar: string;
  detail_en: string;
  confidence: number; // 0-100
  impact: "low" | "medium" | "high" | "critical";
  horizonDays: number;
  tone: "emerald" | "cyan" | "amber" | "rose" | "violet";
  route?: string;
};

export type PredictionsPayload = {
  predictions: Prediction[];
  generatedAt: string;
  sampleSize: number;
};

function linregSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export const getPredictions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PredictionsPayload> => {
    const { supabase } = context;
    const day = 86_400_000;
    const now = Date.now();
    const cutoff = new Date(now - 28 * day).toISOString();

    const [events, alerts, tasks] = await Promise.all([
      supabase
        .from("intelligence_events")
        .select(
          "kind,status,impact,progress,due_at,created_at,last_update,title,title_en,decision_route",
        )
        .gte("created_at", cutoff)
        .limit(2000),
      supabase
        .from("intelligence_alerts")
        .select("severity,business_impact_score,created_at,resolved_at,title,title_en,route")
        .gte("created_at", cutoff)
        .limit(1000),
      supabase
        .from("tasks")
        .select("status,created_at,updated_at")
        .gte("created_at", cutoff)
        .limit(2000),
    ]);

    const ev = events.data ?? [];
    const al = alerts.data ?? [];
    const tk = tasks.data ?? [];

    // Daily completion series (last 14 days)
    const days = 14;
    const series: number[] = Array(days).fill(0);
    const createdSeries: number[] = Array(days).fill(0);
    for (const t of tk) {
      const ageDone = Math.floor((now - new Date(t.updated_at).getTime()) / day);
      if (t.status === "done" && ageDone >= 0 && ageDone < days) series[days - 1 - ageDone]++;
      const ageCreated = Math.floor((now - new Date(t.created_at).getTime()) / day);
      if (ageCreated >= 0 && ageCreated < days) createdSeries[days - 1 - ageCreated]++;
    }

    const slope = linregSlope(series);
    const avgDone = series.reduce((s, v) => s + v, 0) / days;
    const stdDone = Math.sqrt(series.reduce((s, v) => s + (v - avgDone) ** 2, 0) / days);
    const last = series[days - 1];
    const anomalyZ = stdDone === 0 ? 0 : (last - avgDone) / stdDone;
    const forecast7 = Math.max(0, Math.round((avgDone + slope * 7) * 7));

    // Critical alert pressure trend
    const alertsByDay: number[] = Array(days).fill(0);
    for (const a of al) {
      const age = Math.floor((now - new Date(a.created_at).getTime()) / day);
      if (age >= 0 && age < days) alertsByDay[days - 1 - age]++;
    }
    const alertSlope = linregSlope(alertsByDay);

    // Forgotten / silent risk
    const silent = ev.filter((e) => {
      const idleDays = (now - new Date(e.last_update).getTime()) / day;
      return idleDays >= 10 && e.status !== "done";
    });

    const overdue = ev.filter(
      (e) => e.due_at && new Date(e.due_at).getTime() < now && e.status !== "done",
    );

    const openRecs = ev.filter((e) => e.kind === "recommendation" && e.status !== "done");
    const openRisks = ev.filter((e) => e.kind === "risk" && e.status !== "done");

    const predictions: Prediction[] = [];

    // 1. Velocity forecast
    predictions.push({
      id: "velocity-forecast",
      kind: "forecast",
      title_ar: `توقع إنجاز ${forecast7} مهمة خلال الأسبوع القادم`,
      title_en: `Forecast: ${forecast7} task completions next 7 days`,
      detail_ar: `الميل اليومي ${slope >= 0 ? "+" : ""}${slope.toFixed(2)} مهمة/يوم بناءً على آخر 14 يوماً.`,
      detail_en: `Daily trend ${slope >= 0 ? "+" : ""}${slope.toFixed(2)} tasks/day based on last 14 days.`,
      confidence: Math.min(95, 60 + Math.round(Math.min(20, tk.length / 5))),
      impact: slope < -0.5 ? "high" : "medium",
      horizonDays: 7,
      tone: slope >= 0 ? "emerald" : "amber",
      route: "/execution",
    });

    // 2. Anomaly detection
    if (Math.abs(anomalyZ) >= 1.5) {
      const dropping = anomalyZ < 0;
      predictions.push({
        id: "exec-anomaly",
        kind: "anomaly",
        title_ar: dropping
          ? "شذوذ: انخفاض حاد في معدل الإنجاز اليوم"
          : "شذوذ: قفزة في معدل الإنجاز اليوم",
        title_en: dropping
          ? "Anomaly: sharp drop in completion rate today"
          : "Anomaly: completion rate spike today",
        detail_ar: `الانحراف المعياري ${anomalyZ.toFixed(2)} عن المعدل (${avgDone.toFixed(1)}/يوم).`,
        detail_en: `Z-score ${anomalyZ.toFixed(2)} from baseline (${avgDone.toFixed(1)}/day).`,
        confidence: Math.min(96, 70 + Math.round(Math.abs(anomalyZ) * 8)),
        impact: dropping ? "high" : "low",
        horizonDays: 1,
        tone: dropping ? "rose" : "cyan",
        route: "/cockpit",
      });
    }

    // 3. Alert pressure
    if (alertSlope > 0.3) {
      predictions.push({
        id: "alert-pressure",
        kind: "risk",
        title_ar: "ضغط تنبيهات متصاعد — تدخل تنفيذي مطلوب",
        title_en: "Rising alert pressure — executive intervention likely",
        detail_ar: `معدل التنبيهات يرتفع بمعدل ${alertSlope.toFixed(2)}/يوم على مدى أسبوعين.`,
        detail_en: `Alert intake rising at ${alertSlope.toFixed(2)}/day over 2 weeks.`,
        confidence: 82,
        impact: "high",
        horizonDays: 5,
        tone: "rose",
        route: "/fabric",
      });
    }

    // 4. Silent / forgotten risk
    if (silent.length >= 3) {
      predictions.push({
        id: "silent-risk",
        kind: "risk",
        title_ar: `${silent.length} بنود استراتيجية صامتة ≥ 10 أيام`,
        title_en: `${silent.length} strategic items silent ≥ 10 days`,
        detail_ar: "أعد إسناد مالك جديد قبل أن تتحول إلى متأخرات حرجة.",
        detail_en: "Re-assign owners before they escalate into critical overdue.",
        confidence: 88,
        impact: silent.length >= 8 ? "critical" : "high",
        horizonDays: 14,
        tone: "rose",
        route: "/forgotten",
      });
    }

    // 5. Overdue cascade
    if (overdue.length >= 2) {
      predictions.push({
        id: "overdue-cascade",
        kind: "risk",
        title_ar: `${overdue.length} بنود متأخرة قد تؤخر تبعيات`,
        title_en: `${overdue.length} overdue items risk cascading dependencies`,
        detail_ar: "احتمال تأثير سلسلة على القرارات والمبادرات المرتبطة.",
        detail_en: "High probability of cascade onto linked decisions and initiatives.",
        confidence: 79,
        impact: "high",
        horizonDays: 10,
        tone: "amber",
        route: "/memory",
      });
    }

    // 6. Opportunity surface
    if (openRecs.length > 0) {
      const top = openRecs.slice(0, 1)[0];
      predictions.push({
        id: "opportunity-top",
        kind: "opportunity",
        title_ar: `فرصة جاهزة: ${top.title}`,
        title_en: `Ready opportunity: ${top.title_en ?? top.title}`,
        detail_ar: `${openRecs.length} توصية AI مفتوحة بانتظار قرار تنفيذي.`,
        detail_en: `${openRecs.length} open AI recommendations awaiting executive sign-off.`,
        confidence: 84,
        impact: top.impact === "critical" || top.impact === "high" ? "high" : "medium",
        horizonDays: 7,
        tone: "emerald",
        route: top.decision_route ?? "/decisions",
      });
    }

    // 7. Executive recommendation
    if (openRisks.length > 0 || alertSlope > 0.3) {
      predictions.push({
        id: "exec-recommendation",
        kind: "recommendation",
        title_ar: "توصية: عقد مراجعة مخاطر تنفيذية خلال 48 ساعة",
        title_en: "Recommendation: convene executive risk review within 48h",
        detail_ar: `${openRisks.length} مخاطر مفتوحة و ${al.filter((a) => !a.resolved_at).length} تنبيه نشط يتطلب توافقاً تنفيذياً.`,
        detail_en: `${openRisks.length} open risks and ${al.filter((a) => !a.resolved_at).length} active alerts require executive alignment.`,
        confidence: 90,
        impact: "high",
        horizonDays: 2,
        tone: "violet",
        route: "/boardroom",
      });
    }

    return {
      predictions,
      generatedAt: new Date().toISOString(),
      sampleSize: ev.length + al.length + tk.length,
    };
  });
