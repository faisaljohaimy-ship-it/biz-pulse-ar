/**
 * بوابة «مرّة واحدة في الجلسة» للمقدّمة السينمائية.
 *
 * ── لماذا `sessionStorage` لا `localStorage` ──
 * `localStorage` يبقى إلى الأبد، فمن رأى المقدّمة مرّةً لا يراها ثانيةً ولو
 * بعد شهر — وهذا يقتل غرضها: العرض التنفيذي يُفتح على جهازٍ عُرض عليه من
 * قبل، فيدخل المالك مباشرةً إلى الرئيسية بلا مقدّمة أمام العميل.
 * `sessionStorage` ينتهي بإغلاق التبويب: تُعرض مرّةً في كل جلسة عمل، ولا
 * تتكرّر مع كل تنقّل داخل الجلسة نفسها.
 *
 * ── ولماذا مفتاحٌ جديد لا إعادة استعمال مفتاح قائم ──
 * `aria-voice-muted` عقدٌ حيّ (حالة مستخدم قائمة) ولا يُمسّ. هذا مفتاح
 * مستقلّ، والكتم يبقى قراره منفصلًا عن رؤية المقدّمة.
 */

export const SADEED_INTRO_SEEN_KEY = "sadeed-intro-seen";

/**
 * هل عُرضت المقدّمة في هذه الجلسة؟
 *
 * كل وصول إلى التخزين داخل `try` — المتصفّح يرمي فعلًا حين تُمنع ملفات
 * الموقع (نافذة خاصة، إعداد يحجب بيانات المواقع)، والرمية غير الملتقطة هنا
 * تُسقط الجذر كلّه لا المقدّمة وحدها. والافتراض عند الفشل «لم تُعرض» عمدًا:
 * أن تُعرض مرّتين أهون من ألّا تُعرض أبدًا.
 */
export function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return true; // الخادم لا يعرض مقدّمة
  try {
    return window.sessionStorage.getItem(SADEED_INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** تُعلَّم فور بدء العرض لا عند نهايته — فإعادة التحميل وسط المقدّمة لا تعيدها. */
export function markIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SADEED_INTRO_SEEN_KEY, "1");
  } catch {
    /* التخزين محجوب — تُعرض مرّةً أخرى، وهذا مقبول */
  }
}

/** للاختبار ولزرّ «أعد عرض المقدّمة» إن أُضيف لاحقًا. */
export function clearIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SADEED_INTRO_SEEN_KEY);
  } catch {
    /* ignore */
  }
}
