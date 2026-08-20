import { useCallback, useEffect } from "react";
import { useCanGoBack, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * متعقّب المسار السابق داخل التطبيق — على مستوى الوحدة عمدًا.
 *
 * الزوج يُركَّب مرتين (ترويسة القشرة + النسخة العائمة، وإحداهما مخفاة
 * بـ`:has()`)، فلو حفظ كلٌّ منهما تاريخه لتضاعف الدفع. الحارس بسيط:
 * لا يتحرّك السجل إلا حين يتغيّر المسار فعلًا، فالتركيب الثاني لا يرى
 * تغيّرًا ولا يكتب شيئًا.
 */
let PREV_PATH: string | null = null;
let LAST_PATH: string | null = null;
function trackPath(pathname: string) {
  if (pathname !== LAST_PATH) {
    PREV_PATH = LAST_PATH;
    LAST_PATH = pathname;
  }
}

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
/**
 * ── قواعد الزوج بأمر المالك ٢٠٢٦/٠٨/٢٠ ──
 *
 * ① **الرجوع عند الحاجة فقط**: يظهر حين يوجد مُدخل تطبيقٍ سابق **يختلف عن
 *    الرئيسية** — فالرجوع الذي يفعل فعل الهوم تكرارٌ يُكتفى عنه بالهوم
 *    (مثال المالك: من صلاحيات الدخول إلى المقاولين تحتاج العودة؛ أما
 *    القادم من الرئيسية فلا رجوع له غيرها).
 * ② **الهوم ثابت مكانه لا يتحرّك**: خانة الرجوع محجوزة دائمًا وتُخفى
 *    بـ`invisible` لا بإزالة العنصر — فاختفاء الرجوع لا يُزيح الهوم بكسلًا.
 * ③ **على المستوى الأفقي نفسه، والرجوع على يسار الهوم**: الصفّ RTL
 *    فالعنصر الأول (الهوم) يقع يمينًا والرجوع بعده يسارًا.
 */
export function BackHomeControls({ className = "" }: { className?: string } = {}) {
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { locale } = useI18n();
  const isRtl = locale === "ar";

  useEffect(() => {
    trackPath(pathname);
  }, [pathname]);

  // الحاجة = مكدّس المسيّر يملك مُدخلًا سابقًا، وذلك المُدخل ليس الرئيسية.
  const backNeeded = canGoBack && PREV_PATH !== null && PREV_PATH !== "/";

  const goBack = useCallback(() => {
    if (canGoBack) {
      window.history.back();
      return;
    }
    void navigate({ to: "/" });
  }, [canGoBack, navigate]);

  return (
    <div className={`flex items-center gap-2 ${className}`} dir="rtl">
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
      <button
        type="button"
        onClick={goBack}
        aria-label={isRtl ? "رجوع" : "Back"}
        title={isRtl ? "رجوع" : "Back"}
        aria-hidden={!backNeeded}
        tabIndex={backNeeded ? 0 : -1}
        className={`${ORB} ${backNeeded ? "" : "invisible pointer-events-none"}`}
      >
        <ArrowRight
          className={`relative size-[1.15rem] text-[color:var(--tone-cyan)] ${isRtl ? "" : "rotate-180"}`}
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
