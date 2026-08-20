/**
 * SADEED — hidden-ROUTE switchboard (companion to config/hidden-ui.ts, which
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
  "/learn", // التعلّم
  "/ptw", // تصاريح العمل الرقمية — غير قابلة للتطبيق حالياً
  "/executive-reports", // دُمجت داخل واجهة تقارير الأمن الصناعي
  // «شجرة القيادة الهولوغرامية» — طلب المالك حذف الصفحة بالكامل. حُذف
  // مكوّنها من الرئيسية سابقًا، لكن المسار ظلّ مفتوحًا لمن يعرف عنوانه.
  "/agents-flow",

  // «العروض التنفيذية السينمائية» — حذف الواجهة بالكامل.
  // [افتراض] The owner named one screen; the repo has a FAMILY of cinematic
  // show routes with no single canonical one. Resolved by TITLE, not by guess:
  //   /executive-showcase  "العرض التنفيذي — سَدِيد | Executive Showcase"
  //   /cinematic-demo      "SADEED — Cinematic Showcase"
  //   /films               "Film Center — SADEED"
  //   /theater             — same family, a cinematic playback surface
  // (/executive-bridge «جسر القيادة» حُذف من النظام كليًّا بقرار المالك
  //  ٢٠٢٦/٠٨/٠٥ — لا مسار له ولا إخفاء يلزمه.)
  "/executive-showcase",
  "/cinematic-demo",
  "/films",
  "/theater",

  // ── دفعة ٢٠٢٦/٠٨/١٢ — «تعديلات على النظام v3» + رسالة المالك ──
  // «حذف الواجهه بالكامل» (إدارة المخاطر المؤسسية). /sec/risks — سجل
  // المخاطر داخل الأمن الصناعي — شاشة أخرى وتبقى ظاهرة.
  "/risk",
  // «حذف واجهة مركز القيادة بالكامل من الشريط الجانبي والاكتفاء بنقل وضع
  // العرض التنفيذي الى محادثة سديد» — وضع العرض انتقل زرًّا في ترويسة
  // لوحة سَدِيد (SadeedCopilot)، والشاشة نفسها حُجبت.
  "/mission-control",
  // «حذف قمرة القيادة التنفيذية». شاشتان تحملان هذا الاسم حرفيًّا
  // (عنوان H1 واحد): القمرة الكانونية /nx-cockpit وسلفها /cockpit —
  // إبقاء إحداهما يُبقي «قمرة قيادة تنفيذية» في النظام، فحُجبتا معًا.
  "/nx-cockpit",
  "/cockpit",

  // ── دفعة ٢٠٢٦/٠٨/٢٠ — الصور المرفقة الثانية ──
  // «حذف الواجهة بالكامل لتكرار المعلومات» — قاعة المجلس: مؤشراتها
  // معروضة في اللوحة التنفيذية وغرفة العمليات.
  "/boardroom",
  // «حذف الواجهة بالكامل» ×٢ — الدوائر التشغيلية والأقسام. تُعاد وجهتهما
  // إلى /sec لأنهما ابنتا قسمه لا شاشتين مستقلتين.
  "/sec/circles",
  "/sec/sections",
]);

export function isRouteHidden(path: string): boolean {
  return HIDDEN_ROUTES.has(path);
}
