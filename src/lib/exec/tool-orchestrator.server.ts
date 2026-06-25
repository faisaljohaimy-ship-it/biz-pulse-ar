import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getExecutor } from "./tool-registry.server";
import { audit } from "./audit.server";
import { publishEvent } from "./event-bus.server";

export type ExecuteToolParams = {
  toolId: string;
  input: unknown;
  actorId: string;
  workflowRunId?: string | null;
  agentRunId?: string | null;
  correlationId?: string | null;
  /** Pre-approval override: caller asserts approval already granted. */
  preApproved?: boolean;
};

export type ExecuteToolResult = {
  executionId: string;
  status:
    | "succeeded"
    | "failed"
    | "pending_approval"
    | "rejected"
    | "rolled_back";
  output?: unknown;
  error?: string;
};

const DEFAULT_TIMEOUT_MS = 30_000;

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/** Verify the caller holds at least one of the required roles. */
async function hasAnyRole(
  supabase: SupabaseClient<Database>,
  userId: string,
  roles: string[],
): Promise<boolean> {
  if (!roles.length) return true;
  for (const role of roles) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("has_role", {
      _user_id: userId,
      _role: role,
    });
    if (!error && data === true) return true;
  }
  return false;
}

export async function executeTool(
  supabase: SupabaseClient<Database>,
  params: ExecuteToolParams,
): Promise<ExecuteToolResult> {
  const {
    toolId,
    input,
    actorId,
    workflowRunId = null,
    agentRunId = null,
    preApproved = false,
  } = params;

  // 1) Load registry row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reg, error: regErr } = await (supabase as any)
    .from("tool_registry")
    .select("id, enabled, permissions, requires_approval, rollback_kind")
    .eq("id", toolId)
    .maybeSingle();
  if (regErr || !reg) {
    throw new Error(`Tool not registered: ${toolId}`);
  }
  if (!reg.enabled) {
    throw new Error(`Tool disabled: ${toolId}`);
  }

  // 2) Permission check
  const allowed = await hasAnyRole(supabase, actorId, reg.permissions ?? []);
  if (!allowed) {
    throw new Error(`Forbidden: missing role for ${toolId}`);
  }

  // 3) Find executor + validate input
  const exec = getExecutor(toolId);
  if (!exec) {
    throw new Error(`No executor bound for ${toolId}`);
  }
  const parsed = exec.input.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid input for ${toolId}: ${parsed.error.message}`);
  }

  const correlationId = params.correlationId ?? crypto.randomUUID();

  // 4) Approval gate
  if (reg.requires_approval && !preApproved) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pending, error: pendErr } = await (supabase as any)
      .from("tool_executions")
      .insert({
        tool_id: toolId,
        actor_id: actorId,
        workflow_run_id: workflowRunId,
        agent_run_id: agentRunId,
        correlation_id: correlationId,
        status: "pending_approval",
        input_json: parsed.data,
      })
      .select("id")
      .single();
    if (pendErr) throw new Error(pendErr.message);

    await publishEvent(supabase, {
      topic: "tool.pending_approval",
      payload: { executionId: pending.id, toolId, actorId },
      actor_id: actorId,
      correlation_id: correlationId,
    });

    return {
      executionId: pending.id,
      status: "pending_approval",
    };
  }

  // 5) Insert running row
  const startedAt = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error: insErr } = await (supabase as any)
    .from("tool_executions")
    .insert({
      tool_id: toolId,
      actor_id: actorId,
      workflow_run_id: workflowRunId,
      agent_run_id: agentRunId,
      correlation_id: correlationId,
      status: "running",
      input_json: parsed.data,
      started_at: startedAt.toISOString(),
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  const executionId = row.id as string;

  await audit(supabase, {
    actor_id: actorId,
    action: "tool.execute.start",
    resource_type: "tool_execution",
    resource_id: executionId,
    metadata: { toolId, correlationId },
  });

  // 6) Run executor with timeout
  try {
    const result = await withTimeout(
      exec.execute(parsed.data, {
        supabase,
        actorId,
        correlationId,
        executionId,
      }),
      DEFAULT_TIMEOUT_MS,
      `tool ${toolId}`,
    );

    const finishedAt = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("tool_executions")
      .update({
        status: "succeeded",
        output_json: {
          output: result.output,
          rollbackPayload: result.rollbackPayload ?? null,
        },
        finished_at: finishedAt.toISOString(),
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
      })
      .eq("id", executionId);

    await audit(supabase, {
      actor_id: actorId,
      action: "tool.execute.success",
      resource_type: "tool_execution",
      resource_id: executionId,
      metadata: { toolId },
    });

    await publishEvent(supabase, {
      topic: `tool.succeeded.${toolId}`,
      payload: { executionId, toolId, output: result.output },
      actor_id: actorId,
      correlation_id: correlationId,
    });

    return { executionId, status: "succeeded", output: result.output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const finishedAt = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("tool_executions")
      .update({
        status: "failed",
        error: message,
        finished_at: finishedAt.toISOString(),
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
      })
      .eq("id", executionId);

    await audit(supabase, {
      actor_id: actorId,
      action: "tool.execute.fail",
      resource_type: "tool_execution",
      resource_id: executionId,
      metadata: { toolId, error: message },
    });

    await publishEvent(supabase, {
      topic: `tool.failed.${toolId}`,
      payload: { executionId, toolId, error: message },
      actor_id: actorId,
      correlation_id: correlationId,
    });

    return { executionId, status: "failed", error: message };
  }
}

/** Approve or reject a pending execution. On approve, the tool is run. */
export async function decideApproval(
  supabase: SupabaseClient<Database>,
  approverId: string,
  executionId: string,
  decision: "approve" | "reject",
): Promise<ExecuteToolResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pending, error } = await (supabase as any)
    .from("tool_executions")
    .select("id, tool_id, input_json, actor_id, workflow_run_id, agent_run_id, correlation_id, status")
    .eq("id", executionId)
    .maybeSingle();
  if (error || !pending) throw new Error("Execution not found");
  if (pending.status !== "pending_approval") {
    throw new Error(`Execution is ${pending.status}, not pending`);
  }

  if (decision === "reject") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("tool_executions")
      .update({
        status: "rejected",
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", executionId);

    await audit(supabase, {
      actor_id: approverId,
      action: "tool.approval.rejected",
      resource_type: "tool_execution",
      resource_id: executionId,
    });
    return { executionId, status: "rejected" };
  }

  // Approve → mark + run
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("tool_executions")
    .update({
      status: "queued",
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", executionId);

  await audit(supabase, {
    actor_id: approverId,
    action: "tool.approval.approved",
    resource_type: "tool_execution",
    resource_id: executionId,
  });

  // Run as the original actor with pre-approval.
  return executeTool(supabase, {
    toolId: pending.tool_id,
    input: pending.input_json,
    actorId: pending.actor_id ?? approverId,
    workflowRunId: pending.workflow_run_id,
    agentRunId: pending.agent_run_id,
    correlationId: pending.correlation_id,
    preApproved: true,
  });
}
