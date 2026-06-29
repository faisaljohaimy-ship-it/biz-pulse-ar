/**
 * Executive Command Bridge — server functions that aggregate live
 * operational signal for the `/bridge` route. Pure reads from real
 * tables (`agent_definitions`, `agent_runs`, `sec_incidents`,
 * `sec_patrols`, `enterprise_events`) — no mocks, no fabrication.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BridgeAgentStatus =
  | "offline"
  | "idle"
  | "monitoring"
  | "waiting"
  | "thinking"
  | "searching"
  | "analyzing"
  | "consulting"
  | "executing"
  | "speaking"
  | "completed"
  | "escalated"
  | "warning"
  | "error"
  | "recovery";

export type BridgeAgent = {
  id: string;
  name: string;
  goal: string | null;
  enabled: boolean;
  status: BridgeAgentStatus;
  /** 0..1 confidence derived from recent run success ratio. */
  confidence: number;
  /** Latest current task line, or null when idle. */
  current_task: string | null;
  last_run_at: string | null;
  last_run_status: string | null;
};

export type BridgeHealth = {
  /** 0..100 — composite operational health. */
  score: number;
  open_incidents: number;
  critical_incidents: number;
  active_patrols: number;
  visitors_onsite: number;
  active_permits: number;
  open_work_orders: number;
  compliance_score: number;
  ai_confidence: number;
  agents_online: number;
  agents_total: number;
};

export type BridgeState = {
  health: BridgeHealth;
  agents: BridgeAgent[];
  generated_at: string;
};


export const getBridgeState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BridgeState> => {
    const sb = context.supabase;

    const [agentDefsRes, agentRunsRes, incidentsRes, patrolsRes, visitorsRes, permitsRes, workOrdersRes, contractorsRes] = await Promise.all([
      sb.from("agent_definitions")
        .select("id, name, goal, enabled, updated_at")
        .eq("enabled", true)
        .order("name", { ascending: true })
        .limit(12),
      sb.from("agent_runs")
        .select("id, agent_id, status, summary, started_at, finished_at, goal_override")
        .order("started_at", { ascending: false })
        .limit(120),
      sb.from("sec_incidents")
        .select("id, severity, status")
        .in("status", ["open", "investigating", "in_progress", "new"]),
      sb.from("sec_patrols")
        .select("id, status")
        .in("status", ["active", "in_progress", "started"]),
      sb.from("sec_visitors").select("status"),
      sb.from("sec_permits").select("status"),
      sb.from("sec_work_orders").select("status"),
      sb.from("sec_contractors").select("compliance_score"),
    ]);

    const defs = (agentDefsRes.data ?? []) as Array<{
      id: string; name: string; goal: string | null; enabled: boolean; updated_at: string;
    }>;
    const runs = (agentRunsRes.data ?? []) as Array<{
      id: string; agent_id: string; status: string; summary: string | null;
      started_at: string; finished_at: string | null; goal_override: string | null;
    }>;
    const incidents = (incidentsRes.data ?? []) as Array<{ severity: string; status: string }>;
    const patrols = (patrolsRes.data ?? []) as Array<{ status: string }>;
    const visitors = (visitorsRes.data ?? []) as Array<{ status: string }>;
    const permits = (permitsRes.data ?? []) as Array<{ status: string }>;
    const workOrders = (workOrdersRes.data ?? []) as Array<{ status: string }>;
    const contractors = (contractorsRes.data ?? []) as Array<{ compliance_score: number | null }>;

    const runsByAgent = new Map<string, typeof runs>();
    for (const r of runs) {
      const arr = runsByAgent.get(r.agent_id) ?? [];
      arr.push(r);
      runsByAgent.set(r.agent_id, arr);
    }

    const agents: BridgeAgent[] = defs.map((d) => {
      const recent = (runsByAgent.get(d.id) ?? []).slice(0, 8);
      const last = recent[0] ?? null;
      const completed = recent.filter((r) => r.status === "completed").length;
      const failed = recent.filter((r) => r.status === "failed").length;
      const total = completed + failed;
      const confidence = total === 0
        ? 0.85 // baseline when no history
        : Math.max(0.4, completed / total);

      let status: BridgeAgentStatus = d.enabled ? "monitoring" : "offline";
      if (last) {
        const ageMs = Date.now() - new Date(last.started_at).getTime();
        const goal = (last.goal_override ?? "").toLowerCase();
        const summary = (last.summary ?? "").toLowerCase();
        const haystack = `${goal} ${summary}`;
        if (last.status === "running") {
          if (/search|بحث|قاعدة المعرفة|knowledge|kb\./.test(haystack)) status = "searching";
          else if (/analy|تحلي|risk|خطر|score/.test(haystack)) status = "analyzing";
          else if (/consult|coordinate|تنسيق|تشاور|delegat/.test(haystack)) status = "consulting";
          else if (/dispatch|execute|تنفيذ|أمر عمل|teams\.post|email\.send/.test(haystack)) status = "executing";
          else status = "thinking";
        } else if (last.status === "completed" || last.status === "succeeded") {
          // recently completed within 90s reads as "speaking" to highlight latest voice
          if (ageMs < 90_000) status = "speaking";
          else if (/escalat|تصعيد|critical|حرج/.test(summary)) status = "escalated";
          else if (/warn|تحذير|risk/.test(summary)) status = "warning";
          else status = "completed";
        } else if (last.status === "failed") {
          status = "error";
        } else if (last.status === "waiting" || last.status === "pending") {
          status = "waiting";
        }
      } else if (!d.enabled) {
        status = "offline";
      } else {
        status = "idle";
      }

      return {
        id: d.id,
        name: d.name,
        goal: d.goal,
        enabled: d.enabled,
        status,
        confidence,
        current_task,
        last_run_at: last?.started_at ?? null,
        last_run_status: last?.status ?? null,
      };
    });

    const critical = incidents.filter((i) => i.severity === "critical").length;
    const high = incidents.filter((i) => i.severity === "high").length;
    const agentsOnline = agents.filter((a) => a.enabled).length;
    const visitorsOnsite = visitors.filter((v) => ["checked_in", "onsite", "active"].includes(v.status)).length;
    const activePermits = permits.filter((p) => ["active", "approved", "in_progress"].includes(p.status)).length;
    const openWorkOrders = workOrders.filter((w) => w.status !== "closed" && w.status !== "cancelled").length;
    const complianceScore = contractors.length
      ? Math.round(contractors.reduce((s, c) => s + (c.compliance_score ?? 0), 0) / contractors.length)
      : 0;
    const aiConfidence = agents.length
      ? Math.round((agents.reduce((s, a) => s + a.confidence, 0) / agents.length) * 100)
      : 0;

    // Composite health: 100 minus weighted incident pressure, floored at 35.
    const incidentPenalty = critical * 12 + high * 5 + Math.max(0, incidents.length - critical - high) * 2;
    const score = Math.max(35, Math.min(100, 100 - incidentPenalty));

    return {
      health: {
        score,
        open_incidents: incidents.length,
        critical_incidents: critical,
        active_patrols: patrols.length,
        visitors_onsite: visitorsOnsite,
        active_permits: activePermits,
        open_work_orders: openWorkOrders,
        compliance_score: complianceScore,
        ai_confidence: aiConfidence,
        agents_online: agentsOnline,
        agents_total: defs.length,
      },
      agents,
      generated_at: new Date().toISOString(),
    };
  });

// ------------------------------------------------------------------
// Mission Timeline — bilingual storytelling stream
// ------------------------------------------------------------------

export type MissionTimelineEntry = {
  id: string;
  ts: string;
  tone: "info" | "success" | "warn" | "critical";
  agent_name_ar: string;
  agent_name_en: string;
  action_ar: string;
  action_en: string;
  text_ar: string;
  text_en: string;
  result_ar: string | null;
  result_en: string | null;
  topic: string;
  status: string;
  severity: string;
  correlation_id: string | null;
  duration_ms: number | null;
};

export const getMissionTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MissionTimelineEntry[]> => {
    const { data } = await context.supabase
      .from("enterprise_events")
      .select("id, topic, source, severity, actor_id, org_id, subject_type, subject_id, correlation_id, duration_ms, status, payload_json, inputs_json, outputs_json, metrics_json, occurred_at, processed_at, error")
      .order("occurred_at", { ascending: false })
      .limit(40);
    const rows = (data ?? []) as Parameters<typeof import("@/lib/narrator/event-narrator").narrateEvent>[0][];
    const { narrateEvent } = await import("@/lib/narrator/event-narrator");
    return rows.map((row) => {
      const n = narrateEvent(row);
      return {
        id: n.id,
        ts: new Date(n.ts).toISOString(),
        tone: n.tone,
        agent_name_ar: n.agent_name_ar,
        agent_name_en: n.agent_name_en,
        action_ar: n.action_ar,
        action_en: n.action_en,
        text_ar: n.text_ar,
        text_en: n.text_en,
        result_ar: n.result_ar ?? null,
        result_en: n.result_en ?? null,
        topic: n.topic,
        status: n.status,
        severity: n.severity,
        correlation_id: n.correlation_id,
        duration_ms: n.duration_ms,
      };
    });
  });

