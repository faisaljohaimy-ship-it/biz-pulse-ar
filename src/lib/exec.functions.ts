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

async function requireAdmin(
  supabase: unknown,
  userId: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: isAdmin } = await (supabase as any).rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden: admin role required");
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
    // Permission: only admin may approve.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: isAdmin } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");
    const res = await decideApproval(
      context.supabase,
      context.userId,
      data.executionId,
      data.decision,
    );
    return toJson(res);
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
    });
    return toJson(res);
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
