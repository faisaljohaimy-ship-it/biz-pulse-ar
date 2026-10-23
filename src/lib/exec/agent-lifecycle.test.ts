// @vitest-environment node
/**
 * دورة حياة تنفيذ الوكيل — سلوكًا لا نصًّا.
 *
 * ما يُحرس هنا (بعميل Supabase زائف، بلا شبكة ولا نموذج):
 *  ① `sql.read` و`kb.search` مقيَّدان بالمؤسسة دائمًا، ويرفضان بلا مؤسسة
 *     قبل أي استعلام — مسار الخطّاف يمرّر عميل مفتاح الخدمة فلا RLS تحمي.
 *  ② الاعتماد يُنفَّذ **مرّة واحدة على الصفّ نفسه** — لا إدراج ثانٍ.
 *  ③ ما له أثرٌ جانبيّ لا يُعاد بعد انقضاء المهلة؛ والقراءة تُعاد.
 *  ④ الكتابة الختامية لا تمحو إلغاءً، وشرط الإيقاف يقف عند الإلغاء،
 *     والإلغاء نفسه لا يُكتب فوق تشغيلٍ انتهى.
 *  ⑤ الفعل المعلَّق للاعتماد يُبقي الغلاف `waiting_approval` ويُقال صراحةً.
 *  ⑥ وللانتظار مخرج: رفضٌ أو انتهاء مهلةٍ يسوّي الغلاف ويقول إن الفعل لم يقع.
 *  ⑦ (RT-1) كتابات التنسيق بمفتاح الخدمة؛ عميل المستدعي للمنفّذ وحده، وفحص
 *     الفاعل/المؤسسة صريحٌ باقٍ.
 *  ⑧ (RT-6/RT-3/MODEL-3) ما يُعرض = المسموح ∩ المنفّذ ∩ المفعَّل ∩ الدور؛ نداءٌ
 *     لأداةٍ غير معروضة يُسجَّل مرفوضًا؛ وتشغيلٌ فشلت كل نداءاته لا يُقرأ ناجحًا.
 *  ⑨ (RT-2/RT-5) الخروج قبل الحلقة يُغلق الغلاف؛ وختامٌ لم يُكتب لا يُبلَّغ نجاحًا.
 *  ⑩ (RT-4/RT-8) بعد القرار: خطوة الغلاف والملخّص والتقرير تُحسم؛ الرفض مشروطٌ
 *     بالانتظار؛ والكتابة الختامية للتنفيذ مشروطةٌ بـ`running`.
 *  ⑪ إشارة المستدعي تُلغي الحلقة وتكتب التشغيل `cancelled`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  admin: null as unknown,
  generateText: null as unknown as (opts: Record<string, unknown>) => Promise<unknown>,
  embedText: null as unknown as (text: string) => Promise<number[]>,
  hasAnyPlatformRole: null as unknown as (userId: string, roles: string[]) => Promise<boolean>,
  assertAiQuota: null as unknown as () => Promise<void>,
  gemini: null as unknown as () => unknown,
  enterprise: null as unknown as () => string,
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: new Proxy(
    {},
    { get: (_t, prop) => (h.admin as Record<string | symbol, unknown>)[prop] },
  ),
}));
vi.mock("@/lib/authz.server", () => ({
  hasAnyPlatformRole: (userId: string, roles: string[]) => h.hasAnyPlatformRole(userId, roles),
}));
vi.mock("@/lib/governance/ai-quota.server", () => ({
  AiGateError: class AiGateError extends Error {
    code: string;
    surface: string;
    constructor(code = "ai_gate_error", surface = "chat") {
      super(`SADEED AI gate (${surface}): ${code}`);
      this.code = code;
      this.surface = surface;
    }
  },
  assertAiQuota: () => h.assertAiQuota(),
}));
vi.mock("@/lib/sadeed/gemini-provider.server", () => ({
  resolveSadeedGeminiRuntime: () => h.gemini(),
}));
vi.mock("@/lib/sadeed/executive-brain/context.server", () => ({
  buildEnterpriseKnowledgeBlock: () => h.enterprise(),
}));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  // لا نداء نموذج في أي اختبار هنا.
  generateText: (opts: Record<string, unknown>) => h.generateText(opts),
}));
// ولا نداء تضمين: متّجهٌ زائف أو تعذّرٌ مقصود.
vi.mock("@/lib/kb-embed.server", () => ({
  embedText: (text: string) => h.embedText(text),
}));

import { AiGateError } from "@/lib/governance/ai-quota.server";
import { getExecutor, isIdempotentCall } from "./tool-registry.server";
import {
  approvalNote,
  decideApproval,
  executeTool,
  expireStaleApprovals,
} from "./tool-orchestrator.server";
import {
  AGENT_RUN_DEADLINE_MS,
  cancelLiveAgentRun,
  runAgent,
  stopWhenRunCancelled,
} from "./agent-runtime.server";

/* ------------------------------ Fake Supabase ----------------------------- */

type Filter = [op: string, column: string, value: unknown];
type Query = {
  table: string;
  op: "select" | "insert" | "update" | "upsert";
  payload?: Record<string, unknown>;
  columns?: string;
  filters: Filter[];
  returning: boolean;
  single?: "single" | "maybeSingle";
};
type Reply = { data?: unknown; error?: { message: string } | null; count?: number } | "hang";
type Responder = (q: Query) => Reply | undefined;

function defaultReply(q: Query): Exclude<Reply, "hang"> {
  if (q.op === "insert" || q.op === "upsert") {
    return { data: q.returning ? { id: `${q.table}-new` } : null };
  }
  if (q.op === "update") return { data: q.returning ? [] : null };
  return { data: q.single ? null : [] };
}

function settle(reply: Reply) {
  if (reply === "hang") return new Promise<never>(() => undefined);
  return Promise.resolve({
    data: reply.data ?? null,
    error: reply.error ?? null,
    count: reply.count ?? null,
  });
}

function fakeDb(respond: Responder = () => undefined) {
  const log: Query[] = [];
  const rpcLog: Array<{ fn: string; args: unknown }> = [];
  let rpcResponder: (fn: string, args: unknown) => Reply | undefined = () => undefined;
  const make = (q: Query) => {
    const filter =
      (op: string) =>
      (column: string, value?: unknown): unknown => {
        q.filters.push([op, column, value]);
        return b;
      };
    const b: Record<string, unknown> = {
      select(columns?: string) {
        if (q.op === "select") q.columns = columns;
        else q.returning = true;
        return b;
      },
      insert(payload: Record<string, unknown>) {
        q.op = "insert";
        q.payload = payload;
        return b;
      },
      update(payload: Record<string, unknown>) {
        q.op = "update";
        q.payload = payload;
        return b;
      },
      upsert(payload: Record<string, unknown>) {
        q.op = "upsert";
        q.payload = payload;
        return b;
      },
      eq: filter("eq"),
      neq: filter("neq"),
      gt: filter("gt"),
      gte: filter("gte"),
      lt: filter("lt"),
      lte: filter("lte"),
      like: filter("like"),
      ilike: filter("ilike"),
      in: filter("in"),
      is: filter("is"),
      or: filter("or"),
      order: filter("order"),
      limit: (n: number) => {
        q.filters.push(["limit", "", n]);
        return b;
      },
      single() {
        q.single = "single";
        return b;
      },
      maybeSingle() {
        q.single = "maybeSingle";
        return b;
      },
      then(onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) {
        log.push(q);
        return settle(respond(q) ?? defaultReply(q)).then(onOk, onErr);
      },
    };
    return b;
  };
  const client = {
    from: (table: string) => make({ table, op: "select", filters: [], returning: false }),
    rpc: (fn: string, args: unknown) => {
      rpcLog.push({ fn, args });
      return settle(rpcResponder(fn, args) ?? { data: null });
    },
  };
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: client as any,
    log,
    rpcLog,
    onRpc(fn: (name: string, args: unknown) => Reply | undefined) {
      rpcResponder = fn;
    },
  };
}

const has = (q: Query, op: string, column: string, value?: unknown) =>
  q.filters.some(
    ([o, c, v]) =>
      o === op &&
      c === column &&
      (value === undefined || JSON.stringify(v) === JSON.stringify(value)),
  );

/** يطبّق تحديثًا على صفٍّ محفوظ إن طابقت شروطه كلّها — كما تفعل القاعدة. */
function applyUpdate(q: Query, row: Record<string, unknown>): Exclude<Reply, "hang"> {
  const ok = q.filters.every(([op, column, value]) => {
    if (op === "eq") return row[column] === value;
    if (op === "in") return (value as unknown[]).includes(row[column]);
    if (op === "is") return row[column] === value;
    return true;
  });
  if (!ok) return { data: q.returning ? [] : null };
  Object.assign(row, q.payload);
  return { data: q.returning ? [{ id: row.id }] : null };
}

const auditActions = (log: Query[]) =>
  log.filter((q) => q.table === "audit_logs").map((q) => q.payload?.action);
const eventTopics = (log: Query[]) =>
  log.filter((q) => q.table === "enterprise_events").map((q) => q.payload?.topic);

/** عميل المستدعي (RLS) كما على الإنتاج: SELECT وحده — كل كتابةٍ عبره 42501. */
const rlsWriteDenied = (q: Query) =>
  q.op === "select"
    ? undefined
    : { error: { message: `permission denied for table ${q.table} (42501)` } };

/** صفّ السجلّ المطلوب: بـ`.eq("id").maybeSingle()` صفٌّ واحد، وبـ`.in("id")` قائمة. */
function registryReply(q: Query, rows: Array<Record<string, unknown>>) {
  if (q.single) {
    const id = q.filters.find(([op, c]) => op === "eq" && c === "id")?.[2];
    return { data: rows.find((r) => r.id === id) ?? null };
  }
  const ids = q.filters.find(([op, c]) => op === "in" && c === "id")?.[2] as string[] | undefined;
  return { data: ids ? rows.filter((r) => ids.includes(r.id as string)) : rows };
}

const ORG = "00000000-0000-4000-8000-000000000001";
const USER = "00000000-0000-4000-8000-0000000000aa";

function regRow(toolId: string, requiresApproval: boolean, enabled = true) {
  return {
    id: toolId,
    enabled,
    permissions: ["admin"],
    requires_approval: requiresApproval,
    rollback_kind: null,
    metadata: {},
  };
}

const toolCtx = (client: unknown, orgId = ORG) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: client as any,
  actorId: USER,
  orgId,
  correlationId: "corr-1",
  executionId: "exec-1",
});

beforeEach(() => {
  // أي نداء شبكةٍ لم يُقصد صراحةً يفشل الاختبار.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("network is forbidden in tests");
    }),
  );
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  h.admin = fakeDb().client;
  h.embedText = async () => {
    throw new Error("embedding is not expected in this test");
  };
  h.hasAnyPlatformRole = async () => true;
  h.assertAiQuota = async () => undefined;
  h.gemini = () => ({ provider: () => ({}), modelId: "test-model" });
  h.enterprise = () => "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/* ------------------------------ ① sql.read ------------------------------- */

describe("① sql.read مقيَّدٌ بالمؤسسة — ويرفض بلا مؤسسة", () => {
  const exec = getExecutor("sql.read")!;

  it("كل استعلام صفوف يحمل org_id من السياق الموثَّق", async () => {
    const db = fakeDb();
    const input = exec.input.parse({ table: "sec_incidents", filters: { severity: "high" } });
    await exec.execute(input, toolCtx(db.client));
    expect(db.log).toHaveLength(1);
    expect(has(db.log[0], "eq", "org_id", ORG)).toBe(true);
    expect(has(db.log[0], "eq", "severity", "high")).toBe(true);
  });

  it("والعدّ وحده أيضًا", async () => {
    const db = fakeDb(() => ({ data: null, count: 7 }));
    const input = exec.input.parse({ table: "sec_work_orders", count_only: true });
    const res = await exec.execute(input, toolCtx(db.client));
    expect(has(db.log[0], "eq", "org_id", ORG)).toBe(true);
    expect(res.output).toEqual({ count: 7, rows: [] });
  });

  it("ومرشِّح النموذج على مؤسسةٍ أخرى يضيّق ولا يوسّع", async () => {
    const db = fakeDb();
    const input = exec.input.parse({ table: "sec_sites", filters: { org_id: "other-org" } });
    await exec.execute(input, toolCtx(db.client));
    expect(has(db.log[0], "eq", "org_id", ORG)).toBe(true);
    expect(has(db.log[0], "eq", "org_id", "other-org")).toBe(true);
  });

  it("بلا مؤسسة: يرفض قبل أي استعلام (فشلٌ مغلق)", async () => {
    const db = fakeDb();
    const input = exec.input.parse({ table: "sec_incidents" });
    await expect(exec.execute(input, toolCtx(db.client, ""))).rejects.toThrow(
      /Verified organization context is required/,
    );
    expect(db.log).toHaveLength(0);
  });

  it("وكل جدولٍ في القائمة البيضاء يحمل عمود org_id — وإلا كان المرشِّح خطأ استعلام", () => {
    const desc = exec.description ?? "";
    const schema = desc.slice(desc.indexOf("Schema: ") + "Schema: ".length);
    const entries = schema.split(" | ").map((e) => /^(\w+)\(([^)]*)\)$/.exec(e));
    expect(entries.length).toBeGreaterThan(10);
    for (const m of entries) {
      expect(m, "مدخل مخطّط غير مقروء").not.toBeNull();
      expect(m![2].split(","), `${m![1]} بلا org_id`).toContain("org_id");
    }
  });

  it("وتحديث أمر العمل يطابق الصفّ داخل المؤسسة — والغائب لا يُبلَّغ ok", async () => {
    const update = getExecutor("sec.update_work_order")!;
    const id = "00000000-0000-4000-8000-0000000000f1";
    const missing = fakeDb((q) => (q.op === "select" ? { data: null } : undefined));
    await expect(update.execute({ id, status: "closed" }, toolCtx(missing.client))).rejects.toThrow(
      /not found in this organization/,
    );
    expect(missing.log.filter((q) => q.op === "update")).toHaveLength(0);
    expect(has(missing.log[0], "eq", "org_id", ORG)).toBe(true);

    const found = fakeDb((q) =>
      q.op === "select" ? { data: { status: "open", assigned_to: null } } : undefined,
    );
    await update.execute({ id, status: "closed" }, toolCtx(found.client));
    const write = found.log.find((q) => q.op === "update")!;
    expect(has(write, "eq", "id", id)).toBe(true);
    expect(has(write, "eq", "org_id", ORG)).toBe(true);
  });
});

describe("① kb.search مقيَّدٌ بالمؤسسة (ومعها المقالات العامّة) — ويرفض بلا مؤسسة", () => {
  const exec = getExecutor("kb.search")!;
  const SCOPE = `org_id.is.null,org_id.eq.${ORG}`;

  it("بلا مؤسسة: يرفض قبل التضمين وقبل أي استعلام", async () => {
    const embed = vi.fn(async () => [0.1, 0.2]);
    h.embedText = embed;
    const db = fakeDb();
    await expect(
      exec.execute(exec.input.parse({ query: "إجراء الزوار" }), toolCtx(db.client, "")),
    ).rejects.toThrow(/Verified organization context is required/);
    expect(embed).not.toHaveBeenCalled();
    expect(db.log).toHaveLength(0);
    expect(db.rpcLog).toHaveLength(0);
  });

  it("مسار الكلمات: المرشِّح يحمل نطاق المؤسسة إلى جانب المطابقة", async () => {
    // التضمين متعذّر ⇐ المسار النصّي.
    const db = fakeDb(() => ({ data: [{ doc_code: "IS-VIS-001" }] }));
    const res = await exec.execute(exec.input.parse({ query: "visitor" }), toolCtx(db.client));
    expect(res.output).toMatchObject({ mode: "keyword" });
    expect(db.log).toHaveLength(1);
    const q = db.log[0];
    expect(q.table).toBe("sec_knowledge_articles");
    expect(has(q, "or", SCOPE)).toBe(true);
    expect(q.filters.filter(([op]) => op === "or")).toHaveLength(2);
  });

  it("المسار الدلاليّ: إصابات مؤسسةٍ أخرى تُسقط بعد مطابقتها بالمعرّف داخل النطاق", async () => {
    h.embedText = async () => [0.1, 0.2];
    const db = fakeDb((q) =>
      q.table === "sec_knowledge_articles" ? { data: [{ id: "a" }, { id: "c" }] } : undefined,
    );
    db.onRpc(() => ({
      data: [
        { id: "a", doc_code: "OWN" },
        { id: "b", doc_code: "OTHER-ORG" },
        { id: "c", doc_code: "GLOBAL" },
      ],
    }));
    const res = await exec.execute(
      exec.input.parse({ query: "visitor badge", limit: 5 }),
      toolCtx(db.client),
    );
    expect(res.output).toEqual({
      mode: "semantic",
      hits: [
        { id: "a", doc_code: "OWN" },
        { id: "c", doc_code: "GLOBAL" },
      ],
    });
    // يُفرط في الجلب ليملأ الحدّ بعد التصفية — بسقف.
    expect(db.rpcLog[0]).toMatchObject({ fn: "sec_kb_search", args: { _limit: 20 } });
    const scope = db.log[0];
    expect(has(scope, "in", "id", ["a", "b", "c"])).toBe(true);
    expect(has(scope, "or", SCOPE)).toBe(true);
  });

  it("وتعذّر فحص النطاق يرمي — لا إصابةٌ بلا تحقّق", async () => {
    h.embedText = async () => [0.1, 0.2];
    const db = fakeDb(() => ({ error: { message: "db down" } }));
    db.onRpc(() => ({ data: [{ id: "b", doc_code: "OTHER-ORG" }] }));
    await expect(
      exec.execute(exec.input.parse({ query: "visitor badge" }), toolCtx(db.client)),
    ).rejects.toThrow(/kb\.search scope check failed/);
  });
});

/* --------------------------- ② same-row approval -------------------------- */

function approvalFixture(
  opts: {
    agentRunId?: string | null;
    enabled?: boolean;
    staleRead?: boolean;
    incidentsReply?: Reply;
    tally?: (row: Record<string, unknown>) => Array<Record<string, unknown>>;
    /** عضوية المعتمِد كما يقرؤها مفتاح الخدمة. */
    memberships?: Array<{ org_id: string }>;
    /** يُستدعى عند قراءة المنفّذ — لزرع سباقٍ بين المطالبة والكتابة الختامية. */
    onExecutorRead?: (row: Record<string, unknown>) => void;
  } = {},
) {
  const row: Record<string, unknown> = {
    id: "exec-1",
    tool_id: "sql.read",
    input_json: { table: "sec_incidents" },
    actor_id: USER,
    org_id: ORG,
    workflow_run_id: "wfr-1",
    agent_run_id: opts.agentRunId === undefined ? "run-1" : opts.agentRunId,
    correlation_id: "corr-1",
    status: opts.staleRead ? "queued" : "pending_approval",
    approved_at: null,
  };
  const history: unknown[] = [];
  let incidentReads = 0;
  // عميل المعتمِد: بيانات المستأجر وحدها (RT-1) — وأي كتابةٍ عبره مرفوضة كما على الإنتاج.
  const caller = fakeDb((q) => {
    if (q.table === "sec_incidents") {
      incidentReads++;
      opts.onExecutorRead?.(row);
      return opts.incidentsReply ?? { data: [{ id: "inc-1" }] };
    }
    return rlsWriteDenied(q);
  });
  const workflow: Record<string, unknown> = {
    id: "wfr-1",
    org_id: ORG,
    status: "waiting_approval",
    trigger_event: "agent.invoke",
  };
  const stepRow: Record<string, unknown> = {
    id: "step-1",
    tool_execution_id: "exec-1",
    status: "waiting",
  };
  const agentRun: Record<string, unknown> = {
    id: "run-1",
    org_id: ORG,
    status: "succeeded",
    summary: `Brief ready.\n\n${approvalNote(1)}`,
    audit_json: {
      correlationId: "corr-1",
      pendingApprovals: { count: 1, executionIds: ["exec-1"] },
    },
  };
  const report: Record<string, unknown> = {
    id: "rep-1",
    org_id: ORG,
    payload: { agentRunId: "run-1", pending_approvals: 1, summary_en: "Brief ready." },
  };
  const admin = fakeDb((q) => {
    if (q.table === "org_members") return { data: opts.memberships ?? [{ org_id: ORG }] };
    if (q.table === "tool_registry") {
      return registryReply(q, [regRow("sql.read", true, opts.enabled ?? true)]);
    }
    if (q.table === "tool_executions" && q.op === "select") {
      // قراءة الطلب (صفٌّ واحد) — وقد تكون قديمة: صفٌّ اعتُمد للتوّ ما زال يُقرأ معلَّقًا.
      if (q.single)
        return { data: { ...row, status: opts.staleRead ? "pending_approval" : row.status } };
      // حصيلة الارتباط.
      return {
        data: opts.tally ? opts.tally(row) : [{ status: row.status, approved_at: row.approved_at }],
      };
    }
    if (q.table === "tool_executions" && q.op === "update") {
      const reply = applyUpdate(q, row);
      history.push(row.status);
      return reply;
    }
    if (q.table === "workflow_runs" && q.op === "update") return applyUpdate(q, workflow);
    if (q.table === "workflow_step_runs" && q.op === "update") return applyUpdate(q, stepRow);
    if (q.table === "agent_runs" && q.op === "select") return { data: agentRun };
    if (q.table === "agent_runs" && q.op === "update") return applyUpdate(q, agentRun);
    if (q.table === "finn_reports" && q.op === "select") return { data: [report] };
    if (q.table === "finn_reports" && q.op === "update") return applyUpdate(q, report);
    return undefined;
  });
  h.admin = admin.client;
  return {
    row,
    history,
    caller,
    admin,
    workflow,
    stepRow,
    agentRun,
    report,
    get incidentReads() {
      return incidentReads;
    },
  };
}

describe("② الاعتماد يُنفَّذ مرّة واحدة على الصفّ نفسه", () => {
  it("queued ← running ← succeeded على صفّ الطلب، بلا إدراجٍ ثانٍ", async () => {
    const f = approvalFixture();
    const res = await decideApproval(f.caller.client, USER, "exec-1", "approve");

    expect(res).toMatchObject({ executionId: "exec-1", status: "succeeded", attempts: 1 });
    expect(f.admin.log.some((q) => q.table === "tool_executions" && q.op === "insert")).toBe(false);
    expect(f.history).toEqual(["queued", "running", "succeeded"]);
    expect(f.incidentReads).toBe(1);
    expect(f.row.status).toBe("succeeded");
    expect(f.row.output_json).toEqual({
      output: { rows: [{ id: "inc-1" }], count: 1 },
      rollbackPayload: null,
    });
    expect(typeof f.row.duration_ms).toBe("number");
    expect(f.row.approved_by).toBe(USER);

    const claim = f.admin.log.find(
      (q) => q.table === "tool_executions" && q.payload?.status === "running",
    )!;
    expect(has(claim, "eq", "status", "queued")).toBe(true);
    expect(has(claim, "eq", "tool_id", "sql.read")).toBe(true);
    expect(has(claim, "eq", "org_id", ORG)).toBe(true);
    // والكتابة الختامية مشروطةٌ بـ`running` (RT-8).
    const final = f.admin.log.find(
      (q) => q.table === "tool_executions" && q.payload?.status === "succeeded",
    )!;
    expect(has(final, "eq", "status", "running")).toBe(true);
  });

  it("وغلاف الوكيل يخرج من waiting_approval إلى succeeded حين لا يبقى معلَّق", async () => {
    const f = approvalFixture();
    await decideApproval(f.caller.client, USER, "exec-1", "approve");
    expect(f.workflow.status).toBe("succeeded");
    const move = f.admin.log.find((q) => q.table === "workflow_runs")!;
    expect(has(move, "eq", "trigger_event", "agent.invoke")).toBe(true);
    expect(has(move, "eq", "status", "waiting_approval")).toBe(true);
    expect(has(move, "eq", "org_id", ORG)).toBe(true);
  });

  it("وإلى failed إن فشل الفعل المعتمَد — والفشل على الصفّ نفسه", async () => {
    const f = approvalFixture({ incidentsReply: { error: { message: "permission denied" } } });
    const res = await decideApproval(f.caller.client, USER, "exec-1", "approve");
    expect(res.status).toBe("failed");
    expect(res.executionId).toBe("exec-1");
    expect(f.history).toEqual(["queued", "running", "failed"]);
    expect(f.workflow.status).toBe("failed");
    expect(f.workflow.error).toMatch(/1 approved action\(s\) failed/);
  });

  it("والرفض يسوّي الغلاف أيضًا — ويقول إن الفعل لم يُنفَّذ", async () => {
    const f = approvalFixture();
    const res = await decideApproval(f.caller.client, USER, "exec-1", "reject");
    expect(res.status).toBe("rejected");
    expect(f.incidentReads).toBe(0);
    expect(f.workflow.status).toBe("succeeded");
    expect(f.workflow.error).toMatch(/1 action\(s\) not executed \(rejected or approval expired\)/);
  });

  it("ولا يُسوّى الغلاف ما دام في ارتباطه طلبٌ آخر معلَّق", async () => {
    const f = approvalFixture({
      tally: (row) => [
        { status: row.status, approved_at: row.approved_at },
        { status: "pending_approval", approved_at: null },
      ],
    });
    await decideApproval(f.caller.client, USER, "exec-1", "approve");
    expect(f.workflow.status).toBe("waiting_approval");
    expect(f.admin.log.some((q) => q.table === "workflow_runs")).toBe(false);
    // ولا يُعاد كتابة ملخّص التشغيل ما دام معلَّقٌ باقٍ — خطوة الغلاف وحدها تُحسم.
    expect(f.admin.log.some((q) => q.table === "agent_runs" || q.table === "finn_reports")).toBe(
      false,
    );
    expect(f.stepRow.status).toBe("succeeded");
  });

  it("وتنفيذ المحرّك (بلا agent_run_id) لا يُسوّى من هنا — يستأنفه resumeWorkflowRun", async () => {
    const f = approvalFixture({ agentRunId: null });
    await decideApproval(f.caller.client, USER, "exec-1", "approve");
    const settlementTables = ["workflow_runs", "workflow_step_runs", "agent_runs", "finn_reports"];
    expect(f.admin.log.some((q) => settlementTables.includes(q.table))).toBe(false);
  });

  it("واعتمادٌ ثانٍ متزامن لا ينفّذ الفعل مرّة أخرى", async () => {
    const f = approvalFixture({ staleRead: true });
    await expect(decideApproval(f.caller.client, USER, "exec-1", "approve")).rejects.toThrow(
      /no longer pending/,
    );
    expect(f.incidentReads).toBe(0);
    expect(f.history).toEqual(["queued"]);
  });

  it("وإن رمى التنفيذ قبل أن يبدأ يُغلق الصفّ فاشلًا بسببه لا queued معلّقًا", async () => {
    const f = approvalFixture({ enabled: false });
    await expect(decideApproval(f.caller.client, USER, "exec-1", "approve")).rejects.toThrow(
      /Tool disabled/,
    );
    expect(f.row.status).toBe("failed");
    expect(f.row.error).toMatch(/Tool disabled/);
    expect(f.incidentReads).toBe(0);
  });

  it("والصفّ القائم لا يُنفَّذ بلا اعتماد", async () => {
    const db = fakeDb();
    await expect(
      executeTool(db.client, {
        toolId: "sql.read",
        input: { table: "sec_incidents" },
        actorId: USER,
        orgId: ORG,
        existingExecutionId: "exec-1",
      }),
    ).rejects.toThrow(/requires an approved execution/);
    expect(db.log).toHaveLength(0);
  });
});

/* ----------------------- ③ idempotency & retry policy ---------------------- */

function runnerDb(toolId: string, extra: Responder = () => undefined) {
  // قاعدةٌ واحدة للدورين: التنسيق (مفتاح الخدمة) وبيانات المستأجر (المستدعي).
  const db = fakeDb((q) => {
    if (q.table === "org_members") return { data: [{ org_id: ORG }] };
    if (q.table === "tool_registry") return registryReply(q, [regRow(toolId, false)]);
    if (q.table === "tool_executions" && q.op === "insert") return { data: { id: "exec-new" } };
    return extra(q);
  });
  h.admin = db.client;
  return db;
}

describe("③ ما له أثرٌ جانبيّ لا يُعاد — والقراءة تُعاد", () => {
  it("علم idempotent: القراءات صحيحة، وكل ما يكتب أو يرسل خطأ", () => {
    for (const id of ["sql.read", "kb.search", "rag.search_verified", "m365.graph.get_user"]) {
      expect(isIdempotentCall(getExecutor(id)!, {}), id).toBe(true);
    }
    for (const id of [
      "m365.outlook.send_mail",
      "m365.teams.post_message",
      "m365.sharepoint.upload_file",
      "webhook.dispatch",
      "supabase.invoke_edge_function",
      "sec.create_incident",
      "sec.update_work_order",
      "rag.record_gap",
      "rag.propose_candidate",
    ]) {
      expect(isIdempotentCall(getExecutor(id)!, {}), id).toBe(false);
    }
    const rest = getExecutor("rest.http")!;
    expect(isIdempotentCall(rest, { method: "GET" })).toBe(true);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(isIdempotentCall(rest, { method }), method).toBe(false);
    }
  });

  it("أداةٌ ذات أثر: انقضاء المهلة يُسجَّل فاشلًا «النتيجة مجهولة» بمحاولةٍ واحدة", async () => {
    const db = runnerDb("rag.record_gap");
    db.onRpc(() => "hang");
    const res = await executeTool(db.client, {
      toolId: "rag.record_gap",
      input: { query: "ما إجراء تصاريح العمل الساخن؟" },
      actorId: USER,
      orgId: ORG,
      timeoutMs: 20,
      retry: { max: 2, baseMs: 0 },
    });
    expect(db.rpcLog).toHaveLength(1);
    expect(res.status).toBe("failed");
    expect(res.attempts).toBe(1);
    expect(res.error).toMatch(/timed out after 20ms — outcome unknown, not retried/);
    const final = db.log.filter((q) => q.table === "tool_executions" && q.op === "update").at(-1)!;
    expect(final.payload).toMatchObject({ status: "failed", attempt: 1, error: res.error });
    expect(auditActions(db.log)).not.toContain("tool.execute.retry");
  });

  it("وخطأٌ عابر غير المهلة لا يُعاد أيضًا", async () => {
    const db = runnerDb("rag.record_gap");
    db.onRpc(() => ({ error: { message: "fetch failed" } }));
    const res = await executeTool(db.client, {
      toolId: "rag.record_gap",
      input: { query: "سؤال بلا جواب" },
      actorId: USER,
      orgId: ORG,
      retry: { max: 2, baseMs: 0 },
    });
    expect(db.rpcLog).toHaveLength(1);
    expect(res.error).toMatch(/fetch failed — outcome unknown, not retried/);
  });

  it("والقراءة (idempotent) تُعاد بعد انقضاء المهلة وتنجح", async () => {
    let reads = 0;
    const db = runnerDb("sql.read", (q) => {
      if (q.table !== "sec_incidents") return undefined;
      reads++;
      return reads === 1 ? "hang" : { data: [{ id: "inc-1" }] };
    });
    const res = await executeTool(db.client, {
      toolId: "sql.read",
      input: { table: "sec_incidents" },
      actorId: USER,
      orgId: ORG,
      timeoutMs: 20,
      retry: { max: 2, baseMs: 0 },
    });
    expect(reads).toBe(2);
    expect(res).toMatchObject({ status: "succeeded", attempts: 2 });
    expect(auditActions(db.log)).toContain("tool.execute.retry");
  });

  it("وطبقة HTTP: غير GET محاولةٌ واحدة، وGET يحتفظ بإعاداته", async () => {
    const fetchMock = vi.fn(
      async () => new Response("busy", { status: 503, headers: { "retry-after": "0" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const ctx = toolCtx(fakeDb().client);

    const webhook = getExecutor("webhook.dispatch")!;
    await expect(
      webhook.execute(
        { url: "https://connector-gateway.lovable.dev/hook", payload: { a: 1 } },
        ctx,
      ),
    ).rejects.toThrow(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const rest = getExecutor("rest.http")!;
    fetchMock.mockClear();
    await expect(
      rest.execute(
        { method: "POST", url: "https://connector-gateway.lovable.dev/x", body: {} },
        ctx,
      ),
    ).rejects.toThrow(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    await expect(
      rest.execute({ method: "GET", url: "https://connector-gateway.lovable.dev/x" }, ctx),
    ).rejects.toThrow(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

/* ------------------------ ④⑤ agent run lifecycle -------------------------- */

function agentFixture(
  opts: {
    tools?: string[];
    tally?: Array<Record<string, unknown>>;
    requiresApproval?: boolean;
    /** صفوف السجلّ كما على الإنتاج؛ الافتراض sql.read وحدها. */
    registry?: Array<Record<string, unknown>>;
    /** أدوار الوكيل في `agent_definitions.permissions`. */
    permissions?: string[];
    /** ردّ قراءة sec_incidents لدى المستدعي (أو دالّة لكل قراءة). */
    incidents?: Reply | (() => Reply);
    /** كم مرّة تفشل الكتابة الختامية (`status: succeeded`) قبل أن تنجح. */
    finalizeFailures?: number;
    /** إدراج التقرير يعود بخطأ. */
    reportError?: boolean;
  } = {},
) {
  const run: Record<string, unknown> = { id: "run-1", status: "running", finished_at: null };
  const workflow: Record<string, unknown> = {
    id: "wfr-1",
    org_id: ORG,
    status: "running",
    trigger_event: "agent.invoke",
  };
  let finalizeFailures = opts.finalizeFailures ?? 0;
  const admin = fakeDb((q) => {
    switch (q.table) {
      case "agent_definitions":
        return {
          data: {
            id: "agent_x",
            name: "Agent X",
            goal: "Daily security brief",
            system_prompt: null,
            permissions: opts.permissions ?? [],
            tool_allowlist: opts.tools ?? [],
            model: null,
            enabled: true,
            org_id: ORG,
          },
        };
      case "org_members":
        return { data: [{ org_id: ORG }] };
      case "tool_registry":
        return registryReply(
          q,
          opts.registry ?? [regRow("sql.read", opts.requiresApproval ?? false)],
        );
      case "workflows":
        return { data: { id: "wf-def" } };
      case "agent_runs":
        if (q.op === "insert") return { data: { id: run.id } };
        if (q.op === "select") return { data: { status: run.status } };
        if (q.op === "update") {
          if (q.payload?.status === "succeeded" && finalizeFailures > 0) {
            finalizeFailures--;
            return { error: { message: "connection reset" } };
          }
          return applyUpdate(q, run);
        }
        return undefined;
      case "workflow_runs":
        if (q.op === "insert") return { data: { id: workflow.id } };
        if (q.op === "update") return applyUpdate(q, workflow);
        return undefined;
      case "tool_executions":
        if (q.op === "select") return { data: opts.tally ?? [] };
        if (q.op === "insert") return { data: { id: "exec-p1" } };
        return undefined;
      case "finn_reports":
        if (q.op === "insert" && opts.reportError) {
          return { error: { message: "report table down" } };
        }
        return undefined;
      default:
        return undefined;
    }
  });
  h.admin = admin.client;
  // عميل المستدعي (RLS): بيانات المستأجر وحدها — وأي كتابةٍ عبره 42501 كما على الإنتاج.
  const caller = fakeDb((q) => {
    if (q.table === "sec_incidents") {
      const reply = opts.incidents ?? { data: [{ id: "inc-1" }] };
      return typeof reply === "function" ? reply() : reply;
    }
    return rlsWriteDenied(q);
  });
  const workflowUpdates = () =>
    admin.log.filter((q) => q.table === "workflow_runs" && q.op === "update");
  return { run, workflow, admin, caller, workflowUpdates };
}

/** ينادي `sql_read` كما يناديه النموذج ويُغلق الخطوة. */
const callSqlRead = async (opts: Record<string, unknown>) => {
  const tools = opts.tools as Record<
    string,
    { execute: (input: unknown, o: unknown) => Promise<unknown> }
  >;
  const out = await tools.sql_read.execute(
    { table: "sec_incidents" },
    { toolCallId: "c1", messages: [] },
  );
  await (opts.onStepFinish as (s: unknown) => Promise<void> | void)({
    text: "",
    finishReason: "tool-calls",
    content: [],
  });
  return out;
};

const runParams = { agentId: "agent_x", actorId: USER, requiredOrgId: ORG };

describe("④ الإلغاء يُحترم — والكتابة الختامية لا تمحوه", () => {
  it("شرط الإيقاف يقرأ الحالة: يعمل ⇐ يستمر، أُلغي ⇐ يقف، تعذّرت القراءة ⇐ يستمر", async () => {
    let status = "running";
    let fail = false;
    const db = fakeDb((q) =>
      q.table === "agent_runs"
        ? fail
          ? { error: { message: "down" } }
          : { data: { status } }
        : undefined,
    );
    const stop = stopWhenRunCancelled(db.client, "run-1");
    expect(await stop({ steps: [] })).toBe(false);
    status = "cancelled";
    expect(await stop({ steps: [] })).toBe(true);
    fail = true;
    expect(await stop({ steps: [] })).toBe(false);
    expect(has(db.log[0], "eq", "id", "run-1")).toBe(true);
  });

  it("وفي التشغيل: شرط الإلغاء ضمن stopWhen، ومعه إشارة السقف الزمنيّ", async () => {
    const f = agentFixture();
    // تُلتقط القيم داخل النموذج الزائف وتُفحص خارجه: `runAgent` يبتلع ما
    // يُرمى داخل الحلقة، فـ`expect` هناك لا يُسقط الاختبار.
    const seen: { isArray?: boolean; before?: boolean; after?: boolean; signal?: unknown } = {};
    h.generateText = async (opts) => {
      const conditions = opts.stopWhen as Array<(o: { steps: unknown[] }) => Promise<boolean>>;
      seen.isArray = Array.isArray(conditions);
      const anyStops = async () =>
        (await Promise.all(conditions.map((c) => c({ steps: [] })))).some(Boolean);
      seen.before = await anyStops();
      f.run.status = "cancelled";
      seen.after = await anyStops();
      seen.signal = opts.abortSignal;
      return { text: "partial", usage: {} };
    };
    const res = await runAgent(f.caller.client, runParams);
    expect(seen.isArray).toBe(true);
    expect(seen.before).toBe(false);
    expect(seen.after).toBe(true);
    expect(seen.signal).toBeInstanceOf(AbortSignal);
    expect((seen.signal as AbortSignal).aborted).toBe(false);
    expect(res.status).toBe("cancelled");
    expect(AGENT_RUN_DEADLINE_MS).toBe(180_000);
  });

  it("نجاحٌ بعد إلغاءٍ وقع أثناء الحلقة يبقى cancelled بتوقيته", async () => {
    const f = agentFixture();
    h.generateText = async () => {
      f.run.status = "cancelled";
      f.run.finished_at = "2026-10-18T10:00:00.000Z";
      return { text: "done", usage: {} };
    };
    const res = await runAgent(f.caller.client, runParams);
    expect(res.status).toBe("cancelled");
    expect(f.run.status).toBe("cancelled");
    expect(f.run.finished_at).toBe("2026-10-18T10:00:00.000Z");
    expect(f.run.summary).toBeUndefined();
    expect(auditActions(f.admin.log)).toContain("agent.run.cancelled");
    expect(auditActions(f.admin.log)).not.toContain("agent.run.success");
    expect(f.admin.log.some((q) => q.table === "finn_reports")).toBe(false);
    expect(f.workflow.status).toBe("cancelled");
    // الكتابة الختامية كانت مشروطةً بحالةٍ حيّة.
    const finalize = f.admin.log.find(
      (q) => q.table === "agent_runs" && q.payload?.status === "succeeded",
    )!;
    expect(has(finalize, "in", "status", ["queued", "running"])).toBe(true);
  });

  it("وفشلٌ بعد الإلغاء لا يُكتب فوقه", async () => {
    const f = agentFixture();
    h.generateText = async () => {
      f.run.status = "cancelled";
      throw new Error("provider exploded");
    };
    const res = await runAgent(f.caller.client, runParams);
    expect(res.status).toBe("cancelled");
    expect(f.run.status).toBe("cancelled");
    expect(auditActions(f.admin.log)).not.toContain("agent.run.fail");
    expect(f.workflow.status).toBe("cancelled");
  });

  it("والإلغاء نفسه مشروطٌ بحالةٍ حيّة: تشغيلٌ انتهى لا يُكتب فوقه cancelled", async () => {
    const run: Record<string, unknown> = { id: "run-1", status: "running" };
    const db = fakeDb((q) => (q.table === "agent_runs" ? applyUpdate(q, run) : undefined));
    expect(await cancelLiveAgentRun(db.client, "run-1")).toBe(true);
    expect(run).toMatchObject({ status: "cancelled", error: "Cancelled by operator" });
    expect(has(db.log[0], "in", "status", ["queued", "running"])).toBe(true);

    const finished: Record<string, unknown> = { id: "run-2", status: "succeeded" };
    const late = fakeDb((q) => (q.table === "agent_runs" ? applyUpdate(q, finished) : undefined));
    expect(await cancelLiveAgentRun(late.client, "run-2")).toBe(false);
    expect(finished.status).toBe("succeeded");

    const broken = fakeDb(() => ({ error: { message: "permission denied" } }));
    await expect(cancelLiveAgentRun(broken.client, "run-3")).rejects.toThrow(/permission denied/);
  });

  it("والسقف الزمنيّ يُلغي الحلقة ويُسجَّل فشلًا صادقًا", async () => {
    const f = agentFixture();
    const realSetTimeout = globalThis.setTimeout;
    let fireDeadline: (() => void) | null = null;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      fn: () => void,
      ms?: number,
      ...args: unknown[]
    ) => {
      if (ms === AGENT_RUN_DEADLINE_MS) {
        fireDeadline = fn;
        return realSetTimeout(() => undefined, 0);
      }
      return realSetTimeout(fn, ms, ...args);
    }) as typeof setTimeout);
    h.generateText = (opts) =>
      new Promise((_, reject) => {
        (opts.abortSignal as AbortSignal).addEventListener("abort", () =>
          reject(new Error("This operation was aborted")),
        );
        fireDeadline!();
      });
    const res = await runAgent(f.caller.client, runParams);
    expect(res.status).toBe("failed");
    expect(res.error).toMatch(/exceeded its 180s deadline/);
    expect(f.run.status).toBe("failed");
    expect(f.workflow.status).toBe("failed");
  });
});

describe("⑤ الفعل المعلَّق للاعتماد لا يُقرأ «نجح»", () => {
  it("الغلاف waiting_approval، والملخّص يقول عدد ما ينتظر", async () => {
    const f = agentFixture({
      tools: ["sql.read"],
      requiresApproval: true,
      tally: [{ status: "pending_approval", approved_at: null }],
    });
    let toolOutput: unknown;
    h.generateText = async (opts) => {
      toolOutput = await callSqlRead(opts);
      return { text: "Brief ready.", usage: {} };
    };
    const res = await runAgent(f.caller.client, runParams);

    expect(toolOutput).toMatchObject({ pending_approval: true });
    expect(res.status).toBe("succeeded");
    expect(res.pendingApprovals).toBe(1);
    expect(res.summary).toMatch(/Actions awaiting human approval: 1 — not executed yet\./);
    expect(res.summary).toMatch(/إجراءات بانتظار الاعتماد البشري: 1/);
    expect(f.run.status).toBe("succeeded");
    expect(f.run.summary).toBe(res.summary);
    expect(f.workflow.status).toBe("waiting_approval");
    expect(f.workflowUpdates().some((q) => q.payload?.status === "succeeded")).toBe(false);

    // الطلب المعلَّق مربوطٌ بغلافه وتشغيله عمودًا — ومُدرَجٌ بمفتاح الخدمة (RT-1).
    const pending = f.admin.log.find((q) => q.table === "tool_executions" && q.op === "insert")!;
    expect(pending.payload).toMatchObject({
      status: "pending_approval",
      workflow_run_id: "wfr-1",
      agent_run_id: "run-1",
    });
  });

  it("وقرارٌ حُسم أثناء الحلقة لا يترك الغلاف منتظرًا", async () => {
    const f = agentFixture({
      tools: ["sql.read"],
      requiresApproval: true,
      tally: [{ status: "succeeded", approved_at: "2026-10-18T10:00:00.000Z" }],
    });
    h.generateText = async (opts) => {
      await callSqlRead(opts);
      return { text: "Brief ready.", usage: {} };
    };
    const res = await runAgent(f.caller.client, runParams);
    expect(res.pendingApprovals).toBeUndefined();
    expect(res.summary).toBe("Brief ready.");
    expect(f.workflow.status).toBe("succeeded");
  });

  it("وبلا معلَّق: السلوك كما كان — succeeded مباشرة", async () => {
    const f = agentFixture();
    h.generateText = async () => ({ text: "All clear.", usage: {} });
    const res = await runAgent(f.caller.client, runParams);
    expect(res).toMatchObject({ status: "succeeded", summary: "All clear." });
    expect(f.workflow.status).toBe("succeeded");
    expect(f.run.status).toBe("succeeded");
  });
});

/* ---------------- ⑦ RT-1: orchestration on the service key ---------------- */

describe("⑦ كتابات التنسيق بمفتاح الخدمة — وعميل المستدعي للمنفّذ وحده", () => {
  it("عميل واجهةٍ يرفض كل كتابة (42501) لا يُسقط التشغيل، ولا يمرّ عبره تنسيق", async () => {
    const f = agentFixture({ tools: ["sql.read"] });
    h.generateText = async (opts) => {
      await callSqlRead(opts);
      return { text: "Brief ready.", usage: {} };
    };
    const res = await runAgent(f.caller.client, runParams);
    expect(res.status).toBe("succeeded");
    // المستدعي: قراءة بيانات المستأجر وحدها.
    expect(f.caller.log.length).toBeGreaterThan(0);
    expect(f.caller.log.every((q) => q.op === "select" && q.table === "sec_incidents")).toBe(true);
    // والتنسيق كلّه على مفتاح الخدمة: السجلّ، صفّ التنفيذ، الأثر، الحدث.
    expect(f.admin.log.some((q) => q.table === "tool_registry")).toBe(true);
    expect(f.admin.log.some((q) => q.table === "tool_executions" && q.op === "insert")).toBe(true);
    expect(auditActions(f.admin.log)).toContain("tool.execute.success");
    expect(eventTopics(f.admin.log)).toContain("tool.succeeded.sql.read");
    const steps = (f.run.audit_json as { steps: Array<{ toolCalls: Array<{ error?: string }> }> })
      .steps;
    expect(steps[0].toolCalls[0].error).toBeUndefined();
  });

  it("وفحص الفاعل والمؤسسة باقٍ صريحًا: غير العضو يُرفض قبل السجلّ وقبل أي صفّ", async () => {
    const admin = fakeDb((q) =>
      q.table === "org_members" ? { data: [{ org_id: "other-org" }] } : undefined,
    );
    h.admin = admin.client;
    const caller = fakeDb();
    await expect(
      executeTool(caller.client, {
        toolId: "sql.read",
        input: { table: "sec_incidents" },
        actorId: USER,
        orgId: ORG,
      }),
    ).rejects.toThrow(/not a member of the requested organization/);
    const members = admin.log.find((q) => q.table === "org_members")!;
    expect(has(members, "eq", "user_id", USER)).toBe(true);
    expect(
      admin.log.some((q) => q.table === "tool_registry" || q.table === "tool_executions"),
    ).toBe(false);
    expect(caller.log).toHaveLength(0);
  });

  it("والمعتمِد غير العضو يُرفض كذلك ولا يُمسّ الطلب", async () => {
    const f = approvalFixture({ memberships: [{ org_id: "other-org" }] });
    await expect(decideApproval(f.caller.client, USER, "exec-1", "approve")).rejects.toThrow(
      /not a member of the requested organization/,
    );
    expect(f.row.status).toBe("pending_approval");
    expect(f.incidentReads).toBe(0);
  });

  it("ومعتمِدٌ بلا دور مسؤول المنصّة يُرفض قبل المطالبة بالصفّ — ولو كان عضوًا", async () => {
    const f = approvalFixture({ memberships: [{ org_id: ORG }] });
    h.hasAnyPlatformRole = async (_user, roles) => !roles.includes("admin");
    await expect(decideApproval(f.caller.client, USER, "exec-1", "approve")).rejects.toThrow(
      /Forbidden: approver must hold the platform admin role/,
    );
    expect(f.row.status).toBe("pending_approval");
    expect(f.incidentReads).toBe(0);
  });

  it("والدور المفقود يُرفض ويُسجَّل منعًا — بمفتاح الخدمة", async () => {
    h.hasAnyPlatformRole = async () => false;
    const db = runnerDb("sql.read");
    await expect(
      executeTool(db.client, {
        toolId: "sql.read",
        input: { table: "sec_incidents" },
        actorId: USER,
        orgId: ORG,
      }),
    ).rejects.toThrow(/Forbidden: missing role/);
    expect(auditActions(db.log)).toContain("tool.denied.unauthorized");
    expect(db.log.some((q) => q.table === "tool_executions")).toBe(false);
  });
});

/* ---------- ⑧ RT-6 / RT-3 / MODEL-3: exposure, failures, rejected calls ---------- */

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

describe("⑧ ما يُعرض على النموذج، وما فشل منه، وما رُفض قبل التنفيذ", () => {
  it("مديرٌ على «operations» بسجلّ الإنتاج: sql.read (admin وحده) وrag.record_gap (معطَّلة) لا يُعرضان، والسبب في الأثر", async () => {
    // قِيس على الإنتاج ٢٠٢٦/١٠/٢٣: sql.read permissions=['admin']؛ rag.record_gap
    // enabled=false وهي في tool_allowlist لـ«operations»؛ والوكيل مفتوح للمدير.
    h.hasAnyPlatformRole = async (_user, roles) => roles.includes("manager");
    const f = agentFixture({
      permissions: ["admin", "manager", "member"],
      tools: ["sql.read", "rag.search_verified", "rag.record_gap", "kb.search"],
      registry: [
        { ...regRow("sql.read", false), permissions: ["admin"] },
        { ...regRow("rag.search_verified", false), permissions: ["admin", "manager", "member"] },
        {
          ...regRow("rag.record_gap", false, false),
          permissions: ["admin", "manager", "member"],
          metadata: { disabled_reason: "schema guard" },
        },
        // kb.search: لا صفّ في السجلّ.
      ],
    });
    let offered: string[] = [];
    let system = "";
    h.generateText = async (opts) => {
      offered = Object.keys(opts.tools as object);
      system = String(opts.system);
      return { text: "ok", usage: {} };
    };
    const res = await runAgent(f.caller.client, runParams);
    expect(res.status).toBe("succeeded");
    expect(offered).toEqual(["rag_search_verified"]);
    expect(system).toMatch(/Allowed tools: rag\.search_verified\./);
    const excluded = [
      { toolId: "sql.read", reason: "unauthorized", detail: "platform role required" },
      { toolId: "rag.record_gap", reason: "disabled", detail: "schema guard" },
      { toolId: "kb.search", reason: "not_registered" },
    ];
    const inserted = f.admin.log.find((q) => q.table === "agent_runs" && q.op === "insert")!;
    expect((inserted.payload?.audit_json as { excludedTools: unknown }).excludedTools).toEqual(
      expect.arrayContaining(excluded),
    );
    const finalAudit = f.run.audit_json as { excludedTools: unknown[] };
    expect(finalAudit.excludedTools).toHaveLength(3);
    expect(finalAudit.excludedTools).toEqual(expect.arrayContaining(excluded));
  });

  it("وتعذّر قراءة السجلّ يُقصي كل شيء بسببه — لا يفترض الإذن", async () => {
    const f = agentFixture({ tools: ["sql.read"] });
    const failing = fakeDb((q) =>
      q.table === "tool_registry" ? { error: { message: "permission denied" } } : undefined,
    );
    const base = f.admin.client as { from: (t: string) => unknown };
    h.admin = {
      from: (table: string) =>
        table === "tool_registry" ? failing.client.from(table) : base.from(table),
    };
    let offered: string[] = ["unset"];
    h.generateText = async (opts) => {
      offered = Object.keys(opts.tools as object);
      return { text: "ok", usage: {} };
    };
    await runAgent(f.caller.client, runParams);
    expect(offered).toEqual([]);
    expect((f.run.audit_json as { excludedTools: unknown[] }).excludedTools).toEqual([
      { toolId: "sql.read", reason: "not_registered", detail: "registry_read_failed" },
    ]);
    // لا نصّ PostgREST الخام في أثرٍ يقرؤه مشاهدو المؤسسة.
    expect(JSON.stringify(f.run.audit_json)).not.toMatch(/permission denied/);
  });

  it("نداء النموذج لأداةٍ غير معروضة: لا منفّذ يُستدعى، ويُسجَّل مرفوضًا في أثر الخطوة، ويُقال في الملخّص — ولا يُسقط التشغيل وحده", async () => {
    const f = agentFixture({ tools: ["sql.read"] });
    const actual = await vi.importActual<typeof import("ai")>("ai");
    const { MockLanguageModelV3 } = await import("ai/test");
    let step = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        step++;
        if (step === 1) {
          return {
            content: [
              {
                type: "tool-call" as const,
                toolCallId: "tc-1",
                toolName: "email_send",
                input: JSON.stringify({ to: "ops@example.com" }),
              },
            ],
            finishReason: { unified: "tool-calls" as const, raw: undefined },
            usage,
            warnings: [],
          };
        }
        return {
          content: [{ type: "text" as const, text: "Sent the brief by email." }],
          finishReason: { unified: "stop" as const, raw: undefined },
          usage,
          warnings: [],
        };
      },
    });
    // الحلقة الحقيقية من AI SDK بنموذجٍ مُبرمَج — لا نداء شبكة.
    h.generateText = (opts) =>
      actual.generateText({ ...(opts as Parameters<typeof actual.generateText>[0]), model });
    const res = await runAgent(f.caller.client, runParams);

    expect(f.caller.log.some((q) => q.table === "sec_incidents")).toBe(false);
    expect(f.admin.log.some((q) => q.table === "tool_executions" && q.op === "insert")).toBe(false);
    const steps = (f.run.audit_json as { steps: Array<{ toolCalls: unknown[] }> }).steps;
    expect(steps[0].toolCalls).toEqual([
      expect.objectContaining({
        name: "email_send",
        rejected: true,
        error: expect.stringMatching(/rejected before execution/),
      }),
    ]);
    // المرفوض ليس تنفيذًا فشل: النموذج قد يجيب من كتلة البيانات المحقونة، فلا
    // يُسقط التشغيل — لكنه يُقال في الملخّص وسطر الغلاف ويُحصى في الأثر.
    expect(res.status).toBe("succeeded");
    expect(res.error).toBeUndefined();
    expect(f.run.status).toBe("succeeded");
    expect(res.summary).toMatch(/Sent the brief by email\./);
    expect(res.summary).toMatch(/Tool calls failed: 1 of 1/);
    expect(res.summary).not.toMatch(/All tool calls failed/);
    expect(f.workflow.status).toBe("succeeded");
    expect(f.workflow.error).toMatch(/Tool calls failed: 1 of 1/);
    expect((f.run.audit_json as { toolFailures: unknown }).toolFailures).toMatchObject({
      attempted: 1,
      succeeded: 0,
      failed: 0,
      rejected: 1,
      failures: [{ tool: "email_send", rejected: true }],
    });
  });

  it("قراءةٌ فشلت ومعها طلبٌ معلَّق للاعتماد ⇐ الغلاف waiting_approval لا failed (وإلا كرّرت الإعادة الطلب المعلَّق)", async () => {
    let reads = 0;
    const f = agentFixture({
      tools: ["sql.read"],
      // النداء الأوّل يفشل في المنفّذ؛ والثاني يحتاج اعتمادًا (الصفّ يُقرأ requires_approval).
      registry: [regRow("sql.read", true)],
      tally: [{ status: "pending_approval", approved_at: null }],
    });
    const base = f.admin.client as { from: (t: string) => unknown };
    // أوّل قراءةٍ للسجلّ بلا اعتماد (فيُنفَّذ ويفشل)، والثانية تشترطه (فيُعلَّق).
    h.admin = {
      from: (table: string) => {
        if (table !== "tool_registry") return base.from(table);
        reads++;
        return fakeDb((q) => registryReply(q, [regRow("sql.read", reads > 2)])).client.from(table);
      },
    };
    const caller = fakeDb((q) =>
      q.table === "sec_incidents" ? { error: { message: "boom" } } : rlsWriteDenied(q),
    );
    // تُلتقط النتائج داخل النموذج الزائف وتُفحص خارجه: `runAgent` يبتلع ما
    // يُرمى داخل الحلقة فيُقرأ فشلًا مختلَقًا.
    const seen: unknown[] = [];
    h.generateText = async (opts) => {
      seen.push(await callSqlRead(opts));
      seen.push(await callSqlRead(opts));
      return { text: "Brief ready.", usage: {} };
    };
    const res = await runAgent(caller.client, runParams);
    expect(seen[0]).toMatchObject({ ok: false, error: expect.stringMatching(/boom/) });
    expect(seen[1]).toMatchObject({ ok: false, pending_approval: true });
    expect(res.status).toBe("succeeded");
    expect(res.error).toBeUndefined();
    expect(res.pendingApprovals).toBe(1);
    expect(res.summary).toMatch(/Actions awaiting human approval: 1/);
    expect(res.summary).toMatch(/Tool calls failed: 1 of 1/);
    expect(res.summary).not.toMatch(/All tool calls failed/);
    expect(f.run.status).toBe("succeeded");
    expect(f.workflow.status).toBe("waiting_approval");
  });

  it("كل نداءات الأدوات فشلت ⇐ التشغيل failed بسطرٍ صادق في الملخّص والغلاف والتقرير", async () => {
    const f = agentFixture({
      tools: ["sql.read"],
      incidents: { error: { message: 'relation "sec_incidents" does not exist' } },
    });
    h.generateText = async (opts) => {
      const out = await callSqlRead(opts);
      expect(out).toMatchObject({ ok: false });
      return { text: "Brief ready.", usage: {} };
    };
    const res = await runAgent(f.caller.client, runParams);
    expect(res.status).toBe("failed");
    expect(res.error).toBe("all_tool_calls_failed");
    expect(res.summary).toMatch(/All tool calls failed \(1\)/);
    expect(res.summary).toMatch(/كل نداءات الأدوات فشلت \(1\)/);
    expect(f.run.status).toBe("failed");
    expect(f.run.error).toBe("all_tool_calls_failed");
    expect(f.run.summary).toBe(res.summary);
    expect(f.workflow.status).toBe("failed");
    expect(f.workflow.error).toMatch(/All tool calls failed/);
    expect(auditActions(f.admin.log)).toContain("agent.run.fail");
    expect(auditActions(f.admin.log)).not.toContain("agent.run.success");
    expect(eventTopics(f.admin.log)).toEqual(
      expect.arrayContaining(["agent.failed.agent_x", "workflow.failed"]),
    );
    expect((f.run.audit_json as { toolFailures: unknown }).toolFailures).toMatchObject({
      attempted: 1,
      succeeded: 0,
      failed: 1,
      rejected: 0,
      failures: [{ tool: "sql.read", rejected: false }],
    });
    // التقرير يُكتب بحالته الصادقة.
    const report = f.admin.log.find((q) => q.table === "finn_reports" && q.op === "insert")!;
    expect(report.payload?.payload).toMatchObject({ status: "failed", tool_failures: 1 });
  });

  it("وبعض النداءات فشل ⇐ succeeded بسطرٍ يقول العدد، في الملخّص وفي سطر الغلاف", async () => {
    let reads = 0;
    const f = agentFixture({
      tools: ["sql.read"],
      incidents: () => (++reads === 1 ? { error: { message: "boom" } } : { data: [{ id: "i" }] }),
    });
    h.generateText = async (opts) => {
      await callSqlRead(opts);
      await callSqlRead(opts);
      return { text: "Brief ready.", usage: {} };
    };
    const res = await runAgent(f.caller.client, runParams);
    expect(res.status).toBe("succeeded");
    expect(res.error).toBeUndefined();
    expect(res.summary).toMatch(/Tool calls failed: 1 of 2/);
    expect(f.workflow.status).toBe("succeeded");
    expect(f.workflow.error).toMatch(/Tool calls failed: 1 of 2/);
    expect((f.run.audit_json as { toolFailures: unknown }).toolFailures).toMatchObject({
      attempted: 2,
      succeeded: 1,
      failed: 1,
    });
  });
});

/* ------------- ⑨ RT-2 / RT-5: early exits close the wrapper; finalize ------------- */

describe("⑨ الخروج قبل الحلقة يُغلق الغلاف — والختام الذي لم يُكتب لا يُبلَّغ نجاحًا", () => {
  it("بوّابة الحصّة تمنع ⇐ agent_runs وworkflow_runs failed معًا، وحدثا الفشل، والأثر بالمؤسسة والارتباط", async () => {
    const f = agentFixture();
    h.assertAiQuota = async () => {
      throw new AiGateError("ai_disabled", "chat");
    };
    h.generateText = async () => {
      throw new Error("the model must not be called");
    };
    const res = await runAgent(f.caller.client, runParams);
    expect(res).toMatchObject({ status: "failed", error: "ai_disabled", steps: 0 });
    expect(f.run.status).toBe("failed");
    expect(f.run.error).toBe("SADEED AI gate: ai_disabled");
    expect(f.workflow.status).toBe("failed");
    expect(f.workflow.error).toBe("SADEED AI gate: ai_disabled");
    expect(f.workflow.finished_at).toEqual(expect.any(String));
    expect(eventTopics(f.admin.log)).toEqual(
      expect.arrayContaining(["agent.failed.agent_x", "workflow.failed"]),
    );
    const fail = f.admin.log.find(
      (q) => q.table === "audit_logs" && q.payload?.action === "agent.run.fail",
    )!;
    expect(fail.payload).toMatchObject({ org_id: ORG, correlation_id: expect.any(String) });
    expect(typeof fail.payload?.duration_ms).toBe("number");
    // الارتباط والإقصاء يبقيان في الأثر.
    expect(f.run.audit_json).toMatchObject({
      correlationId: expect.any(String),
      excludedTools: [],
    });
  });

  it("ومزوّد Gemini غائب ⇐ المآل نفسه", async () => {
    const f = agentFixture();
    h.gemini = () => {
      throw new Error("GEMINI_API_KEY missing");
    };
    const res = await runAgent(f.caller.client, runParams);
    expect(res).toMatchObject({ status: "failed", steps: 0 });
    expect(res.error).toMatch(/GEMINI_API_KEY/);
    expect(f.run.status).toBe("failed");
    expect(f.workflow.status).toBe("failed");
    expect(f.workflow.error).toBe("SADEED Gemini provider missing");
    expect(eventTopics(f.admin.log)).toEqual(
      expect.arrayContaining(["agent.failed.agent_x", "workflow.failed"]),
    );
  });

  it("وتعذّر كتلة المعرفة لا يترك التشغيل وغلافه running", async () => {
    const f = agentFixture();
    h.enterprise = () => {
      throw new Error("enterprise block exploded");
    };
    const res = await runAgent(f.caller.client, runParams);
    expect(res.status).toBe("failed");
    expect(res.error).toBe("enterprise block exploded");
    expect(f.run.status).toBe("failed");
    expect(f.workflow.status).toBe("failed");
  });

  it("خطأ الكتابة الختامية مرّتين ⇐ failed بـfinalize_failed، بلا نجاحٍ في الغلاف ولا تقرير", async () => {
    const f = agentFixture({ finalizeFailures: 2 });
    h.generateText = async () => ({ text: "done", usage: {} });
    const res = await runAgent(f.caller.client, runParams);
    expect(res).toMatchObject({ status: "failed", error: "finalize_failed", summary: "done" });
    const finalizes = f.admin.log.filter(
      (q) => q.table === "agent_runs" && q.op === "update" && q.payload?.status === "succeeded",
    );
    expect(finalizes).toHaveLength(2);
    expect(auditActions(f.admin.log)).not.toContain("agent.run.success");
    expect(eventTopics(f.admin.log)).not.toContain("agent.succeeded.agent_x");
    expect(f.admin.log.some((q) => q.table === "finn_reports")).toBe(false);
    // أفضل جهد: الصفّ يُكتب فاشلًا بسببه، والغلاف معه.
    expect(f.run.status).toBe("failed");
    expect(f.run.error).toMatch(/^finalize_failed: connection reset/);
    expect(f.workflow.status).toBe("failed");
    expect(f.workflow.error).toMatch(/finalize_failed/);
  });

  it("وخطأٌ عابر مرّةً واحدة ⇐ تُعاد الكتابة مرّةً وينجح", async () => {
    const f = agentFixture({ finalizeFailures: 1 });
    h.generateText = async () => ({ text: "done", usage: {} });
    const res = await runAgent(f.caller.client, runParams);
    expect(res.status).toBe("succeeded");
    const finalizes = f.admin.log.filter(
      (q) => q.table === "agent_runs" && q.op === "update" && q.payload?.status === "succeeded",
    );
    expect(finalizes).toHaveLength(2);
    expect(f.run.status).toBe("succeeded");
    expect(f.workflow.status).toBe("succeeded");
  });

  it("وخطأ إدراج التقرير يُقرأ ويُسجَّل — لا يُهمَل", async () => {
    const f = agentFixture({ reportError: true });
    h.generateText = async () => ({ text: "done", usage: {} });
    const res = await runAgent(f.caller.client, runParams);
    expect(res.status).toBe("succeeded");
    expect(console.error).toHaveBeenCalledWith(
      "[agent-runtime] executive report insert failed",
      "report table down",
    );
  });
});

/* ---------------- ⑩ RT-4 / RT-8: after the decision ---------------- */

describe("⑩ بعد القرار: خطوة الغلاف والملخّص والتقرير تُحسم، والرفض مشروطٌ بالانتظار", () => {
  it("اعتمادٌ نُفّذ ⇐ خطوة الغلاف succeeded، وسطر الانتظار في الملخّص يصير سطر الحسم، والتقرير يُحدَّث", async () => {
    const f = approvalFixture();
    await decideApproval(f.caller.client, USER, "exec-1", "approve");

    expect(f.stepRow.status).toBe("succeeded");
    expect(f.stepRow.output_json).toEqual({ output: { rows: [{ id: "inc-1" }], count: 1 } });
    expect(f.stepRow.finished_at).toEqual(expect.any(String));
    const stepMove = f.admin.log.find((q) => q.table === "workflow_step_runs")!;
    expect(has(stepMove, "eq", "tool_execution_id", "exec-1")).toBe(true);
    expect(has(stepMove, "eq", "status", "waiting")).toBe(true);

    const summary = String(f.agentRun.summary);
    expect(summary).toMatch(/^Brief ready\./);
    expect(summary).not.toMatch(/not executed yet/);
    expect(summary).not.toMatch(/بانتظار الاعتماد البشري/);
    expect(summary).toMatch(/Approvals resolved: 1 executed, 0 failed, 0 not executed/);
    expect(summary).toMatch(/The agent does not resume automatically/);
    expect(summary).toMatch(/الوكيل لا يستأنف تلقائيًّا/);
    expect(f.agentRun.audit_json).toMatchObject({
      correlationId: "corr-1",
      pendingApprovals: { count: 0, resolved: true, approvedSucceeded: 1, resumed: false },
    });
    const runMove = f.admin.log.find((q) => q.table === "agent_runs" && q.op === "update")!;
    expect(has(runMove, "in", "status", ["succeeded", "failed"])).toBe(true);
    expect(has(runMove, "eq", "org_id", ORG)).toBe(true);

    const reportRead = f.admin.log.find((q) => q.table === "finn_reports" && q.op === "select")!;
    expect(has(reportRead, "eq", "payload->>agentRunId", "run-1")).toBe(true);
    expect(f.report.payload).toMatchObject({
      agentRunId: "run-1",
      pending_approvals: 0,
      approvals_resolved: { approvedSucceeded: 1, resumed: false },
      summary_en: summary,
    });
  });

  it("ورفضٌ ⇐ الخطوة cancelled والملخّص يقول «لم يُنفَّذ»", async () => {
    const f = approvalFixture();
    await decideApproval(f.caller.client, USER, "exec-1", "reject");
    expect(f.stepRow.status).toBe("cancelled");
    expect(f.stepRow.error).toMatch(/Rejected by approver/);
    expect(String(f.agentRun.summary)).toMatch(/0 executed, 0 failed, 1 not executed/);
    expect(f.report.payload).toMatchObject({ pending_approvals: 0 });
  });

  it("وفعلٌ معتمَد فشل ⇐ الخطوة failed بسببه", async () => {
    const f = approvalFixture({ incidentsReply: { error: { message: "permission denied" } } });
    await decideApproval(f.caller.client, USER, "exec-1", "approve");
    expect(f.stepRow.status).toBe("failed");
    expect(f.stepRow.error).toMatch(/permission denied/);
    expect(String(f.agentRun.summary)).toMatch(/0 executed, 1 failed, 0 not executed/);
  });

  it("رفضٌ يسابق اعتمادًا سبق فطالب بالصفّ ⇐ يُرفض الرفض «no longer pending» ولا يُمسّ الصفّ", async () => {
    const f = approvalFixture({ staleRead: true });
    await expect(decideApproval(f.caller.client, USER, "exec-1", "reject")).rejects.toThrow(
      /Failed to persist rejection: execution is no longer pending/,
    );
    expect(f.row.status).toBe("queued");
    expect(f.row.approved_by).toBeUndefined();
    const reject = f.admin.log.find(
      (q) => q.table === "tool_executions" && q.payload?.status === "rejected",
    )!;
    expect(has(reject, "eq", "status", "pending_approval")).toBe(true);
    expect(auditActions(f.admin.log)).not.toContain("tool.approval.rejected");
    expect(f.admin.log.some((q) => q.table === "workflow_step_runs")).toBe(false);
  });

  it("والكتابة الختامية للتنفيذ مشروطةٌ بـrunning: صفٌّ أُلغي أثناء المنفّذ يبقى ملغيًّا", async () => {
    const f = approvalFixture({
      onExecutorRead: (row) => {
        row.status = "cancelled";
      },
    });
    const res = await decideApproval(f.caller.client, USER, "exec-1", "approve");
    expect(res.status).toBe("succeeded");
    expect(f.row.status).toBe("cancelled");
    expect(f.row.output_json).toBeUndefined();
  });
});

/* ---------------- ⑪ caller abort signal ---------------- */

describe("⑪ إشارة المستدعي تُلغي الحلقة وتكتب التشغيل cancelled", () => {
  it("abort أثناء الحلقة ⇐ الحلقة تُقطع، agent_runs cancelled بشرط الحالة الحيّة، والنتيجة cancelled لا «تجاوز 180 ث»", async () => {
    const f = agentFixture();
    const ctrl = new AbortController();
    h.generateText = (opts) =>
      new Promise((_, reject) => {
        (opts.abortSignal as AbortSignal).addEventListener("abort", () =>
          reject(new Error("This operation was aborted")),
        );
        ctrl.abort();
      });
    const res = await runAgent(f.caller.client, { ...runParams, signal: ctrl.signal });
    expect(res.status).toBe("cancelled");
    expect(f.run.status).toBe("cancelled");
    expect(f.run.error).toBe("Cancelled by operator");
    expect(f.workflow.status).toBe("cancelled");
    expect(auditActions(f.admin.log)).toContain("agent.run.cancelled");
    expect(auditActions(f.admin.log)).not.toContain("agent.run.fail");
    const cancel = f.admin.log.find(
      (q) => q.table === "agent_runs" && q.payload?.status === "cancelled",
    )!;
    expect(has(cancel, "in", "status", ["queued", "running"])).toBe(true);
  });

  it("وإشارةٌ منطلقة قبل الحلقة ⇐ النموذج يُستدعى بإشارةٍ ملغاة ويُكتب cancelled", async () => {
    const f = agentFixture();
    const ctrl = new AbortController();
    ctrl.abort();
    const generate = vi.fn(async (opts: Record<string, unknown>) => {
      if ((opts.abortSignal as AbortSignal).aborted) throw new Error("This operation was aborted");
      return { text: "must not happen", usage: {} };
    });
    h.generateText = generate;
    const res = await runAgent(f.caller.client, { ...runParams, signal: ctrl.signal });
    expect(res.status).toBe("cancelled");
    expect(f.run.status).toBe("cancelled");
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("وبلا إشارة: السلوك كما كان", async () => {
    const f = agentFixture();
    h.generateText = async () => ({ text: "All clear.", usage: {} });
    const res = await runAgent(f.caller.client, runParams);
    expect(res).toMatchObject({ status: "succeeded", summary: "All clear." });
  });
});

/* ------------------- ⑥ the wait has an exit: expiry/rejection ------------------- */

function expiryFixture(opts: {
  stale: Array<Record<string, unknown>>;
  /** تنفيذاتٌ أخرى في الارتباط نفسه لم تبلغ مهلتها. */
  siblings?: Array<Record<string, unknown>>;
}) {
  const rows: Array<Record<string, unknown>> = opts.stale.map((r) => ({
    status: "pending_approval",
    approved_at: null,
    ...r,
  }));
  const workflow: Record<string, unknown> = {
    id: "wfr-1",
    org_id: ORG,
    status: "waiting_approval",
    trigger_event: "agent.invoke",
  };
  const admin = fakeDb((q) => {
    if (q.table === "tool_executions" && q.op === "select") {
      if (has(q, "lt", "created_at")) {
        return { data: rows.filter((r) => r.status === "pending_approval") };
      }
      const corr = q.filters.find(([op, c]) => op === "eq" && c === "correlation_id")?.[2];
      return {
        data: [...rows, ...(opts.siblings ?? [])]
          .filter((r) => r.correlation_id === corr)
          .map((r) => ({ status: r.status, approved_at: r.approved_at ?? null })),
      };
    }
    if (q.table === "tool_executions" && q.op === "update") {
      // كما القاعدة: `.select("id")` تعيد ما طابق الشرط وكُتب فعلًا.
      const matched: Array<{ id: unknown }> = [];
      for (const r of rows) {
        const reply = applyUpdate(q, r);
        if (Array.isArray(reply.data) && reply.data.length) matched.push({ id: r.id });
      }
      return { data: q.returning ? matched : null };
    }
    if (q.table === "workflow_runs" && q.op === "update") return applyUpdate(q, workflow);
    return undefined;
  });
  h.admin = admin.client;
  const tallies = () =>
    admin.log.filter(
      (q) => q.table === "tool_executions" && q.op === "select" && has(q, "eq", "correlation_id"),
    );
  const workflowUpdates = () =>
    admin.log.filter((q) => q.table === "workflow_runs" && q.op === "update");
  return { rows, workflow, admin, tallies, workflowUpdates };
}

const agentPending = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  tool_id: "m365.outlook.send_mail",
  actor_id: USER,
  org_id: ORG,
  correlation_id: "corr-1",
  workflow_run_id: "wfr-1",
  agent_run_id: "run-1",
  ...extra,
});

describe("⑥ انتهاء مهلة الاعتماد يُخرج الغلاف من waiting_approval", () => {
  it("آخر معلَّقٍ انتهى ⇐ الغلاف يُسوّى، ويُكتب أن الفعل لم يُنفَّذ", async () => {
    const f = expiryFixture({ stale: [agentPending("exec-1")] });
    const res = await expireStaleApprovals();
    expect(res).toEqual({ expired: 1, ids: ["exec-1"], settled: 1 });
    expect(f.rows[0].status).toBe("expired");
    expect(f.workflow.status).toBe("succeeded");
    expect(f.workflow.error).toMatch(/1 action\(s\) not executed \(rejected or approval expired\)/);
    expect(f.workflow.finished_at).toEqual(expect.any(String));
    const move = f.workflowUpdates()[0];
    expect(has(move, "eq", "status", "waiting_approval")).toBe(true);
    expect(has(move, "eq", "trigger_event", "agent.invoke")).toBe(true);
    expect(auditActions(f.admin.log)).toEqual(
      expect.arrayContaining(["tool.approval.expired", "workflow.run.settled"]),
    );
  });

  it("وما دام في الارتباط معلَّقٌ لم تبلغ مهلته، يبقى الغلاف منتظرًا", async () => {
    const f = expiryFixture({
      stale: [agentPending("exec-1")],
      siblings: [{ correlation_id: "corr-1", status: "pending_approval", approved_at: null }],
    });
    const res = await expireStaleApprovals();
    expect(res.settled).toBe(0);
    expect(f.workflow.status).toBe("waiting_approval");
    expect(f.workflowUpdates()).toHaveLength(0);
  });

  it("تسويةٌ واحدة لكل ارتباط، وتنفيذات المحرّك (بلا agent_run_id) لا تُسوّى من هنا", async () => {
    const f = expiryFixture({
      stale: [
        agentPending("exec-1"),
        agentPending("exec-2"),
        agentPending("exec-3", { correlation_id: "corr-2", agent_run_id: null }),
      ],
    });
    const res = await expireStaleApprovals();
    expect(res.expired).toBe(3);
    expect(res.settled).toBe(1);
    expect(f.tallies()).toHaveLength(1);
    expect(has(f.tallies()[0], "eq", "correlation_id", "corr-1")).toBe(true);
    expect(f.workflowUpdates()).toHaveLength(1);
    expect(f.workflow.error).toMatch(/2 action\(s\) not executed/);
  });

  it("وطلبٌ اعتُمد بين القراءة والكتابة لا يُؤرَّخ انتهاؤه ولا تُحسم خطوته (L2)", async () => {
    const f = expiryFixture({ stale: [agentPending("exec-1"), agentPending("exec-2")] });
    // بين القراءة والكتابة: exec-2 اعتُمد للتوّ (يُقلب عند أوّل لمسةٍ بعد القراءة).
    const original = f.admin.client.from.bind(f.admin.client);
    let touches = 0;
    f.admin.client.from = (table: string) => {
      if (table === "tool_executions" && ++touches === 2) f.rows[1]!.status = "queued";
      return original(table);
    };
    const res = await expireStaleApprovals();
    expect(res.expired).toBe(1);
    expect(res.ids).toEqual(["exec-1"]);
    expect(f.rows[0].status).toBe("expired");
    expect(f.rows[1].status).toBe("queued");
    const expiredAudits = f.admin.log.filter(
      (q) => q.table === "audit_logs" && q.payload?.action === "tool.approval.expired",
    );
    expect(expiredAudits.map((q) => q.payload?.resource_id)).toEqual(["exec-1"]);
    const stepMoves = f.admin.log.filter((q) => q.table === "workflow_step_runs");
    expect(stepMoves).toHaveLength(1);
    expect(has(stepMoves[0], "eq", "tool_execution_id", "exec-1")).toBe(true);
    // والغلاف يبقى منتظرًا: في ارتباطه طلبٌ معتمَد لم ينتهِ.
    expect(f.workflow.status).toBe("waiting_approval");
  });

  it("والانتهاء لا ينفّذ: لا نداء شبكة ولا إدراج تنفيذ", async () => {
    const f = expiryFixture({ stale: [agentPending("exec-1")] });
    await expireStaleApprovals();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(f.admin.log.some((q) => q.op === "insert" && q.table === "tool_executions")).toBe(false);
    expect(f.rows[0].status).not.toBe("queued");
  });
});
