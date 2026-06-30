import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  executeTool,
  decideApproval,
  rollbackExecution,
  reapStaleExecutions,
} from "./exec/tool-orchestrator.server";
import {
  triggerWorkflow,
  resumeWorkflowRun,
  cancelWorkflowRun,
  WorkflowDefinitionSchema,
} from "./exec/workflow-engine.server";
import { runAgent } from "./exec/agent-runtime.server";
import { getCurrentOrgIdForUser, requirePlatformAdmin } from "@/lib/authz.server";

async function requireAdmin(
  supabase: unknown,
  userId: string,
): Promise<void> {
  void supabase;
  await requirePlatformAdmin(userId);
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

function toJson<T>(v: T): JsonValue {
  return JSON.parse(JSON.stringify(v)) as JsonValue;
}

/* ------------------------------- Tool API ------------------------------- */

const RunToolSchema = z.object({
  toolId: z.string().min(1),
  input: z.unknown(),
});

export const runTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunToolSchema.parse(d))
  .handler(async ({ data, context }) => {
    const res = await executeTool(context.supabase, {
      toolId: data.toolId,
      input: data.input,
      actorId: context.userId,
    });
    return toJson(res);
  });

const ApproveSchema = z.object({
  executionId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
});

export const approveToolExecution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ApproveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const res = await decideApproval(
      context.supabase,
      context.userId,
      data.executionId,
      data.decision,
    );
    return toJson(res);
  });

const RollbackSchema = z.object({ executionId: z.string().uuid() });

export const rollbackToolExecution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RollbackSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const res = await rollbackExecution(
      context.supabase,
      data.executionId,
      context.userId,
    );
    return toJson(res);
  });

export const reapStaleToolExecutions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    return reapStaleExecutions(context.supabase);
  });

export const listToolRegistry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("tool_registry")
      .select(
        "id, category, name, description, permissions, requires_approval, enabled, schema_json",
      )
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listToolExecutions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("tool_executions")
      .select(
        "id, tool_id, status, actor_id, correlation_id, started_at, finished_at, duration_ms, error, input_json, output_json, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ----------------------------- Workflow API ----------------------------- */

const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  definition: WorkflowDefinitionSchema,
  triggerTopic: z.string().optional(),
});

export const createWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateWorkflowSchema.parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any)
      .from("workflows")
      .insert({
        name: data.name,
        description: data.description ?? null,
        definition_json: data.definition,
        trigger_topic: data.triggerTopic ?? null,
        owner_id: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listWorkflows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("workflows")
      .select("id, name, description, enabled, trigger_topic, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listWorkflowRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("workflow_runs")
      .select(
        "id, workflow_id, status, current_step, started_at, finished_at, error, triggered_by",
      )
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const TriggerSchema = z.object({
  workflowId: z.string().uuid(),
  payload: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().min(8).max(120).optional(),
});

export const triggerWorkflowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TriggerSchema.parse(d))
  .handler(async ({ data, context }) => {
    const res = await triggerWorkflow(context.supabase, {
      workflowId: data.workflowId,
      triggeredBy: context.userId,
      triggerEvent: "manual",
      payload: data.payload,
      idempotencyKey: data.idempotencyKey,
    });
    return toJson(res);
  });

/**
 * Topic-aware default payload — gives each workflow a reasonable starting
 * context when triggered manually from the console without typing JSON.
 */
function defaultPayloadForTopic(topic: string | null | undefined): Record<string, unknown> {
  const now = new Date().toISOString();
  const base = { source: "console.manual_trigger", triggered_at: now } as Record<string, unknown>;
  switch (topic) {
    case "sec.incident.created":
    case "sec.incident.p1":
      return { ...base, severity: topic === "sec.incident.p1" ? "P1" : "P3", category: "security", site: "jeddah-hq" };
    case "sec.contractor.created":
      return { ...base, contractor: { name: "Manual Trigger Test", company: "N/A" } };
    case "sec.permit.created":
      return { ...base, permit_type: "hot_work", site: "jeddah-hq", duration_hours: 4 };
    case "sec.work_order.created":
      return { ...base, priority: "medium", category: "preventive" };
    case "sec.patrol.overdue":
      return { ...base, route: "perimeter-north", overdue_minutes: 15 };
    case "sec.visitor.created":
      return { ...base, visitor: { name: "Manual Trigger Test" }, host: "operations" };
    case "sec.inspection.requested":
      return { ...base, scope: "monthly", site: "jeddah-hq" };
    case "risk.assessment.requested":
      return { ...base, scope: "western-region" };
    case "exec.brief.requested":
      return { ...base, period: "24h", audience: "executive" };
    case "schedule.daily.kpi":
      return { ...base, window: "rolling_24h" };
    default:
      return base;
  }
}

export const triggerAllWorkflowsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (context.supabase as any)
      .from("workflows")
      .select("id, name, trigger_topic, enabled")
      .eq("enabled", true);
    if (error) throw new Error(error.message);

    const results: Array<{ workflowId: string; name: string; status: string; error?: string }> = [];
    for (const w of (rows ?? []) as Array<{ id: string; name: string; trigger_topic: string | null }>) {
      try {
        const res = await triggerWorkflow(context.supabase, {
          workflowId: w.id,
          triggeredBy: context.userId,
          triggerEvent: "console.manual",
          payload: defaultPayloadForTopic(w.trigger_topic),
          idempotencyKey: `console-${w.id}-${Date.now()}`,
        });
        results.push({ workflowId: w.id, name: w.name, status: res.status });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ workflowId: w.id, name: w.name, status: "failed", error: msg });
      }
    }
    return toJson({ total: results.length, results });
  });

const TriggerWithDefaultsSchema = z.object({ workflowId: z.string().uuid() });

export const triggerWorkflowWithDefaultsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TriggerWithDefaultsSchema.parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any)
      .from("workflows")
      .select("trigger_topic")
      .eq("id", data.workflowId)
      .single();
    if (error) throw new Error(error.message);
    const res = await triggerWorkflow(context.supabase, {
      workflowId: data.workflowId,
      triggeredBy: context.userId,
      triggerEvent: "console.manual",
      payload: defaultPayloadForTopic(row?.trigger_topic ?? null),
      idempotencyKey: `console-${data.workflowId}-${Date.now()}`,
    });
    return toJson(res);
  });

const RunIdSchema = z.object({ runId: z.string().uuid() });

export const resumeWorkflowRunFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const res = await resumeWorkflowRun(
      context.supabase,
      data.runId,
      context.userId,
    );
    return toJson(res);
  });

export const cancelWorkflowRunFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const res = await cancelWorkflowRun(
      context.supabase,
      data.runId,
      context.userId,
    );
    return toJson(res);
  });

export const getWorkflowRunDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: run, error } = await (context.supabase as any)
      .from("workflow_runs")
      .select(
        "id, workflow_id, status, current_step, started_at, finished_at, error, triggered_by, trigger_event, context_json",
      )
      .eq("id", data.runId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!run) throw new Error("Run not found");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: steps } = await (context.supabase as any)
      .from("workflow_step_runs")
      .select(
        "id, step_id, kind, status, attempt, started_at, finished_at, error, tool_execution_id, output_json",
      )
      .eq("run_id", data.runId)
      .order("started_at", { ascending: true });
    return { run, steps: steps ?? [] };
  });

/* ------------------------------ Events API ------------------------------ */

export const listRecentEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("enterprise_events")
      .select("id, topic, source, payload_json, status, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ------------------------------ Agents API ------------------------------ */

export const listAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("agent_definitions")
      .select(
        "id, name, goal, model, tool_allowlist, permissions, enabled, updated_at",
      )
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAgentRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("agent_runs")
      .select(
        "id, agent_id, status, summary, steps, error, started_at, finished_at, triggered_by, goal_override, audit_json",
      )
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const RunAgentSchema = z.object({
  agentId: z.string().min(1),
  goalOverride: z.string().max(4000).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const runAgentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunAgentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const res = await runAgent(context.supabase, {
      agentId: data.agentId,
      actorId: context.userId,
      goalOverride: data.goalOverride ?? null,
      context: data.context ?? null,
    });
    return toJson(res);
  });

/* ---------------------------- Agent Operations -------------------------- */

type AgentDefRow = {
  id: string;
  name: string;
  goal: string;
  model: string;
  enabled: boolean;
  tool_allowlist: string[] | null;
  permissions: string[] | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
};

type AgentRunAgg = {
  agent_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
};

export type AgentOpsRecord = {
  id: string;
  name: string;
  goal: string;
  model: string;
  enabled: boolean;
  tool_allowlist: string[];
  permissions: string[];
  metadata: JsonValue;
  updated_at: string;
  state: "running" | "queued" | "failed" | "idle" | "ready" | "disabled";
  total_runs: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  running: number;
  success_rate: number;
  avg_duration_ms: number | null;
  last_status: string | null;
  last_run_at: string | null;
  last_finished_at: string | null;
};

export type AgentOpsOverview = {
  agents: AgentOpsRecord[];
  system: {
    agents_total: number;
    agents_enabled: number;
    agents_running: number;
    agents_failed: number;
    agents_idle: number;
    agents_ready: number;
    agents_disabled: number;
    runs_window_total: number;
    runs_today: number;
    avg_duration_ms: number | null;
    queue_length: number;
    window_days: number;
  };
};

export const getAgentOpsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const windowDays = 30;
    const since = new Date(
      Date.now() - windowDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defsRes = await (context.supabase as any)
      .from("agent_definitions")
      .select(
        "id, name, goal, model, enabled, tool_allowlist, permissions, metadata, updated_at",
      )
      .order("name", { ascending: true });
    if (defsRes.error) throw new Error(defsRes.error.message);
    const defs = (defsRes.data ?? []) as AgentDefRow[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runsRes = await (context.supabase as any)
      .from("agent_runs")
      .select("agent_id, status, started_at, finished_at")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(5000);
    if (runsRes.error) throw new Error(runsRes.error.message);
    const runs = (runsRes.data ?? []) as AgentRunAgg[];

    const byAgent = new Map<string, AgentRunAgg[]>();
    for (const r of runs) {
      const list = byAgent.get(r.agent_id) ?? [];
      list.push(r);
      byAgent.set(r.agent_id, list);
    }

    const todayCutoff = new Date();
    todayCutoff.setHours(0, 0, 0, 0);
    const todayIso = todayCutoff.toISOString();

    const agents: AgentOpsRecord[] = defs.map((d) => {
      const list = byAgent.get(d.id) ?? [];
      const succeeded = list.filter((r) => r.status === "succeeded").length;
      const failed = list.filter((r) => r.status === "failed").length;
      const cancelled = list.filter((r) => r.status === "cancelled").length;
      const queued = list.filter((r) => r.status === "queued").length;
      const runningOnly = list.filter((r) => r.status === "running").length;
      const running = queued + runningOnly;
      const finished = succeeded + failed + cancelled;
      const success_rate = finished
        ? Math.round((succeeded / finished) * 100)
        : 0;

      const durations = list
        .filter((r) => r.finished_at)
        .map(
          (r) =>
            new Date(r.finished_at as string).getTime() -
            new Date(r.started_at).getTime(),
        )
        .filter((ms) => ms >= 0 && ms < 60 * 60 * 1000);
      const avg_duration_ms = durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

      const last = list[0] ?? null;
      const lastFinished = list.find((r) => r.finished_at) ?? null;

      let state: AgentOpsRecord["state"];
      if (!d.enabled) state = "disabled";
      else if (runningOnly > 0) state = "running";
      else if (queued > 0) state = "queued";
      else if (last?.status === "failed") state = "failed";
      else if (lastFinished) state = "idle";
      else state = "ready";

      return {
        id: d.id,
        name: d.name,
        goal: d.goal,
        model: d.model,
        enabled: d.enabled,
        tool_allowlist: d.tool_allowlist ?? [],
        permissions: d.permissions ?? [],
        metadata: toJson(d.metadata ?? {}),
        updated_at: d.updated_at,
        state,
        total_runs: list.length,
        succeeded,
        failed,
        cancelled,
        running,
        success_rate,
        avg_duration_ms,
        last_status: last?.status ?? null,
        last_run_at: last?.started_at ?? null,
        last_finished_at: lastFinished?.finished_at ?? null,
      };
    });

    const runs_today = runs.filter((r) => r.started_at >= todayIso).length;
    const allDurations = runs
      .filter((r) => r.finished_at)
      .map(
        (r) =>
          new Date(r.finished_at as string).getTime() -
          new Date(r.started_at).getTime(),
      )
      .filter((ms) => ms >= 0 && ms < 60 * 60 * 1000);

    return {
      agents,
      system: {
        agents_total: agents.length,
        agents_enabled: agents.filter((a) => a.enabled).length,
        agents_running: agents.filter((a) => a.state === "running").length,
        agents_failed: agents.filter((a) => a.state === "failed").length,
        agents_idle: agents.filter((a) => a.state === "idle").length,
        agents_ready: agents.filter((a) => a.state === "ready").length,
        agents_disabled: agents.filter((a) => a.state === "disabled").length,
        runs_window_total: runs.length,
        runs_today,
        avg_duration_ms: allDurations.length
          ? Math.round(
              allDurations.reduce((a, b) => a + b, 0) / allDurations.length,
            )
          : null,
        queue_length: runs.filter(
          (r) => r.status === "running" || r.status === "queued",
        ).length,
        window_days: windowDays,
      },
    };
  });

const SetEnabledSchema = z.object({
  agentId: z.string().min(1),
  enabled: z.boolean(),
});

export const setAgentEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SetEnabledSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("agent_definitions")
      .update({ enabled: data.enabled, updated_at: new Date().toISOString() })
      .eq("id", data.agentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AgentRunIdSchema = z.object({ runId: z.string().uuid() });

export const cancelAgentRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AgentRunIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error: e1 } = await (context.supabase as any)
      .from("agent_runs")
      .select("status")
      .eq("id", data.runId)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!row) throw new Error("Run not found");
    if (row.status !== "running" && row.status !== "queued") {
      throw new Error(`Cannot cancel run in state: ${row.status}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("agent_runs")
      .update({
        status: "cancelled",
        error: "Cancelled by operator",
        finished_at: new Date().toISOString(),
      })
      .eq("id", data.runId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const retryAgentRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AgentRunIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any)
      .from("agent_runs")
      .select("agent_id, goal_override, context_json")
      .eq("id", data.runId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Run not found");
    const res = await runAgent(context.supabase, {
      agentId: row.agent_id as string,
      actorId: context.userId,
      goalOverride: (row.goal_override as string | null) ?? null,
      context: (row.context_json as Record<string, unknown> | null) ?? null,
    });
    return toJson(res);
  });

/* --------------------------- Tool Sample Context ------------------------ */
// Provides real IDs from the user's tenant so the Tool Runner can populate
// "Load Sample" with non-fabricated values (org, user, site, workflow,
// incident, asset, tool ids). Never returns secrets.

export type ToolSampleContext = {
  user_id: string;
  org_id: string | null;
  now_iso: string;
  site_id: string | null;
  workflow_id: string | null;
  incident_id: string | null;
  asset_id: string | null;
  tool_id: string | null;
  agent_id: string | null;
  has_real_data: boolean;
};

export const getToolSampleContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ToolSampleContext> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const pick = async (table: string, col = "id"): Promise<string | null> => {
      try {
        const { data } = await sb.from(table).select(col).limit(1).maybeSingle();
        return (data?.[col] as string | undefined) ?? null;
      } catch {
        return null;
      }
    };
    const [org_id, site_id, workflow_id, incident_id, asset_id, tool_id, agent_id] =
      await Promise.all([
        getCurrentOrgIdForUser(context.userId),
        pick("sec_sites"),
        pick("workflows"),
        pick("sec_incidents"),
        pick("sec_assets"),
        pick("tool_registry"),
        pick("agent_definitions"),
      ]);
    const has_real_data = Boolean(org_id || site_id || workflow_id || incident_id);
    return {
      user_id: context.userId,
      org_id,
      now_iso: new Date().toISOString(),
      site_id,
      workflow_id,
      incident_id,
      asset_id,
      tool_id,
      agent_id,
      has_real_data,
    };
  });
