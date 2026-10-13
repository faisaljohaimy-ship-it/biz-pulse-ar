/**
 * SEC-01 (P0) — لا هوية منشئ ولا فنّي تبلغ الزائر من تصدير الصيانة المضمَّن.
 *
 * ## العلّة المحروسة
 *
 * `buildNotes` كان يكتب «أنشأه: <المنشئ>» في ملاحظات الـ249 أمرًا من
 * `maintenance-report.data.json` المتعقَّب في git، فتبلغ الملاحظات الزائرَ من
 * خارج حجب `maint_orders_v` (CLAUDE.md «الصيانة» §2): سياق دردشة الضيف،
 * وكتلة معرفة الوكلاء، وبديلا `getWorkOrders` و`listWorkOrders`. أُغلق
 * ٢٠٢٦/١٠/١٣ بطبقتين: الملف بلا `created_by`، والنصوص تمرّ بـ
 * `stripPersonIdentity` قبل العرض والمطابقة. والقيم السابقة باقية في تاريخ
 * git — إعادة كتابته محظورة.
 *
 * ## المادة ٣٠ — كل فحص سلبي يُثبت أنه يحمرّ
 *
 * كل كاشف هنا يُجرَّب أولًا على انتهاكٍ مزروع عمدًا (قيم اصطناعية لا تطابق
 * أي قيمة حقيقية)، وكل حلقة تُسبق بتأكيد أن مجموعتها ليست فارغة.
 *
 * ## المادة ٣١ — السطح الثاني
 *
 * الكتلة نفسها تُبنى في أربعة أسطح، فتُفحص الأربعة لا أوّلها.
 *
 * ## والفشل لا يطبع قيمة
 *
 * التأكيدات على **أسباب** وعدّادات لا على النصوص: فحصٌ يفشل بطباعة السياق
 * كاملًا يعيد نشر المعرّف في سجلّ CI — وهو التسرّب نفسه بطريق آخر.
 *
 * ## والحجب لغير الأعضاء لا لكل جمهور (④)
 *
 * قاعدة المالك تحجب الهوية عن غير الأعضاء. فصفوف القاعدة الحيّة التي قرأها
 * عميل المستدعي تحت RLS تُكشف له في الاسترجاع كما في خلاصتها — وإلا رأى
 * النموذج الأمر نفسه مُسمًّى ومحجوبًا في كتلة واحدة — وكل ما عداها محجوب.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { stripPersonIdentity } from "@/lib/maintenance/person-identity.server";
import {
  buildRecallBlock,
  findWorkOrdersForQuestion,
  formatWorkOrderRecord,
  type RecallWorkOrder,
} from "@/lib/sadeed/projects-maintenance-recall.server";
import { REAL_SEC_WORK_ORDERS } from "./maintenance-report.real.server";

// دوالّ الخادم تُستدعى هنا بمعالِجها نفسه: `createServerFn` يُستبدل بباني
// يعيد المعالِج كما هو، والوسيطان يُستبدلان بكائنين فارغين — فيصل الاختبار
// إلى الحمولة التي يتسلّمها الزائر فعلًا (`userId: null`) لا إلى وصفها.
vi.mock("@tanstack/react-start", () => {
  const builder = () => {
    const b: Record<string, unknown> = {};
    b.middleware = () => b;
    b.inputValidator = () => b;
    b.validator = () => b;
    b.server = () => b;
    b.handler = (fn: unknown) => fn;
    return b;
  };
  return { createServerFn: builder, createMiddleware: builder };
});
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/optional-auth-middleware", () => ({
  optionalSupabaseAuth: {},
}));

// ── الكواشف — مستقلّة عن `stripPersonIdentity` عمدًا ──────────────────────
// كاشفٌ يشارك المُصلِحَ تعبيره يشاركه عماه أيضًا.

const TWO_LETTERS_TEN_DIGITS = /(?<![\p{L}\p{N}])[A-Za-z]{2}\d{10}(?!\p{N})/u;
const STAFF_NUMBER_BESIDE_CREATOR = /أنشأه\s*:?\s*\d{5,6}(?!\d)|(?<!\d)\d{5,6}\s*:?\s*أنشأه/u;
const IDENTITY_KEY = /^(?:created_by|entered_by|creator|technician)/i;

/** أسباب التسرّب في نصّ — أسماء الأسباب وحدها، لا القيم. */
function identityLeaks(text: string): string[] {
  const found: string[] = [];
  if (text.includes("أنشأه")) found.push("وسم المنشئ «أنشأه»");
  if (TWO_LETTERS_TEN_DIGITS.test(text)) found.push("رمز بشكل حرفين وعشرة أرقام");
  if (STAFF_NUMBER_BESIDE_CREATOR.test(text)) found.push("رقم من ٥–٦ أرقام بجوار «أنشأه»");
  return found;
}

/** أسباب التسرّب في حمولة صفوف — مفاتيح هوية، وأشخاص غير فارغين، ونصوص. */
function rowLeaks(rows: readonly object[]): string[] {
  const found = new Set<string>();
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    for (const key of Object.keys(r)) if (IDENTITY_KEY.test(key)) found.add(`حقل هوية: ${key}`);
    for (const key of ["assigned_to", "approved_by"])
      if (r[key] !== null && r[key] !== undefined) found.add(`${key} غير فارغ`);
    for (const value of Object.values(r))
      if (typeof value === "string") for (const why of identityLeaks(value)) found.add(why);
  }
  return [...found];
}

/** عدد صفوف الملف التي تحمل مفتاح `created_by` — العدّ لا القيم. */
function rowsWithCreatorKey(rows: readonly object[]): number {
  return rows.filter((r) => Object.prototype.hasOwnProperty.call(r, "created_by")).length;
}

// قيم اصطناعية للانتهاك المزروع — تحقّق أنها لا تطابق أي قيمة حقيقية.
const PLANTED_STAFF = "000000";
const PLANTED_CODE = "QQ0000000000";

describe("SEC-01 ① الملف المضمَّن بلا created_by", () => {
  const raw = readFileSync(join(__dirname, "maintenance-report.data.json"), "utf8");
  const rows = JSON.parse(raw) as object[];

  it("الكاشف يحمرّ على صفّ مزروع يحمل created_by (المادة ٣٠)", () => {
    expect(rowsWithCreatorKey([{ id: "planted", created_by: PLANTED_STAFF }])).toBe(1);
    expect(rowLeaks([{ id: "planted", created_by: PLANTED_STAFF }]).length).toBeGreaterThan(0);
  });

  it("249 صفًّا، ولا صفّ واحد يحمل created_by ولا أي مفتاح هوية", () => {
    expect(rows.length).toBe(249);
    expect(rowsWithCreatorKey(rows)).toBe(0);
    expect(raw.includes('"created_by"')).toBe(false);
    const identityKeys = new Set(
      rows.flatMap((r) => Object.keys(r)).filter((k) => IDENTITY_KEY.test(k)),
    );
    expect([...identityKeys]).toEqual([]);
  });
});

describe("SEC-01 ② سياق الزائر وأخواته بلا هوية — أربعة أسطح", () => {
  // أسئلة تسمّي أوامر حقيقية بأرقامها وبمواقعها — فالاسترجاع يطبع سجلّاتها
  // كاملةً بملاحظاتها، وهي الموضع الذي كان يحمل المنشئ.
  const questions = REAL_SEC_WORK_ORDERS.filter((_, i) => i % 25 === 0).flatMap((w) => [
    { ref: w.ref, text: `ما حالة الأمر ${w.ref}؟` },
    { ref: w.ref, text: `تفاصيل ${w.ref} في الموقع ${w.asset_code}` },
  ]);

  it("الكاشف يحمرّ على سياقٍ زُرع فيه منشئ (المادة ٣٠)", () => {
    expect(identityLeaks(`- 66000000001 | أمر\n  أنشأه: ${PLANTED_STAFF}`).length).toBeGreaterThan(
      0,
    );
    expect(identityLeaks(`أنشأه: ${PLANTED_STAFF}`)).toContain("رقم من ٥–٦ أرقام بجوار «أنشأه»");
    expect(identityLeaks(`ملاحظة ${PLANTED_CODE} هنا`)).toEqual(["رمز بشكل حرفين وعشرة أرقام"]);
    expect(identityLeaks("المجموعة المخططة: EOA (الشرقية) · التكلفة الفعلية: 2,988 ر.س")).toEqual(
      [],
    );
  });

  it("دردشة الضيف: buildProductionDatasetsSnapshot(…, 'anonymous')", async () => {
    const { buildProductionDatasetsSnapshot } = await import("@/lib/sadeed-context.server");
    expect(questions.length).toBeGreaterThan(0);
    const leaking: string[] = [];
    for (const q of questions) {
      const snap = await buildProductionDatasetsSnapshot(
        q.text,
        "2026-10-13T00:00:00.000Z",
        "anonymous",
      );
      const block = snap.contextBlock;
      // ليس فحصًا فوق فراغ: السجلّ المطابق وملاحظاته طُبعا فعلًا.
      expect(block.includes("أوامر صيانة مطابقة"), `لا استرجاع لـ${q.ref}`).toBe(true);
      expect(block.includes(`- ${q.ref} |`), `سجلّ ${q.ref} غائب`).toBe(true);
      expect(block.includes("المجموعة المخططة:"), `ملاحظات ${q.ref} غائبة`).toBe(true);
      for (const why of identityLeaks(block)) leaking.push(`${q.ref}: ${why}`);
    }
    expect(leaking).toEqual([]);
  });

  it("كتلة معرفة الوكلاء (ومنها /api/public/sadeed-ask): buildEnterpriseKnowledgeBlock", async () => {
    const { buildEnterpriseKnowledgeBlock } =
      await import("@/lib/sadeed/executive-brain/context.server");
    const leaking: string[] = [];
    for (const q of questions) {
      const block = buildEnterpriseKnowledgeBlock(q.text);
      expect(block.includes(`- ${q.ref} |`), `سجلّ ${q.ref} غائب`).toBe(true);
      for (const why of identityLeaks(block)) leaking.push(`${q.ref}: ${why}`);
    }
    expect(leaking).toEqual([]);
  });

  it("الجواب الفوري بالمرجع: matchInstantDataAnswer", async () => {
    const { matchInstantDataAnswer } = await import("@/lib/sadeed/instant-data-answers.server");
    const leaking: string[] = [];
    let answered = 0;
    for (const w of REAL_SEC_WORK_ORDERS.filter((_, i) => i % 25 === 0)) {
      const hit = matchInstantDataAnswer(`تفاصيل ${w.ref}`);
      if (hit?.source !== "record-lookup") continue;
      answered++;
      for (const why of identityLeaks(hit.answer)) leaking.push(`${w.ref}: ${why}`);
    }
    expect(answered).toBeGreaterThan(0);
    expect(leaking).toEqual([]);
  });

  it("الدفاع في العمق: صفّ مزروع بمنشئ وموكَّل لا يبلغ السجلّ ولا يصير مفتاح بحث", () => {
    const planted: RecallWorkOrder = {
      ref: "PLANTED-SEC01",
      title_ar: "أمر اختبار مزروع",
      status: "open",
      assigned_to: PLANTED_CODE,
      notes: `أنشأه: ${PLANTED_STAFF} · المجموعة المخططة: EOA (الشرقية) · مرجع ${PLANTED_CODE}`,
    };
    // المدخل انتهاكٌ حقيقي — وإلا كان «لا تسرّب» بعده بلا معنى.
    expect(identityLeaks(planted.notes!).length).toBeGreaterThan(0);
    expect(identityLeaks(planted.assigned_to!).length).toBeGreaterThan(0);

    const record = formatWorkOrderRecord(planted);
    expect(identityLeaks(record)).toEqual([]);
    expect(record.includes(PLANTED_STAFF)).toBe(false);
    // الحقيقة تبقى: المجموعة وكون الأمر مُسنَدًا.
    expect(record.includes("المجموعة المخططة: EOA (الشرقية)")).toBe(true);
    expect(record.includes("مُسنَد")).toBe(true);

    const block = buildRecallBlock("PLANTED-SEC01", [], [planted], {
      projects: "[T]",
      maintenance: "[T]",
    });
    expect(block.includes("- PLANTED-SEC01 |")).toBe(true);
    expect(identityLeaks(block)).toEqual([]);

    // الهوية ليست مفتاح بحث: سؤالٌ برقم المنشئ أو رمزه لا يجلب الأمر.
    expect(findWorkOrdersForQuestion(`أوامر ${PLANTED_STAFF}`, [planted])).toEqual([]);
    expect(findWorkOrdersForQuestion(`أوامر ${PLANTED_CODE}`, [planted])).toEqual([]);
    // …والمطابِق نفسه يجده لو كان الرقم في حقلٍ يُطابَق (المادة ٣٠).
    expect(
      findWorkOrdersForQuestion(`أوامر ${PLANTED_STAFF}`, [
        { ...planted, notes: null, title_ar: `أمر ${PLANTED_STAFF}` },
      ]).length,
    ).toBe(1);
  });

  it("stripPersonIdentity يُسقط الهوية في أي موضع ويُبقي الحقائق وفواصلها", () => {
    const fact = "المجموعة المخططة: EOA (الشرقية)";
    expect(stripPersonIdentity(`أنشأه: ${PLANTED_STAFF} · ${fact}`)).toBe(fact);
    expect(stripPersonIdentity(`${fact} · أنشأه: ${PLANTED_STAFF} · دورة`)).toBe(`${fact} · دورة`);
    expect(stripPersonIdentity(`${fact} · Entered by: ${PLANTED_STAFF}`)).toBe(fact);
    expect(stripPersonIdentity(`${fact} · ${PLANTED_CODE}`)).toBe(`${fact} · [محجوب]`);
    expect(stripPersonIdentity(fact)).toBe(fact);
  });
});

describe("SEC-01 ③ بديلا أوامر العمل لزائرٍ بلا هوية (userId: null)", () => {
  type GuestArgs = { context: { supabase: unknown; userId: string | null } };
  type Handler = (args: GuestArgs) => Promise<object[]>;

  /** جدولٌ فارغ: سلسلة استعلام تُنتظر فتعيد صفر صفوف. */
  function emptyTable() {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "order", "limit", "eq"]) q[m] = () => q;
    q.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
      resolve({ data: [], error: null });
    return q;
  }
  const GUEST_EMPTY: GuestArgs = {
    context: { supabase: { from: () => emptyTable() }, userId: null },
  };
  const GUEST_DB_DOWN: GuestArgs = {
    context: {
      supabase: {
        from: () => {
          throw new Error("db down");
        },
      },
      userId: null,
    },
  };

  it("الكاشف يحمرّ على حمولة مزروعة (المادة ٣٠)", () => {
    const base = { ...REAL_SEC_WORK_ORDERS[0] };
    expect(rowLeaks([{ ...base, created_by: PLANTED_STAFF }])).toContain("حقل هوية: created_by");
    expect(rowLeaks([{ ...base, assigned_to: "فنّي" }])).toContain("assigned_to غير فارغ");
    expect(rowLeaks([{ ...base, notes: `أنشأه: ${PLANTED_STAFF}` }]).length).toBeGreaterThan(0);
    expect(rowLeaks([base])).toEqual([]);
  });

  it.each([
    ["sec.functions.ts", "getWorkOrders"],
    ["oms.functions.reports.ts", "listWorkOrders"],
  ] as const)("%s · %s — جدول فارغ وقاعدة معطّلة", async (file, fn) => {
    const silence = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const mod = (await (file === "sec.functions.ts"
        ? import("@/lib/sec.functions")
        : import("@/lib/oms.functions.reports"))) as unknown as Record<string, Handler>;
      const handler = mod[fn];
      expect(typeof handler).toBe("function");
      for (const guest of [GUEST_EMPTY, GUEST_DB_DOWN]) {
        const payload = await handler(guest);
        // البديل نهض فعلًا: صفوف التصدير كاملةً، لا مجموعة فارغة تمرّ خضراء.
        expect(payload.length).toBe(249);
        expect(rowLeaks(payload)).toEqual([]);
      }
    } finally {
      silence.mockRestore();
    }
  });
});

describe("SEC-01 ④ الجمهور — يُحجب الموكَّل إلا عمّن تكشفه له القاعدة", () => {
  // قيمة اصطناعية لا تطابق أي هوية حقيقية.
  const PLANTED_TECH = "TECH-PLANTED-000";
  const live: RecallWorkOrder = {
    ref: "LIVE-WO-0001",
    title_ar: "أمر حيّ مزروع",
    kind: "corrective",
    priority: "high",
    status: "open",
    assigned_to: PLANTED_TECH,
    due_at: null,
  };
  const occurrences = (hay: string, needle: string) => hay.split(needle).length - 1;

  /** عميل قاعدة مزروع: كل جدول يعيد صفوفه المعطاة أو صفرًا. */
  function liveClient(rowsByTable: Record<string, unknown[]>): SupabaseClient {
    const client = {
      from: (table: string) => {
        const q: Record<string, unknown> = {};
        for (const m of ["select", "order", "limit", "eq"]) q[m] = () => q;
        q.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
          resolve({ data: rowsByTable[table] ?? [], error: null });
        return q;
      },
    };
    return client as unknown as SupabaseClient;
  }

  it("الافتراضي يحجب ولا يطابق — يفشل مغلقًا، والكاشف يحمرّ بالكشف (المادة ٣٠)", () => {
    const masked = formatWorkOrderRecord(live);
    expect(masked.includes("مُسنَد (الهوية محجوبة)")).toBe(true);
    expect(masked.includes(PLANTED_TECH)).toBe(false);
    expect(findWorkOrdersForQuestion(`أوامر ${PLANTED_TECH}`, [live])).toEqual([]);
    const block = buildRecallBlock(live.ref, [], [live], { projects: "[T]", maintenance: "[T]" });
    expect(block.includes(`- ${live.ref} |`)).toBe(true);
    expect(block.includes(PLANTED_TECH)).toBe(false);
    // …والمطابِق نفسه يجده بالفنّي حين يُكشف — فـ«لا مطابقة» أعلاه حجبٌ لا عمى.
    expect(
      findWorkOrdersForQuestion(`أوامر ${PLANTED_TECH}`, [live], { revealAssignee: true }).length,
    ).toBe(1);
  });

  it("الكشف يُظهر الموكَّل ويطابقه، والملاحظات محجوبة لكل جمهور", () => {
    const withNotes: RecallWorkOrder = {
      ...live,
      notes: `أنشأه: ${PLANTED_STAFF} · المجموعة المخططة: EOA (الشرقية)`,
    };
    const rec = formatWorkOrderRecord(withNotes, { revealAssignee: true });
    expect(rec.includes(PLANTED_TECH)).toBe(true);
    expect(rec.includes("الهوية محجوبة")).toBe(false);
    expect(identityLeaks(rec)).toEqual([]);
    expect(rec.includes("المجموعة المخططة: EOA (الشرقية)")).toBe(true);
    // رقم المنشئ في الملاحظات ليس مفتاح بحث ولو كُشف الموكَّل.
    expect(
      findWorkOrdersForQuestion(`أوامر ${PLANTED_STAFF}`, [withNotes], { revealAssignee: true }),
    ).toEqual([]);
  });

  it("[PROD:WORK_ORDERS]: صفّ حيّ بموكَّل — الخلاصة والاسترجاع متّفقان، والسؤال بالفنّي يجده", async () => {
    const { buildSadeedContextSnapshot } = await import("@/lib/sadeed-context.server");
    const supabase = liveClient({ sec_work_orders: [live] });
    for (const q of [`تفاصيل ${live.ref}`, `أوامر ${PLANTED_TECH}`]) {
      const { contextBlock } = await buildSadeedContextSnapshot(supabase, q);
      expect(contextBlock.includes("[PROD:WORK_ORDERS]"), `لا استرجاع حيّ: ${q}`).toBe(true);
      expect(contextBlock.includes(`- ${live.ref} |`), `سجلّ ${live.ref} غائب`).toBe(true);
      expect(contextBlock.includes("الهوية محجوبة"), `تناقض في الكتلة: ${q}`).toBe(false);
      // مرّتان: سطر «أهم أوامر العمل النشطة» وسجلّ الاسترجاع — صيغة واحدة.
      expect(occurrences(contextBlock, PLANTED_TECH)).toBe(2);
    }
  });

  it("والكشف محصور في مسار القاعدة الحيّة — لا يمرّره مسار الضيف ولا التصدير", () => {
    const root = join(__dirname, "..", "..");
    const callers = (readdirSync(root, { recursive: true }) as string[])
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
      .filter((f) => readFileSync(join(root, f), "utf8").includes("revealAssignee"))
      .map((f) => f.split("\\").join("/"))
      .sort();
    expect(callers).toEqual([
      "lib/sadeed-context.server.ts",
      "lib/sadeed/projects-maintenance-recall.server.ts",
    ]);
    const ctx = readFileSync(join(root, "lib", "sadeed-context.server.ts"), "utf8");
    const guest = ctx.slice(
      ctx.indexOf("export async function buildProductionDatasetsSnapshot"),
      ctx.indexOf("export async function buildSadeedContextSnapshot"),
    );
    expect(guest.length).toBeGreaterThan(0);
    expect(guest.includes("revealAssignee")).toBe(false);
    expect(ctx.match(/revealAssignee: liveOrders/g)?.length).toBe(1);
  });
});
