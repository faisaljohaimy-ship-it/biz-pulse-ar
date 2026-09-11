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

/** المسار بلا مائلة ختامية — `/sec/` و`/sec` مكانٌ واحد لا مكانان. */
function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/** أب المسار إن كان شاشة تفصيلية مكتوبة أعلاه، وإلا `null`. */
export function drilldownParent(pathname: string): string | null {
  const path = normalize(pathname);
  const direct = DRILLDOWN_PARENTS[path];
  if (direct) return direct;
  for (const rule of DYNAMIC_PARENTS) {
    if (rule.test.test(path)) return rule.parent;
  }
  return null;
}

/**
 * وجهة الرجوع لأي مسار — **أمر المالك ٢٠٢٦/٠٨/٢٨**: «اضف زر للرجوع في
 * الصفحات التي تحتاج لزر الرجوع».
 *
 * ── ما الذي تغيّر ولماذا ──
 * كانت `drilldownParent` وحدها هي الحَكَم، وهي خريطة يدوية من **خمسة**
 * مسارات. فقِيس على ١١ مسارًا × مقاسين: زرّ رجوعٍ ظاهر على مسار واحد فقط
 * (`/sec/contractors`) — أي أن عشرة أحد عشر من الشاشات لا مخرج منها إلا
 * الهوم. والخريطة اليدوية لا تُصلح هذا: كل شاشة جديدة تولد بلا رجوع حتى
 * يتذكّر أحدٌ إضافتها، وهو تذكّرٌ لا يقع.
 *
 * فصار القرار ثلاث طبقات، الأولى تسبق ما بعدها:
 *   ① **الخريطة اليدوية تسود** حيث الأب ليس هو السابق في المسار:
 *      `/sec/contractors` أبوه `/sec/access` لا `/sec`.
 *   ② **أبٌ مشتقّ من المسار** حين لا خريطة: يُقطع المقطع الأخير، ويُقبل
 *      الناتج **بشرطين مقيسين لا مفترضين** — أن يكون مسارًا مسجّلًا في
 *      مُسيّر التطبيق فعلًا (`routeExists`)، وألّا يكون محجوبًا
 *      (`hidden-routes`). بغير الشرطين يصير الرجوع بابًا إلى 404 أو إلى
 *      شاشةٍ حجبها المالك — وكلاهما أسوأ من غياب الزر.
 *   ③ **لا زرّ** فيما بقي: شاشةُ المستوى الأوّل (`/sec` · `/settings` ·
 *      `/files`) مخرجها الهوم نفسه، فزرُّ رجوعٍ يقصدها تكرارٌ لا فائدة فيه.
 *
 * **ولماذا ③ تعيد `null` لا `"/"` (نقض حارس الجودة ٢٠٢٦/٠٨/٢٨):** كُتبت
 * أوّلًا تُرجع `"/"`، فصار على نحو ٥٠ شاشةِ مستوًى أوّل زرَّان متجاوران
 * يفعلان الفعل نفسه — وهذا يخالف أمرًا سابقًا صريحًا للمالك (فقرة ١١٧٥ ·
 * ٢٠٢٦/٠٨/٢٠): «الرجوع الذي يفعل فعل الهوم تكرارٌ يُكتفى عنه بالهوم».
 * ويخالف الأمر الجديد نفسه: «الصفحات **التي تحتاج** لزر الرجوع» — وشاشةٌ
 * مخرجها الهوم لا تحتاجه. ويخالف المادة ٢١: سهمٌ مسمًّى «رجوع» يفعل فعل
 * «الرئيسية» لا يُعرّف بنفسه.
 *
 * والرئيسية نفسها تعيد `null` كذلك — لا رجوع من نقطة البداية. وخانة الزرّ
 * تبقى محجوزة حيثما غاب بـ`invisible` كي لا يتزحزح الهوم (الثابت المقيس).
 *
 * دالّة خالصة: وجود المسار يُحقن من الخارج، فتُختبر بلا مُسيّر ولا DOM.
 */
export function resolveBackTarget(
  pathname: string,
  routeExists: (path: string) => boolean,
  isHidden: (path: string) => boolean,
): string | null {
  const path = normalize(pathname);
  if (path === "" || path === "/") return null;

  const mapped = drilldownParent(path);
  if (mapped) return mapped;

  const cut = path.lastIndexOf("/");
  if (cut > 0) {
    const derived = path.slice(0, cut);
    if (!isHidden(derived) && routeExists(derived)) return derived;
  }

  return null;
}
