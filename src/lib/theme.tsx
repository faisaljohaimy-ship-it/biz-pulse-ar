import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * وضعا سَدِيد — **الداكن أساسًا والفاتح اختيارًا** (قرار المالك ٢٠٢٦/٠٨/٠٦،
 * ناسخٌ لقرار التوحيد على الداكن في اليوم نفسه).
 *
 * ## ما الذي تغيّر ولماذا
 *
 * أُلغي المبدّل صباحًا لأن الوضع الفاتح كان مكسورًا: **١٢٨٧ قيمة داكنة
 * مكتوبة يدويًّا في ١٤٥ ملفًا** خارج طبقة الرموز، فالوضع الفاتح كان يقلب
 * الرموز ولا يقلبها. ثم طلب المالك عودة المبدّل على الجوال وكل الأجهزة،
 * فعاد — لكن ليس كما كان: عودته وحدها كانت ستعيد العطل نفسه.
 *
 * الجسر في `styles.css` هو ما يجعلها عودةً صالحة. لبّه سطرٌ واحد:
 * Tailwind v4 يُصرّف **كل** أدوات الأبيض عبر `var(--color-white)` —
 * `text-white` و`text-white/60` و`border-white/10` و`bg-white/5` جميعها.
 * فإعادة تعريف هذا المتغيّر وحده تحت `.light` تقلب ١٠٧٢ موضعًا دفعةً
 * واحدة **مع حفظ تدرّج الشفافية في كل موضع**. لا تعديل على ملف مكوّن
 * واحد، ولا خطر على الوضع الداكن لأن القاعدة محصورة بـ`.light`.
 *
 * ## الأساس يبقى داكنًا
 *
 * لا قراءة لتفضيل النظام: من لم يختر يحصل على الداكن — الهوية مصمَّمة
 * عليه (الفيلم والزجاج والتوهّجات). والفاتح اختيارٌ صريح يُحفظ.
 *
 * ## المبدّل: أُزيل يومًا ثم عاد بموضعٍ محدَّد
 *
 * ٢٠٢٦/٠٩/١٠ أمر المالك بإزالة أيقونات تغيير الوضع والجرس والرجوع والهوم
 * «من النظام كاملًا» فسقط الزرّ وسقط معه `toggle`، وبقي المحرّك وحده —
 * إذ المأمور به إزالة العلامة لا نظام الألوان.
 *
 * ثم أمر ٢٠٢٦/٠٩/١١ بإعادته: «أضف أيقونة زر تغيير الوضعية ثابتة في أعلى
 * الصفحة الرئيسية». فعاد الزرّ و`toggle` معه — **بنطاقٍ أضيق مما كان**:
 * الرئيسية وحدها، لا كل مسار. موضعه في `components/nav/TopChrome.tsx`.
 *
 * وبقاءُ المحرّك خلال يوم الغياب هو ما جعل العودة سطرين: لم تُمسّ طبقة
 * الوضعين ولا القراءة قبل أول رسم، فلم يسقط فحص الوضعين
 * (`tests/e2e/14-lottie-theme.spec.ts`) ولا سقفُ المادة ٣٢.
 */
export type Theme = "dark" | "light";

/** ما يحصل عليه من لم يختر. الهوية داكنة، والفاتح قرارٌ لا افتراض. */
export const DEFAULT_THEME: Theme = "dark";

/** المفتاح نفسه الذي يقرأه السكربت السابق لأول رسم في `__root.tsx`. */
export const THEME_KEY = "theme";

const ThemeCtx = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
} | null>(null);

/** يكتب الوضع على الجذر — نقطة التطبيق الوحيدة، فلا يتنازع كاتبان. */
function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // تبدأ داكنة كما يرسمها الخادم تمامًا، فلا يختلف أول رسمٍ على العميل عن
  // الخادم. السكربت السابق لأول رسم يكون قد وضع الصنف الصحيح على `<html>`
  // قبل ذلك، والمزامنة أدناه تُلحق حالة React به بلا وميض.
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {
      /* تخزين محظور — يبقى الافتراضي لهذه الجلسة. */
    }
    const next: Theme = stored === "light" || stored === "dark" ? stored : DEFAULT_THEME;
    setThemeState(next);
    apply(next);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* تخزين محظور — الاختيار يسري لهذه الجلسة. */
    }
  }, []);

  // **عاد `toggle` بعودة زرّه (أمر المالك ٢٠٢٦/٠٩/١١).** سقط يومًا مع
  // المبدّل لئلّا يبقى خطّافًا موصولًا بلا زرّ، ثم أمر المالك بإعادة
  // المبدّل إلى أعلى الرئيسية فعاد معه.
  //
  // ويقرأ **صنف الجذر** لا حالة React: الحالة تبدأ داكنة دائمًا لتطابق
  // ما يرسله الخادم، بينما السكربت السابق لأول رسم يكون قد وضع الصنف
  // الصحيح فعلًا — فقراءةُ الحالة تقلب الوضع الخطأ عند أول ضغطة لمن
  // اختار الفاتح.
  const toggle = useCallback(
    () => setTheme(document.documentElement.classList.contains("light") ? "dark" : "light"),
    [setTheme],
  );

  return <ThemeCtx.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
