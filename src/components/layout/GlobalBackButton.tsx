import { useCallback } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { drilldownParent } from "@/lib/nav/drilldowns";

/**
 * **الرجوع لا يغادر النظام (إصلاح ٢٠٢٦/٠٨/٠٦).** كان الزر يستدعي
 * `window.history.back()` متى كان `window.history.length > 1`، وهذا الطول
 * يَعُدّ **تاريخ التبويب كله** لا تاريخ التطبيق: أي صفحة زارها المستخدم في
 * التبويب نفسه قبل فتح سَدِيد تبقى مُدخلًا صالحًا. فإن كانت تلك المُدخلة نسخة
 * قديمة من الموقع أعادها المتصفح من ذاكرة التنقّل (bfcache) كما هي — فيرى
 * المالك «الشكل القديم» عائدًا وكأن النظام ارتدّ، بينما البناء الحالي لم
 * يتغيّر إطلاقًا.
 *
 * `useCanGoBack()` يسأل مكدّس المسيّر نفسه: هل دفع **هذا التطبيق** مُدخلة
 * يمكن الرجوع إليها؟ إن لا — فالرجوع الوحيد الآمن هو الرئيسية.
 */
/**
 * هيئة واحدة للزرّين، منسوخة عن `NexusOrb` عمدًا: القرص الزجاجي نفسه
 * (`border-primary/30 bg-card/40 backdrop-blur-md`) والمقاس نفسه (44px =
 * أدنى هدف لمس مقبول) والاستدارة نفسها. المطلوب محاذاةٌ بصرية لا تقارب،
 * فالفرق في المقاس أو الاستدارة يُقرأ فورًا على أنه صفّان لا صفّ.
 * والزجاج نفسه هو ما يحفظ مقروئية الزرّين فوق أي خلفية حين يمرّ المحتوى
 * تحتهما بالسكرول.
 */
const ORB =
  "nx-orb relative inline-flex size-11 shrink-0 items-center justify-center rounded-full " +
  "border border-primary/30 bg-card/40 text-foreground shadow-lg backdrop-blur-md " +
  "transition-colors hover:border-primary/60 hover:bg-primary/10 " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background";

/**
 * ── قواعد الزوج بأمر المالك (٢٠٢٦/٠٨/٢٠ ثم فقرة 1175) ──
 *
 * ① **الرجوع عند الحاجة فقط**: يظهر حين يوجد مُدخل تطبيقٍ سابق **يختلف عن
 *    الرئيسية** — فالرجوع الذي يفعل فعل الهوم تكرارٌ يُكتفى عنه بالهوم.
 * ② **الهوم ثابت مكانه لا يتحرّك — بالقياس لا بالنية**: خانة الرجوع محجوزة
 *    دائمًا وتُخفى بـ`invisible` لا بإزالة العنصر، والزوج كلّه `fixed` على
 *    إحداثيات من طبقة الرموز وحدها (`.nx-backhome-pin` في styles.css) لا
 *    تتبدّل بحالة DOM ولا بصفحةٍ دون أخرى.
 * ③ **على المستوى الأفقي نفسه، والرجوع على يسار الهوم**: الصفّ RTL
 *    فالعنصر الأول (الهوم) يقع يمينًا والرجوع بعده يسارًا.
 *
 * **لماذا عاد الزوج مثبّتًا بعد أن كان داخل صفّ الترويسة (قياس ٢٠٢٦/٠٨/٢٤).**
 * الحل السابق ركّب نسخة داخل ترويسة الجوال ونسخة عائمة تُحسم بينهما
 * بـ`:has()`. قيست إحداثيات زر الهوم فعليًا على ست صفحات بمقاسي 390/1280
 * فظهرت أربع حركات لا واحدة:
 *   ١. على 1280 يقفز الزوج من إزاحة ٦٨px إلى ٢٧٢px عن الحافة بعد ~٢.٥ث من
 *      كل فتح مباشر — لأن `body:has(.nexus-sidebar)` لا يصدق إلا بعد أن
 *      تُركَّب القشرة (`ssr:false`)، فالإحداثي كان يتبع حالة DOM.
 *   ٢. على 390 يتبادل زرّان مختلفان (عائم ثم سطري) بفارق ~٧px.
 *   ٣. النسخة السطرية داخل ترويسةٍ `sticky` معطّلة اللصوق (سلفها
 *      `overflow-x-hidden`) — فيغادر الهوم الشاشة كليًّا عند السكرول
 *      (قيس y=-257 بعد سكرول 300).
 *   ٤. الرئيسية لا تعرض الزوج أصلًا، فيظهر ويختفي بين صفحة وأخرى.
 * العلاج: زوج واحد تفاعلي في الجذر، `fixed` بإحداثيات ثابتة، يُرسم على
 * **كل** الصفحات بما فيها الرئيسية — والقياس بعد الإصلاح أثبت تطابق
 * الإحداثيات بالبكسل عبر الصفحات والحالتين.
 */
function BackHomePair({ className = "" }: { className?: string } = {}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { locale } = useI18n();
  const isRtl = locale === "ar";

  // الحاجة صفةُ مكان لا صفةُ رحلة (V5 · ملاحظات العميل): الشاشات التفصيلية
  // وحدها لها أبٌ مكتوب في `drilldowns.ts`، وما عداها لا زرّ رجوع فيه.
  const parent = drilldownParent(pathname);
  const backNeeded = parent !== null;

  const goBack = useCallback(() => {
    void navigate({ to: parent ?? "/" });
  }, [parent, navigate]);

  return (
    <div className={`flex items-center gap-2 ${className}`} dir="rtl">
      <button
        type="button"
        onClick={() => void navigate({ to: "/" })}
        aria-label={isRtl ? "الرئيسية" : "Home"}
        title={isRtl ? "الرئيسية" : "Home"}
        aria-current={pathname === "/" || pathname === "" ? "page" : undefined}
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
 * خانة الممرّ في ترويسة الجوال — **حجز مساحة لا أزرار.**
 *
 * القشرة (`AppShell`) تستورد هذا الاسم وتركّبه في صفّ ترويستها بجوار مدار
 * النوافذ. الزوج التفاعلي صار واحدًا مثبّتًا في الجذر (`GlobalBackButton`
 * أدناه) يطفو فوق هذا الموضع نفسه؛ فلو بقيت هنا أزرار حقيقية لتضاعف الزوج
 * وتحرّك الهوم عند تبادل النسختين — وهو عين ما قاسه التشخيص.
 *
 * فما يبقى هنا هو **بصمة القدم وحدها**: عرض الزوج (44 + 8 + 44) بلا رسم ولا
 * تفاعل ولا شجرة وصول، كي يواصل `justify-between` توزيع جيران الترويسة
 * (المدار · الشعار · الأدوات) كما لو كان الزوج بينهم — فلا يجلس الشعار تحت
 * الزوج المثبّت. إزالة هذه الخانة من القشرة تُزحزح الشعار إلى تحت الزوج.
 */
export function BackHomeControls({ className = "" }: { className?: string } = {}) {
  return (
    <div
      aria-hidden="true"
      className={`invisible pointer-events-none flex shrink-0 items-center gap-2 ${className}`}
    >
      <span className="size-11 shrink-0" />
      <span className="size-11 shrink-0" />
    </div>
  );
}

/**
 * الزوج المثبّت — يُركَّب مرّة واحدة في `__root.tsx` ويُرسم على كل صفحة،
 * **بما فيها الرئيسية**: إخفاؤه هناك كان أول حركات الهوم المقيسة (يظهر
 * ويختفي بين صفحة وأخرى). موضعه كلّه في `.nx-backhome-pin` بطبقة الرموز؛
 * وهو خارج `RouteTransition` عمدًا فلا يتحرّك مع انتقالات المسار.
 */
export function GlobalBackButton() {
  return <BackHomePair className="nx-backhome-pin" />;
}
