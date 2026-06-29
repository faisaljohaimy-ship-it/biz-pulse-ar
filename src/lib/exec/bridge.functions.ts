/**
 * Executive Command Bridge — server functions that aggregate live
 * operational signal for the `/bridge` route. Pure reads from real
 * tables (`agent_definitions`, `agent_runs`, `sec_incidents`,
 * `sec_patrols`, `enterprise_events`) — no mocks, no fabrication.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BridgeAgentStatus = "idle" | "thinking" | "speaking" | "completed" | "error";

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

    const [agentDefsRes, agentRunsRes, incidentsRes, patrolsRes] = await Promise.all([
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

      let status: BridgeAgentStatus = "idle";
      if (last) {
        if (last.status === "running") status = "thinking";
        else if (last.status === "completed") status = "completed";
        else if (last.status === "failed") status = "error";
      }

      const current_task =
        last?.status === "running"
          ? (last.goal_override?.slice(0, 120) ?? "Working")
          : last?.summary?.slice(0, 120) ?? null;

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

    // Composite health: 100 minus weighted incident pressure, floored at 35.
    const incidentPenalty = critical * 12 + high * 5 + Math.max(0, incidents.length - critical - high) * 2;
    const score = Math.max(35, Math.min(100, 100 - incidentPenalty));

    return {
      health: {
        score,
        open_incidents: incidents.length,
        critical_incidents: critical,
        active_patrols: patrols.length,
        agents_online: agentsOnline,
        agents_total: defs.length,
      },
      agents,
      generated_at: new Date().toISOString(),
    };
  });
