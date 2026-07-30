/**
 * NEXIOS — hidden-ROUTE switchboard (companion to config/hidden-ui.ts, which
 * hides UI *fragments*; this hides whole *screens*).
 *
 * OWNER DIRECTIVE — the hide policy, stated exactly as it was given:
 *   ① remove the link from every navigation surface
 *   ② make the route redirect to the homepage
 *   ③ KEEP the component files in the repo — do not delete code
 *
 * Deleting a screen's code needs separate, explicit approval. The reason is
 * asymmetry: un-hiding is deleting one line here, un-deleting is archaeology.
 *
 * To restore a screen: remove its entry below and re-add its MODULES row.
 * Nothing else has to change — the guard and the nav both read this set.
 */

/** Screens hidden by owner directive. Keys are router paths. */
export const HIDDEN_ROUTES: ReadonlySet<string> = new Set([
  "/analytics", // الإحصائيات — تحليلات وداشبورد موجودة في واجهات أخرى
  "/bi", // لوحات التحليل — يكفي بطاقات يمين الرئيسية
  "/intelligence", // الذكاء والتطوّر
  "/learn", // التعلّم
  "/ptw", // تصاريح العمل الرقمية — غير قابلة للتطبيق حالياً
]);

export function isRouteHidden(path: string): boolean {
  return HIDDEN_ROUTES.has(path);
}
