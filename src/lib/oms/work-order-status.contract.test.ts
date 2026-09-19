/**
 * مفردات حالة أمر العمل — الحرفُ الواحد الذي عطّل الزرّ كلّه.
 *
 * ## العطل الذي وُجد هذا الحارس لأجله
 *
 * `approveWorkOrder` كانت تكتب `in_progress` بشُرطةٍ سفلية، و
 * `sec_work_orders_status_chk` يقبل `in-progress` بشَرطة. فكل اعتمادٍ
 * يُردّ من القاعدة بانتهاك قيد — والزرّ لم يعمل قطّ.
 *
 * ولم يلتقطه شيء: TypeScript يرى `string` فيقبل أي نصّ، وeslint لا شأن له
 * بمفردات قاعدة، ولا اختبار كان يقارن ما يكتبه الكود بما تقبله القاعدة.
 * والقيد يعيش في ملفّ SQL لا يقرؤه المصرّف أصلًا. فالفجوة بنيوية: **طرفا
 * العقد مكتوبان بلغتين لا يقرأ أحدهما الآخر.**
 *
 * ## ما يُحرَس هنا
 *
 * كل نصٍّ حرفيّ يُكتب في `status` على `sec_work_orders` يجب أن يكون داخل
 * مجموعة القيد المقروءة **من الترحيلات نفسها** — لا من قائمةٍ أكتبها هنا
 * فتفترق عنها يومًا.
 *
 * ## ولماذا `approved` تحديدًا لا أي قيمةٍ صالحة
 *
 * تصحيح الشُرطة وحده كان سيصنع ما هو أسوأ من العطل: `in-progress` قيمة
 * صالحة لكنها **خارج نطاق `enforce_work_order_approval`** — الـtrigger
 * يفحص `approved` و`returned` فقط. فاعتمادٌ يمرّ بها اعتمادٌ بلا حاجز،
 * من أي حساب مصادَق، بلا دور `work_order_approver`. أي أن إصلاحًا يبدو
 * صحيحًا كان سيحوّل عطلًا صاخبًا إلى ثغرةٍ صامتة — وهذا وحده سبب وجود
 * الفحص الثاني أدناه.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIG_DIR = "supabase/migrations";
const SRC = readFileSync("src/lib/oms.functions.ts", "utf8");

/**
 * مجموعة القيد كما تقولها **آخر** ترحيلٍ يعيد تعريفها.
 *
 * تُقرأ بالترتيب الزمني (أسماء الملفّات مسبوقة بالتاريخ) فيغلب المتأخّر،
 * لأن ترحيل ٢٠٢٦/٠٩/١٣ أسقط القيد وأعاده بقيمتين جديدتين. وقراءةُ الأوّل
 * تعطي مجموعةً ناقصة، فيسقط الحارس على قيمةٍ صحيحة.
 */
function allowedStatuses(): string[] {
  let latest: string[] | null = null;
  for (const file of readdirSync(MIG_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const sql = readFileSync(join(MIG_DIR, file), "utf8");
    for (const m of sql.matchAll(/check\s*\(\s*status\s+in\s*\(([^)]*)\)/gi)) {
      // القيد المقصود هو قيد `sec_work_orders` وحده — وتمييزه بأنه يحوي
      // `assigned` و`on-hold` معًا، وهما لا يجتمعان في أي قيد حالةٍ آخر.
      const values = [...m[1].matchAll(/'([^']+)'/g)].map((v) => v[1]);
      if (values.includes("assigned") && values.includes("on-hold")) latest = values;
    }
  }
  if (!latest) throw new Error("لم يُعثر على قيد حالة sec_work_orders في الترحيلات");
  return latest;
}

/**
 * كل `status: "X"` مكتوبٍ على `sec_work_orders` في طبقة الخادم.
 *
 * الملفّ يكتب على جداول عدّة، فلا يصحّ مسحُه كلّه: `sec_incidents` لها
 * `closed` و`contained`، والتصاريح لها `pending`/`approved`/`revoked`.
 * فيُقسَّم النصّ على `.from("` ويُقرأ كل مقطعٍ في جدوله — وإلا حرس
 * الاختبار مفردات جدولٍ بقيد جدولٍ آخر ومرّ على العطل أو سقط بلا سبب.
 */
function writtenStatuses(): string[] {
  const out = new Set<string>();
  for (const segment of SRC.split('.from("').slice(1)) {
    if (!segment.startsWith('sec_work_orders")')) continue;
    const scope = segment.split('.from("')[0]!;
    for (const m of scope.matchAll(/status:\s*"([^"]+)"/g)) out.add(m[1]);
  }
  return [...out].sort();
}

/** مقطع معالج `approveWorkOrder` وحده. */
function approveHandler(): string {
  const start = SRC.indexOf("export const approveWorkOrder");
  expect(start, "approveWorkOrder غير موجودة — أُعيدت تسميتها؟").toBeGreaterThan(-1);
  const after = SRC.slice(start);
  const end = after.indexOf("export const", 1);
  return end === -1 ? after : after.slice(0, end);
}

describe("مفردات حالة أمر العمل — الكود والقاعدة يقولان الشيء نفسه", () => {
  it("القيد يُقرأ فعلًا، وبقيمتَي ٢٠٢٦/٠٩/١٣ الجديدتين", () => {
    const allowed = allowedStatuses();
    // حارسٌ على مجموعةٍ فارغة أو قديمة لا يحرس شيئًا.
    expect(allowed).toContain("in-progress");
    expect(allowed).toContain("approved");
    expect(allowed).toContain("returned");
  });

  it("وثمّة حالاتٌ تُكتب فعلًا — وإلا فالفحص التالي فراغ", () => {
    expect(writtenStatuses().length).toBeGreaterThan(0);
  });

  it("كل حالةٍ يكتبها الخادم داخل قيد القاعدة", () => {
    const allowed = new Set(allowedStatuses());
    const rogue = writtenStatuses().filter((s) => !allowed.has(s));
    expect(
      rogue,
      `حالات يرفضها \`sec_work_orders_status_chk\` — كل نداءٍ يكتبها يُردّ ` +
        `بانتهاك قيد، والزرّ لا يعمل: ${rogue.join(", ")}`,
    ).toEqual([]);
  });

  it("والاعتماد يكتب `approved` تحديدًا — فيبقى تحت حاجز القاعدة", () => {
    const handler = approveHandler();
    expect(handler).toMatch(/status:\s*"approved"/);
    // `in-progress` قيمة صالحة لكنها خارج نطاق الـtrigger: اعتمادٌ بها
    // اعتمادٌ بلا فحص دور. الصلاحية وحدها ليست المعيار هنا.
    expect(handler).not.toMatch(/status:\s*"in[-_]progress"/);
  });

  it("والاعتماد يفحص الدور على الخادم أيضًا لا على القاعدة وحدها", () => {
    // الـtrigger يردّ من يتجاوز الخادم؛ والخادم يردّ برسالةٍ مفهومة بدل
    // استثناء قاعدةٍ خام يصل المستخدم كما هو.
    expect(approveHandler()).toMatch(/canApprove\(supabase, userId\)/);
  });
});
