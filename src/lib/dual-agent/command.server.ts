import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { executeTool } from "@/lib/exec/tool-orchestrator.server";
import { audit } from "@/lib/exec/audit.server";
import { FNN_TOOL_IDS, type DualAgentOverview, type FnnTaskResult } from "./types";

const READ_TIMEOUT_MS = 3_500;
export const OrgInput = z.object({ orgId: z.string().uuid().optional() }).strict();
export const FnnTaskInput = OrgInput.extend({
  toolId: z.enum(FNN_TOOL_IDS),
  objective: z.string().trim().min(3).max(2000),
  input: z.record(z.unknown()).refine((value) => JSON.stringify(value).length <= 20_000),
}).strict();

export interface CommandContext {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims?: unknown;
}

/** Membership is checked from the database on every request; claims only select a tenant. */
export async function resolveCommandOrg(
  context: CommandContext,
  requested?: string,
): Promise<string> {
  if (!context.userId) throw new Error("سجّل الدخول لعرض مهام مؤسستك.");
  const { data, error } = await context.supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", context.userId)
    .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS));
  if (error) throw new Error("تعذّر التحقق من صلاحية المؤسسة. أعد المحاولة.");
  const memberships = [...new Set((data ?? []).map((row) => row.org_id))];
  const active = (context.claims as { app_metadata?: { current_org?: unknown } } | undefined)
    ?.app_metadata?.current_org;
  const selected = requested ?? (typeof active === "string" ? active : undefined);
  if (selected && memberships.includes(selected)) return selected;
  if (selected || memberships.length !== 1) {
    throw new Error("اختر مؤسسة تملك عضوية فيها قبل متابعة المهمة.");
  }
  return memberships[0];
}

export async function readCommandOverview(
  context: CommandContext,
  input: z.infer<typeof OrgInput>,
): Promise<DualAgentOverview> {
  const orgId = await resolveCommandOrg(context, input.orgId);
  const signal = AbortSignal.timeout(READ_TIMEOUT_MS);
  const [registry, history] = await Promise.all([
    context.supabase
      .from("tool_registry")
      .select("id, name, description, enabled, requires_approval, schema_json")
      .eq("org_id", orgId)
      .in("id", [...FNN_TOOL_IDS])
      .abortSignal(signal),
    context.supabase
      .from("tool_executions")
      .select("id, tool_id, status, correlation_id, created_at, finished_at, duration_ms")
      .eq("org_id", orgId)
      .eq("actor_id", context.userId)
      .in("tool_id", [...FNN_TOOL_IDS])
      .order("created_at", { ascending: false })
      .limit(50)
      .abortSignal(signal),
  ]);
  if (registry.error || history.error) throw new Error("تعذّر تحميل سجل المهام. أعد المحاولة.");
  const executions = (history.data ?? []).map((row) => ({
    id: row.id,
    toolId: row.tool_id,
    status: row.status,
    correlationId: row.correlation_id,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms,
  }));
  const count = (status: string) => executions.filter((row) => row.status === status).length;
  const succeeded = count("succeeded");
  const failed = count("failed");
  return {
    orgId,
    observedAt: new Date().toISOString(),
    source: "database",
    scope: "current_user",
    sampleLimit: 50,
    tools: (registry.data ?? []).map((row) => ({
      id: row.id as (typeof FNN_TOOL_IDS)[number],
      name: row.name,
      description: row.description,
      enabled: row.enabled,
      requiresApproval: row.id !== "sql.read" || row.requires_approval,
      inputSchema: row.schema_json,
    })),
    executions,
    metrics: {
      sampleSize: executions.length,
      succeeded,
      failed,
      pendingApproval: count("pending_approval"),
      running: count("running") + count("queued"),
      successRate: succeeded + failed ? (succeeded / (succeeded + failed)) * 100 : null,
    },
  };
}

/** Only fixed registered tools; no arbitrary URL, SQL, shell, code, secret, or deployment action. */
export async function dispatchFnnTask(
  context: CommandContext,
  untrusted: unknown,
): Promise<FnnTaskResult> {
  const data = FnnTaskInput.parse(untrusted);
  const orgId = await resolveCommandOrg(context, data.orgId);
  const taskId = crypto.randomUUID();
  // Registry is tenant scoped here as well as RLS protected in the shared executor.
  const { data: registered, error } = await context.supabase
    .from("tool_registry")
    .select("id, enabled")
    .eq("org_id", orgId)
    .eq("id", data.toolId)
    .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS))
    .maybeSingle();
  if (error || !registered?.enabled) throw new Error("الأداة غير متاحة لهذه المؤسسة حاليًا.");
  await audit(context.supabase, {
    actor_id: context.userId,
    org_id: orgId,
    action: "sadeed.fnn.delegated",
    resource_type: "agent_task",
    resource_id: taskId,
    correlation_id: taskId,
    source: "sadeed-command",
    metadata: {
      coordinator: "sadeed",
      executor: "fnn",
      toolId: data.toolId,
      objective: data.objective,
    },
  });
  const result = await executeTool(context.supabase, {
    toolId: data.toolId,
    input: data.input,
    actorId: context.userId,
    orgId,
    correlationId: taskId,
    requireApproval: data.toolId !== "sql.read",
    // Never retry non-idempotent tasks automatically; explicit human approval is preserved.
    retry: { max: 0, baseMs: 0 },
  });
  await audit(context.supabase, {
    actor_id: context.userId,
    org_id: orgId,
    action: "sadeed.fnn.outcome_received",
    resource_type: "tool_execution",
    resource_id: result.executionId,
    correlation_id: taskId,
    source: "sadeed-command",
    status: result.status,
    metadata: { coordinator: "sadeed", executor: "fnn", toolId: data.toolId },
  });
  return {
    taskId,
    coordinator: "sadeed",
    executor: "fnn",
    executionId: result.executionId,
    status: result.status,
    ...(result.output === undefined
      ? {}
      : { output: JSON.parse(JSON.stringify(result.output)) as Json }),
    ...(result.error
      ? { error: "تعذّر تنفيذ المهمة. راجع سجل التنفيذ وأعد المحاولة بعد معالجة السبب." }
      : {}),
  };
}
