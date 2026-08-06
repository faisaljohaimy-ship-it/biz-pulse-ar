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
/**
 * هيئة واحدة للزرّين، منسوخة عن `NexusOrb` عمدًا: القرص الزجاجي نفسه
 * (`border-primary/30 bg-card/40 backdrop-blur-md`) والمقاس نفسه (44px =
 * أدنى هدف لمس مقبول) والاستدارة نفسها. المطلوب محاذاةٌ بصرية لا تقارب،
 * فالفرق في المقاس أو الاستدارة يُقرأ فورًا على أنه صفّان لا صفّ.
 *
 * `nx-orb` تضمّ الزرّين إلى عائلة النبض نفسها التي عليها الجرس والمبدّل،
 * فيتنفّس السقف كلّه بإيقاع واحد بدل جزيرتين ساكنتين بين نابضات.
 */
const ORB =
  "nx-orb relative inline-flex size-11 shrink-0 items-center justify-center rounded-full " +
  "border border-primary/30 bg-card/40 text-foreground shadow-lg backdrop-blur-md " +
  "transition-colors hover:border-primary/60 hover:bg-primary/10 " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background";

/**
 * الزرّان بلا موضع — ليُركَّبا داخل صفٍّ قائم.
 *
 * **لماذا انفصل الشكل عن الموضع (٢٠٢٦/٠٨/٠٦).** أوّل محاولة أبقتهما عائمَين
 * (`fixed`) وحسبت لهما إحداثيًّا يقع في صفّ الترويسة. والحساب صحّ — قِيس على
 * الصفحة الحيّة: أعلى الزرّ ٤٣ بكسلًا، وأعلى مدار النوافذ ٤٣ بكسلًا. ومع ذلك
 * كانت النتيجة خطأً، لأن العائم **لا يزيح شيئًا**: جلس الزوج فوق شعار
 * سَدِيد فحجبه، فظهر الشعار شبحًا خلف زجاج زرّ الرئيسية.
 *
 * الدرس: المحاذاة البصرية لا تُحسب، **تُترك للتخطيط**. داخل الصفّ نفسه يوزّع
 * flexbox المساحة فيحاذي الزوجُ جيرانَه ويُفسحون له معًا — بلا رقمٍ يُصان
 * ولا تصادمٍ يُكتشف بعد حين.
 */
export function BackHomeControls({ className = "" }: { className?: string } = {}) {
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();
  const { locale } = useI18n();
  const isRtl = locale === "ar";

  const goBack = useCallback(() => {
    if (canGoBack) {
      window.history.back();
      return;
    }
    void navigate({ to: "/" });
  }, [canGoBack, navigate]);

  return (
    <div className={`flex items-center gap-2 ${className}`} dir={isRtl ? "rtl" : "ltr"}>
      <button
        type="button"
        onClick={goBack}
        aria-label={isRtl ? "رجوع" : "Back"}
        title={isRtl ? "رجوع" : "Back"}
        className={ORB}
      >
        <ArrowRight
          className={`relative size-[1.15rem] text-[color:var(--tone-cyan)] ${isRtl ? "" : "rotate-180"}`}
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        onClick={() => void navigate({ to: "/" })}
        aria-label={isRtl ? "الرئيسية" : "Home"}
        title={isRtl ? "الرئيسية" : "Home"}
        className={ORB}
      >
        <Home
          className="relative size-[1.15rem] text-[color:var(--tone-cyan)]"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

/**
 * النسخة العائمة — **للصفحات التي لا قشرة لها وحدها.**
 *
 * القشرة (`AppShell`) تركّب `BackHomeControls` داخل ترويستها مباشرةً، فيحاذي
 * الزوجُ مدارَ النوافذ بالتخطيط لا بالحساب. لكن صفحاتٍ كثيرة تقع خارجها
 * (السياسات، الاتفاقيات، الصفحات المستقلّة) ولا ترويسة فيها تُركَّب داخلها،
 * فتبقى لها هذه النسخة العائمة.
 *
 * وأيّهما يظهر يُحسم في `styles.css` بـ`:has()` — تسأل الصفحةُ نفسَها:
 * أثمّة ترويسة قشرة؟ فيختفي العائم حيث لا لزوم له. لا رايةً تُمرَّر ولا
 * سياقًا يجب أن يصعد فوق موضع التركيب.
 */
export function GlobalBackButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/" || pathname === "" || pathname === "/index") return null;
  return <BackHomeControls className="nx-backhome" />;
}
