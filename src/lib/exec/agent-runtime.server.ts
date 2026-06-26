import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { generateText, tool, stepCountIs, type ToolSet } from "ai";
import {
  createLovableAiGatewayProvider,
  DEFAULT_LOVABLE_MODEL,
} from "@/lib/ai-gateway.server";
import { getExecutor, listExecutorIds } from "./tool-registry.server";
import { executeTool } from "./tool-orchestrator.server";
import { audit } from "./audit.server";
import { publishEvent } from "./event-bus.server";

export type RunAgentParams = {
  agentId: string;
  actorId: string;
  goalOverride?: string | null;
  context?: Record<string, unknown> | null;
};

export type RunAgentResult = {
  runId: string;
  status: "succeeded" | "failed";
  summary: string;
  steps: number;
  error?: string;
};

type AgentDef = {
  id: string;
  name: string;
  goal: string;
  system_prompt: string | null;
  permissions: string[] | null;
  tool_allowlist: string[] | null;
  model: string | null;
  enabled: boolean;
};

type StepRecord = {
  index: number;
  text: string;
  toolCalls: Array<{
    name: string;
    input: unknown;
    output?: unknown;
    error?: string;
    executionId?: string;
    approvalStatus?: string;
  }>;
  finishReason: string;
};

export async function runAgent(
  supabase: SupabaseClient<Database>,
  params: RunAgentParams,
): Promise<RunAgentResult> {
  const { agentId, actorId, goalOverride, context: ctxData } = params;

  // 1) Load agent definition (RLS scoped).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: def, error: defErr } = await (supabase as any)
    .from("agent_definitions")
    .select(
      "id, name, goal, system_prompt, permissions, tool_allowlist, model, enabled",
    )
    .eq("id", agentId)
    .maybeSingle();
  if (defErr || !def) throw new Error(`Agent not found: ${agentId}`);
  const agent = def as AgentDef;
  if (!agent.enabled) throw new Error(`Agent disabled: ${agentId}`);

  const goal = (goalOverride?.trim() || agent.goal).trim();
  const correlationId = crypto.randomUUID();

  // Resolve org_id for this actor (first membership) — RLS requires it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memb } = await (supabase as any)
    .from("org_members")
    .select("org_id")
    .eq("user_id", actorId)
    .limit(1)
    .maybeSingle();
  const orgId: string =
    (memb?.org_id as string | undefined) ??
    "00000000-0000-0000-0000-000000000001";

  // Find or create the system "Agent Execution" workflow per org so every
  // Run Agent press produces a real workflow_runs / workflow_step_runs trail.
  const WF_NAME = "__agent.run__";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: wfRow } = await (supabase as any)
    .from("workflows")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", WF_NAME)
    .limit(1)
    .maybeSingle();
  if (!wfRow) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created } = await (supabase as any)
      .from("workflows")
      .insert({
        org_id: orgId,
        name: WF_NAME,
        description: "System workflow wrapping agent executions",
        definition_json: { kind: "agent-run", version: 1 },
        enabled: true,
        tags: ["system", "agent"],
        owner_id: actorId,
      })
      .select("id")
      .single();
    wfRow = created;
  }
  const workflowId = (wfRow?.id as string | undefined) ?? null;

  // 2) Create agent_runs row (running).
  const startedAt = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: runRow, error: runErr } = await (supabase as any)
    .from("agent_runs")
    .insert({
      agent_id: agentId,
      triggered_by: actorId,
      org_id: orgId,
      goal_override: goalOverride ?? null,
      context_json: ctxData ?? {},
      status: "running",
      steps: 0,
      audit_json: { correlationId, steps: [] as StepRecord[] },
      started_at: startedAt,
    })
    .select("id")
    .single();
  if (runErr) throw new Error(runErr.message);
  const runId = runRow.id as string;

  // 2b) Wrap the agent execution in a workflow_run for full lifecycle evidence.
  let workflowRunId: string | null = null;
  if (workflowId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: wfRunRow } = await (supabase as any)
      .from("workflow_runs")
      .insert({
        workflow_id: workflowId,
        org_id: orgId,
        triggered_by: actorId,
        trigger_event: "agent.invoke",
        trigger_payload: { agentId, agentRunId: runId, goal },
        context_json: { correlationId },
        status: "running",
        current_step: "agent.execute",
      })
      .select("id")
      .single();
    workflowRunId = (wfRunRow?.id as string | undefined) ?? null;
  }

  await audit(supabase, {
    actor_id: actorId,
    org_id: orgId,
    action: "agent.run.start",
    resource_type: "agent_run",
    resource_id: runId,
    metadata: { agentId, correlationId, workflowRunId },
    correlation_id: correlationId,
  });
  await publishEvent(supabase, {
    topic: "workflow.started",
    payload: { workflowRunId, agentId, agentRunId: runId, goal },
    source: "agent.runtime",
    actor_id: actorId,
    org_id: orgId,
    correlation_id: correlationId,
    subject_type: "workflow_run",
    subject_id: workflowRunId,
  });
  await publishEvent(supabase, {
    topic: `agent.started.${agentId}`,
    payload: { runId, agentId, goal, workflowRunId },
    source: "agent.runtime",
    actor_id: actorId,
    org_id: orgId,
    correlation_id: correlationId,
    subject_type: "agent_run",
    subject_id: runId,
  });

  // 3) Build AI SDK tools from the allowlist, intersected with bound executors.
  const allowed = new Set(agent.tool_allowlist ?? []);
  const bound = new Set(listExecutorIds());
  const toolIds = [...allowed].filter((id) => bound.has(id));

  const stepRecords: StepRecord[] = [];
  let currentToolCalls: StepRecord["toolCalls"] = [];

  const tools: ToolSet = Object.fromEntries(
    toolIds.map((toolId) => {
      const exec = getExecutor(toolId);
      // Sanitize tool name for OpenAI/Anthropic (alphanumeric/underscore only).
      const fnName = toolId.replace(/[^a-zA-Z0-9_]/g, "_");
      return [
        fnName,
        tool({
          description: `Invoke registry tool ${toolId}. Permission and approval are enforced server-side.`,
          inputSchema: exec!.input,
          execute: async (input: unknown) => {
            const callRecord: StepRecord["toolCalls"][number] = {
              name: toolId,
              input,
            };
            currentToolCalls.push(callRecord);
            const stepStartedAt = new Date().toISOString();
            // workflow_step_runs (running)
            let stepRowId: string | null = null;
            if (workflowRunId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: stepRow } = await (supabase as any)
                .from("workflow_step_runs")
                .insert({
                  run_id: workflowRunId,
                  org_id: orgId,
                  step_id: toolId,
                  kind: "tool",
                  status: "running",
                  attempt: 1,
                  input_json: (input as Record<string, unknown>) ?? {},
                  started_at: stepStartedAt,
                })
                .select("id")
                .single();
              stepRowId = (stepRow?.id as string | undefined) ?? null;
            }
            await publishEvent(supabase, {
              topic: "workflow.step.started",
              payload: { workflowRunId, toolId, input },
              source: "agent.runtime",
              actor_id: actorId,
              org_id: orgId,
              correlation_id: correlationId,
              subject_type: "workflow_step_run",
              subject_id: stepRowId,
            });

            try {
              const res = await executeTool(supabase, {
                toolId,
                input,
                actorId,
                agentRunId: runId,
                correlationId,
              });
              callRecord.executionId = res.executionId;
              callRecord.approvalStatus = res.status;

              const stepStatus =
                res.status === "succeeded"
                  ? "succeeded"
                  : res.status === "pending_approval"
                    ? "waiting"
                    : "failed";
              if (stepRowId) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase as any)
                  .from("workflow_step_runs")
                  .update({
                    status: stepStatus,
                    output_json:
                      res.status === "succeeded"
                        ? ({ output: res.output } as Record<string, unknown>)
                        : null,
                    error:
                      res.status === "succeeded" ? null : (res.error ?? res.status),
                    tool_execution_id: res.executionId ?? null,
                    finished_at: new Date().toISOString(),
                  })
                  .eq("id", stepRowId);
              }
              await publishEvent(supabase, {
                topic:
                  res.status === "succeeded"
                    ? "workflow.step.completed"
                    : res.status === "pending_approval"
                      ? "workflow.step.waiting"
                      : "workflow.step.failed",
                payload: { workflowRunId, toolId, executionId: res.executionId, status: res.status },
                source: "agent.runtime",
                severity: res.status === "succeeded" ? "info" : "warn",
                actor_id: actorId,
                org_id: orgId,
                correlation_id: correlationId,
                subject_type: "workflow_step_run",
                subject_id: stepRowId,
              });

              if (res.status === "succeeded") {
                callRecord.output = res.output;
                return { ok: true, output: res.output };
              }
              if (res.status === "pending_approval") {
                callRecord.error = "pending_approval";
                return {
                  ok: false,
                  pending_approval: true,
                  message:
                    "Tool requires human approval. Halt this step, report it to the operator, and stop calling this tool.",
                  executionId: res.executionId,
                };
              }
              callRecord.error = res.error ?? res.status;
              return { ok: false, error: res.error ?? res.status };
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              callRecord.error = msg;
              if (stepRowId) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase as any)
                  .from("workflow_step_runs")
                  .update({
                    status: "failed",
                    error: msg,
                    finished_at: new Date().toISOString(),
                  })
                  .eq("id", stepRowId);
              }
              await publishEvent(supabase, {
                topic: "workflow.step.failed",
                payload: { workflowRunId, toolId, error: msg },
                source: "agent.runtime",
                severity: "error",
                actor_id: actorId,
                org_id: orgId,
                correlation_id: correlationId,
                subject_type: "workflow_step_run",
                subject_id: stepRowId,
              });
              return { ok: false, error: msg };
            }
          },
        }),
      ];
    }),
  );

  // 4) Run the bounded LLM loop.
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) {
    await failRun(supabase, runId, actorId, "LOVABLE_API_KEY missing");
    return {
      runId,
      status: "failed",
      summary: "Missing LOVABLE_API_KEY",
      steps: 0,
      error: "LOVABLE_API_KEY missing",
    };
  }
  const gateway = createLovableAiGatewayProvider(lovableKey);
  const modelId = agent.model || DEFAULT_LOVABLE_MODEL;
  const isGpt5Family = modelId.startsWith("openai/gpt-5");

  const systemPrompt = [
    agent.system_prompt?.trim() ||
      `You are ${agent.name}, an autonomous executive agent inside NEXUS AI OS for the Western Region Industrial Security Department.`,
    `Mission: ${agent.goal}`,
    `Allowed tools: ${toolIds.length ? toolIds.join(", ") : "(none — answer with analysis only)"}.`,
    `Rules:`,
    `- Use tools only when the goal demands evidence or action.`,
    `- If a tool returns pending_approval, stop using that tool and report what is awaiting approval.`,
    `- Be decisive. Produce a final concise executive summary at the end.`,
    `- Answer in the language of the goal (Arabic or English).`,
  ].join("\n");

  try {
    const result = await generateText({
      model: gateway(modelId),
      system: systemPrompt,
      prompt: ctxData
        ? `${goal}\n\nContext:\n${JSON.stringify(ctxData, null, 2)}`
        : goal,
      tools,
      toolChoice: "auto",
      stopWhen: stepCountIs(50),
      maxRetries: 1,
      maxOutputTokens: 1500,
      ...(isGpt5Family ? {} : { temperature: 0.3 }),
      onStepFinish: ({ text, finishReason }) => {
        stepRecords.push({
          index: stepRecords.length,
          text: text ?? "",
          toolCalls: currentToolCalls,
          finishReason: String(finishReason),
        });
        currentToolCalls = [];
      },
    });

    const finishedAt = new Date().toISOString();
    const summary = result.text?.trim() || "(no summary produced)";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("agent_runs")
      .update({
        status: "succeeded",
        summary,
        steps: stepRecords.length,
        audit_json: { correlationId, steps: stepRecords, usage: result.usage },
        finished_at: finishedAt,
      })
      .eq("id", runId);

    await audit(supabase, {
      actor_id: actorId,
      org_id: orgId,
      action: "agent.run.success",
      resource_type: "agent_run",
      resource_id: runId,
      metadata: { agentId, steps: stepRecords.length, workflowRunId },
      correlation_id: correlationId,
      duration_ms: Date.now() - new Date(startedAt).getTime(),
    });
    await publishEvent(supabase, {
      topic: `agent.succeeded.${agentId}`,
      payload: { runId, agentId, steps: stepRecords.length, workflowRunId },
      source: "agent.runtime",
      actor_id: actorId,
      org_id: orgId,
      correlation_id: correlationId,
      subject_type: "agent_run",
      subject_id: runId,
      duration_ms: Date.now() - new Date(startedAt).getTime(),
    });

    if (workflowRunId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("workflow_runs")
        .update({
          status: "succeeded",
          finished_at: finishedAt,
          current_step: null,
        })
        .eq("id", workflowRunId);
      await publishEvent(supabase, {
        topic: "workflow.completed",
        payload: { workflowRunId, agentId, agentRunId: runId, steps: stepRecords.length },
        source: "agent.runtime",
        actor_id: actorId,
        org_id: orgId,
        correlation_id: correlationId,
        subject_type: "workflow_run",
        subject_id: workflowRunId,
        duration_ms: Date.now() - new Date(startedAt).getTime(),
      });
    }

    // Persist a bilingual executive report tied to this run.
    try {
      const md = [
        `# Executive Report — ${agent.name}`,
        ``,
        `**Run:** ${runId}  ·  **Agent:** ${agentId}  ·  **Steps:** ${stepRecords.length}`,
        ``,
        `## English`,
        summary,
        ``,
        `## Goal`,
        goal,
      ].join("\n");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("aria_reports").insert({
        user_id: actorId,
        org_id: orgId,
        kind: "executive",
        title: `Agent Run — ${agent.name}`,
        period_start: startedAt,
        period_end: finishedAt,
        markdown: md,
        payload: {
          agentId,
          agentRunId: runId,
          workflowRunId,
          steps: stepRecords.length,
          tool_calls: stepRecords.flatMap((s) => s.toolCalls.map((c) => ({
            tool: c.name,
            ok: !c.error,
            executionId: c.executionId ?? null,
          }))),
          summary_en: summary,
          summary_ar: summary,
          correlationId,
        },
      });
    } catch (e) {
      console.error("[agent-runtime] executive report insert failed", e);
    }

    return {
      runId,
      status: "succeeded",
      summary,
      steps: stepRecords.length,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await failRun(supabase, runId, actorId, msg, stepRecords, orgId, correlationId, startedAt);
    await publishEvent(supabase, {
      topic: `agent.failed.${agentId}`,
      payload: { runId, agentId, error: msg, workflowRunId },
      source: "agent.runtime",
      severity: "error",
      actor_id: actorId,
      org_id: orgId,
      correlation_id: correlationId,
      subject_type: "agent_run",
      subject_id: runId,
    });
    if (workflowRunId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("workflow_runs")
        .update({
          status: "failed",
          error: msg,
          finished_at: new Date().toISOString(),
        })
        .eq("id", workflowRunId);
      await publishEvent(supabase, {
        topic: "workflow.failed",
        payload: { workflowRunId, agentId, agentRunId: runId, error: msg },
        source: "agent.runtime",
        severity: "error",
        actor_id: actorId,
        org_id: orgId,
        correlation_id: correlationId,
        subject_type: "workflow_run",
        subject_id: workflowRunId,
      });
    }
    return {
      runId,
      status: "failed",
      summary: msg,
      steps: stepRecords.length,
      error: msg,
    };
  }
}

async function failRun(
  supabase: SupabaseClient<Database>,
  runId: string,
  actorId: string,
  error: string,
  stepRecords: StepRecord[] = [],
  orgId?: string,
  correlationId?: string,
  startedAt?: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("agent_runs")
    .update({
      status: "failed",
      error,
      steps: stepRecords.length,
      audit_json: { steps: stepRecords },
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
  await audit(supabase, {
    actor_id: actorId,
    org_id: orgId ?? null,
    action: "agent.run.fail",
    resource_type: "agent_run",
    resource_id: runId,
    metadata: { error },
    correlation_id: correlationId ?? null,
    duration_ms: startedAt ? Date.now() - new Date(startedAt).getTime() : null,
  });
}
