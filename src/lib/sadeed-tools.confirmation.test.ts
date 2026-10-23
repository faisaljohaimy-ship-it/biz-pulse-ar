// @vitest-environment node
/**
 * بوابة التأكيد البشري لأدوات الكتابة في دردشة سَدِيد.
 *
 * الثابت: «أي إجراء كتابة أو طوارئ خلف بوابة تأكيد بشري». النداء الأول لا يكتب
 * شيئًا ويحفظ الاقتراح على الخادم؛ والتأكيد لا يُقبل إلا في رسالةٍ **لاحقة** صريحة
 * قصيرة؛ والاقتراح لا يُنفَّذ مرّتين؛ وغياب السرّ أو السجلّ يفشل مغلقًا.
 *
 * **كل «طلب» هنا بناءٌ جديد لأدوات الدردشة لا يمرّر إليه الاختبار شيئًا من
 * الطلب السابق** — كما في `/api/chat` الذي يُسقط أجزاء الأدوات من السجلّ ولا
 * يرسل إلى العميل إلا النصّ الآمن. ما يعبر بين الطلبات هو سجلّ الخادم وحده.
 * عملاء القاعدة وهميّون بالكامل، و`fetch` يرمي — أي نداء شبكة هنا خطأ.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { asSchema, convertToModelMessages, generateText, stepCountIs, type UIMessage } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { toSadeedSpeechText } from "@/lib/sadeed/reply-modality";
import { hasForbiddenFiller } from "@/lib/sadeed/response-contract";

const SECRET = "test-secret-that-is-longer-than-thirty-two-characters";

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  orgId: "org-1" as string | null,
  writerRole: true,
  adminRole: true,
  /** جداول عميل الخدمة — تبقى عبر إعادة تحميل الوحدة (معزولٌ جديد، قاعدةٌ نفسها). */
  tables: {
    finn_actions_log: [] as Row[],
    sec_activity_events: [] as Row[],
    agent_definitions: [] as Row[],
  } as Record<string, Row[]>,
  /** تشغيلات الوكلاء التي طلبتها أداة `dispatch_agent` (RT-10). */
  agentRuns: [] as Array<{ client: unknown; params: Record<string, unknown> }>,
  runAgentBehaviour: "resolve" as "resolve" | "cancel-on-abort" | "never",
  seq: 0,
  /** عطلٌ مزروع: جدول + عملية (+ فعل السجلّ اختياريًّا). */
  fail: null as null | { table: string; op: "select" | "insert"; action?: string },
  /** يُستدعى قبل كل إدراج — لزرع طلبٍ منافس يسبقنا بين الفحص والمطالبة. */
  beforeInsert: null as null | ((table: string, row: Row) => void),
}));

vi.mock("@/lib/authz.server", () => ({
  getCurrentOrgIdForUser: async () => state.orgId,
  hasAnyPlatformRole: async () => state.writerRole,
  hasPlatformRole: async () => state.adminRole,
}));

/** عميل خدمة وهمي فوق مصفوفات: insert/select/eq/gte/contains/order/limit/single. */
vi.mock("@/integrations/supabase/client.server", () => {
  const admin = {
    from(table: string) {
      const rows = state.tables[table];
      if (!rows) throw new Error(`unexpected admin table ${table}`);
      const filters: Array<(row: Row) => boolean> = [];
      const orders: Array<[string, boolean]> = [];
      let limitN = Number.POSITIVE_INFINITY;
      let inserted: Row | null = null;
      let insertError: { message: string } | null = null;
      let op: "select" | "insert" = "select";
      const matchesFail = (row?: Row) =>
        state.fail &&
        state.fail.table === table &&
        state.fail.op === op &&
        (!state.fail.action || state.fail.action === row?.action);
      const result = () => {
        if (op === "insert") return { data: inserted, error: insertError };
        if (matchesFail()) return { data: null, error: { message: "ledger down" } };
        const out = rows
          .filter((row) => filters.every((f) => f(row)))
          .sort((a, b) => {
            for (const [col, asc] of orders) {
              const x = String(a[col]);
              const y = String(b[col]);
              if (x !== y) return (x < y ? -1 : 1) * (asc ? 1 : -1);
            }
            return 0;
          })
          .slice(0, limitN);
        return { data: out, error: null };
      };
      const query = {
        insert(row: Row) {
          op = "insert";
          state.beforeInsert?.(table, row);
          if (matchesFail(row)) {
            insertError = { message: "ledger down" };
            return query;
          }
          state.seq += 1;
          inserted = {
            id: `row-${String(state.seq).padStart(4, "0")}`,
            created_at: new Date(Date.now() + state.seq).toISOString(),
            ...row,
          };
          rows.push(inserted);
          return query;
        },
        select: () => query,
        eq(col: string, value: unknown) {
          filters.push((row) => row[col] === value);
          return query;
        },
        in(col: string, values: unknown[]) {
          filters.push((row) => values.includes(row[col]));
          return query;
        },
        gte(col: string, value: string) {
          filters.push((row) => String(row[col]) >= value);
          return query;
        },
        contains(col: string, value: Row) {
          filters.push((row) =>
            Object.entries(value).every(([k, v]) => (row[col] as Row | undefined)?.[k] === v),
          );
          return query;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          orders.push([col, opts?.ascending !== false]);
          return query;
        },
        limit(n: number) {
          limitN = n;
          return query;
        },
        single: async () => result(),
        then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
          return Promise.resolve(result()).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { supabaseAdmin: admin };
});

vi.mock("@/lib/sadeed/outbound-messaging.server", () => ({
  prepareSadeedOutboundMessage: vi.fn(),
  sendSadeedOutboundMessageDirectInternal: vi.fn(),
  sadeedAutoApproveEnabled: () => false,
}));

vi.mock("@/lib/governance/rate-limit.server", () => ({
  enforceRateLimit: async () => ({ allowed: true }),
}));

// مشغّل الوكلاء: يُسجَّل النداء ويعود بنتيجةٍ مبرمَجة — لا نموذج ولا قاعدة.
vi.mock("@/lib/exec/agent-runtime.server", () => ({
  runAgent: async (client: unknown, params: Record<string, unknown>) => {
    state.agentRuns.push({ client, params });
    if (state.runAgentBehaviour === "never") return new Promise(() => undefined);
    if (state.runAgentBehaviour === "cancel-on-abort") {
      await new Promise<void>((resolve) =>
        (params.signal as AbortSignal).addEventListener("abort", () => resolve(), { once: true }),
      );
      return { runId: "run-0002", status: "cancelled", summary: "Cancelled by operator", steps: 1 };
    }
    return {
      runId: "run-0001",
      status: "succeeded",
      summary: "أُعدّت الإحاطة.",
      steps: 2,
    };
  },
}));

type Write = { table: string; op: "insert" | "update"; values: Record<string, unknown> };

/** عميل RLS وهمي: يسجّل كل كتابة ويعيد صفًّا بمعرّف حقيقيّ الشكل. */
function fakeRls(readResults: Record<string, { data: unknown; error: unknown }> = {}) {
  const writes: Write[] = [];
  let seq = 0;
  const client = {
    from(table: string) {
      let pending: Write | null = null;
      const chain: Record<string, unknown> = {};
      chain.insert = (values: Record<string, unknown>) => {
        pending = { table, op: "insert", values };
        writes.push(pending);
        return chain;
      };
      chain.update = (values: Record<string, unknown>) => {
        pending = { table, op: "update", values };
        writes.push(pending);
        return chain;
      };
      for (const method of ["select", "eq", "in", "order", "limit"]) chain[method] = () => chain;
      chain.single = async () => {
        seq += 1;
        return {
          data: {
            id: `${table}-row-${seq}`,
            ref: `REF-${seq}`,
            source_incident_id: null,
            ...(pending?.values ?? {}),
          },
          error: null,
        };
      };
      chain.then = (resolve: (v: unknown) => unknown) =>
        resolve(readResults[table] ?? { data: [], error: null });
      return chain;
    },
  };
  return { client: client as unknown as SupabaseClient, writes };
}

async function loadTools() {
  return import("@/lib/sadeed-tools.server");
}

type ToolResult = Record<string, unknown>;
async function call(
  tools: Record<string, unknown>,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const t = tools[name] as { execute: (a: unknown, o: unknown) => Promise<unknown> };
  return (await t.execute(args, { toolCallId: `call-${name}`, messages: [] })) as ToolResult;
}

/** طلب دردشة جديد: بناءٌ جديد للأدوات برسالة المستخدم الحالية وحدها. */
async function request(
  rls: ReturnType<typeof fakeRls>,
  lastUserText: string,
  userId = "user-1",
  orgId: string | null = "org-1",
  agentsAvailable = true,
) {
  const { buildSadeedTools } = await loadTools();
  return buildSadeedTools(rls.client, userId, { lastUserText, orgId, agentsAvailable });
}

const BRIEFING_AGENT: Row = {
  id: "briefing",
  name: "وكيل الإحاطات",
  enabled: true,
  permissions: ["admin", "manager", "member"],
  org_id: "org-1",
};
const DISPATCH = { agentId: "briefing", goal: "أعدّ إحاطة الصباح عن بلاغات البوابة الشمالية" };

const ledger = (action?: string) =>
  state.tables.finn_actions_log!.filter((row) => !action || row.action === action);
const businessWrites = (rls: ReturnType<typeof fakeRls>, table: string) =>
  rls.writes.filter((w) => w.table === table);

const INCIDENT = {
  category: "fire",
  title_ar: "حريق في البوابة الشمالية",
  severity: "high",
  priority: "medium",
};

beforeEach(() => {
  vi.stubEnv("SADEED_MESSAGE_APPROVAL_SECRET", SECRET);
  vi.stubEnv("ARIA_MESSAGE_APPROVAL_SECRET", "");
  vi.stubGlobal("fetch", () => {
    throw new Error("network is forbidden in this test");
  });
  state.orgId = "org-1";
  state.writerRole = true;
  state.adminRole = true;
  state.tables.finn_actions_log = [];
  state.tables.sec_activity_events = [];
  state.tables.agent_definitions = [BRIEFING_AGENT];
  state.agentRuns = [];
  state.runAgentBehaviour = "resolve";
  state.seq = 0;
  state.fail = null;
  state.beforeInsert = null;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("chat write tools — human confirmation gate", () => {
  it("first call writes nothing and records a sealed proposal on the server, not a token for the model", async () => {
    const rls = fakeRls();
    const result = await call(
      await request(rls, "سجّل بلاغ حريق في البوابة الشمالية"),
      "sec_create_incident",
      INCIDENT,
    );

    expect(result).toMatchObject({ ok: false, executed: false, status: "requires_confirmation" });
    expect(String(result.action_summary)).toContain("حريق في البوابة الشمالية");
    expect(String(result.action_summary)).toContain("عالية");
    expect(Date.parse(String(result.expires_at))).toBeGreaterThan(Date.now());
    // لا رمز في يد النموذج: لا يعبر حدّ الطلب، ونصّه في الردّ يُسقط الردّ كلّه.
    expect(result).not.toHaveProperty("confirmation_token");
    expect(JSON.stringify(result)).not.toMatch(/token/i);
    expect(rls.writes).toHaveLength(0);
    expect(state.tables.sec_activity_events).toHaveLength(0);

    const [pending] = ledger("chat.write.confirmation_requested");
    expect(ledger()).toHaveLength(1);
    expect(pending).toMatchObject({ user_id: "user-1", org_id: "org-1", status: "ok" });
    const input = pending!.input as Record<string, unknown>;
    expect(input).toMatchObject({ tool: "sec_create_incident", org: "org-1" });
    // السجلّ يقرؤه أعضاء المؤسسة: الوسائط والملخّص مشفَّران، لا نصّ مقروء.
    expect(JSON.stringify(pending)).not.toContain("حريق");
  });

  it("an identical call whose user message is not a confirmation is refused", async () => {
    const rls = fakeRls();
    await call(await request(rls, "سجّل بلاغ حريق"), "sec_create_incident", INCIDENT);
    const result = await call(
      await request(rls, "انتظر، دعني أراجع التفاصيل أولًا"),
      "sec_create_incident",
      INCIDENT,
    );
    expect(result).toMatchObject({
      ok: false,
      executed: false,
      status: "confirmation_required_from_user",
      reason: "no_explicit_confirmation",
    });
    expect(String(result.action_summary)).toContain("حريق في البوابة الشمالية");
    expect(rls.writes).toHaveLength(0);
  });

  it("a proposal made in this request cannot be confirmed in it, even if the text is «نعم»", async () => {
    const rls = fakeRls();
    const tools = await request(rls, "نعم");
    const first = await call(tools, "sec_create_incident", INCIDENT);
    const second = await call(tools, "sec_create_incident", INCIDENT);
    expect(first).toMatchObject({ status: "requires_confirmation", executed: false });
    expect(second).toMatchObject({
      status: "requires_confirmation",
      reason: "no_earlier_summary_for_this_action",
      executed: false,
    });
    expect(rls.writes).toHaveLength(0);
    // النداء المكرَّر في الطلب نفسه لا يكتب اقتراحًا ثانيًا.
    expect(ledger("chat.write.confirmation_requested")).toHaveLength(1);
  });

  it("«نعم» in the next request executes exactly once; a replay is refused", async () => {
    const rls = fakeRls();
    await call(await request(rls, "سجّل بلاغ حريق"), "sec_create_incident", INCIDENT);

    const done = await call(await request(rls, "نعم"), "sec_create_incident", INCIDENT);
    expect(done).toMatchObject({ ok: true, executed: true });
    expect((done.incident as Record<string, unknown>).id).toBe("sec_incidents-row-1");
    const inserts = businessWrites(rls, "sec_incidents");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]!.values).toMatchObject({ org_id: "org-1", title_ar: INCIDENT.title_ar });

    // الأثر الأمني يحمل الرقم العابر، وسجلّ سَدِيد يحمل المطالبة والنتيجة.
    expect(state.tables.sec_activity_events).toHaveLength(1);
    const payload = state.tables.sec_activity_events![0]!.payload as Record<string, unknown>;
    const nonce = (ledger("chat.write.confirmation_requested")[0]!.input as Row).nonce;
    expect(payload.confirmation_nonce).toBe(nonce);
    expect(ledger("chat.write.confirmed")).toHaveLength(1);
    const [outcome] = ledger("chat.write.executed");
    expect(outcome).toMatchObject({ status: "ok" });
    expect(outcome!.output).toMatchObject({
      executed: true,
      entity: { kind: "incident", id: "sec_incidents-row-1" },
    });

    const replay = await call(await request(rls, "نعم"), "sec_create_incident", INCIDENT);
    expect(replay).toMatchObject({ ok: false, executed: false, status: "already_executed" });
    expect(businessWrites(rls, "sec_incidents")).toHaveLength(1);
  });

  it("a replay after an isolate restart is still refused (the ledger is durable)", async () => {
    const rls = fakeRls();
    const patrol = { team: "الفريق أ", route: "السور الشرقي", checkpoints_total: 10 };
    await call(await request(rls, "جدول دورية"), "sec_schedule_patrol", patrol);
    const done = await call(await request(rls, "أؤكد"), "sec_schedule_patrol", patrol);
    expect(done).toMatchObject({ ok: true, executed: true });

    vi.resetModules();
    const replay = await call(await request(rls, "أؤكد"), "sec_schedule_patrol", patrol);
    expect(replay).toMatchObject({ executed: false, status: "already_executed" });
    expect(businessWrites(rls, "sec_patrols")).toHaveLength(1);
  });

  it("a competing claim that lands between the replay check and ours wins; we do not write", async () => {
    // سباق طلبين متزامنين على الاقتراح نفسه، مزروعٌ حتميًّا: يمرّ فحص المطالبة
    // السابقة، ثم يسبقنا منافسٌ بمطالبته قبل أن تُكتب مطالبتنا. (نداءان متوازيان
    // حقًّا في vitest 4 يعيدان الوحدة الأصلية بدل الوهمية في الاستيراد الديناميكي
    // المتزامن، فالسباق يُزرع ولا يُشغَّل.)
    const rls = fakeRls();
    await call(await request(rls, "سجّل بلاغ حريق"), "sec_create_incident", INCIDENT);
    state.beforeInsert = (table, row) => {
      if (table !== "finn_actions_log" || row.action !== "chat.write.confirmed") return;
      state.beforeInsert = null;
      state.tables.finn_actions_log!.push({
        ...row,
        id: "row-0000-competitor",
        created_at: new Date(Date.now() - 1).toISOString(),
      });
    };
    const lost = await call(await request(rls, "نعم"), "sec_create_incident", INCIDENT);
    expect(lost).toMatchObject({ executed: false, status: "already_executed" });
    expect(businessWrites(rls, "sec_incidents")).toHaveLength(0);
  });

  it("when the model rebuilds the arguments differently, it gets back exactly what the user confirmed", async () => {
    const rls = fakeRls();
    await call(await request(rls, "سجّل بلاغ حريق"), "sec_create_incident", INCIDENT);

    const confirmTurn = await request(rls, "نعم");
    const drifted = { ...INCIDENT, title_ar: "حريق عند البوابة الشمالية", severity: "critical" };
    const differ = await call(confirmTurn, "sec_create_incident", drifted);
    expect(differ).toMatchObject({ executed: false, status: "confirmed_arguments_differ" });
    expect(rls.writes).toHaveLength(0);
    const proposals = differ.confirmed_proposals as Array<{
      arguments: Record<string, unknown>;
      action_summary: string;
    }>;
    expect(proposals).toHaveLength(1);
    expect(proposals[0]!.arguments).toEqual(INCIDENT);
    expect(proposals[0]!.action_summary).toContain("حريق في البوابة الشمالية");

    const done = await call(confirmTurn, "sec_create_incident", proposals[0]!.arguments);
    expect(done).toMatchObject({ ok: true, executed: true });
    const inserts = businessWrites(rls, "sec_incidents");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]!.values).toMatchObject({ title_ar: INCIDENT.title_ar, severity: "high" });
  });

  it("a newer proposal supersedes an older one: «نعم» confirms only the latest", async () => {
    const rls = fakeRls();
    await call(await request(rls, "سجّل بلاغ حريق"), "sec_create_incident", INCIDENT);
    await call(await request(rls, "سجّل خروج الزائر"), "sec_checkout_visitor", {
      id: "11111111-1111-4111-8111-111111111111",
    });
    const stale = await call(await request(rls, "نعم"), "sec_create_incident", INCIDENT);
    expect(stale).toMatchObject({
      executed: false,
      status: "requires_confirmation",
      reason: "no_earlier_summary_for_this_action",
    });
    expect(rls.writes).toHaveLength(0);
  });

  it("several proposals shown together are all confirmable by the next «نعم»", async () => {
    const rls = fakeRls();
    const proposeTurn = await request(rls, "سجّل البلاغ وأنشئ أمر عمل له");
    const workOrder = {
      title_ar: "إصلاح كاميرا البوابة",
      kind: "corrective",
      priority: "high",
      asset_kind: "camera",
    };
    await call(proposeTurn, "sec_create_incident", INCIDENT);
    await call(proposeTurn, "sec_create_work_order", workOrder);

    const confirmTurn = await request(rls, "نعم");
    expect(await call(confirmTurn, "sec_create_incident", INCIDENT)).toMatchObject({
      executed: true,
    });
    expect(await call(confirmTurn, "sec_create_work_order", workOrder)).toMatchObject({
      executed: true,
    });
    expect(businessWrites(rls, "sec_incidents")).toHaveLength(1);
    expect(businessWrites(rls, "sec_work_orders")).toHaveLength(1);
  });

  it("a confirmation expires after ten minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-18T09:00:00Z"));
    const rls = fakeRls();
    await call(await request(rls, "سجّل بلاغ حريق"), "sec_create_incident", INCIDENT);
    vi.setSystemTime(new Date("2026-10-18T09:11:00Z"));
    const late = await call(await request(rls, "نعم"), "sec_create_incident", INCIDENT);
    expect(late).toMatchObject({ executed: false, status: "requires_confirmation" });
    expect(rls.writes).toHaveLength(0);
  });

  it("an expired proposal is never handed back as confirmed arguments", async () => {
    // حدّ الصلاحية بالضبط: الصفّ ما زال داخل نافذة القراءة، والختم انتهى.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-18T09:00:00Z"));
    const rls = fakeRls();
    await call(await request(rls, "سجّل بلاغ حريق"), "sec_create_incident", INCIDENT);
    vi.setSystemTime(new Date("2026-10-18T09:10:00Z"));
    const drifted = { ...INCIDENT, title_ar: "حريق بالبوابة الشمالية" };
    const result = await call(await request(rls, "نعم"), "sec_create_incident", drifted);
    expect(result).toMatchObject({ executed: false, status: "requires_confirmation" });
    expect(result).not.toHaveProperty("confirmed_proposals");
    expect(rls.writes).toHaveLength(0);
  });

  it("another user's «نعم» or another tool cannot use the proposal", async () => {
    const rls = fakeRls();
    const visitor = { id: "11111111-1111-4111-8111-111111111111" };
    await call(await request(rls, "اكشف الزائر"), "sec_checkout_visitor", visitor);

    const otherUser = await call(
      await request(rls, "نعم", "user-2"),
      "sec_checkout_visitor",
      visitor,
    );
    expect(otherUser).toMatchObject({ executed: false, status: "requires_confirmation" });
    const otherTool = await call(await request(rls, "نعم"), "sec_triage_cctv_alert", {
      ...visitor,
      status: "triaged",
    });
    expect(otherTool).toMatchObject({ executed: false, status: "requires_confirmation" });
    expect(rls.writes).toHaveLength(0);
  });

  it("a proposal row forged without the server secret is never executed", async () => {
    const rls = fakeRls();
    const { writeConfirmationArgsHash } = await import("@/lib/sadeed/write-confirmation.server");
    state.tables.finn_actions_log!.push({
      id: "row-forged",
      created_at: new Date().toISOString(),
      user_id: "user-1",
      org_id: "org-1",
      action: "chat.write.confirmation_requested",
      input: {
        tool: "sec_create_incident",
        org: "org-1",
        turn: "forged-turn",
        nonce: "forged-nonce",
        args_hash: await writeConfirmationArgsHash(INCIDENT),
        seal: "eyJ2IjoxfQ.AAAA",
        details: "AAAA.AAAA",
      },
    });
    const result = await call(await request(rls, "نعم"), "sec_create_incident", INCIDENT);
    expect(result).toMatchObject({ executed: false, status: "requires_confirmation" });
    expect(rls.writes).toHaveLength(0);
  });

  it("fails closed when the proposal ledger cannot be read or the claim cannot be written", async () => {
    const rls = fakeRls();
    await call(await request(rls, "سجّل بلاغ"), "sec_create_incident", INCIDENT);

    state.fail = { table: "finn_actions_log", op: "select" };
    const unreadable = await call(await request(rls, "نعم"), "sec_create_incident", INCIDENT);
    expect(unreadable).toMatchObject({ executed: false, status: "confirmation_unavailable" });

    state.fail = { table: "finn_actions_log", op: "insert", action: "chat.write.confirmed" };
    const unclaimable = await call(await request(rls, "نعم"), "sec_create_incident", INCIDENT);
    expect(unclaimable).toMatchObject({ executed: false, status: "confirmation_unavailable" });

    state.fail = { table: "sec_activity_events", op: "select" };
    const noAudit = await call(await request(rls, "نعم"), "sec_create_incident", INCIDENT);
    expect(noAudit).toMatchObject({ executed: false, status: "confirmation_unavailable" });
    expect(rls.writes).toHaveLength(0);
  });

  it("a proposal that cannot be recorded is not shown as confirmable", async () => {
    state.fail = {
      table: "finn_actions_log",
      op: "insert",
      action: "chat.write.confirmation_requested",
    };
    const rls = fakeRls();
    const result = await call(await request(rls, "سجّل بلاغ"), "sec_create_incident", INCIDENT);
    expect(result).toMatchObject({ executed: false, status: "confirmation_unavailable" });
    expect(result).not.toHaveProperty("action_summary");
    expect(rls.writes).toHaveLength(0);
  });

  it("missing secret ⇒ confirmation_unavailable, nothing read or written", async () => {
    const rls = fakeRls();
    await call(await request(rls, "سجّل بلاغ"), "sec_create_incident", INCIDENT);
    vi.stubEnv("SADEED_MESSAGE_APPROVAL_SECRET", "");
    const ledgerBefore = ledger().length;

    for (const text of ["سجّل بلاغ", "نعم"]) {
      const result = await call(await request(rls, text), "sec_create_incident", INCIDENT);
      expect(result).toMatchObject({
        ok: false,
        executed: false,
        status: "confirmation_unavailable",
      });
      expect(result).not.toHaveProperty("action_summary");
    }
    expect(ledger()).toHaveLength(ledgerBefore);
    expect(rls.writes).toHaveLength(0);
  });

  it("role checks still run first: a forbidden user gets no proposal", async () => {
    state.writerRole = false;
    const rls = fakeRls();
    const result = await call(await request(rls, "سجّل بلاغ"), "sec_create_incident", INCIDENT);
    expect(result.ok).toBe(false);
    expect(String(result.error)).toMatch(/^Forbidden/);
    expect(result).not.toHaveProperty("action_summary");
    expect(ledger()).toHaveLength(0);
  });

  it("user-scoped task writes follow the same protocol, durably replay-protected", async () => {
    const rls = fakeRls();
    const task = { title: "مراجعة خطة الإخلاء", priority: "high" };
    const issued = await call(await request(rls, "أضف مهمة", "user-1", null), "create_task", task);
    expect(issued).toMatchObject({ status: "requires_confirmation", executed: false });
    expect(String(issued.action_summary)).toContain("مراجعة خطة الإخلاء");
    expect(rls.writes).toHaveLength(0);
    // بلا مؤسسة: عمود المؤسسة يأخذ افتراضه، والمطابقة بالمستخدم والمؤسسة الفارغة.
    expect(ledger()[0]).toMatchObject({
      user_id: "user-1",
      org_id: "00000000-0000-0000-0000-000000000001",
    });
    expect(JSON.stringify(ledger()[0])).not.toContain("مراجعة");

    const done = await call(await request(rls, "confirm", "user-1", null), "create_task", task);
    expect(done).toMatchObject({ ok: true, executed: true });
    expect((done.task as Record<string, unknown>).id).toBe("tasks-row-1");

    vi.resetModules();
    const replay = await call(await request(rls, "confirm", "user-1", null), "create_task", task);
    expect(replay).toMatchObject({ executed: false, status: "already_executed" });
    expect(businessWrites(rls, "tasks")).toHaveLength(1);
    // أدوات المستخدم لا تكتب في أثر الأمن الصناعي.
    expect(state.tables.sec_activity_events).toHaveLength(0);
  });

  it("a failed write is reported honestly and the next attempt needs a fresh confirmation", async () => {
    const rls = fakeRls();
    let failWrites = true;
    const flaky = {
      ...rls,
      client: {
        from: (table: string) => {
          const chain = rls.client.from(table) as unknown as Record<string, unknown>;
          const single = chain.single as () => Promise<unknown>;
          chain.single = async () =>
            failWrites ? { data: null, error: { message: "row not found" } } : single();
          return chain;
        },
      } as unknown as SupabaseClient,
    };
    const args = { task_id: "22222222-2222-4222-8222-222222222222", status: "done" };
    await call(await request(flaky, "علّم المهمة كمكتملة"), "update_task_status", args);

    const failed = await call(await request(flaky, "نعم"), "update_task_status", args);
    expect(failed).toMatchObject({ ok: false, executed: false, error: "row not found" });
    expect(String(failed.next_step)).toMatch(/fresh summary/);
    expect(ledger("chat.write.failed")[0]).toMatchObject({ status: "error" });

    // «نعم» مرّةً أخرى لا تقول «نُفّذ» ولا تعيد المحاولة بالتأكيد المستهلك: اقتراحٌ جديد.
    failWrites = false;
    const again = await call(await request(flaky, "نعم"), "update_task_status", args);
    expect(again).toMatchObject({
      executed: false,
      status: "requires_confirmation",
      reason: "previous_attempt_failed",
    });
    const done = await call(await request(flaky, "نعم"), "update_task_status", args);
    expect(done).toMatchObject({ ok: true, executed: true });
    expect(ledger("chat.write.executed")).toHaveLength(1);
  });

  it("every write tool is gated; outbound messaging and read tools are unchanged", async () => {
    const { buildSadeedTools } = await loadTools();
    const tools = buildSadeedTools(fakeRls().client, "user-1", {
      agentsAvailable: true,
    }) as unknown as Record<
      string,
      { description?: string; inputSchema: Parameters<typeof asSchema>[0] }
    >;
    const gated = [
      "create_task",
      "update_task_status",
      "record_executive_decision",
      "create_intelligence_alert",
      "sec_create_incident",
      "sec_update_incident",
      "sec_create_work_order",
      "sec_close_work_order",
      "sec_create_permit",
      "sec_decide_permit",
      "sec_schedule_patrol",
      "sec_register_visitor",
      "sec_checkout_visitor",
      "sec_triage_cctv_alert",
      "dispatch_agent",
    ];
    const properties = async (name: string) =>
      Object.keys(
        (
          (await asSchema(tools[name]!.inputSchema).jsonSchema) as {
            properties?: Record<string, unknown>;
          }
        ).properties ?? {},
      );
    for (const name of gated) {
      const description = tools[name]!.description ?? "";
      expect(description, name).toContain("human confirmation gate");
      expect(description, name).toContain("executed:true");
      // النموذج لا يحمل رمزًا بين الطلبات.
      expect(await properties(name), name).not.toContain("confirmation_token");
    }
    for (const name of [
      "send_executive_email",
      "send_executive_sms",
      "generate_image",
      "sec_list_incidents",
      "query_tasks",
      "execution_status",
    ]) {
      expect(tools[name]!.description ?? "", name).not.toContain("human confirmation gate");
    }
  });
});

// ── من طرفٍ إلى طرف عبر AI SDK الحقيقي: طلبان منفصلان، والسجلّ نصٌّ وحده ──
describe("two real chat requests through convertToModelMessages + generateText", () => {
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };
  type Prompt = Array<{ role: string; content: unknown }>;

  /** آخر نتيجة أداة في المطالبة التي يراها النموذج. */
  function lastToolResult(prompt: Prompt): Record<string, unknown> | null {
    for (let i = prompt.length - 1; i >= 0; i--) {
      const message = prompt[i]!;
      if (message.role !== "tool" || !Array.isArray(message.content)) continue;
      const part = (message.content as Array<Record<string, unknown>>).at(-1);
      const output = part?.output as { type?: string; value?: unknown } | undefined;
      if (output?.type === "json") return output.value as Record<string, unknown>;
    }
    return null;
  }

  /** نموذجٌ مُبرمَج: كل خطوة تقرأ المطالبة وتقرّر — كما يفعل نموذجٌ حقيقي. */
  function scriptedModel(steps: Array<(prompt: Prompt) => unknown>, prompts: string[]) {
    let step = 0;
    return new MockLanguageModelV3({
      doGenerate: async (options) => {
        const prompt = options.prompt as unknown as Prompt;
        prompts.push(JSON.stringify(prompt));
        const next = steps[Math.min(step, steps.length - 1)]!;
        step += 1;
        const out = next(prompt) as { tool?: string; input?: unknown; text?: string };
        if (out.tool) {
          return {
            content: [
              {
                type: "tool-call" as const,
                toolCallId: `tc-${step}`,
                toolName: out.tool,
                input: JSON.stringify(out.input),
              },
            ],
            finishReason: { unified: "tool-calls" as const, raw: undefined },
            usage,
            warnings: [],
          };
        }
        return {
          content: [{ type: "text" as const, text: out.text ?? "" }],
          finishReason: { unified: "stop" as const, raw: undefined },
          usage,
          warnings: [],
        };
      },
    });
  }

  /**
   * ما يحمله العميل ويعيده: نصوصٌ وحدها — المسار لا يبثّ إلا النصّ الآمن،
   * و`sanitizeHistory` في `chat.ts` يُسقط ما سوى `text`/`file` على أي حال.
   */
  function clientHistory(messages: Array<{ role: "user" | "assistant"; text: string }>) {
    return messages.map((m, i): UIMessage => ({
      id: `m-${i}`,
      role: m.role,
      parts: [{ type: "text", text: m.text }],
    }));
  }

  async function chatRequest(
    rls: ReturnType<typeof fakeRls>,
    history: UIMessage[],
    model: MockLanguageModelV3,
  ) {
    const lastUser = [...history].reverse().find((m) => m.role === "user")!;
    const lastUserText = lastUser.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("")
      .trim();
    const tools = await request(rls, lastUserText);
    const messages = await convertToModelMessages(history, {
      tools,
      ignoreIncompleteToolCalls: true,
    });
    return generateText({ model, messages, tools, toolChoice: "auto", stopWhen: stepCountIs(6) });
  }

  it("proposes in request 1 and executes once in request 2, with no token crossing the boundary", async () => {
    const rls = fakeRls();
    const prompts1: string[] = [];
    const first = await chatRequest(
      rls,
      clientHistory([{ role: "user", text: "سجّل بلاغ حريق في البوابة الشمالية" }]),
      scriptedModel(
        [
          () => ({ tool: "sec_create_incident", input: INCIDENT }),
          (prompt) => {
            const result = lastToolResult(prompt);
            return { text: `سأسجّل: ${String(result?.action_summary)}. هل تؤكّد؟` };
          },
        ],
        prompts1,
      ),
    );
    expect(first.text).toContain("هل تؤكّد؟");
    expect(rls.writes).toHaveLength(0);

    // الطلب الثاني: النموذج يعيد بناء الوسائط من السياق بصياغةٍ أخرى.
    const prompts2: string[] = [];
    const second = await chatRequest(
      rls,
      clientHistory([
        { role: "user", text: "سجّل بلاغ حريق في البوابة الشمالية" },
        { role: "assistant", text: first.text },
        { role: "user", text: "نعم" },
      ]),
      scriptedModel(
        [
          () => ({
            tool: "sec_create_incident",
            input: { ...INCIDENT, title_ar: "حريق بالبوابة الشمالية" },
          }),
          (prompt) => {
            const result = lastToolResult(prompt);
            if (result?.status !== "confirmed_arguments_differ") return { text: "تعذّر" };
            const [proposal] = result.confirmed_proposals as Array<{ arguments: unknown }>;
            return { tool: "sec_create_incident", input: proposal!.arguments };
          },
          (prompt) => ({
            text: lastToolResult(prompt)?.executed === true ? "سُجّل البلاغ." : "لم يُنفَّذ.",
          }),
        ],
        prompts2,
      ),
    );

    expect(second.text).toBe("سُجّل البلاغ.");
    const inserts = businessWrites(rls, "sec_incidents");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]!.values).toMatchObject({ title_ar: INCIDENT.title_ar });
    // لا شيء من ختم الاقتراح ولا رمزٌ في أي مطالبة رآها النموذج.
    const seal = String((ledger("chat.write.confirmation_requested")[0]!.input as Row).seal);
    for (const prompt of [...prompts1, ...prompts2]) {
      expect(prompt).not.toContain(seal.split(".")[1]);
      expect(prompt).not.toContain("confirmation_token");
    }
  });
});

describe("execution_status chat tool", () => {
  it("reads agent runs and active tool executions through the caller's client", async () => {
    const { buildSadeedTools } = await loadTools();
    const rls = fakeRls({
      agent_runs: {
        data: [{ id: "run-1", agent_id: "risk", status: "running", started_at: "t0" }],
        error: null,
      },
      tool_executions: {
        data: [{ id: "exec-1", tool_id: "sec.patrol", status: "queued", created_at: "t1" }],
        error: null,
      },
    });
    const result = await call(
      buildSadeedTools(rls.client, "user-1", { orgId: "org-1" }),
      "execution_status",
      {},
    );
    expect(result).toMatchObject({
      ok: true,
      org_id: "org-1",
      agent_runs: [{ id: "run-1", status: "running", finished_at: null }],
      active_tool_executions: [{ id: "exec-1", status: "queued" }],
    });
    expect(rls.writes).toHaveLength(0);
  });

  it("returns the database error honestly", async () => {
    const { buildSadeedTools } = await loadTools();
    const rls = fakeRls({ agent_runs: { data: null, error: { message: "permission denied" } } });
    const result = await call(
      buildSadeedTools(rls.client, "user-1", { orgId: "org-1" }),
      "execution_status",
      {},
    );
    expect(result).toEqual({ ok: false, error: "agent_runs: permission denied" });
  });

  it("fails closed without a verified org", async () => {
    const { buildSadeedTools } = await loadTools();
    const result = await call(
      buildSadeedTools(fakeRls().client, "user-1", { orgId: null }),
      "execution_status",
      {},
    );
    expect(result).toMatchObject({ ok: false, error: "missing_org_context" });
  });
});

// ── FINN → الوكلاء (RT-10): الأداة الخامسة عشرة خلف البوابة نفسها ──────────────
describe("dispatch_agent — the chat can start an agent run, behind the same gate", () => {
  it("step 1 proposes with a readable summary and starts no run", async () => {
    const rls = fakeRls();
    const result = await call(
      await request(rls, "شغّل وكيل الإحاطات على بلاغات البوابة الشمالية"),
      "dispatch_agent",
      DISPATCH,
    );
    expect(result).toMatchObject({ ok: false, executed: false, status: "requires_confirmation" });
    expect(String(result.action_summary)).toBe(
      "تشغيل الوكيل «وكيل الإحاطات» على: «أعدّ إحاطة الصباح عن بلاغات البوابة الشمالية»",
    );
    expect(state.agentRuns).toHaveLength(0);
    expect(rls.writes).toHaveLength(0);
    expect(ledger("chat.write.confirmation_requested")).toHaveLength(1);
  });

  it("step 2 (explicit confirmation) starts exactly one run on the user's identity and verified org", async () => {
    const rls = fakeRls();
    await call(await request(rls, "شغّل وكيل الإحاطات"), "dispatch_agent", DISPATCH);
    const done = await call(await request(rls, "نعم"), "dispatch_agent", DISPATCH);
    expect(done).toMatchObject({
      ok: true,
      executed: true,
      run: { id: "run-0001", status: "succeeded", summary: "أُعدّت الإحاطة.", steps: 2 },
    });
    expect(state.agentRuns).toHaveLength(1);
    const { client, params } = state.agentRuns[0]!;
    // عميل المستخدم (RLS) للمنفّذين — كما `runAgentFn`، لا مفتاح الخدمة.
    expect(client).toBe(rls.client);
    expect(params).toMatchObject({
      agentId: "briefing",
      actorId: "user-1",
      requiredOrgId: "org-1",
      goalOverride: DISPATCH.goal,
    });
    expect(params.signal).toBeInstanceOf(AbortSignal);
    // الأثر يسمّي التشغيل الذي بدأ.
    expect(ledger("chat.write.executed")[0]!.output).toMatchObject({
      executed: true,
      entity: { kind: "run", id: "run-0001" },
    });
    // وإعادة «نعم» لا تشغّل ثانيةً.
    const replay = await call(await request(rls, "نعم"), "dispatch_agent", DISPATCH);
    expect(replay).toMatchObject({ executed: false, status: "already_executed" });
    expect(state.agentRuns).toHaveLength(1);
  });

  it("no proposal for a missing org, a disabled or unknown agent, or an actor without the agent's role", async () => {
    const rls = fakeRls();
    const noOrg = await call(
      await request(rls, "شغّل وكيل الإحاطات", "user-1", null),
      "dispatch_agent",
      DISPATCH,
    );
    expect(noOrg).toMatchObject({ ok: false, error: "missing_org_context" });

    state.tables.agent_definitions = [{ ...BRIEFING_AGENT, enabled: false }];
    const disabled = await call(await request(rls, "شغّل"), "dispatch_agent", DISPATCH);
    expect(disabled).toMatchObject({ ok: false, error: "agent_disabled" });

    state.tables.agent_definitions = [{ ...BRIEFING_AGENT, org_id: "org-2" }];
    const otherOrg = await call(await request(rls, "شغّل"), "dispatch_agent", DISPATCH);
    expect(otherOrg).toMatchObject({ ok: false, error: "agent_not_found" });

    state.tables.agent_definitions = [BRIEFING_AGENT];
    state.writerRole = false;
    const noRole = await call(await request(rls, "شغّل"), "dispatch_agent", DISPATCH);
    expect(String(noRole.error)).toMatch(/Forbidden: missing role for agent briefing/);

    expect(state.agentRuns).toHaveLength(0);
    expect(ledger()).toHaveLength(0);
    expect(rls.writes).toHaveLength(0);
  });

  it("the summary shows the goal in full (no clipping) and the schema caps it at 500 chars", async () => {
    const goal = `أعدّ إحاطة مفصّلة عن ${"بلاغات البوابة الشمالية و".repeat(17)}الحراسة الليلية`;
    expect(goal.length).toBeGreaterThan(400);
    expect(goal.length).toBeLessThanOrEqual(500);
    const rls = fakeRls();
    const tools = await request(rls, "شغّل وكيل الإحاطات");
    const result = await call(tools, "dispatch_agent", { agentId: "briefing", goal });
    expect(result).toMatchObject({ status: "requires_confirmation" });
    expect(String(result.action_summary)).toBe(`تشغيل الوكيل «وكيل الإحاطات» على: «${goal}»`);
    const schema = (
      tools as unknown as Record<
        string,
        { inputSchema: { safeParse: (v: unknown) => { success: boolean } } }
      >
    ).dispatch_agent!.inputSchema;
    expect(schema.safeParse({ agentId: "briefing", goal: "x".repeat(501) }).success).toBe(false);
    expect(schema.safeParse({ agentId: "briefing", goal: "x".repeat(500) }).success).toBe(true);
  });

  it("when the turn budget aborts, the run's real cancelled outcome is returned (grace), with the follow-up note", async () => {
    state.runAgentBehaviour = "cancel-on-abort";
    const rls = fakeRls();
    await call(await request(rls, "شغّل وكيل الإحاطات"), "dispatch_agent", DISPATCH);
    const turn = new AbortController();
    const tools = await request(rls, "نعم");
    const t = tools.dispatch_agent as unknown as {
      execute: (a: unknown, o: unknown) => Promise<unknown>;
    };
    const pending = t.execute(DISPATCH, {
      toolCallId: "call-dispatch",
      messages: [],
      abortSignal: turn.signal,
    });
    await new Promise((r) => setTimeout(r, 20));
    turn.abort();
    const done = (await pending) as ToolResult;
    expect(done).toMatchObject({
      ok: true,
      executed: true,
      run: {
        id: "run-0002",
        status: "cancelled",
        note: "انتهت مهلة الدور؛ تابع بـexecution_status",
      },
    });
    expect(state.agentRuns).toHaveLength(1);
    expect((state.agentRuns[0]!.params.signal as AbortSignal).aborted).toBe(true);
  });

  it("and only if the run never answers within the grace does it report running + the note", async () => {
    state.runAgentBehaviour = "never";
    const rls = fakeRls();
    await call(await request(rls, "شغّل وكيل الإحاطات"), "dispatch_agent", DISPATCH);
    const turn = new AbortController();
    const t = (await request(rls, "نعم")).dispatch_agent as unknown as {
      execute: (a: unknown, o: unknown) => Promise<unknown>;
    };
    const pending = t.execute(DISPATCH, {
      toolCallId: "call-dispatch",
      messages: [],
      abortSignal: turn.signal,
    });
    await new Promise((r) => setTimeout(r, 20));
    const started = Date.now();
    turn.abort();
    const done = (await pending) as ToolResult;
    expect(Date.now() - started).toBeGreaterThanOrEqual(2_900);
    expect(done).toMatchObject({
      ok: true,
      run: { id: null, status: "running", note: "انتهت مهلة الدور؛ تابع بـexecution_status" },
    });
  }, 15_000);

  it("the tool is absent when agents are unavailable (non-Gemini plan) — and by default", async () => {
    const { buildSadeedTools } = await loadTools();
    const off = buildSadeedTools(fakeRls().client, "user-1", {
      orgId: "org-1",
      agentsAvailable: false,
    }) as Record<string, unknown>;
    expect(off.dispatch_agent).toBeUndefined();
    const dflt = buildSadeedTools(fakeRls().client, "user-1", { orgId: "org-1" }) as Record<
      string,
      unknown
    >;
    expect(dflt.dispatch_agent).toBeUndefined();
    const on = buildSadeedTools(fakeRls().client, "user-1", {
      orgId: "org-1",
      agentsAvailable: true,
    }) as Record<string, unknown>;
    expect(on.dispatch_agent).toBeDefined();
    expect(on.execution_status).toBeDefined();
  });

  it("the description says the run spends a chat quota unit and how to follow up", async () => {
    const tools = (await request(fakeRls(), "x")) as unknown as Record<
      string,
      { description?: string }
    >;
    expect(tools.dispatch_agent!.description).toMatch(/one chat AI-quota unit/);
    expect(tools.dispatch_agent!.description).toMatch(/execution_status/);
    expect(tools.dispatch_agent!.description).toMatch(/status cancelled\) is returned/);
    expect(tools.dispatch_agent!.description).toMatch(/run\.status running with a note/);
  });
});

// ── الملخّص يُعرض ويُنطق (المادة ٢٢ §٥): لا معرّف، ولا ISO، ولا تعدادٌ إنجليزي ──
describe("action summaries — readable on screen and in the SADEED voice", () => {
  const EXISTING = {
    task: "3f2e1d0c-9b8a-4765-8432-10fedcba9876",
    incident: "4a3b2c1d-0e9f-4a8b-9c7d-6e5f4a3b2c1d",
    workOrder: "6c5b4a39-2817-4f6e-8d5c-4b3a29180f7e",
    permit: "8e7d6c5b-4a39-4281-8f0e-9d8c7b6a5948",
    visitor: "9f8e7d6c-5b4a-4392-8a1b-0c9d8e7f6a5b",
    cctv: "1b2c3d4e-5f60-4718-8293-a4b5c6d7e8f9",
  };
  /** الأدوات الخمس عشرة بوسائط واقعية: معرّفات UUID، ومواعيد ISO بتوقيت UTC، وتعدادات إنجليزية. */
  const CASES: Array<{ tool: string; args: Row }> = [
    {
      tool: "create_task",
      args: { title: "مراجعة خطة الإخلاء", priority: "high", due_at: "2026-10-25T09:00:00Z" },
    },
    { tool: "update_task_status", args: { task_id: EXISTING.task, status: "done" } },
    {
      tool: "record_executive_decision",
      args: {
        title: "اعتماد ميزانية تحديث كاميرات البوابات",
        kind: "decision",
        owner: "إدارة الأمن الصناعي",
        impact: "high",
      },
    },
    {
      tool: "create_intelligence_alert",
      args: {
        title: "تكرار محاولات دخول غير مصرّح عند البوابة الشرقية",
        severity: "high",
        business_impact_score: 70,
      },
    },
    { tool: "sec_create_incident", args: INCIDENT },
    {
      tool: "sec_update_incident",
      args: { id: EXISTING.incident, status: "investigating", priority: "high" },
    },
    {
      tool: "sec_create_work_order",
      args: {
        title_ar: "إصلاح كاميرا البوابة الشمالية",
        kind: "corrective",
        priority: "high",
        asset_kind: "camera",
        source_incident_id: EXISTING.incident,
      },
    },
    {
      tool: "sec_close_work_order",
      args: { id: EXISTING.workOrder, completion_notes: "استُبدلت الكاميرا واختُبر البث" },
    },
    {
      tool: "sec_create_permit",
      args: {
        work_type: "hot-work",
        contractor: "مقاول الصيانة الميكانيكية",
        risk_level: "high",
        starts_at: "2026-10-20T06:00:00Z",
        ends_at: "2026-10-20T14:00:00Z",
      },
    },
    {
      tool: "sec_decide_permit",
      args: { id: EXISTING.permit, decision: "approved", note: "استوفى متطلبات السلامة" },
    },
    {
      tool: "sec_schedule_patrol",
      args: { team: "الفريق أ", route: "السور الشرقي", checkpoints_total: 10 },
    },
    {
      tool: "sec_register_visitor",
      args: { full_name: "زائر وفد المقاول", host: "إدارة المشاريع", organization: "شركة المقاول" },
    },
    { tool: "sec_checkout_visitor", args: { id: EXISTING.visitor } },
    {
      tool: "sec_triage_cctv_alert",
      args: { id: EXISTING.cctv, status: "dispatched", notes: "أُرسل فريق الاستجابة" },
    },
    { tool: "dispatch_agent", args: DISPATCH },
  ];
  /** وصف السجلات القائمة كما يعيده عميل الطلب (تحت RLS). */
  const LABEL_ROWS: Record<string, { data: unknown; error: unknown }> = {
    tasks: { data: [{ title: "مراجعة خطة الإخلاء" }], error: null },
    sec_incidents: { data: [{ title_ar: "حريق في البوابة الشمالية" }], error: null },
    sec_work_orders: { data: [{ title_ar: "إصلاح كاميرا البوابة الشمالية" }], error: null },
    sec_permits: {
      data: [{ work_type: "hot_work", contractor: "مقاول الصيانة الميكانيكية" }],
      error: null,
    },
    sec_visitors: { data: [{ full_name: "زائر وفد المقاول" }], error: null },
    sec_cctv_alerts: { data: [{ alert_type: "intrusion", camera_code: "CAM-N-01" }], error: null },
  };
  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const ISO = /\d{4}-\d{2}-\d{2}T|\dZ\b/;
  /** قيم التعداد التي تترجمها خرائط الأدوات — لا تُطبع ولا تُنطق إنجليزية وسط العربية. */
  const ENUM_WORDS =
    /\b(?:low|medium|high|critical|todo|in_progress|done|blocked|decision|commitment|milestone|risk|opportunity|open|investigating|contained|resolved|closed|triaged|dispatched|false_positive|preventive|corrective|approved|rejected|intrusion|fire|leak|access|theft|safety|other|camera|cctv|gate|sensor|fence|fire[-_]system|hot[-_]work|confined[-_]space|electrical|height|excavation|general)\b/i;
  /** رمز الكاميرا مرجعها المعروض في شاشتها — الحرف اللاتيني الوحيد المسموح. */
  const CAMERA_CODE = /CAM-N-(?:01|واحد)/g;

  async function firstSummaries(
    readResults: Record<string, { data: unknown; error: unknown }>,
  ): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const c of CASES) {
      const result = await call(await request(fakeRls(readResults), "طلب"), c.tool, c.args);
      expect(result, c.tool).toMatchObject({ executed: false, status: "requires_confirmation" });
      out[c.tool] = String(result.action_summary);
    }
    return out;
  }

  function expectSpeakable(tool: string, summary: string) {
    const spoken = toSadeedSpeechText(summary);
    for (const [form, text] of [
      ["shown", summary],
      ["spoken", spoken],
    ] as const) {
      const where = `${tool} (${form}): ${text}`;
      expect(text, where).not.toMatch(UUID);
      expect(text, where).not.toMatch(ISO);
      expect(text, where).not.toMatch(ENUM_WORDS);
      // الأسهم تصل الصوت حرفًا (نقض المدقّق، المادة ٢٢ النطق).
      expect(text, where).not.toMatch(/[←→]/);
      expect(text.replace(CAMERA_CODE, ""), where).not.toMatch(/[A-Za-z]/);
      expect(hasForbiddenFiller(text), where).toBe(false);
      expect(text.split("\n").length, where).toBeLessThanOrEqual(2);
    }
  }

  it("all fifteen first-call summaries carry no raw id, no ISO time and no English enum — shown or spoken", async () => {
    expect(new Set(CASES.map((c) => c.tool)).size).toBe(15);
    const summaries = await firstSummaries(LABEL_ROWS);
    for (const [tool, summary] of Object.entries(summaries)) expectSpeakable(tool, summary);

    // الهدف يُسمّى من صفّه، لا من معرّفه.
    expect(summaries.update_task_status).toBe(
      "تغيير حالة المهمة «مراجعة خطة الإخلاء» إلى «مكتملة»",
    );
    expect(summaries.sec_update_incident).toBe(
      "تحديث البلاغ «حريق في البوابة الشمالية»: الحالة إلى «قيد التحقيق» — الأولوية إلى عالية",
    );
    expect(summaries.sec_create_work_order).toContain("— الأصل: كاميرا —");
    expect(summaries.sec_create_work_order).toContain("مرتبط بالبلاغ «حريق في البوابة الشمالية»");
    expect(summaries.sec_close_work_order).toMatch(
      /^إغلاق أمر العمل «إصلاح كاميرا البوابة الشمالية» /,
    );
    expect(summaries.sec_decide_permit).toBe(
      "اعتماد تصريح العمل (عمل ساخن) للمقاول «مقاول الصيانة الميكانيكية» — ملاحظة: «استوفى متطلبات السلامة»",
    );
    expect(summaries.sec_checkout_visitor).toBe("تسجيل خروج الزائر «زائر وفد المقاول»");
    expect(summaries.sec_triage_cctv_alert).toMatch(
      /^فرز تنبيه «تسلل» من الكاميرا CAM-N-01 إلى «أُرسلت له استجابة»/,
    );

    // المواعيد بتوقيت مكة المكرمة (06:00Z هي التاسعة صباحًا)، وتُقال كذلك.
    expect(summaries.create_task).toContain(
      "الاستحقاق: 25 أكتوبر 2026، 12:00 مساءً بتوقيت مكة المكرمة",
    );
    expect(summaries.sec_create_permit).toBe(
      "إنشاء تصريح عمل (عمل ساخن) للمقاول «مقاول الصيانة الميكانيكية» — مستوى الخطر: عالٍ — من 20 أكتوبر 2026، 9:00 صباحًا إلى 5:00 مساءً بتوقيت مكة المكرمة",
    );
    const spokenPermit = toSadeedSpeechText(summaries.sec_create_permit!);
    expect(spokenPermit).toContain("التاسعة تمامًا صباحًا");
    expect(spokenPermit).toContain("الخامسة تمامًا مساءً");

    // الصفة توافق موصوفها: الأثر ومستوى الخطر مذكّران، والأولوية والخطورة مؤنّثتان.
    expect(summaries.record_executive_decision).toContain("الأثر: عالٍ");
    expect(summaries.sec_create_incident).toContain(
      "الفئة: حريق — الخطورة: عالية — الأولوية: متوسطة",
    );
    expect(summaries.create_intelligence_alert).toContain(
      "الخطورة: عالية — أثر الأعمال: 70 من 100",
    );
  });

  it("an unreadable or empty record falls back to a neutral phrase — never the id", async () => {
    const denied = { data: null, error: { message: "permission denied" } };
    const unreadable = Object.fromEntries(Object.keys(LABEL_ROWS).map((table) => [table, denied]));
    for (const reads of [unreadable, {}]) {
      const summaries = await firstSummaries(reads);
      for (const [tool, summary] of Object.entries(summaries)) expectSpeakable(tool, summary);
      expect(summaries.update_task_status).toBe("تغيير حالة المهمة المحدّدة إلى «مكتملة»");
      expect(summaries.sec_update_incident).toMatch(/^تحديث البلاغ المحدّد: /);
      expect(summaries.sec_create_work_order).toContain("مرتبط بالبلاغ المحدّد");
      expect(summaries.sec_close_work_order).toMatch(/^إغلاق أمر العمل المحدّد /);
      expect(summaries.sec_decide_permit).toMatch(/^اعتماد تصريح العمل المحدّد — /);
      expect(summaries.sec_checkout_visitor).toBe("تسجيل خروج الزائر المحدّد");
      expect(summaries.sec_triage_cctv_alert).toMatch(/^فرز تنبيه الكاميرا المحدّد إلى /);
    }
  });

  it("a label read that never answers falls back after its deadline — the proposal never hangs and never shows the id", async () => {
    // قراءةٌ لا تجيب أبدًا (طبقة «المسجَّل لا يعلق»): بلا مهلة `describeExisting` كان الاقتراح
    // يعلق حتى مهلة الدور كلّها. نقض الحارس على 25ca8297 — فحصٌ يحمرّ إن أُزيل السباق.
    const base = fakeRls(LABEL_ROWS);
    const hanging = {
      ...base,
      client: {
        from(table: string) {
          const chain = base.client.from(table) as unknown as Record<string, unknown>;
          if (table === "sec_visitors") chain.then = () => new Promise(() => {});
          return chain;
        },
      } as unknown as SupabaseClient,
    };
    const started = Date.now();
    const proposed = await call(
      await request(hanging, "سجّل خروج الزائر"),
      "sec_checkout_visitor",
      { id: EXISTING.visitor },
    );
    expect(proposed).toMatchObject({ executed: false, status: "requires_confirmation" });
    expect(proposed.action_summary).toBe("تسجيل خروج الزائر المحدّد");
    expect(Date.now() - started).toBeGreaterThanOrEqual(1_400);
  }, 10_000);

  it("the record is read for the proposal only: confirming reads nothing and executes the same arguments", async () => {
    const reads: string[] = [];
    const counted = new Proxy(LABEL_ROWS, {
      get(target, table: string) {
        reads.push(table);
        return target[table];
      },
    });
    const rls = fakeRls(counted);
    const visitor = { id: EXISTING.visitor };
    const proposed = await call(
      await request(rls, "سجّل خروج الزائر"),
      "sec_checkout_visitor",
      visitor,
    );
    expect(proposed.action_summary).toBe("تسجيل خروج الزائر «زائر وفد المقاول»");
    expect(reads).toEqual(["sec_visitors"]);
    expect(rls.writes).toHaveLength(0);

    const done = await call(await request(rls, "نعم"), "sec_checkout_visitor", visitor);
    expect(done).toMatchObject({ ok: true, executed: true });
    expect(reads).toEqual(["sec_visitors"]);
    expect(businessWrites(rls, "sec_visitors")).toHaveLength(1);
  });

  it("an unreadable date is omitted, not printed; free text the user typed stays as typed", async () => {
    const task = await call(await request(fakeRls(), "أضف مهمة"), "create_task", {
      title: "مراجعة خطة الإخلاء",
      priority: "low",
      due_at: "غدًا صباحًا",
    });
    expect(task.action_summary).toBe("إنشاء مهمة «مراجعة خطة الإخلاء» — الأولوية: منخفضة");

    const permit = await call(await request(fakeRls(), "أصدر تصريحًا"), "sec_create_permit", {
      work_type: "Hot Work",
      contractor: "مقاول الصيانة",
      risk_level: "critical",
      starts_at: "2026-10-20T21:30:00Z",
      ends_at: "not-a-date",
    });
    expect(permit.action_summary).toBe(
      "إنشاء تصريح عمل (عمل ساخن) للمقاول «مقاول الصيانة» — مستوى الخطر: حرج — من 21 أكتوبر 2026، 12:30 صباحًا بتوقيت مكة المكرمة",
    );

    const incident = await call(await request(fakeRls(), "سجّل بلاغ"), "sec_create_incident", {
      ...INCIDENT,
      category: "تسرّب زيت من المضخة",
    });
    expect(String(incident.action_summary)).toContain("الفئة: تسرّب زيت من المضخة —");
  });
});
