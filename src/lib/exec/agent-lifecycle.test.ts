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
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.MICROSOFT_CONNECTOR_BASE_URL = "https://connector.example.invalid";
});

const h = vi.hoisted(() => ({
  admin: null as unknown,
  generateText: null as unknown as (opts: Record<string, unknown>) => Promise<unknown>,
  embedText: null as unknown as (text: string) => Promise<number[]>,
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: new Proxy(
    {},
    { get: (_t, prop) => (h.admin as Record<string | symbol, unknown>)[prop] },
  ),
}));
vi.mock("@/lib/authz.server", () => ({ hasAnyPlatformRole: async () => true }));
vi.mock("@/lib/governance/ai-quota.server", () => ({
  AiGateError: class AiGateError extends Error {
    code = "ai_gate_error";
  },
  assertAiQuota: async () => undefined,
}));
vi.mock("@/lib/sadeed/gemini-provider.server", () => ({
  resolveSadeedGeminiRuntime: () => ({ provider: () => ({}), modelId: "test-model" }),
}));
vi.mock("@/lib/sadeed/executive-brain/context.server", () => ({
  buildEnterpriseKnowledgeBlock: () => "",
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

import { getExecutor, isIdempotentCall } from "./tool-registry.server";
import { decideApproval, executeTool, expireStaleApprovals } from "./tool-orchestrator.server";
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
      q.op === "select" ? { data: { status: "open", assigned_to: null } } : { data: [{ id }] },
    );
    await update.execute({ id, status: "closed" }, toolCtx(found.client));
    const write = found.log.find((q) => q.op === "update")!;
    expect(has(write, "eq", "id", id)).toBe(true);
    expect(has(write, "eq", "org_id", ORG)).toBe(true);
  });

  it("does not report an update when RLS permits reading but affects no rows", async () => {
    const update = getExecutor("sec.update_work_order")!;
    const db = fakeDb((q) =>
      q.op === "select" ? { data: { status: "open", assigned_to: null } } : { data: [] },
    );
    await expect(
      update.execute({ id: "work-1", status: "closed" }, toolCtx(db.client)),
    ).rejects.toThrow(/no row changed/);
    const write = db.log.find((q) => q.op === "update");
    expect(write?.returning).toBe(true);
  });

  for (const [toolId, table, payload] of [
    ["sec.update_work_order", "sec_work_orders", { id: "row-1", before: { status: "open" } }],
    ["sec.create_incident", "sec_incidents", { incidentId: "row-1" }],
  ] as const) {
    it(`${toolId} rollback refuses zero rows, errors and absent payload`, async () => {
      const rollback = getExecutor(toolId)!.rollback!;
      const empty = fakeDb(() => ({ data: [] }));
      await expect(rollback(payload, toolCtx(empty.client))).rejects.toThrow(/no row changed/);
      expect(empty.log[0].table).toBe(table);
      expect(empty.log[0].returning).toBe(true);
      expect(has(empty.log[0], "eq", "org_id", ORG)).toBe(true);
      const denied = fakeDb(() => ({ error: { message: "permission denied" } }));
      await expect(rollback(payload, toolCtx(denied.client))).rejects.toThrow(/permission denied/);
      await expect(rollback(null, toolCtx(empty.client))).rejects.toThrow(
        /missing rollback payload/,
      );
    });

    it(`${toolId} rollback succeeds only on the matching returned row`, async () => {
      const rollback = getExecutor(toolId)!.rollback!;
      const db = fakeDb(() => ({ data: [{ id: "row-1" }] }));
      await expect(rollback(payload, toolCtx(db.client))).resolves.toBeUndefined();
      const wrong = fakeDb(() => ({ data: [{ id: "another-row" }] }));
      await expect(rollback(payload, toolCtx(wrong.client))).rejects.toThrow(/no row changed/);
    });
  }
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
  const caller = fakeDb((q) => {
    if (q.table === "org_members") return { data: [{ org_id: ORG }] };
    if (q.table === "tool_registry")
      return { data: regRow("sql.read", true, opts.enabled ?? true) };
    if (q.table === "tool_executions" && q.op === "select") {
      // قراءةٌ قديمة: صفٌّ اعتُمد للتوّ ما زال يُقرأ معلَّقًا.
      return { data: { ...row, status: opts.staleRead ? "pending_approval" : row.status } };
    }
    if (q.table === "tool_executions" && q.op === "update") {
      const reply = applyUpdate(q, row);
      history.push(row.status);
      return reply;
    }
    if (q.table === "sec_incidents") {
      incidentReads++;
      return opts.incidentsReply ?? { data: [{ id: "inc-1" }] };
    }
    return undefined;
  });
  const workflow: Record<string, unknown> = {
    id: "wfr-1",
    org_id: ORG,
    status: "waiting_approval",
    trigger_event: "agent.invoke",
  };
  const admin = fakeDb((q) => {
    if (q.table === "tool_executions" && q.op === "select") {
      return {
        data: opts.tally ? opts.tally(row) : [{ status: row.status, approved_at: row.approved_at }],
      };
    }
    if (q.table === "workflow_runs" && q.op === "update") return applyUpdate(q, workflow);
    return undefined;
  });
  h.admin = admin.client;
  return {
    row,
    history,
    caller,
    admin,
    workflow,
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
    expect(f.caller.log.some((q) => q.table === "tool_executions" && q.op === "insert")).toBe(
      false,
    );
    expect(f.history).toEqual(["queued", "running", "succeeded"]);
    expect(f.incidentReads).toBe(1);
    expect(f.row.status).toBe("succeeded");
    expect(f.row.output_json).toEqual({
      output: { rows: [{ id: "inc-1" }], count: 1 },
      rollbackPayload: null,
    });
    expect(typeof f.row.duration_ms).toBe("number");
    expect(f.row.approved_by).toBe(USER);

    const claim = f.caller.log.find(
      (q) => q.table === "tool_executions" && q.payload?.status === "running",
    )!;
    expect(has(claim, "eq", "status", "queued")).toBe(true);
    expect(has(claim, "eq", "tool_id", "sql.read")).toBe(true);
    expect(has(claim, "eq", "org_id", ORG)).toBe(true);
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
  });

  it("وتنفيذ المحرّك (بلا agent_run_id) لا يُسوّى من هنا — يستأنفه resumeWorkflowRun", async () => {
    const f = approvalFixture({ agentRunId: null });
    await decideApproval(f.caller.client, USER, "exec-1", "approve");
    expect(f.admin.log).toHaveLength(0);
  });

  it("واعتمادٌ ثانٍ متزامن لا ينفّذ الفعل مرّة أخرى", async () => {
    const f = approvalFixture({ staleRead: true });
    await expect(decideApproval(f.caller.client, USER, "exec-1", "approve")).rejects.toThrow(
      /no longer pending/,
    );
    expect(f.incidentReads).toBe(0);
    expect(f.history).toEqual(["queued"]);
  });

  it("a stale rejection cannot overwrite an approval claimed concurrently", async () => {
    const f = approvalFixture({ staleRead: true });
    await expect(decideApproval(f.caller.client, USER, "exec-1", "reject")).rejects.toThrow(
      /no longer pending/,
    );
    expect(f.row.status).toBe("queued");
    expect(f.incidentReads).toBe(0);
  });

  it("server policy forces human approval even when the registry does not", async () => {
    const db = runnerDb("sec.create_incident");
    const result = await executeTool(db.client, {
      toolId: "sec.create_incident",
      input: { title_ar: "بلاغ اختباري", severity: "low" },
      actorId: USER,
      orgId: ORG,
      requireApproval: true,
    });
    expect(result.status).toBe("pending_approval");
    expect(db.log.some((q) => q.table === "sec_incidents")).toBe(false);
    expect(
      db.log.find((q) => q.table === "tool_executions" && q.op === "insert")?.payload,
    ).toMatchObject({ status: "pending_approval", org_id: ORG });
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
  const execution: Record<string, unknown> = { id: "exec-new", org_id: ORG, status: "running" };
  return fakeDb((q) => {
    if (q.table === "org_members") return { data: [{ org_id: ORG }] };
    if (q.table === "tool_registry") return { data: regRow(toolId, false) };
    if (q.table === "tool_executions" && q.op === "insert") return { data: { id: "exec-new" } };
    const overridden = extra(q);
    if (overridden !== undefined) return overridden;
    if (q.table === "tool_executions" && q.op === "update") return applyUpdate(q, execution);
    return undefined;
  });
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
    expect(res.outcomeUnknown).toBe(true);
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
      webhook.execute({ url: "https://connector.example.invalid/hook", payload: { a: 1 } }, ctx),
    ).rejects.toThrow(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const rest = getExecutor("rest.http")!;
    fetchMock.mockClear();
    await expect(
      rest.execute({ method: "POST", url: "https://connector.example.invalid/x", body: {} }, ctx),
    ).rejects.toThrow(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    await expect(
      rest.execute({ method: "GET", url: "https://connector.example.invalid/x" }, ctx),
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
  } = {},
) {
  const run: Record<string, unknown> = { id: "run-1", status: "running", finished_at: null };
  const workflow: Record<string, unknown> = {
    id: "wfr-1",
    org_id: ORG,
    status: "running",
    trigger_event: "agent.invoke",
  };
  const admin = fakeDb((q) => {
    switch (q.table) {
      case "agent_definitions":
        return {
          data: {
            id: "agent_x",
            name: "Agent X",
            goal: "Daily security brief",
            system_prompt: null,
            permissions: [],
            tool_allowlist: opts.tools ?? [],
            model: null,
            enabled: true,
            org_id: ORG,
          },
        };
      case "org_members":
        return { data: [{ org_id: ORG }] };
      case "workflows":
        return { data: { id: "wf-def" } };
      case "agent_runs":
        if (q.op === "insert") return { data: { id: run.id } };
        if (q.op === "select") return { data: { status: run.status } };
        if (q.op === "update") return applyUpdate(q, run);
        return undefined;
      case "workflow_runs":
        if (q.op === "insert") return { data: { id: workflow.id } };
        if (q.op === "update") return applyUpdate(q, workflow);
        return undefined;
      case "tool_executions":
        if (q.op === "select") return { data: opts.tally ?? [] };
        return undefined;
      default:
        return undefined;
    }
  });
  h.admin = admin.client;
  const caller = fakeDb((q) => {
    if (q.table === "org_members") return { data: [{ org_id: ORG }] };
    if (q.table === "tool_registry") {
      return { data: regRow("sql.read", opts.requiresApproval ?? false) };
    }
    if (q.table === "tool_executions" && q.op === "insert") return { data: { id: "exec-p1" } };
    return undefined;
  });
  const workflowUpdates = () =>
    admin.log.filter((q) => q.table === "workflow_runs" && q.op === "update");
  return { run, workflow, admin, caller, workflowUpdates };
}

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
    });
    return out;
  };

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

    // الطلب المعلَّق مربوطٌ بغلافه وتشغيله عمودًا.
    const pending = f.caller.log.find((q) => q.table === "tool_executions" && q.op === "insert")!;
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
      for (const r of rows) applyUpdate(q, r);
      return { data: null };
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

  it("والانتهاء لا ينفّذ: لا نداء شبكة ولا إدراج تنفيذ", async () => {
    const f = expiryFixture({ stale: [agentPending("exec-1")] });
    await expireStaleApprovals();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(f.admin.log.some((q) => q.op === "insert" && q.table === "tool_executions")).toBe(false);
    expect(f.rows[0].status).not.toBe("queued");
  });
});

/* ---------- Completion persistence is not permission to repeat a tool ------ */
describe("tool completion requires a durable compare-and-set acknowledgement", () => {
  const run = (db: ReturnType<typeof runnerDb>) =>
    executeTool(db.client, {
      toolId: "sql.read",
      input: { table: "sec_incidents" },
      actorId: USER,
      orgId: ORG,
      retry: { max: 2, baseMs: 0 },
    });
  it.each(["error", "no_rows", "throw"] as const)(
    "does not retry an idempotent executor after completion persistence %s",
    async (failure) => {
      let reads = 0;
      const db = runnerDb("sql.read", (q) => {
        if (q.table === "sec_incidents") {
          reads++;
          return { data: [{ id: "inc-1" }] };
        }
        if (q.table === "tool_executions" && q.op === "update") {
          if (failure === "throw") throw new Error("fetch failed after executor returned");
          return failure === "error" ? { error: { message: "fetch failed" } } : { data: [] };
        }
        return undefined;
      });
      const result = await run(db);
      expect(result).toMatchObject({ status: "failed", attempts: 1, outcomeUnknown: true });
      expect(result.error).toMatch(/outcome unknown, not retried/);
      expect(reads).toBe(1);
      const updates = db.log.filter((q) => q.table === "tool_executions" && q.op === "update");
      expect(updates).toHaveLength(1);
      expect(has(updates[0], "eq", "id", "exec-new")).toBe(true);
      expect(has(updates[0], "eq", "org_id", ORG)).toBe(true);
      expect(has(updates[0], "eq", "status", "running")).toBe(true);
      expect(updates[0].returning).toBe(true);
      expect(auditActions(db.log)).toContain("tool.execute.outcome_unknown");
      expect(auditActions(db.log)).not.toContain("tool.execute.success");
      expect(auditActions(db.log)).not.toContain("tool.execute.retry");
      expect(auditActions(db.log)).not.toContain("tool.execute.fail");
      expect(
        db.log.some(
          (q) =>
            q.table === "enterprise_events" &&
            String(q.payload?.topic).startsWith("tool.succeeded."),
        ),
      ).toBe(false);
    },
  );
  it("does not overwrite a success committed before its acknowledgement was lost", async () => {
    let committedStatus = "running";
    let reads = 0;
    const db = runnerDb("sql.read", (q) => {
      if (q.table === "sec_incidents") {
        reads++;
        return { data: [] };
      }
      if (q.table === "tool_executions" && q.op === "update") {
        committedStatus = q.payload?.status as string;
        return { error: { message: "connection reset after commit" } };
      }
      return undefined;
    });
    expect(await run(db)).toMatchObject({ status: "failed", attempts: 1, outcomeUnknown: true });
    expect(committedStatus).toBe("succeeded");
    expect(reads).toBe(1);
    expect(db.log.filter((q) => q.table === "tool_executions" && q.op === "update")).toHaveLength(
      1,
    );
  });
  it.each(["returned", "failed"] as const)(
    "preserves concurrent cancellation when the executor %s",
    async (executorOutcome) => {
      const cancelled: Record<string, unknown> = {
        id: "exec-new",
        org_id: ORG,
        status: "cancelled",
      };
      const db = runnerDb("sql.read", (q) => {
        if (q.table === "sec_incidents")
          return executorOutcome === "returned"
            ? { data: [] }
            : { error: { message: "permission denied" } };
        if (q.table === "tool_executions" && q.op === "update") return applyUpdate(q, cancelled);
        return undefined;
      });
      const result = await run(db);
      expect(result).toMatchObject({ status: "failed", attempts: 1, outcomeUnknown: true });
      expect(cancelled.status).toBe("cancelled");
      const updates = db.log.filter((q) => q.table === "tool_executions" && q.op === "update");
      expect(updates).toHaveLength(1);
      expect(has(updates[0], "eq", "org_id", ORG)).toBe(true);
      expect(has(updates[0], "eq", "status", "running")).toBe(true);
      expect(auditActions(db.log)).not.toContain("tool.execute.success");
      expect(auditActions(db.log)).not.toContain("tool.execute.fail");
    },
  );
  it("publishes success only after the exact running execution was acknowledged", async () => {
    const db = runnerDb("sql.read", (q) =>
      q.table === "sec_incidents" ? { data: [] } : undefined,
    );
    expect(await run(db)).toMatchObject({ status: "succeeded", attempts: 1 });
    const updateAt = db.log.findIndex((q) => q.table === "tool_executions" && q.op === "update");
    const auditAt = db.log.findIndex(
      (q) => q.table === "audit_logs" && q.payload?.action === "tool.execute.success",
    );
    expect(updateAt).toBeLessThan(auditAt);
    expect(
      db.log.some(
        (q) => q.table === "enterprise_events" && q.payload?.topic === "tool.succeeded.sql.read",
      ),
    ).toBe(true);
  });
  it.each(["error", "throw"] as const)(
    "reports unknown final state when failure persistence returns %s",
    async (failure) => {
      const db = runnerDb("sql.read", (q) => {
        if (q.table === "sec_incidents") return { error: { message: "permission denied" } };
        if (q.table === "tool_executions" && q.op === "update") {
          if (failure === "throw") throw new Error("connection reset");
          return { error: { message: "failure write rejected" } };
        }
        return undefined;
      });
      const result = await run(db);
      expect(result).toMatchObject({ status: "failed", attempts: 1, outcomeUnknown: true });
      expect(result.error).toMatch(/final execution state could not be confirmed/);
      expect(auditActions(db.log)).toContain("tool.execute.outcome_unknown");
      expect(auditActions(db.log)).not.toContain("tool.execute.fail");
      expect(
        db.log.some(
          (q) =>
            q.table === "enterprise_events" && String(q.payload?.topic).startsWith("tool.failed."),
        ),
      ).toBe(false);
    },
  );
});
