// @vitest-environment node
/**
 * مسار تشغيل الوكيل على **المكدّس الحقيقي** — Postgres 16 بسلسلة الترحيلات
 * كاملةً، PostgREST 12، بوّابة HS256، و`@supabase/supabase-js` الحقيقية.
 *
 * ما هو حقيقي هنا: `runAgent` و`executeTool` و`decideApproval` و
 * `readExecutionStatus` وكل ما تستدعيه (`supabaseAdmin` يُبنى من
 * SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY المشيرَين إلى البوّابة؛ بوّابة حصّة
 * الذكاء تستدعي `check_rate_limit` الحقيقية في القاعدة؛ RLS والامتيازات كما
 * بنتها الترحيلات). المزيَّف وحده: **النموذج** — `MockLanguageModelV3` مُبرمَج
 * يستدعي الأدوات بالترتيب نفسه الذي يفعله نموذجٌ حقيقي.
 *
 * حصّة الذكاء غير مزيَّفة: `assertAiQuota` ← `enforceRateLimit` ←
 * `supabaseAdmin.rpc("check_rate_limit")` تجري على القاعدة الحقيقية (السقف
 * الافتراضي 120/هوية/يوم على سطح chat؛ هذا الملف يستهلك أقلّ من عشرة).
 *
 * توصيلتان للمستدعي تُختبران معًا لأن الكود يملكهما معًا — وكلتاهما تعمل منذ
 * RT-1 (كل كتابات التنسيق بمفتاح الخدمة، وعميل المستدعي للمنفّذين وحدهم):
 *   • **توصيلة الخطّاف** — `runAgent(supabaseAdmin, …)` كما في
 *     `src/routes/api/public/hooks/run-agent.ts`.
 *   • **توصيلة الواجهة** — `runAgent(context.supabase, …)` و
 *     `decideApproval(context.supabase, …)` كما في `src/lib/exec.functions.ts`:
 *     عميلُ المستخدم تحت RLS (و`authenticated` بلا INSERT/UPDATE على
 *     `tool_executions` — `20260625234437`).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const h = vi.hoisted(() => ({
  model: null as unknown,
}));

// البذرة الوحيدة المزيَّفة: مزوّد Gemini ← نموذجٌ مُبرمَج لكل اختبار.
vi.mock("@/lib/sadeed/gemini-provider.server", () => ({
  resolveSadeedGeminiRuntime: () => ({
    provider: () => h.model,
    modelId: "mock-integration",
    vendor: "google-gemini",
  }),
  resolveSadeedGeminiRuntimes: () => [
    { provider: () => h.model, modelId: "mock-integration", vendor: "google-gemini" },
  ],
}));

import { runAgent } from "@/lib/exec/agent-runtime.server";
import { decideApproval } from "@/lib/exec/tool-orchestrator.server";
import { readExecutionStatus } from "@/lib/exec/execution-status.server";
import { adminClient, userClient, FIXTURES as F } from "./harness/clients";
import { closeDb, db } from "./harness/db";
import { marker, operationsScript, scriptedModel, type Step } from "./harness/scripted-model";

/* --------------------------------- shared --------------------------------- */

let admin: SupabaseClient;
let adminUserA: SupabaseClient;
let viewerUserA: SupabaseClient;
let adminUserB: SupabaseClient;

type RunSnapshot = {
  runId: string;
  title: string;
  pendingExecutionId: string;
  workflowRunId: string;
  correlationId: string;
};

// حالةٌ تتدفّق بين الاختبارات داخل هذا الملف (vitest يشغّلها بالترتيب).
const state: { hook?: RunSnapshot; ui?: RunSnapshot } = {};

beforeAll(async () => {
  admin = adminClient();
  adminUserA = await userClient({
    sub: F.ADMIN_A,
    org: F.ORG_A,
    email: "admin-a@integration.invalid",
  });
  viewerUserA = await userClient({ sub: F.VIEWER_A, org: F.ORG_A });
  adminUserB = await userClient({ sub: F.ADMIN_B, org: F.ORG_B });
});

afterAll(async () => {
  await closeDb();
});

const runParams = (actorId: string) => ({
  agentId: F.AGENT,
  actorId,
  requiredOrgId: F.ORG_A,
});

type ExecRow = {
  id: string;
  tool_id: string;
  status: string;
  org_id: string;
  workflow_run_id: string | null;
};

/**
 * يشغّل سيناريو العمليات لمسؤول المؤسسة أ بعميلٍ معيّن ويؤكّد الأثر الكامل:
 * صفّ التشغيل، التنفيذان، الغلاف المنتظر، خطوتا الغلاف، ونتيجة sql.read
 * المحصورة بالمؤسسة أ — ثم يعيد لقطةً تستعملها الاختبارات التالية.
 */
async function runOperationsAsAdminA(caller: SupabaseClient, label: string): Promise<RunSnapshot> {
  const title = marker(label);
  const scripted = scriptedModel(operationsScript(title));
  h.model = scripted.model;

  const res = await runAgent(caller as never, runParams(F.ADMIN_A));

  expect(res.status).toBe("succeeded");
  expect(res.steps).toBe(3);
  expect(res.pendingApprovals).toBe(1);
  expect(res.summary).toMatch(/Actions awaiting human approval: 1 — not executed yet\./);
  expect(scripted.calls).toBe(3);

  // ما رآه النموذج من sql.read: صفوف المؤسسة أ وحدها — لا صفّ من ب أبدًا.
  const sqlRead = scripted.seen[1]!.find((r) => r.toolName === "sql_read")!.value as {
    ok: boolean;
    output: { rows: Array<{ ref: string; org_id: string }>; count: number };
  };
  expect(sqlRead.ok).toBe(true);
  const refs = sqlRead.output.rows.map((r) => r.ref).sort();
  expect(refs).toEqual(expect.arrayContaining(["INT-A-1", "INT-A-2"]));
  expect(refs.some((r) => r.startsWith("INT-B-"))).toBe(false);
  expect(sqlRead.output.rows.every((r) => r.org_id === F.ORG_A)).toBe(true);

  // والنموذج أُبلغ أن الإنشاء معلَّق لا منفَّذ.
  const create = scripted.seen[2]!.find((r) => r.toolName === "sec_create_incident")!.value as {
    ok: boolean;
    pending_approval?: boolean;
    executionId?: string;
  };
  expect(create).toMatchObject({ ok: false, pending_approval: true });

  const [run] = await db()<
    Array<{
      status: string;
      org_id: string;
      triggered_by: string;
      steps: number;
      audit_json: {
        correlationId: string;
        excludedTools: Array<{ toolId: string; reason: string }>;
        pendingApprovals: { count: number; executionIds: string[] };
      };
    }>
  >`select status, org_id, triggered_by, steps, audit_json from agent_runs where id = ${res.runId}`;
  expect(run).toMatchObject({
    status: "succeeded",
    org_id: F.ORG_A,
    triggered_by: F.ADMIN_A,
    steps: 3,
  });
  // RT-6: ما لم يُعرض على النموذج مكتوبٌ بسببه — للمسؤول: rag.record_gap معطَّلة فقط.
  expect(run!.audit_json.excludedTools).toHaveLength(1);
  expect(run!.audit_json.excludedTools[0]).toMatchObject({
    toolId: "rag.record_gap",
    reason: "disabled",
  });
  expect(run!.audit_json.pendingApprovals).toMatchObject({ count: 1 });

  const execs = await db()<
    ExecRow[]
  >`select id, tool_id, status, org_id, workflow_run_id from tool_executions where agent_run_id = ${res.runId} order by created_at`;
  expect(execs.map((e) => [e.tool_id, e.status])).toEqual([
    ["sql.read", "succeeded"],
    ["sec.create_incident", "pending_approval"],
  ]);
  expect(execs.every((e) => e.org_id === F.ORG_A)).toBe(true);
  expect(execs[1]!.id).toBe(create.executionId);
  expect(run!.audit_json.pendingApprovals.executionIds).toEqual([execs[1]!.id]);
  const workflowRunId = execs[1]!.workflow_run_id!;
  expect(workflowRunId).toBeTruthy();

  const [wf] = await db()<
    Array<{ status: string; trigger_event: string; current_step: string | null }>
  >`select status, trigger_event, current_step from workflow_runs where id = ${workflowRunId}`;
  expect(wf).toMatchObject({
    status: "waiting_approval",
    trigger_event: "agent.invoke",
    current_step: "agent.awaiting_approval",
  });

  const steps = await db()<
    Array<{ step_id: string; status: string; tool_execution_id: string | null }>
  >`select step_id, status, tool_execution_id from workflow_step_runs where run_id = ${workflowRunId} order by started_at`;
  expect(steps).toEqual([
    { step_id: "sql.read", status: "succeeded", tool_execution_id: execs[0]!.id },
    { step_id: "sec.create_incident", status: "waiting", tool_execution_id: execs[1]!.id },
  ]);

  // لم يُنشأ بلاغ: الفعل معلَّق.
  const [{ n }] = await db()<
    Array<{ n: number }>
  >`select count(*)::int as n from sec_incidents where title_en = ${title}`;
  expect(n).toBe(0);

  return {
    runId: res.runId,
    title,
    pendingExecutionId: execs[1]!.id,
    workflowRunId,
    correlationId: run!.audit_json.correlationId,
  };
}

/** أثر الحسم (RT-4) على التشغيل والخطوة والتقرير بعد قرارٍ أنهى كل المعلَّق. */
async function expectResolved(
  snap: RunSnapshot,
  expected: {
    step: "succeeded" | "failed" | "cancelled";
    approvedSucceeded: number;
    notExecuted: number;
    workflow: "succeeded" | "failed";
  },
) {
  const [step] = await db()<
    Array<{ status: string; error: string | null; finished_at: string | null }>
  >`select status, error, finished_at from workflow_step_runs where tool_execution_id = ${snap.pendingExecutionId}`;
  expect(step!.status).toBe(expected.step);
  expect(step!.finished_at).toBeTruthy();

  const [run] = await db()<
    Array<{
      status: string;
      summary: string;
      audit_json: { pendingApprovals: Record<string, unknown> };
    }>
  >`select status, summary, audit_json from agent_runs where id = ${snap.runId}`;
  expect(run!.status).toBe("succeeded");
  expect(run!.summary).not.toMatch(/Actions awaiting human approval/);
  expect(run!.summary).toMatch(/does not resume automatically/);
  expect(run!.summary).toMatch(/لا يستأنف تلقائيًّا/);
  expect(run!.audit_json.pendingApprovals).toMatchObject({
    count: 0,
    resolved: true,
    approvedSucceeded: expected.approvedSucceeded,
    notExecuted: expected.notExecuted,
    resumed: false,
  });

  const [wf] = await db()<
    Array<{ status: string; error: string | null; finished_at: string | null }>
  >`select status, error, finished_at from workflow_runs where id = ${snap.workflowRunId}`;
  expect(wf!.status).toBe(expected.workflow);
  expect(wf!.finished_at).toBeTruthy();
  if (expected.notExecuted > 0) {
    expect(wf!.error).toMatch(/action\(s\) not executed/);
  } else {
    expect(wf!.error).toBeNull();
  }

  const reports = await db()<
    Array<{
      payload: {
        pending_approvals: number;
        approvals_resolved: Record<string, unknown>;
        summary_en: string;
      };
    }>
  >`select payload from finn_reports where org_id = ${F.ORG_A} and payload->>'agentRunId' = ${snap.runId}`;
  expect(reports).toHaveLength(1);
  expect(reports[0]!.payload.pending_approvals).toBe(0);
  expect(reports[0]!.payload.approvals_resolved).toMatchObject({
    approvedSucceeded: expected.approvedSucceeded,
    notExecuted: expected.notExecuted,
    resumed: false,
  });
  expect(reports[0]!.payload.summary_en).toMatch(/does not resume automatically/);

  const actions = await db()<
    Array<{ action: string }>
  >`select action from audit_logs where correlation_id = ${snap.correlationId} order by occurred_at`;
  const names = actions.map((a) => a.action);
  expect(names.filter((a) => a === "workflow.run.settled")).toHaveLength(1);
  expect(names).toContain("agent.run.start");
  expect(names).toContain("agent.run.success");
}

/* ------------------------- (a) hook wiring, admin A ------------------------- */

describe("(a) admin of org A runs 'operations' (hook wiring: service-role client)", () => {
  it("writes a real agent_runs row, a pending tool_execution, a waiting workflow_run — and sql.read is scoped to A", async () => {
    state.hook = await runOperationsAsAdminA(admin, "a-hook");
  });
});

/* ---------------------- (f) readExecutionStatus — RLS -------------------- */

describe("(f) readExecutionStatus with user-JWT clients", () => {
  it("admin A (member + platform admin) sees the run and the pending execution", async () => {
    const res = await readExecutionStatus(adminUserA, F.ORG_A);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.visibility).toBe("caller_rls");
    expect(res.agent_runs.map((r) => r.id)).toContain(state.hook!.runId);
    expect(res.agent_runs.map((r) => r.id)).not.toContain(F.RUN_B);
    const pending = res.active_tool_executions.find((e) => e.id === state.hook!.pendingExecutionId);
    expect(pending).toMatchObject({
      tool_id: "sec.create_incident",
      status: "pending_approval",
      agent_run_id: state.hook!.runId,
    });
  });

  it("viewer A sees the run but — by the tool_exec_admin_select policy — not the execution", async () => {
    const res = await readExecutionStatus(viewerUserA, F.ORG_A);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.agent_runs.map((r) => r.id)).toContain(state.hook!.runId);
    // سياسة tool_executions: admin أو actor_id = auth.uid() — والقارئ لا هذا ولا ذاك.
    expect(res.active_tool_executions).toEqual([]);
  });

  it("admin B asking about org A gets nothing (RLS, not an error)", async () => {
    const res = await readExecutionStatus(adminUserB, F.ORG_A);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.agent_runs).toEqual([]);
    expect(res.active_tool_executions).toEqual([]);
  });
});

/* --------------------- (e) user-JWT reads/writes on agent_runs --------------------- */

describe("(e) agent_runs under a user JWT", () => {
  it("viewer of org A reads A's runs and never B's", async () => {
    const { data, error } = await viewerUserA.from("agent_runs").select("id, org_id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(state.hook!.runId);
    expect(ids).not.toContain(F.RUN_B);
    expect((data ?? []).every((r) => r.org_id === F.ORG_A)).toBe(true);
  });

  it("admin of org B reads B's run and never A's", async () => {
    const { data, error } = await adminUserB.from("agent_runs").select("id, org_id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(F.RUN_B);
    expect(ids).not.toContain(state.hook!.runId);
  });

  it("a user-JWT INSERT into agent_runs is refused at the GRANT layer (42501)", async () => {
    const { error } = await viewerUserA
      .from("agent_runs")
      .insert({ agent_id: F.AGENT, org_id: F.ORG_A, status: "queued", triggered_by: F.VIEWER_A })
      .select("id");
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
    expect(error!.message).toMatch(/permission denied for table agent_runs/);

    // وحتى المسؤول: الامتياز مسحوب من authenticated كلّه، لا من الدور وحده.
    const asAdmin = await adminUserA
      .from("agent_runs")
      .insert({ agent_id: F.AGENT, org_id: F.ORG_A, status: "queued", triggered_by: F.ADMIN_A })
      .select("id");
    expect(asAdmin.error?.code).toBe("42501");
  });
});

/* ------------------- (a-UI) runAgent with the UI wiring (RT-1) ------------------- */

describe("(a-UI) runAgent(context.supabase) — the wiring in exec.functions.ts", () => {
  it("behaves exactly like the hook path: the user-JWT client only reaches executors, orchestration is service-role", async () => {
    state.ui = await runOperationsAsAdminA(adminUserA, "a-ui");
  });
});

/* ------------------ (d-UI) decideApproval with the UI wiring (RT-1) ------------------ */

describe("(d-UI) decideApproval(context.supabase) — the wiring in exec.functions.ts", () => {
  it("a non-member (admin of org B) is refused by the explicit membership check and the row stays pending", async () => {
    await expect(
      decideApproval(adminUserB as never, F.ADMIN_B, state.ui!.pendingExecutionId, "approve"),
    ).rejects.toThrow(/Forbidden: actor is not a member of the requested organization/);
    const [row] = await db()<
      Array<{ status: string }>
    >`select status from tool_executions where id = ${state.ui!.pendingExecutionId}`;
    expect(row!.status).toBe("pending_approval");
  });

  it("an org admin approving through a user-JWT client runs the action on the same row and settles everything (RT-4)", async () => {
    const snap = state.hook!;
    const res = await decideApproval(
      adminUserA as never,
      F.ADMIN_A,
      snap.pendingExecutionId,
      "approve",
    );
    expect(res).toMatchObject({ executionId: snap.pendingExecutionId, status: "succeeded" });

    const [row] = await db()<
      Array<{ status: string; approved_by: string | null }>
    >`select status, approved_by from tool_executions where id = ${snap.pendingExecutionId}`;
    expect(row).toMatchObject({ status: "succeeded", approved_by: F.ADMIN_A });
    const incidents = await db()<
      Array<{ org_id: string; created_by: string }>
    >`select org_id, created_by from sec_incidents where title_en = ${snap.title}`;
    expect(incidents).toEqual([{ org_id: F.ORG_A, created_by: F.ADMIN_A }]);

    await expectResolved(snap, {
      step: "succeeded",
      approvedSucceeded: 1,
      notExecuted: 0,
      workflow: "succeeded",
    });
  });
});

/* --------------------- (d) approval — concurrency, service-role wiring --------------------- */

describe("(d) admin approves the pending execution (service-role wiring)", () => {
  it("same row queued→running→succeeded, exactly one incident, workflow settles; a concurrent approve does not create a second", async () => {
    const snap = state.ui!;
    const execId = snap.pendingExecutionId;
    const [first, second] = await Promise.allSettled([
      decideApproval(admin as never, F.ADMIN_A, execId, "approve"),
      decideApproval(admin as never, F.ADMIN_A, execId, "approve"),
    ]);
    const fulfilled = [first, second].filter((r) => r.status === "fulfilled");
    const rejected = [first, second].filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const ok = (fulfilled[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof decideApproval>>>)
      .value;
    expect(ok).toMatchObject({ executionId: execId, status: "succeeded", attempts: 1 });
    const err = (rejected[0] as PromiseRejectedResult).reason as Error;
    expect(err.message).toMatch(/no longer pending|not pending|not queued for execution/);

    // الصفّ نفسه، لا صفّ ثانٍ.
    const rows = await db()<
      Array<{
        id: string;
        status: string;
        approved_by: string | null;
        approved_at: string | null;
        output_json: { output?: { incident?: { ref?: string } } };
      }>
    >`select id, status, approved_by, approved_at, output_json from tool_executions where agent_run_id = ${snap.runId} and tool_id = 'sec.create_incident'`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: execId, status: "succeeded", approved_by: F.ADMIN_A });
    expect(rows[0]!.approved_at).toBeTruthy();
    expect(rows[0]!.output_json.output?.incident?.ref).toMatch(/^INC-/);

    // بلاغٌ واحد بالضبط، في المؤسسة أ، منسوبٌ للفاعل.
    const incidents = await db()<
      Array<{ org_id: string; created_by: string; status: string; severity: string }>
    >`select org_id, created_by, status, severity from sec_incidents where title_en = ${snap.title}`;
    expect(incidents).toHaveLength(1);
    expect(incidents[0]).toMatchObject({
      org_id: F.ORG_A,
      created_by: F.ADMIN_A,
      status: "open",
      severity: "high",
    });

    // أثرٌ واحد للاعتماد (سطره بلا correlation_id — decideApproval لا يمرّره،
    // فيُطابَق بمعرّف الصفّ)، وتنفيذٌ واحد على الصفّ.
    const approvals = await db()<
      Array<{ actor_id: string }>
    >`select actor_id from audit_logs where action = 'tool.approval.approved' and resource_id = ${execId}`;
    expect(approvals).toHaveLength(1);
    expect(approvals[0]!.actor_id).toBe(F.ADMIN_A);
    const execAudit = await db()<
      Array<{ action: string }>
    >`select action from audit_logs where resource_id = ${execId} and action like 'tool.execute.%' order by occurred_at`;
    expect(execAudit.map((a) => a.action)).toEqual(["tool.execute.start", "tool.execute.success"]);

    await expectResolved(snap, {
      step: "succeeded",
      approvedSucceeded: 1,
      notExecuted: 0,
      workflow: "succeeded",
    });
  });
});

/* ------------------------- (d-reject) rejection is conditional (RT-8) ------------------------- */

describe("(d-reject) rejecting a pending execution", () => {
  it("rejects once, settles the wrapper as 'not executed', and a second reject or a late approve is refused", async () => {
    const snap = await runOperationsAsAdminA(admin, "d-reject");
    const res = await decideApproval(admin as never, F.ADMIN_A, snap.pendingExecutionId, "reject");
    expect(res).toMatchObject({ executionId: snap.pendingExecutionId, status: "rejected" });

    await expect(
      decideApproval(admin as never, F.ADMIN_A, snap.pendingExecutionId, "reject"),
    ).rejects.toThrow(/is rejected, not pending|no longer pending/);
    await expect(
      decideApproval(admin as never, F.ADMIN_A, snap.pendingExecutionId, "approve"),
    ).rejects.toThrow(/is rejected, not pending|no longer pending/);

    const [row] = await db()<
      Array<{ status: string; approved_by: string | null }>
    >`select status, approved_by from tool_executions where id = ${snap.pendingExecutionId}`;
    expect(row).toMatchObject({ status: "rejected", approved_by: F.ADMIN_A });
    const [{ n }] = await db()<
      Array<{ n: number }>
    >`select count(*)::int as n from sec_incidents where title_en = ${snap.title}`;
    expect(n).toBe(0);

    await expectResolved(snap, {
      step: "cancelled",
      approvedSucceeded: 0,
      notExecuted: 1,
      workflow: "succeeded",
    });
    const rejections = await db()<
      Array<{ actor_id: string }>
    >`select actor_id from audit_logs where action = 'tool.approval.rejected' and resource_id = ${snap.pendingExecutionId}`;
    expect(rejections).toHaveLength(1);
  });
});

/* ------------------------- (d-viewer) approver without a platform role ------------------------- */

describe("(d-viewer) a viewer (member, no platform role) calling decideApproval directly", () => {
  // `decideApproval` يفحص **عضوية** المعتمِد وحدها (resolveToolOrgId)؛ أمّا دوره
  // فيفحصه `requireAdmin` في exec.functions.ts قبل النداء. فالنداء المباشر من
  // عضوٍ بلا دورٍ منصّي يطالب بالصفّ وينفّذه بهوية طالبه (actor_id) — ولم يوقفه
  // هنا إلا RLS على sec_incidents بعميل المعتمِد. عيبٌ قائم يُوثَّق لا يُصلَح هنا.
  let snap: RunSnapshot;
  let outcome: { settled: "fulfilled" | "rejected"; value?: unknown; reason?: Error };

  beforeAll(async () => {
    snap = await runOperationsAsAdminA(admin, "d-viewer");
    try {
      const value = await decideApproval(
        viewerUserA as never,
        F.VIEWER_A,
        snap.pendingExecutionId,
        "approve",
      );
      outcome = { settled: "fulfilled", value };
    } catch (reason) {
      outcome = { settled: "rejected", reason: reason as Error };
    }
  });

  it("an approver without the platform admin role is refused by code before the row is claimed", async () => {
    expect(outcome.settled).toBe("rejected");
    expect(outcome.reason?.message).toMatch(
      /Forbidden: approver must hold the platform admin role/,
    );
    const [row] = await db()<
      Array<{ status: string; approved_by: string | null }>
    >`select status, approved_by from tool_executions where id = ${snap.pendingExecutionId}`;
    expect(row).toMatchObject({ status: "pending_approval", approved_by: null });
    const [{ n }] = await db()<
      Array<{ n: number }>
    >`select count(*)::int as n from sec_incidents where title_en = ${snap.title}`;
    expect(n).toBe(0);
  });
});

/* ------------------------- (b) viewer: refused early ------------------------- */

describe("(b) viewer of org A (no platform role) is refused before any row is written", () => {
  it("throws Forbidden and leaves no agent_runs row and no model call", async () => {
    const scripted = scriptedModel(operationsScript(marker("b")));
    h.model = scripted.model;
    const before = await db()<
      Array<{ n: number }>
    >`select count(*)::int as n from agent_runs where triggered_by = ${F.VIEWER_A}`;
    await expect(runAgent(admin as never, runParams(F.VIEWER_A))).rejects.toThrow(
      /Forbidden: missing role for agent operations/,
    );
    const after = await db()<
      Array<{ n: number }>
    >`select count(*)::int as n from agent_runs where triggered_by = ${F.VIEWER_A}`;
    expect(after[0]!.n).toBe(before[0]!.n);
    expect(after[0]!.n).toBe(0);
    expect(scripted.calls).toBe(0);
  });
});

/* ------------------- (c) manager: sql.read not exposed (RT-6) → rejected call (RT-3) ------------------- */

describe("(c) manager of org A runs 'operations' — sql.read permissions are {admin} (production-seeded)", () => {
  // النموذج يطلب القراءة وحدها ثم يختم — فيُرى أثر الإقصاء معزولًا.
  const managerScript: Step[] = [
    { tool: "sql_read", input: { table: "sec_incidents", columns: ["ref"], limit: 5 } },
    { text: "Brief ready." },
  ];
  let runId: string;
  let scripted: ReturnType<typeof scriptedModel>;
  let result: Awaited<ReturnType<typeof runAgent>>;

  beforeAll(async () => {
    scripted = scriptedModel(managerScript);
    h.model = scripted.model;
    result = await runAgent(admin as never, runParams(F.MANAGER_A));
    runId = result.runId;
  });

  it("sql.read is not offered to the model (unauthorized) and rag.record_gap is not offered (disabled) — recorded in audit_json.excludedTools", async () => {
    const [run] = await db()<
      Array<{
        audit_json: { excludedTools: Array<{ toolId: string; reason: string; detail?: string }> };
      }>
    >`select audit_json from agent_runs where id = ${runId}`;
    const excluded = run!.audit_json.excludedTools;
    expect(excluded).toEqual(
      expect.arrayContaining([
        // رمزٌ محايد لا قائمة الأدوار — الأثر يقرؤه مشاهدو المؤسسة (L3).
        { toolId: "sql.read", reason: "unauthorized", detail: "platform role required" },
        expect.objectContaining({ toolId: "rag.record_gap", reason: "disabled" }),
      ]),
    );
    expect(excluded).toHaveLength(2);
    // ما رآه النموذج: رفضٌ قبل أي منفّذ، بقائمة الأدوات المتاحة له فعلًا.
    const reply = scripted.seen[1]!.find((r) => r.toolName === "sql_read")!.value;
    expect(typeof reply).toBe("string");
    expect(reply as string).toMatch(/unavailable tool 'sql_read'/);
    expect(reply as string).toMatch(
      /rag_search_verified, sec_create_incident, sec_update_work_order/,
    );
  });

  it("the rejected call leaves no tool_executions row and is recorded as rejected in the run evidence", async () => {
    const execs = await db()<
      Array<{ n: number }>
    >`select count(*)::int as n from tool_executions where agent_run_id = ${runId}`;
    expect(execs[0]!.n).toBe(0);
    const [run] = await db()<
      Array<{
        audit_json: {
          steps: Array<{ toolCalls: Array<{ name: string; error?: string; rejected?: boolean }> }>;
          toolFailures: { attempted: number; succeeded: number; failed: number; rejected: number };
        };
      }>
    >`select audit_json from agent_runs where id = ${runId}`;
    expect(run!.audit_json.steps[0]!.toolCalls).toEqual([
      expect.objectContaining({
        name: "sql_read",
        rejected: true,
        error: expect.stringMatching(/rejected before execution/),
      }),
    ]);
    expect(run!.audit_json.toolFailures).toMatchObject({
      attempted: 1,
      succeeded: 0,
      failed: 0,
      rejected: 1,
    });
  });

  it("a run whose only tool activity was a rejected call stays `succeeded` — the rejection is said in the summary and the wrapper line, not hidden (RT-3, M2)", async () => {
    // المرفوض قبل التنفيذ ليس تنفيذًا فشل: النموذج قد يجيب من كتلة البيانات
    // المحقونة. «فشل الكلّ» يشترط فشلَ تنفيذٍ فعليّ وبلا معلَّقٍ للاعتماد.
    expect(result.status).toBe("succeeded");
    expect(result.error).toBeUndefined();
    expect(result.summary).toMatch(/^Brief ready\./);
    expect(result.summary).toMatch(/Tool calls failed: 1 of 1/);
    expect(result.summary).not.toMatch(/All tool calls failed/);
    expect(result.pendingApprovals).toBeUndefined();

    const [run] = await db()<
      Array<{ status: string; error: string | null; summary: string }>
    >`select status, error, summary from agent_runs where id = ${runId}`;
    expect(run).toMatchObject({ status: "succeeded", error: null });
    expect(run!.summary).toBe(result.summary);
    const [wf] = await db()<
      Array<{ status: string; error: string | null }>
    >`select status, error from workflow_runs where trigger_payload->>'agentRunId' = ${runId}`;
    expect(wf!.status).toBe("succeeded");
    expect(wf!.error).toMatch(/Tool calls failed: 1 of 1/);
    const audit = await db()<
      Array<{ action: string; metadata: { toolFailures?: { rejected?: number } } }>
    >`select action, metadata from audit_logs where resource_id = ${runId} and action in ('agent.run.success','agent.run.fail')`;
    expect(audit).toHaveLength(1);
    expect(audit[0]!.action).toBe("agent.run.success");
    expect(audit[0]!.metadata.toolFailures).toMatchObject({ rejected: 1 });
  });
});

/* ------------------------- (g) AI gate failure fails the wrapper too (RT-2) ------------------------- */

describe("(g) the AI kill switch", () => {
  it("fails the run with ai_disabled before any model call, and the workflow wrapper is failed too", async () => {
    const scripted = scriptedModel(operationsScript(marker("g")));
    h.model = scripted.model;
    const previous = process.env.SADEED_AI_DISABLED;
    process.env.SADEED_AI_DISABLED = "1";
    let res: Awaited<ReturnType<typeof runAgent>>;
    try {
      res = await runAgent(admin as never, runParams(F.ADMIN_A));
    } finally {
      if (previous === undefined) delete process.env.SADEED_AI_DISABLED;
      else process.env.SADEED_AI_DISABLED = previous;
    }
    expect(res).toMatchObject({ status: "failed", error: "ai_disabled", steps: 0 });
    expect(scripted.calls).toBe(0);
    const [run] = await db()<
      Array<{ status: string; error: string | null; finished_at: string | null }>
    >`select status, error, finished_at from agent_runs where id = ${res.runId}`;
    expect(run).toMatchObject({ status: "failed", error: "SADEED AI gate: ai_disabled" });
    expect(run!.finished_at).toBeTruthy();
    const [wf] = await db()<
      Array<{ status: string; error: string | null }>
    >`select status, error from workflow_runs where trigger_payload->>'agentRunId' = ${res.runId}`;
    expect(wf).toMatchObject({ status: "failed", error: "SADEED AI gate: ai_disabled" });
  });
});
