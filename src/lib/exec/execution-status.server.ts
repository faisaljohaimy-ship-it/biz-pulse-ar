import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * حالة التنفيذ المرجعية للوكلاء — قراءة خالصة يقرؤها سَدِيد ليجيب عن «ماذا
 * يفعل الوكلاء الآن؟» و«هل الإجراء بانتظار اعتماد؟» من الجداول نفسها التي
 * يكتبها محرّك التشغيل (`agent_runs` و`tool_executions`)، لا من ذاكرة النموذج.
 *
 * - عميل المستدعي (RLS) لا عميل الخدمة: يرى المستخدم ما تسمح له به السياسات
 *   وحده، فالقائمة الفارغة «لا شيء مرئيّ لك» لا «لا شيء موجود».
 * - الجدولان يحملان `org_id` (‏`src/integrations/supabase/types.ts`) فيُقيَّد
 *   الاستعلام بالمؤسسة صراحةً فوق RLS.
 * - لا يرمي أبدًا ولا يختلق: أي خطأ ⇐ `{ ok: false, error }`، والحقل الغائب
 *   يعود `null` لا قيمةً مفترضة (المادة ٢٧).
 */

export const EXECUTION_STATUS_RUN_LIMIT = 10;
export const EXECUTION_STATUS_ACTIVE_LIMIT = 10;
export const ACTIVE_TOOL_EXECUTION_STATUSES = ["pending_approval", "queued", "running"] as const;

export type ExecutionStatusRun = {
  id: string;
  agent_id: string | null;
  status: string | null;
  started_at: string | null;
  finished_at: string | null;
  summary: string | null;
};

export type ExecutionStatusToolExecution = {
  id: string;
  tool_id: string | null;
  status: string | null;
  agent_run_id: string | null;
  created_at: string | null;
  started_at: string | null;
};

export type ExecutionStatusResult =
  | {
      ok: true;
      org_id: string;
      read_at: string;
      /** الصفوف المرئيّة للمستدعي تحت RLS — الفراغ ليس دليل غياب. */
      visibility: "caller_rls";
      agent_runs: ExecutionStatusRun[];
      active_tool_executions: ExecutionStatusToolExecution[];
    }
  | { ok: false; error: string };

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRun(row: Record<string, unknown>): ExecutionStatusRun | null {
  const id = text(row.id);
  if (!id) return null;
  return {
    id,
    agent_id: text(row.agent_id),
    status: text(row.status),
    started_at: text(row.started_at),
    finished_at: text(row.finished_at),
    summary: text(row.summary),
  };
}

function toToolExecution(row: Record<string, unknown>): ExecutionStatusToolExecution | null {
  const id = text(row.id);
  if (!id) return null;
  return {
    id,
    tool_id: text(row.tool_id),
    status: text(row.status),
    agent_run_id: text(row.agent_run_id),
    created_at: text(row.created_at),
    started_at: text(row.started_at),
  };
}

function rowsOf<T>(data: unknown, map: (row: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map(map)
    .filter((row): row is T => row !== null);
}

export async function readExecutionStatus(
  supabase: SupabaseClient,
  orgId: string,
): Promise<ExecutionStatusResult> {
  if (typeof orgId !== "string" || !orgId.trim()) {
    return { ok: false, error: "missing_org_context" };
  }
  try {
    const [runs, active] = await Promise.all([
      supabase
        .from("agent_runs")
        .select("id,agent_id,status,started_at,finished_at,summary")
        .eq("org_id", orgId)
        .order("started_at", { ascending: false })
        .limit(EXECUTION_STATUS_RUN_LIMIT),
      supabase
        .from("tool_executions")
        .select("id,tool_id,status,agent_run_id,created_at,started_at")
        .eq("org_id", orgId)
        .in("status", [...ACTIVE_TOOL_EXECUTION_STATUSES])
        .order("created_at", { ascending: false })
        .limit(EXECUTION_STATUS_ACTIVE_LIMIT),
    ]);
    // كلّ شيء أو لا شيء: نصف صورةٍ يُقرأ صورةً كاملة.
    if (runs.error) return { ok: false, error: `agent_runs: ${runs.error.message}` };
    if (active.error) return { ok: false, error: `tool_executions: ${active.error.message}` };
    return {
      ok: true,
      org_id: orgId,
      read_at: new Date().toISOString(),
      visibility: "caller_rls",
      agent_runs: rowsOf(runs.data, toRun),
      active_tool_executions: rowsOf(active.data, toToolExecution),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "execution_status_unavailable",
    };
  }
}
