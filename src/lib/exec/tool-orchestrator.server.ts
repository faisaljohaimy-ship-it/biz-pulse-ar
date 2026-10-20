import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { hasAnyPlatformRole } from "@/lib/authz.server";
import { getExecutor, isIdempotentCall } from "./tool-registry.server";
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
  /** Server-only policy: callers may require approval even if the registry does not. */
  requireApproval?: boolean;
  /**
   * تنفيذ طلبٍ معتمَد **على صفّه نفسه** (queued → running → النتيجة) بدل
   * إدراج صفٍّ ثانٍ. كان الاعتماد ينقل الصفّ الأصلي إلى `queued` ثم يُدرج
   * التنفيذُ صفًّا جديدًا، فيبقى الأصلي حتى يُحصد `failed` — زوجٌ مضلِّل
   * (فاشل + ناجح) لفعلٍ واحد. يشترط `preApproved`.
   */
  existingExecutionId?: string | null;
  /** Override default retry policy (max=2, baseMs=750). Applies to idempotent tools only. */
  retry?: { max: number; baseMs: number };
  /** Override the per-attempt executor timeout (default 30s). */
  timeoutMs?: number;
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

/** انقضاء مهلة المنفّذ — صنفٌ مميَّز ليُعرف الانقضاء دون مطابقة نصّ. */
class ToolTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "ToolTimeoutError";
  }
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new ToolTimeoutError(label, ms)), ms);
      }),
    ]);
  } finally {
    // المؤقّت لا يبقى معلّقًا بعد أن يحسم المنفّذ النتيجة.
    if (timer) clearTimeout(timer);
  }
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

/**
 * رسالة الإخفاق كما تُكتب في الصفّ. لأداةٍ ذات أثرٍ جانبيّ، انقضاءُ المهلة
 * أو خطأٌ عابر يعني «النتيجة مجهولة» لا «لم يقع» — فيُقال ذلك صراحةً، ويُقال
 * إنه لم يُعَد، كي لا يُقرأ الفشل دعوةً لإعادةٍ قد تكرّر الأثر.
 */
function failureMessage(err: unknown, idempotent: boolean): string {
  const base = err instanceof Error ? err.message : String(err);
  if (idempotent) return base;
  // «timed out» (مهلة المنسّق) و«Timeout after» (مهلة httpFetch) وكل عابر.
  const ambiguous =
    err instanceof ToolTimeoutError || isTransient(err) || /\btimeout\b/i.test(base);
  return ambiguous ? `${base} — outcome unknown, not retried` : base;
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
    existingExecutionId = null,
  } = params;
  // صفٌّ قائم لا يُنفَّذ إلا خلف اعتماد — وإلا صار بابًا خلفيًّا حول البوابة.
  if (existingExecutionId && !preApproved) {
    throw new Error("existingExecutionId requires an approved execution");
  }
  const retry = params.retry ?? DEFAULT_RETRY;
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
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
  if ((reg.requires_approval || params.requireApproval) && !preApproved) {
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

  // 5) Execution row — an approved request runs on ITS OWN row; anything
  // else gets a fresh running row.
  const startedAt = new Date();
  let executionId: string;
  if (existingExecutionId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: claimed, error: claimErr } = await (supabase as any)
      .from("tool_executions")
      .update({ status: "running", started_at: startedAt.toISOString(), attempt: 1 })
      .eq("id", existingExecutionId)
      .eq("tool_id", toolId)
      .eq("org_id", orgId)
      // الاعتماد نقل الصفّ إلى queued؛ وشرط الحالة عند الكتابة يمنع تنفيذه
      // مرّتين لو تسابق نداءان على الصفّ نفسه.
      .eq("status", "queued")
      .select("id");
    if (claimErr) throw new Error(claimErr.message);
    if (!Array.isArray(claimed) || claimed.length === 0) {
      throw new Error(`Execution ${existingExecutionId} is not queued for execution`);
    }
    executionId = existingExecutionId;
  } else {
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
    executionId = row.id as string;
  }

  await audit(supabase, {
    actor_id: actorId,
    org_id: orgId,
    action: "tool.execute.start",
    resource_type: "tool_execution",
    resource_id: executionId,
    metadata: { toolId, correlationId },
  });

  // 6) Run executor with timeout; transient-error retries for idempotent
  // calls ONLY. A side-effecting tool runs exactly once: its timeout means
  // "outcome unknown", and a retry could send the mail / create the incident
  // twice. (`Promise.race` cannot cancel the first attempt either — it keeps
  // running after the timeout fires.)
  const idempotent = isIdempotentCall(exec, parsed.data);
  const maxRetries = idempotent ? retry.max : 0;
  let attempt = 0;
  let lastErr: unknown;
  while (attempt <= maxRetries) {
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
        timeoutMs,
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
      if (attempt > maxRetries || !isTransient(err)) break;
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

  const message = failureMessage(lastErr, idempotent);
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
    metadata: { toolId, error: message, attempts: attempt, idempotent },
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
    const { data: rejectedRows, error: rejectError } = await (supabase as any)
      .from("tool_executions")
      .update({
        status: "rejected",
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", executionId)
      .eq("org_id", orgId)
      .eq("status", "pending_approval")
      .select("id");
    if (rejectError) {
      // Never report a rejection that did not persist.
      throw new Error(`Failed to persist rejection: ${rejectError.message}`);
    }
    if (!Array.isArray(rejectedRows) || rejectedRows.length === 0) {
      throw new Error("Failed to persist rejection: execution is no longer pending");
    }
    await audit(supabase, {
      actor_id: approverId,
      org_id: orgId,
      action: "tool.approval.rejected",
      resource_type: "tool_execution",
      resource_id: executionId,
    });
    // الرفض يُنهي الانتظار أيضًا — فإن كان آخر المعلَّق فلا يبقى الغلاف معلّقًا.
    await settleAfterResolution(pending, orgId);
    return { executionId, status: "rejected" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: approvedRows, error: approveError } = await (supabase as any)
    .from("tool_executions")
    .update({
      status: "queued",
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", executionId)
    // شرط الحالة عند الكتابة: اعتمادان متزامنان لا ينفّذان الفعل مرّتين.
    .eq("status", "pending_approval")
    .select("id");
  if (approveError) {
    // Never report an approval that did not persist.
    throw new Error(`Failed to persist approval: ${approveError.message}`);
  }
  if (!Array.isArray(approvedRows) || approvedRows.length === 0) {
    throw new Error("Failed to persist approval: execution is no longer pending");
  }
  await audit(supabase, {
    actor_id: approverId,
    org_id: orgId,
    action: "tool.approval.approved",
    resource_type: "tool_execution",
    resource_id: executionId,
  });

  // التنفيذ على **الصفّ نفسه**: لا إدراج ثانٍ، ولا صفٌّ أصليٌّ يُترك في
  // queued حتى يُحصد فاشلًا بجوار نسخةٍ ناجحة.
  let result: ExecuteToolResult;
  try {
    result = await executeTool(supabase, {
      toolId: pending.tool_id,
      input: pending.input_json,
      actorId: pending.actor_id ?? approverId,
      orgId,
      workflowRunId: pending.workflow_run_id,
      agentRunId: pending.agent_run_id,
      correlationId: pending.correlation_id,
      preApproved: true,
      existingExecutionId: executionId,
    });
  } catch (err) {
    // رمى قبل أن يبدأ (أداةٌ عُطّلت، دورٌ سُحب، مدخلٌ لم يعد صالحًا): الصفّ
    // المعتمَد يُغلق فاشلًا بسببه بدل أن يبقى queued بلا تفسير.
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("tool_executions")
      .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
      .eq("id", executionId)
      .eq("status", "queued");
    await settleAfterResolution(pending, orgId);
    throw err;
  }
  await settleAfterResolution(pending, orgId);
  return result;
}

/* ------------------- Agent wrapper workflow settlement ------------------ */

/**
 * `trigger_event` لغلاف تشغيل الوكيل في `workflow_runs`. هو ما يميّز الغلاف
 * عن سير عمل المحرّك: الأخير يُستأنف بعد الاعتماد عبر `resumeWorkflowRun`،
 * ونقله إلى `succeeded` من هنا كان سيقطع خطواته الباقية.
 */
export const AGENT_RUN_TRIGGER_EVENT = "agent.invoke";

/** حالات تنفيذٍ لم تُحسم بعد — ما دام منها شيء فالغلاف ينتظر. */
const UNRESOLVED_EXECUTION_STATUSES = new Set(["pending_approval", "queued", "running"]);

/**
 * حالاتٌ حُسم فيها الطلب **دون أن يقع الفعل**: رفضٌ بشريّ، أو مهلةٌ انقضت
 * بلا قرار، أو إلغاءٌ/إحلال. تُحصى ليُقال صراحةً إن الفعل لم يُنفَّذ.
 */
const NOT_EXECUTED_STATUSES = new Set(["rejected", "expired", "cancelled", "superseded"]);

export type ApprovalTally = {
  /** تنفيذات الارتباط التي لم تُحسم (بانتظار اعتماد، أو معتمَدة لم تنتهِ). */
  unresolved: number;
  /** تنفيذات مرّت ببوابة الاعتماد (`approved_at`) ثم فشلت. */
  approvedFailed: number;
  /** طلباتٌ حُسمت بلا تنفيذ (رُفضت، أو انتهت مهلتها، أو أُلغيت). */
  notExecuted: number;
};

/**
 * يقرأ حالة تنفيذات ارتباطٍ واحد داخل مؤسسته. `null` = تعذّرت القراءة —
 * وليس «لا شيء معلّق» (المادة ٢٧).
 */
export async function tallyApprovalState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  correlationId: string,
  orgId: string,
): Promise<ApprovalTally | null> {
  const { data, error } = await admin
    .from("tool_executions")
    .select("status, approved_at")
    .eq("correlation_id", correlationId)
    .eq("org_id", orgId);
  if (error || !Array.isArray(data)) return null;
  const rows = data as Array<{ status: string; approved_at: string | null }>;
  return {
    unresolved: rows.filter((r) => UNRESOLVED_EXECUTION_STATUSES.has(r.status)).length,
    approvedFailed: rows.filter((r) => r.approved_at && r.status === "failed").length,
    notExecuted: rows.filter((r) => NOT_EXECUTED_STATUSES.has(r.status)).length,
  };
}

/**
 * سطر الغلاف عند تسويته: فشلُ فعلٍ معتمَد، وما لم يُنفَّذ أصلًا. `succeeded`
 * عارية بعد رفضٍ أو انتهاء مهلة تُقرأ «نُفّذ كل شيء» — وهو لم يُنفَّذ.
 */
function settlementNote(tally: ApprovalTally): string | null {
  const parts: string[] = [];
  if (tally.approvedFailed > 0) parts.push(`${tally.approvedFailed} approved action(s) failed`);
  if (tally.notExecuted > 0) {
    parts.push(`${tally.notExecuted} action(s) not executed (rejected or approval expired)`);
  }
  return parts.length ? parts.join("; ") : null;
}

/**
 * ينقل غلاف تشغيل الوكيل من `waiting_approval` إلى مآله حين لا يبقى في
 * ارتباطه تنفيذٌ غير محسوم: `failed` إن فشل فعلٌ معتمَد، وإلا `succeeded`.
 * وما حُسم بلا تنفيذ (رفضٌ أو انتهاء مهلة) يُكتب في `error` سطرًا صريحًا —
 * التشغيل اكتمل، لكن الفعل لم يقع.
 *
 * لا يرمي (تسويةٌ بعد قرارٍ أو تشغيلٍ اكتمل فعلًا)، ولا يلمس إلا صفًّا
 * هو غلاف وكيل (`trigger_event`) في المؤسسة نفسها وما زال ينتظر — فلا
 * يدوس إلغاءً ولا سير عمل المحرّك. يعيد المآل، أو `null` إن لم ينقل شيئًا.
 */
export async function settleAgentWorkflowRun(params: {
  workflowRunId: string;
  correlationId: string;
  orgId: string;
}): Promise<"succeeded" | "failed" | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // الغلاف يُكتب بمفتاح الخدمة في وقت التشغيل، فيُسوّى بالمفتاح نفسه.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const tally = await tallyApprovalState(admin, params.correlationId, params.orgId);
    if (!tally || tally.unresolved > 0) return null;
    const status = tally.approvedFailed > 0 ? "failed" : "succeeded";
    const { data: moved, error } = await admin
      .from("workflow_runs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        current_step: null,
        error: settlementNote(tally),
      })
      .eq("id", params.workflowRunId)
      .eq("org_id", params.orgId)
      .eq("trigger_event", AGENT_RUN_TRIGGER_EVENT)
      .eq("status", "waiting_approval")
      .select("id");
    if (error || !Array.isArray(moved) || moved.length === 0) return null;
    await audit(admin, {
      actor_id: null,
      org_id: params.orgId,
      action: "workflow.run.settled",
      resource_type: "workflow_run",
      resource_id: params.workflowRunId,
      source: "tool-orchestrator",
      correlation_id: params.correlationId,
      metadata: { status, approvedFailed: tally.approvedFailed, notExecuted: tally.notExecuted },
    });
    return status;
  } catch (err) {
    console.error("[tool-orchestrator] agent workflow settlement failed", err);
    return null;
  }
}

/**
 * تسوية الغلاف بعد حسم طلب: اعتمادٌ أو رفضٌ بشريّ، أو انتهاء مهلةٍ بلا قرار
 * (`expireStaleApprovals`) — وإلا بقي الغلاف `waiting_approval` أبدًا ولا
 * شيء ينتظره. لتنفيذات الوكيل وحدها. يعيد مآل الغلاف أو `null`.
 */
async function settleAfterResolution(
  execution: {
    id: string;
    workflow_run_id: string | null;
    agent_run_id: string | null;
    correlation_id: string | null;
  },
  orgId: string,
): Promise<"succeeded" | "failed" | null> {
  // تنفيذات المحرّك (بلا agent_run_id) يُكمِلها `resumeWorkflowRun`.
  if (!execution.agent_run_id || !execution.correlation_id) return null;
  try {
    let workflowRunId = execution.workflow_run_id;
    if (!workflowRunId) {
      // صفوف ما قبل ربط `workflow_run_id`: الرابط عمود `tool_execution_id`
      // في خطوة الغلاف.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: step } = await (supabaseAdmin as any)
        .from("workflow_step_runs")
        .select("run_id")
        .eq("tool_execution_id", execution.id)
        .limit(1)
        .maybeSingle();
      workflowRunId = (step?.run_id as string | undefined) ?? null;
    }
    if (!workflowRunId) return null;
    return await settleAgentWorkflowRun({
      workflowRunId,
      correlationId: execution.correlation_id,
      orgId,
    });
  } catch (err) {
    console.error("[tool-orchestrator] post-decision settlement failed", err);
    return null;
  }
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
  maxAgeMs = APPROVAL_TTL_MS,
): Promise<{ expired: number; ids: string[]; settled: number }> {
  // **بلا معامل عميل.** كان يأخذ `supabase` ولا يستعمله بعد أن صار الأثر
  // يُكتب بمفتاح الخدمة — توقيعٌ يوحي بأن عميل النداء يحكم، وهو لا يحكم.
  // وتوقيعٌ يَعِد بما لا يفي به يُضلّل قارئه قبل أن يُضلّل مستدعيه.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

  const { data: stale, error: readError } = await admin
    .from("tool_executions")
    .select("id, tool_id, actor_id, org_id, correlation_id, workflow_run_id, agent_run_id")
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
    workflow_run_id: string | null;
    agent_run_id: string | null;
  }>;
  if (!rows.length) return { expired: 0, ids: [], settled: 0 };

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

  // غلاف تشغيل الوكيل ينتظر هذه الطلبات بالذات (`waiting_approval`)، والاعتماد
  // والرفض وحدهما كانا يسوّيانه — فانتهاءٌ بلا قرار تركه منتظرًا أبدًا ما لا
  // شيء ينتظره. تسويةٌ واحدة لكل ارتباط، والتسوية نفسها تتحقّق ألّا معلَّق
  // باقٍ (طلبٌ اعتُمد بين القراءة والكتابة يُبقيه منتظرًا)، وتكتب أن الفعل
  // لم يُنفَّذ. أفضل جهد: لا ترمي.
  let settled = 0;
  const seen = new Set<string>();
  for (const r of rows) {
    if (!r.agent_run_id || !r.correlation_id || !r.org_id) continue;
    const key = `${r.org_id}:${r.correlation_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (await settleAfterResolution(r, r.org_id)) settled++;
  }
  return { expired: ids.length, ids, settled };
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
