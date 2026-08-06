import { createContext, useContext, useEffect, type ReactNode } from "react";

/**
 * هوية سَدِيد البصرية **داكنة ثابتة** — قرار ٢٠٢٦/٠٨/٠٦ (البندان ٥٧ و٥٨ من
 * سجل التغيير المفتوح).
 *
 * ## لماذا حُسم بالإلغاء لا بالإصلاح
 *
 * البلاغ كان «النظام الفاتح لا يعمل على المنصة كاملة». وقياسٌ فعليّ على
 * الشجرة أعطى الحكم: **١٣٢٩ قيمة داكنة مكتوبة يدويًّا في ١١٦ ملفًا**
 * (`text-white`، `bg-[#04070F]`، `border-white/…`) خارج طبقة الرموز
 * كليًّا. ترحيلها كلّها ترحيلًا صحيحًا — مع تحقّق تباين لكل شاشة — عملُ
 * أسابيع لا جلسة؛ وترحيلها جزئيًّا يُنتج بالضبط ما يشتكي منه المالك:
 * وضعٌ فاتح يعمل هنا ولا يعمل هناك. **الوعد المكسور أسوأ من الوعد
 * المسحوب.**
 *
 * والهوية نفسها داكنة أصلًا: الفيلم الهولوغرامي، والزجاج، والتوهّجات —
 * كلها مصمَّمة على الكحلي، والفاتح كان توأمها الأضعف دائمًا. فالحسم
 * بالإلغاء يوحّد المنتج بدل أن يجزّئه.
 *
 * ## ما بقي عمدًا
 *
 * طبقة `.light` في styles.css (١٠٤ قواعد) **لم تُحذف**. هذه سياسة
 * المستودع نفسها المكتوبة في `hidden-routes.ts`: «إلغاء الإخفاء حذفُ سطر،
 * وإلغاء الحذف حَفريّات». إعادة الوضع الفاتح يومًا ما = إعادة زرٍّ واحد،
 * لا إعادة كتابة طبقة كاملة.
 *
 * ## الشكل المتبقّي
 *
 * `useTheme()` باقٍ بعقده كما هو ويعيد `"dark"` دائمًا، فلا يُلمس أيٌّ من
 * مستهلكيه ولا يتغيّر معرّف واحد. `setTheme` أُزيل: دالةٌ لا تفعل شيئًا
 * أسوأ من غيابها — تُغري بالنداء وتصمت.
 */
export type Theme = "dark";

/** الوضع الوحيد. قيمة لا حالة: لا شيء يبدّلها في وقت التشغيل. */
const FIXED_THEME: Theme = "dark";

const ThemeCtx = createContext<{ theme: Theme } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // السكربت السابق لأول رسم في `__root.tsx` يضع الصنف قبل أي رسم. هذا
  // التأثير حارسٌ لا مُطبِّق: يزيل `light` إن سرّبها تخزينٌ قديم أو امتداد،
  // فلا تبقى نصف شاشة فاتحة بعد قرار التوحيد.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    try {
      localStorage.removeItem("theme");
    } catch {
      /* تخزين محظور — الصنف أعلاه كافٍ لهذه الجلسة. */
    }
  }, []);

  return <ThemeCtx.Provider value={{ theme: FIXED_THEME }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
