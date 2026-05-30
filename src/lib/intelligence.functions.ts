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
        .select("id,kind,status,impact,progress,due_at,last_update,created_at,title,title_en,owner,department,decision_route")
        .order("last_update", { ascending: false })
        .limit(500),
      supabase
        .from("intelligence_alerts")
        .select("id,severity,title,title_en,owner,route,source,business_impact_score,resolved_at,created_at")
        .order("business_impact_score", { ascending: false })
        .limit(200),
      supabase
        .from("tasks")
        .select("status,created_at,updated_at")
        .limit(1000),
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
          available: Boolean(
            process.env.POWERBI_TENANT_ID && process.env.POWERBI_CLIENT_ID,
          ),
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
  status: z
    .enum(["open", "in_progress", "blocked", "done", "forgotten"])
    .default("open"),
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
      supabase
        .from("intelligence_alerts")
        .select("severity,resolved_at,source")
        .limit(1000),
      supabase
        .from("tasks")
        .select("status,assigned_agent,updated_at,created_at")
        .limit(2000),
      supabase.from("knowledge_docs").select("id", { count: "exact", head: true }),
    ]);

    const ev = events.data ?? [];
    const al = alerts.data ?? [];
    const tk = tasks.data ?? [];

    const departments = new Set(
      ev.map((e) => e.department).filter((d): d is string => !!d),
    ).size;
    const agents = new Set(
      tk.map((t) => t.assigned_agent).filter((a): a is string => !!a),
    ).size;
    const integrations = new Set(
      [
        ...ev.map((e) => e.source),
        ...al.map((a) => a.source),
      ].filter((s): s is string => !!s),
    ).size;
    const automations = tk.length;
    const criticalRisks = ev.filter(
      (e) => e.kind === "risk" && e.impact === "critical" && e.status !== "done",
    ).length + al.filter((a) => a.severity === "critical" && !a.resolved_at).length;
    const boardActions = ev.filter(
      (e) => e.kind === "board_action" && e.status !== "done",
    ).length;
    const intelligenceSignals = ev.length + al.filter((a) => !a.resolved_at).length;

    const day = 86_400_000;
    const cutoff = Date.now() - 14 * day;
    const created14 = tk.filter((t) => new Date(t.created_at).getTime() >= cutoff).length;
    const done14 = tk.filter(
      (t) => t.status === "done" && new Date(t.updated_at).getTime() >= cutoff,
    ).length;
    const executionVelocity =
      created14 === 0 ? (done14 > 0 ? 100 : 70) : Math.min(100, Math.round((done14 / created14) * 100));

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
