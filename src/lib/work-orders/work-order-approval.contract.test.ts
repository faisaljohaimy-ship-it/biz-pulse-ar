/**
 * حاجز اعتماد أمر العمل — حارس العقد (أمر المالك ٢٠٢٦/٠٩/١٣).
 *
 * ## لماذا حارسٌ نصّيّ لهذه البنود بعينها
 *
 * البنود ٥ و٦ و٧ أقوالٌ عن **الخادم والقاعدة**: أن القرار يكتب `approved`
 * مع مُعتمِدٍ ووقت، وأن غير المخوَّل يُردّ بـ`not_authorized_to_approve`،
 * وأن الضيف لا يكتب في القاعدة ولا يرى عبارة جلسة. لا يسقط أيٌّ منها في
 * tsc ولا eslint: حذفُ سطر الصلاحية أو قلبُ الشرط كودٌ سليم.
 *
 * **والبند ٦ لم يُشغَّل على قاعدة حيّة** — مشروع Supabase موقوف (INACTIVE)
 * وكل استعلام يعود بانقطاع اتصال، فالترحيل غير مطبَّق. فما يحرسه هذا الملفّ
 * أن **نصّ** الحاجز قائمٌ وصحيح في الترحيل وفي الخادم معًا؛ وتشغيلُه على
 * قاعدةٍ حيّة يبقى دَينًا معلنًا لا يُدّعى إنجازه.
 *
 * ولأن الحاجز القاعديّ نائم، **الخادم يفرضها أيضًا** — وهذا ما يجعل المسار
 * محروسًا اليوم لا بعد التطبيق. البند ④ أدناه يحرس بقاء الفرضين معًا.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { FAULT_TYPES } from "./constants";

const read = (p: string) => readFileSync(p, "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, "");

const OMS = strip(read("src/lib/oms.functions.ts"));
const DIALOGS_RAW = read("src/components/sec/oms-dialogs.tsx");
const DIALOGS = strip(DIALOGS_RAW);

const woStart = DIALOGS.indexOf("export function NewWorkOrderDialog");
const woEnd = DIALOGS.indexOf("export function WorkOrderActions");
const WO_DIALOG = DIALOGS.slice(woStart, woEnd);

/** ملفّا الترحيل — يُقرآن بالبحث لا بالاسم، فإعادة الترقيم لا تُسقط الحارس. */
const MIGRATIONS = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .map((f) => read(`supabase/migrations/${f}`));
const ROLE_MIG = MIGRATIONS.find((m) =>
  m.includes("add value if not exists 'work_order_approver'"),
);
const APPROVAL_MIG = MIGRATIONS.find((m) => m.includes("enforce_work_order_approval"));

describe("⑤ «اعتماد» ⇒ status='approved' + approved_by + approved_at", () => {
  it("حدود الشريحة صحيحة — حارسٌ على شريحة فارغة لا يحرس شيئًا", () => {
    expect(woStart).toBeGreaterThan(-1);
    expect(woEnd).toBeGreaterThan(woStart);
    expect(OMS).toContain("createWorkOrder");
  });

  it("القرار يُترجَم إلى الحالات الثلاث في الخادم", () => {
    expect(OMS).toMatch(/decision === "approve"\s*\?\s*"approved"/);
    expect(OMS).toMatch(/decision === "return"\s*\?\s*"returned"/);
    expect(OMS).toMatch(/:\s*"open"/);
  });

  it("والمُعتمِد ووقتُه يُكتبان مع القرار ويُترَكان فارغين بدونه", () => {
    expect(OMS).toMatch(/approved_by:\s*decidedAt \? userId : null/);
    expect(OMS).toMatch(/approved_at:\s*decidedAt/);
    expect(OMS).toMatch(/decidedAt =\s*\n?\s*data\.decision === "none" \? null :/);
  });

  it("و«إرجاع» يحفظ سببه في عمودٍ مستقلّ لا في الملاحظات وحدها", () => {
    expect(OMS).toMatch(/return_reason:\s*\(?data\.decision === "return"/);
  });
});

describe("⑥ غير المخوَّل يُردّ — في القاعدة وفي الخادم معًا", () => {
  it("ترحيل الدور موجود ومنفصل عن ترحيل الأعمدة", () => {
    // `ALTER TYPE … ADD VALUE` لا تُستعمل قيمتها في المعاملة نفسها، فجمعُ
    // البندين في ملفّ يُسقط الملفّ عند أوّل استعمال.
    expect(ROLE_MIG, "سقط ترحيل دور الاعتماد").toBeDefined();
    expect(APPROVAL_MIG, "سقط ترحيل حاجز الاعتماد").toBeDefined();
    expect(ROLE_MIG).not.toContain("enforce_work_order_approval");
  });

  it("الحاجز يرفع `not_authorized_to_approve` على الحالتين معًا", () => {
    expect(APPROVAL_MIG).toMatch(/new\.status in \('approved','returned'\)/);
    expect(APPROVAL_MIG).toMatch(/raise exception 'not_authorized_to_approve'/);
    // الإدراج والتحديث كلاهما: حارسٌ على UPDATE وحده يُلتَفّ عليه بـINSERT.
    expect(APPROVAL_MIG).toMatch(/tg_op = 'INSERT' or new\.status is distinct from old\.status/);
    expect(APPROVAL_MIG).toMatch(/before insert or update on public\.sec_work_orders/);
  });

  it("والدور يُقرأ من `has_role` على جدول الأدوار — لا من profiles", () => {
    expect(APPROVAL_MIG).toMatch(/public\.has_role\(auth\.uid\(\), 'work_order_approver'\)/);
    expect(APPROVAL_MIG, "قراءة الدور من جدول يعدّله المستخدم ⇒ تصعيد صلاحية").not.toMatch(
      /from\s+public\.profiles/i,
    );
    expect(APPROVAL_MIG).toMatch(/security definer set search_path = public/);
  });

  it("والخادم يفرضها أيضًا — الحاجز القاعديّ غير مطبَّق بعد", () => {
    expect(OMS).toMatch(/not_authorized_to_approve/);
    expect(OMS).toMatch(/data\.decision !== "none" && !\(await canApprove\(/);
  });

  it("والواجهة تقرأ الصلاحية من المصدر نفسه لا من حالة محلية", () => {
    expect(OMS).toContain("getWorkOrderPermissions");
    expect(OMS).toMatch(/canApproveWorkOrders:\s*await canApprove\(/);
    expect(WO_DIALOG).toContain("getWorkOrderPermissions");
    expect(WO_DIALOG).toMatch(/permissions\?\.canApproveWorkOrders === true/);
  });
});

describe("⑦ الضيف: محاكاة محلية فقط، ولا رسالة جلسة", () => {
  it("لا عبارة مصادقة في مسار الإنشاء بأي صياغة", () => {
    expect(WO_DIALOG).not.toContain("SESSION_ERROR_AR");
    expect(WO_DIALOG).not.toMatch(/authenticat|unauthor|token|forbidden|jwt|bearer/i);
  });

  it("والصف المحاكى يحمل نوع العطل والقيمتين المؤسسيتين وis_simulation", () => {
    expect(WO_DIALOG).toMatch(/fault_type:\s*payload\.fault_type/);
    expect(WO_DIALOG).toMatch(/assignee_team:\s*payload\.assignee_team/);
    expect(WO_DIALOG).toMatch(/contractor_name:\s*payload\.contractor_name/);
    expect(DIALOGS).toMatch(/is_simulation:\s*true/);
  });

  it("والضيف لا يسأل عن الصلاحية أصلًا فلا يرى القرار", () => {
    expect(WO_DIALOG).toMatch(/enabled:\s*open && !!user/);
    expect(WO_DIALOG).toMatch(/isGuest=\{!user\}/);
  });

  it("ورسالة الإنشاء المحاكى تبقى SIM_WO_CREATED_INFO", () => {
    expect(WO_DIALOG).toContain("toast.info(SIM_WO_CREATED_INFO)");
  });
});

describe("⑦ب معايير القبول — لا أثر لحقل الأصل، والتقويم كما هو", () => {
  it("لا حقل أصل ولا كود ميت منه في النافذة", () => {
    expect(WO_DIALOG, "عاد حقل الأصل إلى النافذة").not.toContain("الأصل *");
    expect(WO_DIALOG).not.toContain("اختر الأصل وكوده");
    expect(WO_DIALOG).not.toContain("selectedAsset");
    expect(WO_DIALOG).not.toContain("assetsLoading");
    expect(WO_DIALOG).not.toContain("sec-overview-assets");
    expect(WO_DIALOG).not.toContain("getSecOverview");
    // والاستيراد نفسه سقط من الملفّ — استيرادٌ ميت يُقرأ عقدًا حيًّا.
    expect(DIALOGS_RAW, "بقي استيراد getSecOverview بلا مستهلك").not.toContain(
      'from "@/lib/sec.functions"',
    );
  });

  it("ونصّ الوصف صار نصّ الأمر حرفيًّا", () => {
    expect(DIALOGS_RAW).toContain(
      "حدّد نوع العطل؛ سيُوجَّه أمر العمل تلقائيًا إلى فريق الصيانة ثم ينتظر الاعتماد.",
    );
    expect(DIALOGS_RAW).not.toContain("اختر الأصل من السجل");
  });

  it("وحقل «نوع العطل» إلزاميّ بقائمته الإحدى عشرة", () => {
    expect(WO_DIALOG).toContain("نوع العطل *");
    expect(WO_DIALOG).toContain("اختر نوع العطل");
    expect(WO_DIALOG).toContain("FAULT_TYPES.map");
  });

  it("والحقلان المؤسسيان معروضان معطَّلين", () => {
    expect(WO_DIALOG).toMatch(
      /value=\{DEFAULT_ASSIGNEE_TEAM\}[\s\S]{0,80}readOnly[\s\S]{0,20}disabled/,
    );
    expect(WO_DIALOG).toMatch(
      /value=\{DEFAULT_CONTRACTOR\}[\s\S]{0,80}readOnly[\s\S]{0,20}disabled/,
    );
  });

  it("وقرار الاعتماد بين الملاحظات وزرّ الإنشاء — لا فوقهما ولا تحتهما", () => {
    const notes = WO_DIALOG.indexOf("<Textarea");
    const decision = WO_DIALOG.indexOf("<ApprovalDecision");
    const footer = WO_DIALOG.indexOf("<DialogFooter>");
    expect(notes).toBeGreaterThan(-1);
    expect(decision).toBeGreaterThan(notes);
    expect(footer).toBeGreaterThan(decision);
  });

  it("وتقويم الاستحقاق عربي RTL كما هو — لا datetime-local", () => {
    expect(WO_DIALOG).not.toContain('type="date"');
    expect(WO_DIALOG).not.toContain('type="datetime-local"');
    expect(WO_DIALOG).toContain("<Calendar");
  });

  it("وقيد القاعدة يطابق قائمة الواجهة مفتاحًا بمفتاح", () => {
    for (const fault of FAULT_TYPES) {
      expect(APPROVAL_MIG, `${fault.key} خارج قيد القاعدة`).toContain(`'${fault.key}'`);
    }
    expect(OMS).toContain("FAULT_TYPE_KEYS");
  });

  it("والتوافق الخلفي: لا حذف عمود، فكُّ إلزامٍ فقط", () => {
    expect(APPROVAL_MIG).toMatch(/alter column asset_kind drop not null/);
    expect(APPROVAL_MIG, "حذفُ عمودٍ ترحيلٌ مدمِّر لم يُؤذن به").not.toMatch(/drop column/i);
  });

  it("ونطاق `status` احتفظ بقيمه الستّ الأصلية مع الجديدتين", () => {
    for (const s of ["open", "assigned", "in-progress", "on-hold", "closed", "cancelled"]) {
      expect(APPROVAL_MIG, `سقطت الحالة ${s} من النطاق`).toContain(`'${s}'`);
    }
    expect(APPROVAL_MIG).toContain("'approved'");
    expect(APPROVAL_MIG).toContain("'returned'");
  });
});
