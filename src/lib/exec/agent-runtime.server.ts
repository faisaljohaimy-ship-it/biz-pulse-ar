import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { generateText, tool, stepCountIs, type ToolSet } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, DEFAULT_LOVABLE_MODEL } from "@/lib/ai-gateway.server";
import { getExecutor, listExecutorIds } from "./tool-registry.server";
import { executeTool } from "./tool-orchestrator.server";
import { audit } from "./audit.server";
import { publishEvent } from "./event-bus.server";

const RunAgentParamsSchema = z.object({
  agentId: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[A-Za-z0-9_-]+$/),
  actorId: z.string().uuid(),
  goalOverride: z.string().trim().max(4000).optional().nullable(),
  context: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type RunAgentParams = z.infer<typeof RunAgentParamsSchema>;

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
  const { agentId, actorId, goalOverride, context: ctxData } = RunAgentParamsSchema.parse(params);

  // ALL orchestration writes go through the service-role admin client so RLS
  // RESTRICTIVE policies on workflows/workflow_runs/workflow_step_runs cannot
  // silently drop the wrapper trail. This is the production contract: every
  // Run Agent click produces a complete evidence chain regardless of caller.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;

  // 1) Load agent definition (admin — wrapper runs as system).
  const { data: def, error: defErr } = await admin
    .from("agent_definitions")
    .select("id, name, goal, system_prompt, permissions, tool_allowlist, model, enabled")
    .eq("id", agentId)
    .maybeSingle();
  if (defErr || !def) throw new Error(`Agent not found: ${agentId}`);
  const agent = def as AgentDef;
  if (!agent.enabled) throw new Error(`Agent disabled: ${agentId}`);

  const goal = (goalOverride?.trim() || agent.goal).trim();
  const correlationId = crypto.randomUUID();

  // Resolve org_id for this actor (first membership).
  const { data: memb } = await admin
    .from("org_members")
    .select("org_id")
    .eq("user_id", actorId)
    .limit(1)
    .maybeSingle();
  const orgId: string = (memb?.org_id as string | undefined) ?? "";
  if (!orgId) throw new Error("Actor is not assigned to an organization");

  // Find or create the system "Agent Execution" workflow per org so every
  // Run Agent press produces a real workflow_runs / workflow_step_runs trail.
  const WF_NAME = "__agent.run__";

  let { data: wfRow } = await admin
    .from("workflows")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", WF_NAME)
    .limit(1)
    .maybeSingle();
  if (!wfRow) {
    const { data: created } = await admin
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

  const { data: runRow, error: runErr } = await admin
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
    const { data: wfRunRow } = await admin
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

  await audit(admin, {
    actor_id: actorId,
    org_id: orgId,
    action: "agent.run.start",
    resource_type: "agent_run",
    resource_id: runId,
    metadata: { agentId, correlationId, workflowRunId },
    correlation_id: correlationId,
  });
  await publishEvent(admin, {
    topic: "workflow.started",
    payload: { workflowRunId, agentId, agentRunId: runId, goal },
    source: "agent.runtime",
    actor_id: actorId,
    org_id: orgId,
    correlation_id: correlationId,
    subject_type: "workflow_run",
    subject_id: workflowRunId,
  });
  await publishEvent(admin, {
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
          description:
            exec!.description ??
            `Invoke registry tool ${toolId}. Permission and approval are enforced server-side.`,
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
              const { data: stepRow } = await admin
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
            await publishEvent(admin, {
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
                await admin
                  .from("workflow_step_runs")
                  .update({
                    status: stepStatus,
                    output_json:
                      res.status === "succeeded"
                        ? ({ output: res.output } as Record<string, unknown>)
                        : null,
                    error: res.status === "succeeded" ? null : (res.error ?? res.status),
                    tool_execution_id: res.executionId ?? null,
                    finished_at: new Date().toISOString(),
                  })
                  .eq("id", stepRowId);
              }
              await publishEvent(admin, {
                topic:
                  res.status === "succeeded"
                    ? "workflow.step.completed"
                    : res.status === "pending_approval"
                      ? "workflow.step.waiting"
                      : "workflow.step.failed",
                payload: {
                  workflowRunId,
                  toolId,
                  executionId: res.executionId,
                  status: res.status,
                },
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
                await admin
                  .from("workflow_step_runs")
                  .update({
                    status: "failed",
                    error: msg,
                    finished_at: new Date().toISOString(),
                  })
                  .eq("id", stepRowId);
              }
              await publishEvent(admin, {
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
    ``,
    `ABSOLUTE RULES (Executive Runtime Charter v10):`,
    `1. NEVER fabricate data, metrics, counts, percentages, names, IDs, dates, or statuses. Every number or fact in your final answer MUST come from a tool result returned in THIS run.`,
    `2. If a tool call returns { ok: false } or an error, DO NOT invent the data it would have returned. Either retry the tool with a corrected payload, or state explicitly in the final summary: "Data unavailable — <tool> failed: <reason>".`,
    `3. The database uses bilingual schemas. ALL security tables are prefixed sec_* (sec_incidents, sec_sites, sec_work_orders, sec_patrols, sec_permits, sec_visitors, sec_assets, sec_contractors). Tables named "incidents", "sites", "work_orders" DO NOT EXIST — never query them.`,
    `4. Column names are bilingual: use title_en/title_ar (not "title"), name_en/name_ar (not "name"), company_name_en/company_name_ar (not "company_name"). Check the sql.read description for exact columns before calling it.`,
    `5. Validate every tool payload against its schema before sending. Repair malformed JSON. Reject unknown fields.`,
    `6. If pending_approval is returned, stop calling that tool and report it as awaiting approval.`,
    `7. Be decisive. Produce a concise executive summary at the end, in the language of the goal (Arabic or English).`,
    `8. If you have no tool evidence to support a claim, do not make the claim. State the gap instead.`,
  ].join("\n");

  try {
    const result = await generateText({
      model: gateway(modelId),
      system: systemPrompt,
      prompt: ctxData ? `${goal}\n\nContext:\n${JSON.stringify(ctxData, null, 2)}` : goal,
      tools,
      toolChoice: "auto",
      stopWhen: stepCountIs(50),
      maxRetries: 1,
      // GPT-5 family rejects max_tokens entirely; omit any output-token cap.
      ...(isGpt5Family ? {} : { maxOutputTokens: 1500, temperature: 0.3 }),
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

    await admin
      .from("agent_runs")
      .update({
        status: "succeeded",
        summary,
        steps: stepRecords.length,
        audit_json: { correlationId, steps: stepRecords, usage: result.usage },
        finished_at: finishedAt,
      })
      .eq("id", runId);

    await audit(admin, {
      actor_id: actorId,
      org_id: orgId,
      action: "agent.run.success",
      resource_type: "agent_run",
      resource_id: runId,
      metadata: { agentId, steps: stepRecords.length, workflowRunId },
      correlation_id: correlationId,
      duration_ms: Date.now() - new Date(startedAt).getTime(),
    });
    await publishEvent(admin, {
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
      await admin
        .from("workflow_runs")
        .update({
          status: "succeeded",
          finished_at: finishedAt,
          current_step: null,
        })
        .eq("id", workflowRunId);
      await publishEvent(admin, {
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

      await admin.from("aria_reports").insert({
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
          tool_calls: stepRecords.flatMap((s) =>
            s.toolCalls.map((c) => ({
              tool: c.name,
              ok: !c.error,
              executionId: c.executionId ?? null,
            })),
          ),
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
    await publishEvent(admin, {
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
      await admin
        .from("workflow_runs")
        .update({
          status: "failed",
          error: msg,
          finished_at: new Date().toISOString(),
        })
        .eq("id", workflowRunId);
      await publishEvent(admin, {
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
  _supabase: SupabaseClient<Database>,
  runId: string,
  actorId: string,
  error: string,
  stepRecords: StepRecord[] = [],
  orgId?: string,
  correlationId?: string,
  startedAt?: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;
  await admin
    .from("agent_runs")
    .update({
      status: "failed",
      error,
      steps: stepRecords.length,
      audit_json: { steps: stepRecords },
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
  await audit(admin, {
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
