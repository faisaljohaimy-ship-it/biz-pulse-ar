// @vitest-environment node
/**
 * قياس بوابة التأكيد البشري: كم أداةً من أدوات الكتابة الخمس عشرة في دردشة
 * سَدِيد تكتب كتابةً تشغيلية في **نداءها الأول** (بلا أي تأكيد سابق)؟
 *
 * الملف نفسه يُشغَّل على الشجرة الحالية وعلى ما قبل البوابة (3bec5e5) ليعطي
 * رقمَي «قبل/بعد» من الكود لا من التقدير؛ لذلك لا يستورد وحدة التأكيد ولا
 * يحاكيها — يحاكي ما بين الأدوات والقاعدة فقط (عميلا القاعدة، الأدوار،
 * المراسلة الصادرة، محدّد المعدّل)، و`fetch` يرمي: أي نداء شبكة هنا خطأ.
 *
 * التصنيف:
 * - عميل الطلب (RLS): كل insert/update/upsert/delete — عدا `finn_actions_log` —
 *   كتابةٌ تشغيلية.
 * - عميل الخدمة: `finn_actions_log` سجلّ اقتراحات التأكيد (ليس تشغيليًّا)،
 *   و`sec_activity_events` أثرٌ تدقيقي يُعدّ منفصلًا، وما سواهما تشغيلي.
 *
 * كل أداة تُنادى مرّةً واحدة في طلبٍ جديد، بوسائط تجتاز مخطّطها (zod) فعلًا،
 * بأدوارٍ ممنوحة ومؤسسةٍ قائمة، ورسالة المستخدم طلبٌ عاديّ لا تأكيد. أدوات
 * التحديث والإغلاق تُعطى معرّفًا قائمًا، والقراءات تعيد صفًّا له `id` — فيبلغ
 * المسار القديم كتابته. صفّ أمر العمل مرتبطٌ ببلاغ (`source_incident_id`) فيُقاس
 * أيضًا التحديث الملحق الذي يحوّل البلاغ إلى «محتوى».
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const SECRET = "measure-secret-that-is-longer-than-thirty-two-characters";
const USER_ID = "7a1c0f3e-5b2d-4c8e-9f10-2a3b4c5d6e7f";
const ORG_ID = "0b9e8d7c-6a5f-4e3d-8c2b-1a0f9e8d7c6b";
const LINKED_INCIDENT_ID = "5e4d3c2b-1a09-4f8e-8d7c-6b5a49382716";

type Row = Record<string, unknown>;
type WriteOp = "insert" | "update" | "upsert" | "delete";

const state = vi.hoisted(() => ({
  orgId: null as string | null,
  /** جداول عميل الخدمة — تُنشأ عند أول لمس. */
  tables: {} as Record<string, Array<Record<string, unknown>>>,
  /** كل كتابة عبر عميل الخدمة، بجدولها وعمليتها. */
  adminWrites: [] as Array<{ table: string; op: string }>,
  seq: 0,
}));

vi.mock("@/lib/authz.server", () => ({
  getCurrentOrgIdForUser: async () => state.orgId,
  hasAnyPlatformRole: async () => true,
  hasPlatformRole: async () => true,
}));

/** عميل خدمة وهمي عامّ فوق مصفوفات: يسجّل كل كتابة ويجيب القراءات بالترشيح. */
vi.mock("@/integrations/supabase/client.server", () => {
  type AdminRow = Record<string, unknown>;
  const admin = {
    from(table: string) {
      const rows = (state.tables[table] ??= []);
      const filters: Array<(row: AdminRow) => boolean> = [];
      const orders: Array<[string, boolean]> = [];
      let limitN = Number.POSITIVE_INFINITY;
      let written: AdminRow | null = null;
      let op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
      const store = (values: AdminRow | AdminRow[]) => {
        for (const value of Array.isArray(values) ? values : [values]) {
          state.seq += 1;
          written = {
            id: `admin-row-${String(state.seq).padStart(4, "0")}`,
            created_at: new Date(Date.now() + state.seq).toISOString(),
            ...value,
          };
          rows.push(written);
        }
      };
      const result = () => {
        if (op !== "select") return { data: written, error: null };
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
        insert(values: AdminRow | AdminRow[]) {
          op = "insert";
          state.adminWrites.push({ table, op });
          store(values);
          return query;
        },
        upsert(values: AdminRow | AdminRow[]) {
          op = "upsert";
          state.adminWrites.push({ table, op });
          store(values);
          return query;
        },
        update(values: AdminRow) {
          op = "update";
          state.adminWrites.push({ table, op });
          written = { ...values };
          return query;
        },
        delete() {
          op = "delete";
          state.adminWrites.push({ table, op });
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
        contains(col: string, value: AdminRow) {
          filters.push((row) =>
            Object.entries(value).every(([k, v]) => (row[col] as AdminRow | undefined)?.[k] === v),
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
        maybeSingle: async () => result(),
        then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
          return Promise.resolve(result()).then(resolve, reject);
        },
      };
      return query;
    },
    storage: {
      from() {
        throw new Error("storage is outside this measurement");
      },
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

/** عميل الطلب (RLS) وهمي: يسجّل كل كتابة، وتعيد قراءاته صفًّا قائمًا له `id`. */
function requestClient() {
  const writes: Array<{ table: string; op: WriteOp }> = [];
  let seq = 0;
  const client = {
    from(table: string) {
      let pending: Row | null = null;
      let wrote = false;
      let idFilter: unknown = null;
      const chain: Record<string, unknown> = {};
      const write = (op: WriteOp) => (values?: unknown) => {
        writes.push({ table, op });
        wrote = true;
        pending = values && typeof values === "object" ? (values as Row) : null;
        return chain;
      };
      chain.insert = write("insert");
      chain.update = write("update");
      chain.upsert = write("upsert");
      chain.delete = write("delete");
      chain.eq = (col: string, value: unknown) => {
        if (col === "id") idFilter = value;
        return chain;
      };
      for (const method of ["select", "in", "neq", "gte", "lte", "or", "order", "limit", "is"]) {
        chain[method] = () => chain;
      }
      const row = (): Row => {
        seq += 1;
        return {
          id: typeof idFilter === "string" ? idFilter : `${table}-row-${seq}`,
          ref: `REF-${seq}`,
          full_name: "زائر وفد المقاول",
          camera_code: "CAM-N-01",
          source_incident_id: table === "sec_work_orders" ? LINKED_INCIDENT_ID : null,
          ...(pending ?? {}),
        };
      };
      chain.single = async () => ({ data: row(), error: null });
      chain.maybeSingle = chain.single;
      chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(wrote ? { data: null, error: null } : { data: [row()], error: null }).then(
          resolve,
          reject,
        );
      return chain;
    },
    rpc: async () => ({ data: null, error: null }),
  };
  return { client: client as unknown as SupabaseClient, writes };
}

const EXISTING = {
  task: "3f2e1d0c-9b8a-4765-8432-10fedcba9876",
  incident: "4a3b2c1d-0e9f-4a8b-9c7d-6e5f4a3b2c1d",
  workOrder: "6c5b4a39-2817-4f6e-8d5c-4b3a29180f7e",
  permit: "8e7d6c5b-4a39-4281-8f0e-9d8c7b6a5948",
  visitor: "9f8e7d6c-5b4a-4392-8a1b-0c9d8e7f6a5b",
  cctv: "1b2c3d4e-5f60-4718-8293-a4b5c6d7e8f9",
};

/** الأدوات الخمس عشرة، بطلبٍ عاديّ ووسائط واقعية لكلٍّ منها. */
const CASES: Array<{
  tool: string;
  request: string;
  args: Row;
  adminRows?: Record<string, Row[]>;
}> = [
  {
    tool: "create_task",
    request: "أضف مهمة لمراجعة خطة الإخلاء قبل نهاية الأسبوع",
    args: {
      title: "مراجعة خطة الإخلاء",
      priority: "high",
      due_at: "2026-10-25T09:00:00Z",
    },
  },
  {
    tool: "update_task_status",
    request: "علّم مهمة مراجعة خطة الإخلاء كمكتملة",
    args: { task_id: EXISTING.task, status: "done" },
  },
  {
    tool: "record_executive_decision",
    request: "سجّل قرار اعتماد ميزانية تحديث كاميرات البوابات",
    args: {
      title: "اعتماد ميزانية تحديث كاميرات البوابات",
      kind: "decision",
      owner: "إدارة الأمن الصناعي",
      impact: "high",
    },
  },
  {
    tool: "create_intelligence_alert",
    request: "ارفع تنبيهًا عن تكرار محاولات الدخول عند البوابة الشرقية",
    args: {
      title: "تكرار محاولات دخول غير مصرّح عند البوابة الشرقية",
      severity: "high",
      business_impact_score: 70,
      summary: "ثلاث محاولات خلال ٢٤ ساعة رصدتها بطاقات الدخول",
    },
  },
  {
    tool: "sec_create_incident",
    request: "سجّل بلاغ حريق في البوابة الشمالية",
    args: {
      category: "fire",
      title_ar: "حريق في البوابة الشمالية",
      severity: "high",
      priority: "medium",
    },
  },
  {
    tool: "sec_update_incident",
    request: "حوّل بلاغ الحريق إلى قيد التحقيق وارفع أولويته",
    args: { id: EXISTING.incident, status: "investigating", priority: "high" },
  },
  {
    tool: "sec_create_work_order",
    request: "أنشئ أمر عمل تصحيحي لإصلاح كاميرا البوابة الشمالية",
    args: {
      title_ar: "إصلاح كاميرا البوابة الشمالية",
      kind: "corrective",
      priority: "high",
      asset_kind: "camera",
    },
  },
  {
    tool: "sec_close_work_order",
    request: "أغلق أمر عمل الكاميرا، استُبدلت واختُبر البث",
    args: { id: EXISTING.workOrder, completion_notes: "استُبدلت الكاميرا واختُبر البث" },
  },
  {
    tool: "sec_create_permit",
    request: "أصدر تصريح عمل ساخن لمقاول الصيانة يوم الثلاثاء",
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
    request: "اعتمد تصريح العمل الساخن المعلّق",
    args: { id: EXISTING.permit, decision: "approved", note: "استوفى متطلبات السلامة" },
  },
  {
    tool: "sec_schedule_patrol",
    request: "جدول دورية للفريق أ على السور الشرقي",
    args: { team: "الفريق أ", route: "السور الشرقي", checkpoints_total: 10 },
  },
  {
    tool: "sec_register_visitor",
    request: "سجّل دخول زائر من وفد المقاول لإدارة المشاريع",
    args: {
      full_name: "زائر وفد المقاول",
      host: "إدارة المشاريع",
      organization: "شركة المقاول",
      purpose: "اجتماع مراجعة",
    },
  },
  {
    tool: "sec_checkout_visitor",
    request: "سجّل خروج زائر وفد المقاول",
    args: { id: EXISTING.visitor },
  },
  {
    tool: "sec_triage_cctv_alert",
    request: "أرسل فريق استجابة لإنذار كاميرا البوابة الشمالية",
    args: { id: EXISTING.cctv, status: "dispatched", notes: "أُرسل فريق الاستجابة" },
  },
  {
    tool: "dispatch_agent",
    request: "شغّل وكيل الإحاطات على بلاغات البوابة الشمالية",
    args: { agentId: "briefing", goal: "أعدّ إحاطة الصباح عن بلاغات البوابة الشمالية" },
    // الوكيل يُقرأ من `agent_definitions` بمفتاح الخدمة قبل الاقتراح.
    adminRows: {
      agent_definitions: [
        {
          id: "briefing",
          name: "وكيل الإحاطات",
          enabled: true,
          permissions: ["admin", "manager", "member"],
          org_id: ORG_ID,
        },
      ],
    },
  },
];

type ToolLike = {
  inputSchema: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: unknown } };
  execute: (args: unknown, options: unknown) => Promise<unknown>;
};

type Measurement = {
  tool: string;
  business: number;
  businessTables: string;
  audit: number;
  ledger: number;
  outcome: string;
  reachedWritePoint: boolean;
};

beforeEach(() => {
  vi.stubEnv("SADEED_MESSAGE_APPROVAL_SECRET", SECRET);
  vi.stubEnv("ARIA_MESSAGE_APPROVAL_SECRET", "");
  vi.stubGlobal("fetch", () => {
    throw new Error("network is forbidden in this measurement");
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("chat write tools — business writes on the FIRST call (before/after measurement)", () => {
  it("no gated write tool performs a business write before the user confirms", async () => {
    const { buildSadeedTools } = await import("@/lib/sadeed-tools.server");
    const measured: Measurement[] = [];

    for (const c of CASES) {
      state.orgId = ORG_ID;
      state.tables = { ...(c.adminRows ?? {}) };
      state.adminWrites = [];
      state.seq = 0;
      const rls = requestClient();
      // طلبٌ جديد لكل أداة، كما يبني `/api/chat` الأدوات لكل رسالة.
      const tools = buildSadeedTools(rls.client, USER_ID, {
        lastUserText: c.request,
        orgId: ORG_ID,
        agentsAvailable: true,
      }) as unknown as Record<string, ToolLike>;
      const t = tools[c.tool];
      expect(t, `${c.tool} exists`).toBeDefined();
      const parsed = t!.inputSchema.safeParse(c.args);
      expect(parsed.success, `${c.tool} args satisfy its schema`).toBe(true);

      const result = (await t!.execute(parsed.data, {
        toolCallId: `measure-${c.tool}`,
        messages: [],
      })) as Row;

      const businessRls = rls.writes.filter((w) => w.table !== "finn_actions_log");
      const businessAdmin = state.adminWrites.filter(
        (w) => w.table !== "finn_actions_log" && w.table !== "sec_activity_events",
      );
      const business = [...businessRls, ...businessAdmin];
      measured.push({
        tool: c.tool,
        business: business.length,
        businessTables: business.map((w) => `${w.op}:${w.table}`).join(" ") || "-",
        audit: state.adminWrites.filter((w) => w.table === "sec_activity_events").length,
        ledger: state.adminWrites.filter((w) => w.table === "finn_actions_log").length,
        outcome:
          typeof result.status === "string"
            ? result.status
            : result.ok === true
              ? "ok (executed)"
              : `error: ${String(result.error)}`,
        // بلغت الأداة نقطة الكتابة: كتبت (قديمًا) أو أوقفتها البوابة (حديثًا) —
        // لا رفض دورٍ ولا غياب مؤسسة ولا عطل قاعدة.
        reachedWritePoint: result.ok === true || result.status === "requires_confirmation",
      });
    }

    const pad = (s: string | number, n: number) => String(s).padEnd(n);
    const lines = [
      `${pad("tool", 27)}${pad("biz", 5)}${pad("audit", 7)}${pad("ledger", 8)}${pad("outcome", 24)}business writes`,
      ...measured.map(
        (m) =>
          `${pad(m.tool, 27)}${pad(m.business, 5)}${pad(m.audit, 7)}${pad(m.ledger, 8)}${pad(m.outcome, 24)}${m.businessTables}`,
      ),
    ];
    const toolsThatWrote = measured.filter((m) => m.business > 0).map((m) => m.tool);
    const totalBusinessWrites = measured.reduce((n, m) => n + m.business, 0);
    const totalAudit = measured.reduce((n, m) => n + m.audit, 0);
    const totalLedger = measured.reduce((n, m) => n + m.ledger, 0);
    lines.push(
      `TOTAL: ${toolsThatWrote.length}/${measured.length} tools wrote on first call; ` +
        `${totalBusinessWrites} business writes; ${totalAudit} audit rows; ${totalLedger} ledger rows`,
    );
    console.log(`\n[write-gate measure]\n${lines.join("\n")}\n`);

    expect(measured.map((m) => m.tool)).toEqual(CASES.map((c) => c.tool));
    expect(measured).toHaveLength(15);
    expect(measured.filter((m) => !m.reachedWritePoint).map((m) => m.tool)).toEqual([]);
    expect({ toolsThatWrote, totalBusinessWrites, totalAudit }).toEqual({
      toolsThatWrote: [],
      totalBusinessWrites: 0,
      totalAudit: 0,
    });
  });
});
