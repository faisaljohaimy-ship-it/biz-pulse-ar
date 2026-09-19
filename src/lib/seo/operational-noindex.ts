/**
 * منع فهرسة المسارات التشغيلية — أمر المالك ٢٠٢٦/٠٩/١٨ (المرحلة ز، البند ٢).
 *
 * ## لماذا مركزيًّا لا مسارًا مسارًا
 *
 * المسارات التشغيلية تزيد على المئة. ووسمُ كلٍّ منها في `head` الخاص به
 * يعني أن كل مسارٍ جديد يُولد **مفهرسًا افتراضًا** حتى يتذكّر أحدٌ وسمه —
 * وهو خطأٌ صامت لا يلتقطه بناءٌ ولا اختبار. فالقرار هنا: قائمة بادئات
 * واحدة يقرؤها الجذر، فالافتراض للمسار الجديد تحت بادئةٍ تشغيلية **منعٌ
 * لا سماح**.
 *
 * ## و`robots.txt` وحده لا يكفي
 *
 * ملفّ `robots` يمنع **الزحف**، ولا يمنع **الإدراج**: صفحةٌ وصلها جوجل من
 * رابطٍ خارجيّ تُدرج في النتائج بعنوانها بلا زحف. و`noindex` في الترويسة
 * هو ما يمنع الإدراج نفسه. فالاثنان يعملان معًا لا أحدهما.
 *
 * ## الجذر يبقى مفهرسًا
 *
 * `/` سطحٌ تسويقيّ مقصود ظهوره. والقائمة بادئاتٌ لا مطابقة تامّة، فما
 * تحتها يُمنع كلّه.
 */

/** بادئات المسارات التشغيلية — ما تحتها لا يُفهرس. */
export const OPERATIONAL_PREFIXES: readonly string[] = [
  "/sec",
  "/settings",
  "/assistant",
  "/sadeed",
  "/login",
  "/auth",
  "/admin",
  "/agents",
  "/urgent-ops",
  "/executive-reports",
  "/boardroom",
  "/files",
  "/integrations",
  "/governance",
  "/ptw",
  "/hajj",
  "/nx-",
];

/** المسار بلا مائلة ختامية — `/sec/` و`/sec` مكانٌ واحد. */
function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/**
 * هل يُمنع فهرسة هذا المسار؟
 *
 * دالّة خالصة تُختبر بالمساواة على عشرات المسارات بلا مُسيّر ولا DOM.
 */
export function isOperationalRoute(pathname: string): boolean {
  const path = normalize(pathname);
  if (path === "/") return false;
  return OPERATIONAL_PREFIXES.some((prefix) => {
    // بادئةٌ تنتهي بشَرطة (`/nx-`) عائلةُ مساراتٍ لا مسارًا: تُطابق بالبداية
    // مباشرةً. وأوّل صياغةٍ أغفلت ذلك فأفلت `/nx-ops` من المنع — أمسكه
    // الحارس قبل الدفع، وهو عين ما وُجد له.
    if (prefix.endsWith("-")) return path.startsWith(prefix);
    // وغيرها يُطابق تامًّا، أو كأبٍ (`/sec/…`)، أو كأخٍ موسوم
    // (`/sadeed-analytics` تحت `/sadeed`).
    return path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}-`);
  });
}
