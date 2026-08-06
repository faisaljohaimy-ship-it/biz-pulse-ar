import { useCallback } from "react";
import { useCanGoBack, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * Global back control — shown on every page except the home shell.
 * RTL-safe: the arrow points right in Arabic, left in English.
 *
 * **الرجوع لا يغادر النظام (إصلاح ٢٠٢٦/٠٨/٠٦).** كان الزر يستدعي
 * `window.history.back()` متى كان `window.history.length > 1`، وهذا الطول
 * يَعُدّ **تاريخ التبويب كله** لا تاريخ التطبيق: أي صفحة زارها المستخدم في
 * التبويب نفسه قبل فتح سَدِيد تبقى مُدخلًا صالحًا. فإن كانت تلك المُدخلة نسخة
 * قديمة من الموقع (نسخة ما قبل إعادة التسمية مثلًا) أعادها المتصفح من ذاكرة
 * التنقّل (bfcache) كما هي — فيرى المالك «الشكل القديم» عائدًا وكأن النظام
 * ارتدّ، بينما البناء الحالي لم يتغيّر إطلاقًا.
 *
 * `useCanGoBack()` يسأل مكدّس المسيّر نفسه: هل دفع **هذا التطبيق** مُدخلة
 * يمكن الرجوع إليها؟ إن لا — فالرجوع الوحيد الآمن هو الرئيسية.
 */
export function GlobalBackButton() {
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();
  const { locale } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isRtl = locale === "ar";

  const goBack = useCallback(() => {
    if (canGoBack) {
      window.history.back();
      return;
    }
    void navigate({ to: "/" });
  }, [canGoBack, navigate]);

  if (pathname === "/" || pathname === "" || pathname === "/index") return null;

  return (
    <div
      /* سقف النظام، مائلًا نحو كلمة «سَدِيد» (قرار المالك ٢٠٢٦/٠٨/٠٦):
         الزرّان يجلسان داخل الشريط العلوي بجوار أيقونة النوافذ من الداخل،
         بإزاحة كافية حتى لا يغطّيا الأيقونة ولا العلامة. */
      className="fixed top-[calc(0.6rem+env(safe-area-inset-top))] z-[70] flex items-center gap-1.5 ltr:left-[5.75rem] rtl:right-[5.75rem]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <button
        type="button"
        onClick={goBack}
        aria-label={isRtl ? "رجوع" : "Back"}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-background/85 px-2.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur-sm transition-colors hover:border-primary/60 hover:bg-primary/10"
      >
        <ArrowRight
          className={`h-4 w-4 text-primary ${isRtl ? "" : "rotate-180"}`}
          aria-hidden="true"
        />
        <span className="hidden lg:inline">{isRtl ? "رجوع" : "Back"}</span>
      </button>
      <button
        type="button"
        onClick={() => void navigate({ to: "/" })}
        aria-label={isRtl ? "الرئيسية" : "Home"}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-background/85 text-foreground shadow-lg backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-primary/10"
      >
        <Home className="h-4 w-4 text-primary" aria-hidden="true" />
      </button>
    </div>
  );
}
