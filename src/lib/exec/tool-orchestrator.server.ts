import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { hasAnyPlatformRole } from "@/lib/authz.server";
import { getExecutor } from "./tool-registry.server";
import { audit } from "./audit.server";
import { publishEvent } from "./event-bus.server";

export type ExecuteToolParams = {
  toolId: string;
  input: unknown;
  actorId: string;
  /** Requested tenant. Membership is verified before any execution row/tool call. */
  orgId?: string | null;
  workflowRunId?: string | null;
  agentRunId?: string | null;
  correlationId?: string | null;
  preApproved?: boolean;
  /** Override default retry policy (max=2, baseMs=750). */
  retry?: { max: number; baseMs: number };
};

export type ExecuteToolResult = {
  executionId: string;
  status: "succeeded" | "failed" | "pending_approval" | "rejected" | "rolled_back";
  output?: unknown;
  error?: string;
  attempts?: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY = { max: 2, baseMs: 750 };

/** قرارات المنع قبل التنفيذ — تُسجَّل كلُّها في الأثر. */
export type DenialDecision = "disabled" | "unauthorized" | "misconfigured";

/**
 * يسجّل **قرار منع**، لا إخفاقَ تنفيذ.
 *
 * الأثر قبل هذا كان يحمل نتائج التنفيذ وحدها (`tool.execute.*`)؛ أمّا من
 * حاول أداةً فمُنع فلم يترك سطرًا. والمحاولة المرفوضة أدلّ أمنيًّا من
 * الناجحة: تكرارُها من فاعلٍ واحد هو ما يُقرأ محاولةَ تصعيدِ صلاحيات،
 * وغيابُها يجعل ذلك غير مرئيّ بالكامل.
 *
 * ولا يرمي: تسجيلُ المنع لا يجوز أن يمنع المنع نفسه من الوقوع.
 */
async function auditDenial(
  supabase: SupabaseClient<Database>,
  params: {
    toolId: string;
    actorId: string;
    orgId: string | null;
    decision: DenialDecision;
    detail: string | null;
  },
): Promise<void> {
  await audit(supabase, {
    actor_id: params.actorId,
    org_id: params.orgId,
    action: `tool.denied.${params.decision}`,
    resource_type: "tool",
    resource_id: params.toolId,
    status: "denied",
    source: "tool-orchestrator",
    metadata: { decision: params.decision, detail: params.detail },
  });
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Classify an error as transient (retryable) vs permanent. */
function isTransient(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes("timed out")) return true;
  if (msg.includes("etimedout") || msg.includes("econnreset")) return true;
  if (msg.includes("network") || msg.includes("fetch failed")) return true;
  // HTTP status codes embedded in our executor messages: "(429)" "(500)" etc.
  const m = msg.match(/\((\d{3})\)/);
  if (m) {
    const code = parseInt(m[1], 10);
    if (code === 408 || code === 429) return true;
    if (code >= 500 && code <= 599) return true;
  }
  return false;
}

async function hasAnyRole(
  supabase: SupabaseClient<Database>,
  userId: string,
  roles: string[],
): Promise<boolean> {
  void supabase;
  return hasAnyPlatformRole(userId, roles);
}

async function resolveToolOrgId(
  supabase: SupabaseClient<Database>,
  actorId: string,
  requestedOrgId?: string | null,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("org_members")
    .select("org_id")
    .eq("user_id", actorId);
  if (error) throw new Error(`Unable to verify organization membership: ${error.message}`);
  const memberships = (data ?? []) as Array<{ org_id: string }>;
  if (requestedOrgId) {
    if (!memberships.some((membership) => membership.org_id === requestedOrgId)) {
      throw new Error("Forbidden: actor is not a member of the requested organization");
    }
    return requestedOrgId;
  }
  if (memberships.length !== 1) {
    throw new Error("An explicit organization is required for multi-tenant tool execution");
  }
  return memberships[0].org_id;
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
  const retry = params.retry ?? DEFAULT_RETRY;
  const orgId = await resolveToolOrgId(supabase, actorId, params.orgId);

  // 1) Load registry row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reg, error: regErr } = await (supabase as any)
    .from("tool_registry")
    .select("id, enabled, permissions, requires_approval, rollback_kind, metadata")
    .eq("id", toolId)
    .maybeSingle();
  if (regErr || !reg) throw new Error(`Tool not registered: ${toolId}`);
  if (!reg.enabled) {
    // السبب يُنقل مع الرفض — «Tool disabled» وحدها لا تقول **لماذا**،
    // فيُقرأ تعطيلُ حارسِ المخطّط (تابعٌ غائب) كأنه قرار تشغيليّ، ويُبحث
    // عن العلّة في غير موضعها. الحارس `20260920140000` يكتب السبب في
    // `metadata.disabled_reason`، وهنا يُقرأ.
    const reason = (reg.metadata as Record<string, unknown> | null)?.disabled_reason;
    await auditDenial(supabase, {
      toolId,
      actorId,
      orgId,
      decision: "disabled",
      detail: typeof reason === "string" ? reason : null,
    });
    throw new Error(
      `Tool disabled: ${toolId}${typeof reason === "string" && reason ? ` — ${reason}` : ""}`,
    );
  }

  // 2) Permission check
  const permissions = Array.isArray(reg.permissions) ? reg.permissions : [];
  if (!permissions.length) {
    await auditDenial(supabase, {
      toolId,
      actorId,
      orgId,
      decision: "misconfigured",
      detail: "no permissions configured",
    });
    throw new Error(`Tool ${toolId} has no permissions configured`);
  }
  const allowed = await hasAnyRole(supabase, actorId, permissions);
  if (!allowed) {
    // **قرارُ منعٍ يُسجَّل.** كان يُرمى بلا أثر: من حاول أداةً لا يملك
    // دورها لم يترك سطرًا واحدًا. والمحاولة المرفوضة أدلّ أمنيًّا من
    // الناجحة — تكرارُها من فاعلٍ واحد هو ما يُقرأ تصعيدَ صلاحيات.
    await auditDenial(supabase, {
      toolId,
      actorId,
      orgId,
      decision: "unauthorized",
      detail: `required one of: ${permissions.join(", ")}`,
    });
    throw new Error(`Forbidden: missing role for ${toolId}`);
  }

  // 3) Find executor + validate input
  const exec = getExecutor(toolId);
  if (!exec) throw new Error(`No executor bound for ${toolId}`);
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
        org_id: orgId,
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
      org_id: orgId,
      correlation_id: correlationId,
    });
    return { executionId: pending.id, status: "pending_approval" };
  }

  // 5) Insert running row
  const startedAt = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error: insErr } = await (supabase as any)
    .from("tool_executions")
    .insert({
      tool_id: toolId,
      actor_id: actorId,
      org_id: orgId,
      workflow_run_id: workflowRunId,
      agent_run_id: agentRunId,
      correlation_id: correlationId,
      status: "running",
      input_json: parsed.data,
      started_at: startedAt.toISOString(),
      attempt: 1,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  const executionId = row.id as string;

  await audit(supabase, {
    actor_id: actorId,
    org_id: orgId,
    action: "tool.execute.start",
    resource_type: "tool_execution",
    resource_id: executionId,
    metadata: { toolId, correlationId },
  });

  // 6) Run executor with timeout + transient-error retries
  let attempt = 0;
  let lastErr: unknown;
  while (attempt <= retry.max) {
    attempt++;
    try {
      const result = await withTimeout(
        exec.execute(parsed.data, {
          supabase,
          actorId,
          orgId,
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
          attempt,
        })
        .eq("id", executionId);
      await audit(supabase, {
        actor_id: actorId,
        org_id: orgId,
        action: "tool.execute.success",
        resource_type: "tool_execution",
        resource_id: executionId,
        metadata: { toolId, attempts: attempt },
      });
      await publishEvent(supabase, {
        topic: `tool.succeeded.${toolId}`,
        payload: { executionId, toolId, output: result.output },
        actor_id: actorId,
        org_id: orgId,
        correlation_id: correlationId,
      });
      return { executionId, status: "succeeded", output: result.output, attempts: attempt };
    } catch (err) {
      lastErr = err;
      if (attempt > retry.max || !isTransient(err)) break;
      const backoff = retry.baseMs * Math.pow(2, attempt - 1);
      await audit(supabase, {
        actor_id: actorId,
        org_id: orgId,
        action: "tool.execute.retry",
        resource_type: "tool_execution",
        resource_id: executionId,
        metadata: {
          toolId,
          attempt,
          backoff,
          error: err instanceof Error ? err.message : String(err),
        },
      });
      await sleep(backoff);
    }
  }

  const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
  const finishedAt = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("tool_executions")
    .update({
      status: "failed",
      error: message,
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      attempt,
    })
    .eq("id", executionId);
  await audit(supabase, {
    actor_id: actorId,
    org_id: orgId,
    action: "tool.execute.fail",
    resource_type: "tool_execution",
    resource_id: executionId,
    metadata: { toolId, error: message, attempts: attempt },
  });
  await publishEvent(supabase, {
    topic: `tool.failed.${toolId}`,
    payload: { executionId, toolId, error: message },
    actor_id: actorId,
    org_id: orgId,
    correlation_id: correlationId,
  });
  return { executionId, status: "failed", error: message, attempts: attempt };
}

export async function decideApproval(
  supabase: SupabaseClient<Database>,
  approverId: string,
  executionId: string,
  decision: "approve" | "reject",
): Promise<ExecuteToolResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pending, error } = await (supabase as any)
    .from("tool_executions")
    .select(
      "id, tool_id, input_json, actor_id, org_id, workflow_run_id, agent_run_id, correlation_id, status",
    )
    .eq("id", executionId)
    .maybeSingle();
  if (error || !pending) throw new Error("Execution not found");
  if (pending.status !== "pending_approval") {
    throw new Error(`Execution is ${pending.status}, not pending`);
  }
  const orgId = await resolveToolOrgId(supabase, approverId, pending.org_id);

  if (decision === "reject") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rejectError } = await (supabase as any)
      .from("tool_executions")
      .update({
        status: "rejected",
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", executionId);
    if (rejectError) {
      // Never report a rejection that did not persist.
      throw new Error(`Failed to persist rejection: ${rejectError.message}`);
    }
    await audit(supabase, {
      actor_id: approverId,
      org_id: orgId,
      action: "tool.approval.rejected",
      resource_type: "tool_execution",
      resource_id: executionId,
    });
    return { executionId, status: "rejected" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: approveError } = await (supabase as any)
    .from("tool_executions")
    .update({
      status: "queued",
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", executionId);
  if (approveError) {
    // Never report an approval that did not persist.
    throw new Error(`Failed to persist approval: ${approveError.message}`);
  }
  await audit(supabase, {
    actor_id: approverId,
    org_id: orgId,
    action: "tool.approval.approved",
    resource_type: "tool_execution",
    resource_id: executionId,
  });

  return executeTool(supabase, {
    toolId: pending.tool_id,
    input: pending.input_json,
    actorId: pending.actor_id ?? approverId,
    orgId,
    workflowRunId: pending.workflow_run_id,
    agentRunId: pending.agent_run_id,
    correlationId: pending.correlation_id,
    preApproved: true,
  });
}

/* ------------------------------- Rollback ------------------------------- */

export async function rollbackExecution(
  supabase: SupabaseClient<Database>,
  executionId: string,
  actorId: string,
): Promise<ExecuteToolResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("tool_executions")
    .select("id, tool_id, status, output_json, correlation_id, org_id")
    .eq("id", executionId)
    .maybeSingle();
  if (error || !row) throw new Error("Execution not found");
  if (row.status !== "succeeded") {
    throw new Error(`Cannot rollback execution in status: ${row.status}`);
  }
  const orgId = await resolveToolOrgId(supabase, actorId, row.org_id);
  const exec = getExecutor(row.tool_id);
  if (!exec?.rollback) {
    throw new Error(`Tool ${row.tool_id} does not support rollback`);
  }
  const payload =
    (row.output_json as { rollbackPayload?: Record<string, unknown> } | null)?.rollbackPayload ??
    null;

  try {
    await exec.rollback(payload, {
      supabase,
      actorId,
      orgId,
      correlationId: row.correlation_id ?? crypto.randomUUID(),
      executionId,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("tool_executions")
      .update({ status: "rolled_back" })
      .eq("id", executionId);
    await audit(supabase, {
      actor_id: actorId,
      org_id: orgId,
      action: "tool.rollback.success",
      resource_type: "tool_execution",
      resource_id: executionId,
      metadata: { toolId: row.tool_id },
    });
    await publishEvent(supabase, {
      topic: `tool.rolled_back.${row.tool_id}`,
      payload: { executionId, toolId: row.tool_id },
      actor_id: actorId,
      org_id: orgId,
    });
    return { executionId, status: "rolled_back" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await audit(supabase, {
      actor_id: actorId,
      org_id: orgId,
      action: "tool.rollback.fail",
      resource_type: "tool_execution",
      resource_id: executionId,
      metadata: { toolId: row.tool_id, error: message },
    });
    throw new Error(`Rollback failed: ${message}`);
  }
}

/* -------------------- Reap stale "running" executions ------------------- */

/**
 * Mark executions stuck in "running" for longer than maxAgeMs as failed.
 * Runs as an admin maintenance job. Returns count reaped.
 */
/** مهلة الاعتماد الافتراضية — سبعة أيام. */
export const APPROVAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * يُنهي انتظار الاعتمادات التي تجاوزت مهلتها — **ولا ينفّذ منها شيئًا.**
 *
 * ## العلّة التي وُلد منها
 *
 * `reapStaleExecutions` يحصد `status = 'running'` وحده، فالمعلَّق
 * للاعتماد بلا حاصدٍ ولا مهلة. وقِيس في الإنتاج: ثلاثة تنفيذات معلَّقة
 * منذ ٢٠٢٦/٠٧/٠٧ — شهران ونصف بلا قرار، وطابورُ تفويضٍ لا يراقبه أحد
 * هو حارسٌ نائم.
 *
 * ## والانتهاء ليس اعتمادًا
 *
 * `expired` تُغلق الانتظار وتترك الفعل **غير منفَّذ**. والخلط بينها وبين
 * `approved` يقلب الحارس إلى بابٍ يفتح نفسه بمرور الوقت — وهو أسوأ من
 * غياب الحارس، لأنّه يُقرأ حراسةً.
 *
 * وكلّ انتقالٍ يُكتب في الأثر بفاعلٍ مسمًّى (`system:approval-ttl`) لا
 * مجهولًا: من أغلق الطلب سؤالٌ يجب أن يُجاب بعد شهر.
 */
export async function expireStaleApprovals(
  supabase: SupabaseClient<Database>,
  maxAgeMs = APPROVAL_TTL_MS,
): Promise<{ expired: number; ids: string[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

  const { data: stale, error: readError } = await admin
    .from("tool_executions")
    .select("id, tool_id, actor_id, org_id, correlation_id")
    .eq("status", "pending_approval")
    .lt("created_at", cutoff);
  // **قراءةٌ فاشلة ليست «صفر منتهٍ».** بلا هذا التفكيك يعود
  // `{ expired: 0 }` فيُقرأ «لا شيء تجاوز مهلته» وهو «لم نستطع النظر» —
  // وهما نقيضان (المادة ٢٧)، والخلط بينهما في دفعةٍ موضوعُها أن الصفر
  // ليس غيابًا يكون قد أعاد العلّة في الأداة التي تعالجها.
  if (readError) throw new Error(`Failed to read pending approvals: ${readError.message}`);

  const rows = (stale ?? []) as Array<{
    id: string;
    tool_id: string;
    actor_id: string | null;
    org_id: string | null;
    correlation_id: string | null;
  }>;
  if (!rows.length) return { expired: 0, ids: [] };

  const ids = rows.map((r) => r.id);
  const { error } = await admin
    .from("tool_executions")
    .update({
      status: "expired",
      error: "Approval window elapsed without a human decision",
      finished_at: new Date().toISOString(),
    })
    .in("id", ids)
    // شرطٌ مكرَّر عمدًا: لو اعتُمد الطلب بين القراءة والكتابة فلا يُداس
    // قرارُ بشرٍ بانتهاءِ مهلة.
    .eq("status", "pending_approval");
  if (error) throw new Error(`Failed to expire approvals: ${error.message}`);

  // سطرٌ لكلّ طلب لا سطرٌ للدفعة: الأثر يُسأل عن طلبٍ بعينه.
  //
  // **والكتابة بمفتاح الخدمة لا بعميل النداء.** سياسة `audit_logs_org_insert`
  // تشترط `actor_id IS NOT NULL AND actor_id = auth.uid()`؛ وفاعلُ الانتهاء
  // نظامٌ لا إنسان، فـ`actor_id: null` يُرفض صامتًا مع عميلٍ مصادَق —
  // فيمضي الانتهاء بلا أثرٍ إطلاقًا، وهو نقيض الغرض. والجداول نفسها
  // تُعالَج بـ`admin` أصلًا في هذه الدالّة.
  for (const r of rows) {
    await audit(admin, {
      actor_id: null,
      org_id: r.org_id,
      action: "tool.approval.expired",
      resource_type: "tool_execution",
      resource_id: r.id,
      status: "expired",
      source: "system:approval-ttl",
      correlation_id: r.correlation_id,
      metadata: {
        tool_id: r.tool_id,
        requested_by: r.actor_id,
        cutoff,
        executed: false,
        note: "المهلة تُنهي الانتظار ولا تنفّذ — ليست اعتمادًا.",
      },
    });
  }
  return { expired: ids.length, ids };
}

export async function reapStaleExecutions(
  supabase: SupabaseClient<Database>,
  maxAgeMs = 5 * 60_000,
): Promise<{ reaped: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Maintenance reaping must not be limited by the caller's RLS visibility.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

  const { data: stale } = await admin
    .from("tool_executions")
    .select("id")
    .eq("status", "running")
    .lt("started_at", cutoff);
  const ids = (stale ?? []).map((r: { id: string }) => r.id);
  if (!ids.length) return { reaped: 0 };

  await admin
    .from("tool_executions")
    .update({
      status: "failed",
      error: "Reaped: execution exceeded max runtime",
      finished_at: new Date().toISOString(),
    })
    .in("id", ids);
  await audit(supabase, {
    actor_id: null,
    action: "tool.execute.reap",
    resource_type: "tool_execution",
    metadata: { count: ids.length, cutoff },
  });
  return { reaped: ids.length };
}
