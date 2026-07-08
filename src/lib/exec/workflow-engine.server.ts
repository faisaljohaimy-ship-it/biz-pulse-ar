import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { executeTool } from "./tool-orchestrator.server";
import { audit } from "./audit.server";
import { publishEvent } from "./event-bus.server";

/* ---------------------------- Definition types -------------------------- */

const RetryPolicy = z
  .object({
    max: z.number().int().min(0).max(5).default(0),
    backoffMs: z.number().int().min(100).max(60_000).default(1000),
    factor: z.number().min(1).max(5).default(2),
  })
  .default({ max: 0, backoffMs: 1000, factor: 2 });

const StepBase = z.object({
  id: z.string().min(1),
  kind: z.enum(["tool", "condition", "parallel", "approval", "wait"]),
});

export const StepSchema = z.discriminatedUnion("kind", [
  StepBase.extend({
    kind: z.literal("tool"),
    toolId: z.string(),
    input: z.record(z.string(), z.unknown()).default({}),
    next: z.string().optional(),
    onError: z.string().optional(),
    retry: RetryPolicy.optional(),
  }),
  StepBase.extend({
    kind: z.literal("condition"),
    when: z.object({
      path: z.string(),
      equals: z.unknown().optional(),
      truthy: z.boolean().optional(),
    }),
    ifTrue: z.string(),
    ifFalse: z.string().optional(),
  }),
  StepBase.extend({
    kind: z.literal("parallel"),
    branches: z.array(z.string()).min(1),
    next: z.string().optional(),
  }),
  StepBase.extend({
    kind: z.literal("approval"),
    message: z.string().optional(),
    next: z.string().optional(),
  }),
  StepBase.extend({
    kind: z.literal("wait"),
    seconds: z.number().int().positive().max(300),
    next: z.string().optional(),
  }),
]);

export const WorkflowDefinitionSchema = z.object({
  start: z.string().min(1),
  steps: z.array(StepSchema).min(1),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowStep = z.infer<typeof StepSchema>;

/* ------------------------------ Execution ------------------------------- */

export type TriggerWorkflowParams = {
  workflowId: string;
  triggeredBy: string;
  triggerEvent?: string;
  payload?: Record<string, unknown>;
  /** Optional idempotency key — re-trigger with same key returns existing run. */
  idempotencyKey?: string;
};

export type WorkflowRunResult = {
  runId: string;
  status: "succeeded" | "failed" | "waiting_approval" | "cancelled" | "running";
  context: Record<string, unknown>;
  error?: string;
};

function readPath(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, k) =>
        acc != null && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined,
      obj,
    );
}

function interpolate(
  input: Record<string, unknown>,
  ctx: Record<string, unknown>,
): Record<string, unknown> {
  const json = JSON.stringify(input);
  const out = json.replace(/"\{\{ctx\.([\w.]+)\}\}"/g, (_, p) => {
    const val = readPath(ctx, p);
    return JSON.stringify(val ?? null);
  });
  return JSON.parse(out) as Record<string, unknown>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------- Core run executor --------------------------- */

type EngineState = {
  runId: string;
  def: WorkflowDefinition;
  stepIndex: Map<string, WorkflowStep>;
  triggeredBy: string;
  orgId: string | null;
  context: Record<string, unknown>;
};

async function loadDef(
  supabase: SupabaseClient<Database>,
  workflowId: string,
): Promise<WorkflowDefinition> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wf, error } = await (supabase as any)
    .from("workflows")
    .select("id, definition_json, enabled")
    .eq("id", workflowId)
    .maybeSingle();
  if (error || !wf) throw new Error("Workflow not found");
  if (!wf.enabled) throw new Error("Workflow disabled");
  return WorkflowDefinitionSchema.parse(wf.definition_json);
}

async function execToolStep(
  supabase: SupabaseClient<Database>,
  state: EngineState,
  step: Extract<WorkflowStep, { kind: "tool" }>,
  stepRunId: string | undefined,
): Promise<
  | { kind: "ok"; output: unknown; executionId: string }
  | { kind: "waiting"; executionId: string }
  | { kind: "error"; error: string; executionId?: string }
> {
  const policy = step.retry ?? { max: 0, backoffMs: 1000, factor: 2 };
  let attempt = 0;
  let lastErr: string | undefined;
  let lastExecId: string | undefined;

  while (attempt <= policy.max) {
    attempt++;
    const input = interpolate(step.input, state.context);
    const res = await executeTool(supabase, {
      toolId: step.toolId,
      input,
      actorId: state.triggeredBy,
      workflowRunId: state.runId,
    });
    lastExecId = res.executionId;

    if (res.status === "pending_approval") {
      return { kind: "waiting", executionId: res.executionId };
    }
    if (res.status === "succeeded") {
      if (stepRunId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("workflow_step_runs").update({ attempt }).eq("id", stepRunId);
      }
      return { kind: "ok", output: res.output, executionId: res.executionId };
    }
    // failed or rejected → maybe retry
    lastErr = res.error ?? `tool ${res.status}`;
    if (attempt > policy.max) break;
    const backoff = Math.min(policy.backoffMs * Math.pow(policy.factor, attempt - 1), 60_000);
    await audit(supabase, {
      actor_id: state.triggeredBy,
      action: "workflow.step.retry",
      resource_type: "workflow_step_run",
      resource_id: stepRunId ?? null,
      metadata: { stepId: step.id, attempt, backoff, error: lastErr },
    });
    await sleep(backoff);
  }
  return { kind: "error", error: lastErr ?? "tool failed", executionId: lastExecId };
}

async function runEngine(
  supabase: SupabaseClient<Database>,
  state: EngineState,
  startCursor: string,
): Promise<WorkflowRunResult> {
  let cursor: string | undefined = startCursor;
  const MAX_STEPS = 200;
  let stepCount = 0;

  try {
    while (cursor && stepCount < MAX_STEPS) {
      stepCount++;

      // Check for external cancel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: alive } = await (supabase as any)
        .from("workflow_runs")
        .select("status")
        .eq("id", state.runId)
        .maybeSingle();
      if (alive?.status === "cancelled") {
        return { runId: state.runId, status: "cancelled", context: state.context };
      }

      const step = state.stepIndex.get(cursor);
      if (!step) throw new Error(`Step not found: ${cursor}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: stepRow } = await (supabase as any)
        .from("workflow_step_runs")
        .insert({
          run_id: state.runId,
          org_id: state.orgId ?? undefined,
          step_id: step.id,
          kind: step.kind,
          status: "running",
          input_json: step,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      const stepRunId = stepRow?.id as string | undefined;

      const finishStep = async (
        status: "succeeded" | "failed" | "skipped" | "waiting",
        output: Record<string, unknown> | null,
        err?: string,
        toolExecutionId?: string,
      ) => {
        if (!stepRunId) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("workflow_step_runs")
          .update({
            status,
            output_json: output,
            error: err ?? null,
            finished_at: new Date().toISOString(),
            tool_execution_id: toolExecutionId ?? null,
          })
          .eq("id", stepRunId);
      };

      switch (step.kind) {
        case "tool": {
          const r = await execToolStep(supabase, state, step, stepRunId);
          if (r.kind === "waiting") {
            await finishStep("waiting", { executionId: r.executionId });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from("workflow_runs")
              .update({
                status: "waiting_approval",
                current_step: step.id,
                context_json: state.context,
              })
              .eq("id", state.runId);
            return {
              runId: state.runId,
              status: "waiting_approval",
              context: state.context,
            };
          }
          if (r.kind === "error") {
            await finishStep("failed", null, r.error, r.executionId);
            if (step.onError) {
              cursor = step.onError;
              break;
            }
            throw new Error(r.error);
          }
          state.context = {
            ...state.context,
            steps: {
              ...(state.context.steps as object),
              [step.id]: r.output ?? null,
            },
          };
          await finishStep(
            "succeeded",
            { executionId: r.executionId, output: r.output ?? null },
            undefined,
            r.executionId,
          );
          cursor = step.next;
          break;
        }
        case "condition": {
          const val = readPath(state.context, step.when.path);
          const truthy = step.when.equals !== undefined ? val === step.when.equals : Boolean(val);
          await finishStep("succeeded", { evaluated: truthy });
          cursor = truthy ? step.ifTrue : step.ifFalse;
          break;
        }
        case "parallel": {
          // True parallel: execute branches concurrently with allSettled
          const branchPromises = step.branches.map(async (branchId) => {
            const sub = state.stepIndex.get(branchId);
            if (!sub || sub.kind !== "tool") {
              throw new Error(`parallel branch ${branchId} must be a tool`);
            }
            const r = await execToolStep(supabase, state, sub, undefined);
            if (r.kind !== "ok") {
              throw new Error(r.kind === "error" ? r.error : "branch requires approval");
            }
            return { id: branchId, output: r.output };
          });
          const results = await Promise.allSettled(branchPromises);
          const failed = results.filter((r) => r.status === "rejected");
          if (failed.length) {
            const errs = failed
              .map((f) => (f as PromiseRejectedResult).reason?.message ?? "branch failed")
              .join("; ");
            await finishStep("failed", null, errs);
            throw new Error(errs);
          }
          const merged: Record<string, unknown> = { ...(state.context.steps as object) };
          for (const r of results) {
            if (r.status === "fulfilled") {
              merged[r.value.id] = r.value.output ?? null;
            }
          }
          state.context = { ...state.context, steps: merged };
          await finishStep("succeeded", { branches: step.branches.length });
          cursor = step.next;
          break;
        }
        case "approval": {
          await finishStep("waiting", { message: step.message ?? null });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("workflow_runs")
            .update({
              status: "waiting_approval",
              current_step: step.id,
              context_json: state.context,
            })
            .eq("id", state.runId);
          await publishEvent(supabase, {
            topic: "workflow.approval_needed",
            payload: { runId: state.runId, stepId: step.id, message: step.message },
            actor_id: state.triggeredBy,
          });
          return {
            runId: state.runId,
            status: "waiting_approval",
            context: state.context,
          };
        }
        case "wait": {
          await sleep(step.seconds * 1000);
          await finishStep("succeeded", { waited: step.seconds });
          cursor = step.next;
          break;
        }
      }
    }
  } catch (err) {
    const lastError = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("workflow_runs")
      .update({
        status: "failed",
        error: lastError,
        finished_at: new Date().toISOString(),
        context_json: state.context,
      })
      .eq("id", state.runId);
    await audit(supabase, {
      actor_id: state.triggeredBy,
      action: "workflow.run.fail",
      resource_type: "workflow_run",
      resource_id: state.runId,
      metadata: { error: lastError },
    });
    await publishEvent(supabase, {
      topic: "workflow.failed",
      payload: { runId: state.runId, error: lastError },
    });
    return {
      runId: state.runId,
      status: "failed",
      context: state.context,
      error: lastError,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("workflow_runs")
    .update({
      status: "succeeded",
      finished_at: new Date().toISOString(),
      context_json: state.context,
    })
    .eq("id", state.runId);
  await audit(supabase, {
    actor_id: state.triggeredBy,
    action: "workflow.run.success",
    resource_type: "workflow_run",
    resource_id: state.runId,
  });
  await publishEvent(supabase, {
    topic: "workflow.succeeded",
    payload: { runId: state.runId },
  });
  return { runId: state.runId, status: "succeeded", context: state.context };
}

/* ------------------------------ Public API ------------------------------ */

export async function triggerWorkflow(
  supabase: SupabaseClient<Database>,
  params: TriggerWorkflowParams,
): Promise<WorkflowRunResult> {
  // Idempotency: if a run with same workflow+key+actor exists in last 24h, return it
  if (params.idempotencyKey) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("workflow_runs")
      .select("id, status, context_json, error")
      .eq("workflow_id", params.workflowId)
      .eq("triggered_by", params.triggeredBy)
      .contains("trigger_payload", { __idempotency_key: params.idempotencyKey })
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      return {
        runId: existing.id,
        status: existing.status,
        context: (existing.context_json as Record<string, unknown>) ?? {},
        error: existing.error ?? undefined,
      };
    }
  }

  const def = await loadDef(supabase, params.workflowId);
  const triggerPayload: Record<string, unknown> = { ...(params.payload ?? {}) };
  if (params.idempotencyKey) {
    triggerPayload.__idempotency_key = params.idempotencyKey;
  }

  const { data: member } = await (supabase as any)
    .from("org_members")
    .select("org_id")
    .eq("user_id", params.triggeredBy)
    .limit(1)
    .maybeSingle();
  const orgId = (member?.org_id as string | undefined) ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run, error: rErr } = await (supabase as any)
    .from("workflow_runs")
    .insert({
      workflow_id: params.workflowId,
      org_id: orgId ?? undefined,
      status: "running",
      triggered_by: params.triggeredBy,
      trigger_event: params.triggerEvent ?? "manual",
      trigger_payload: triggerPayload,
      context_json: { trigger: params.payload ?? {}, steps: {} },
      current_step: def.start,
    })
    .select("id")
    .single();
  if (rErr) throw new Error(rErr.message);
  const runId = run.id as string;

  await audit(supabase, {
    actor_id: params.triggeredBy,
    action: "workflow.run.start",
    resource_type: "workflow_run",
    resource_id: runId,
    metadata: { workflowId: params.workflowId },
  });
  await publishEvent(supabase, {
    topic: "workflow.started",
    source: "exec.workflow",
    severity: "info",
    subject_type: "workflow_run",
    subject_id: runId,
    actor_id: params.triggeredBy,
    payload: {
      workflowId: params.workflowId,
      triggerEvent: params.triggerEvent ?? "manual",
    },
  });

  const state: EngineState = {
    runId,
    def,
    stepIndex: new Map(def.steps.map((s) => [s.id, s])),
    triggeredBy: params.triggeredBy,
    orgId,
    context: { trigger: params.payload ?? {}, steps: {} },
  };
  return runEngine(supabase, state, def.start);
}

export async function resumeWorkflowRun(
  supabase: SupabaseClient<Database>,
  runId: string,
  resumedBy: string,
): Promise<WorkflowRunResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run, error } = await (supabase as any)
    .from("workflow_runs")
    .select("id, workflow_id, status, current_step, context_json, triggered_by, org_id")
    .eq("id", runId)
    .maybeSingle();
  if (error || !run) throw new Error("Run not found");
  if (run.status !== "waiting_approval") {
    throw new Error(`Cannot resume run in status: ${run.status}`);
  }
  const def = await loadDef(supabase, run.workflow_id);
  const current = def.steps.find((s) => s.id === run.current_step);
  if (!current) throw new Error("Current step missing in definition");

  // After approval, advance past the approval/tool step to next
  const next =
    current.kind === "approval" ? current.next : current.kind === "tool" ? current.next : undefined;
  if (!next) {
    // No next → mark succeeded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("workflow_runs")
      .update({ status: "succeeded", finished_at: new Date().toISOString() })
      .eq("id", runId);
    return {
      runId,
      status: "succeeded",
      context: (run.context_json as Record<string, unknown>) ?? {},
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("workflow_runs")
    .update({ status: "running", current_step: next })
    .eq("id", runId);
  await audit(supabase, {
    actor_id: resumedBy,
    action: "workflow.run.resume",
    resource_type: "workflow_run",
    resource_id: runId,
    metadata: { from: current.id, to: next },
  });
  const state: EngineState = {
    runId,
    def,
    stepIndex: new Map(def.steps.map((s) => [s.id, s])),
    triggeredBy: run.triggered_by ?? resumedBy,
    orgId: (run.org_id as string | undefined) ?? null,
    context: (run.context_json as Record<string, unknown>) ?? { steps: {} },
  };
  return runEngine(supabase, state, next);
}

export async function cancelWorkflowRun(
  supabase: SupabaseClient<Database>,
  runId: string,
  cancelledBy: string,
): Promise<{ ok: true }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run } = await (supabase as any)
    .from("workflow_runs")
    .select("status")
    .eq("id", runId)
    .maybeSingle();
  if (!run) throw new Error("Run not found");
  if (["succeeded", "failed", "cancelled"].includes(run.status)) {
    throw new Error(`Run is terminal: ${run.status}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("workflow_runs")
    .update({
      status: "cancelled",
      error: "Cancelled by user",
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
  await audit(supabase, {
    actor_id: cancelledBy,
    action: "workflow.run.cancel",
    resource_type: "workflow_run",
    resource_id: runId,
  });
  await publishEvent(supabase, {
    topic: "workflow.cancelled",
    payload: { runId },
    actor_id: cancelledBy,
  });
  return { ok: true };
}
