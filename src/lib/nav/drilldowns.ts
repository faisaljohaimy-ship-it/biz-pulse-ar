/**
 * خريطة الرجوع الهرمية — المصدر الوحيد لقرار «هل يظهر زر الرجوع؟».
 *
 * ── لماذا خريطة لا تاريخ ──
 * القرار التاريخي (`useCanGoBack` + آخر مسار زاره المستخدم) يجعل الزر يظهر
 * في **كل** واجهة رئيسية بمجرّد أي تنقّل سابق — حتى في الرئيسية نفسها.
 * وهذا عين ملاحظة العميل. الخريطة تقول: الرجوع صفةُ **مكان** لا صفةُ
 * رحلة — الشاشات التفصيلية وحدها لها أب، وما عداها لا رجوع فيه.
 *
 * والنقل حتمي: الضغط ينتقل إلى الأب المكتوب هنا، لا إلى ما صادف أن كان
 * قبله في المكدّس.
 */

/** المسار التفصيلي ← أبوه. ما ليس هنا فلا زرّ رجوع له. */
const DRILLDOWN_PARENTS: Readonly<Record<string, string>> = {
  "/sec/contractors": "/sec/access",
  "/sec/visitors": "/sec/access",
  "/sec/vehicles": "/sec/access",
  "/sec/permits": "/sec/access",
  "/settings/microsoft": "/settings",
};

/** أنماط ديناميكية: `/assistant/$threadId` ← `/assistant`. */
const DYNAMIC_PARENTS: ReadonlyArray<{ test: RegExp; parent: string }> = [
  { test: /^\/assistant\/[^/]+$/, parent: "/assistant" },
];

/** أب المسار إن كان شاشة تفصيلية، وإلا `null` (فلا رجوع). */
export function drilldownParent(pathname: string): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const direct = DRILLDOWN_PARENTS[path];
  if (direct) return direct;
  for (const rule of DYNAMIC_PARENTS) {
    if (rule.test.test(path)) return rule.parent;
  }
  return null;
}
