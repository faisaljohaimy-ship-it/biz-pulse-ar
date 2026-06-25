import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { executeTool } from "./tool-orchestrator.server";
import { audit } from "./audit.server";
import { publishEvent } from "./event-bus.server";

/* ---------------------------- Definition types -------------------------- */

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
  }),
  StepBase.extend({
    kind: z.literal("condition"),
    /** Simple expression: `ctx.foo === "bar"` style supported via predicate path */
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
};

export type WorkflowRunResult = {
  runId: string;
  status: "succeeded" | "failed" | "waiting_approval" | "cancelled";
  context: Record<string, unknown>;
  error?: string;
};

function readPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (acc, k) => (acc != null && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined),
    obj,
  );
}

/**
 * Substitute `{{ctx.foo.bar}}` tokens inside tool inputs with values from
 * the workflow context. Returns a new object; missing keys become undefined.
 */
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

export async function triggerWorkflow(
  supabase: SupabaseClient<Database>,
  params: TriggerWorkflowParams,
): Promise<WorkflowRunResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wf, error } = await (supabase as any)
    .from("workflows")
    .select("id, name, definition_json, enabled")
    .eq("id", params.workflowId)
    .maybeSingle();
  if (error || !wf) throw new Error("Workflow not found");
  if (!wf.enabled) throw new Error("Workflow disabled");

  const def = WorkflowDefinitionSchema.parse(wf.definition_json);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run, error: rErr } = await (supabase as any)
    .from("workflow_runs")
    .insert({
      workflow_id: wf.id,
      status: "running",
      triggered_by: params.triggeredBy,
      trigger_event: params.triggerEvent ?? "manual",
      trigger_payload: params.payload ?? {},
      context_json: { trigger: params.payload ?? {} },
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
    metadata: { workflowId: wf.id },
  });

  const stepIndex = new Map<string, WorkflowStep>(
    def.steps.map((s) => [s.id, s]),
  );
  let context: Record<string, unknown> = { trigger: params.payload ?? {}, steps: {} };
  let cursor: string | undefined = def.start;
  let lastError: string | undefined;
  const MAX_STEPS = 100;
  let stepCount = 0;

  try {
    while (cursor && stepCount < MAX_STEPS) {
      stepCount++;
      const step = stepIndex.get(cursor);
      if (!step) throw new Error(`Step not found: ${cursor}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: stepRow } = await (supabase as any)
        .from("workflow_step_runs")
        .insert({
          run_id: runId,
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
          const input = interpolate(step.input, context);
          const res = await executeTool(supabase, {
            toolId: step.toolId,
            input,
            actorId: params.triggeredBy,
            workflowRunId: runId,
          });
          if (res.status === "pending_approval") {
            await finishStep("waiting", { executionId: res.executionId });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from("workflow_runs")
              .update({ status: "waiting_approval", current_step: step.id, context_json: context })
              .eq("id", runId);
            return { runId, status: "waiting_approval", context };
          }
          if (res.status === "failed") {
            await finishStep("failed", null, res.error, res.executionId);
            if (step.onError) {
              cursor = step.onError;
              break;
            }
            throw new Error(res.error ?? "tool failed");
          }
          context = {
            ...context,
            steps: { ...(context.steps as object), [step.id]: res.output ?? null },
          };
          await finishStep(
            "succeeded",
            { executionId: res.executionId, output: res.output ?? null },
            undefined,
            res.executionId,
          );
          cursor = step.next;
          break;
        }
        case "condition": {
          const val = readPath(context, step.when.path);
          let truthy = false;
          if (step.when.equals !== undefined) {
            truthy = val === step.when.equals;
          } else {
            truthy = Boolean(val);
          }
          await finishStep("succeeded", { evaluated: truthy });
          cursor = truthy ? step.ifTrue : step.ifFalse;
          break;
        }
        case "parallel": {
          // Each branch is itself a step id; execute branches sequentially
          // for simplicity (parallel semantics preserved at audit level).
          for (const branchId of step.branches) {
            const sub = stepIndex.get(branchId);
            if (!sub || sub.kind !== "tool") {
              await finishStep("failed", null, `parallel branch ${branchId} must be a tool`);
              throw new Error(`parallel branch ${branchId} invalid`);
            }
            const input = interpolate(sub.input, context);
            const res = await executeTool(supabase, {
              toolId: sub.toolId,
              input,
              actorId: params.triggeredBy,
              workflowRunId: runId,
            });
            if (res.status !== "succeeded") {
              await finishStep("failed", null, res.error ?? "branch failed");
              throw new Error(res.error ?? "branch failed");
            }
            context = {
              ...context,
              steps: { ...(context.steps as object), [branchId]: res.output ?? null },
            };
          }
          await finishStep("succeeded", { branches: step.branches.length });
          cursor = step.next;
          break;
        }
        case "approval": {
          await finishStep("waiting", { message: step.message ?? null });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("workflow_runs")
            .update({ status: "waiting_approval", current_step: step.id, context_json: context })
            .eq("id", runId);
          await publishEvent(supabase, {
            topic: "workflow.approval_needed",
            payload: { runId, stepId: step.id, message: step.message },
            actor_id: params.triggeredBy,
          });
          return { runId, status: "waiting_approval", context };
        }
        case "wait": {
          await new Promise((r) => setTimeout(r, step.seconds * 1000));
          await finishStep("succeeded", { waited: step.seconds });
          cursor = step.next;
          break;
        }
      }
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("workflow_runs")
      .update({
        status: "failed",
        error: lastError,
        finished_at: new Date().toISOString(),
        context_json: context,
      })
      .eq("id", runId);
    await audit(supabase, {
      actor_id: params.triggeredBy,
      action: "workflow.run.fail",
      resource_type: "workflow_run",
      resource_id: runId,
      metadata: { error: lastError },
    });
    await publishEvent(supabase, {
      topic: "workflow.failed",
      payload: { runId, error: lastError },
    });
    return { runId, status: "failed", context, error: lastError };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("workflow_runs")
    .update({
      status: "succeeded",
      finished_at: new Date().toISOString(),
      context_json: context,
    })
    .eq("id", runId);
  await audit(supabase, {
    actor_id: params.triggeredBy,
    action: "workflow.run.success",
    resource_type: "workflow_run",
    resource_id: runId,
  });
  await publishEvent(supabase, {
    topic: "workflow.succeeded",
    payload: { runId },
  });

  return { runId, status: "succeeded", context };
}
