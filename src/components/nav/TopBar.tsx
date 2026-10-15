/**
 * الشريط العلوي — الساعة والأزرار الثلاثة في **صفٍّ واحد مرسوم**.
 *
 * نصّ أمر المالك ٢٠٢٦/٠٩/١٢: «اجعل الأيقونات ثابتة في الخلفية أو قم
 * بتغييرها واستبدالها بأيقونات ثابتة في أعلى صفحات النظام». وهذا تنفيذ
 * الشقّ الثاني، بعد أن أثبت القياس أن الشقّ الأول **ليس هو العطل**.
 *
 * ## ما الذي قاسته الأداة وما الذي أخطأته
 *
 * الشكوى تكرّرت ثلاث مرّات بصيغ متقاربة، وكنت في كل مرّة أقيس
 * **الإحداثيات**: ٢٦ عيّنة من أول إطار (t=2ms)، وسكرول برمجيّ، وسحب لمسيّ
 * عشر خطوات بعد نهاية الصفحة على جهازٍ باللمس. النتيجة في الثلاثة واحدة:
 * حالةٌ واحدة لا تتبدّل، `animationName: none` على الطبقة والزرّ والرمز
 * معًا، و`x`/`y` ثابتان إلى البكسل. فالطبقة `fixed` كانت تفعل ما وُعدت به
 * تمامًا.
 *
 * ثم التُقطت لقطة: الأزرار **أقراصٌ زجاجية شفّافة تطفو فوق المحتوى**.
 * وشريط الساعة تحتها ليس لاصقًا فعلًا (سلفه `overflow-x: hidden` فيصير
 * حاوية السكرول، فيمضي الشريط مع الصفحة)، فبعد أول تمريرة لا يبقى خلف
 * الأقراص شيء: تطفو على الجوال فوق بطاقةٍ يمرّ عنوانها **من خلالها**،
 * وعلى المكتب فوق شعار الشريط الجانبي.
 *
 * فالذي رآه المالك حركةً ليس حركة الزرّ — بل **حركة المحتوى خلاله**.
 * والإحداثية الثابتة لا تُسكت ذلك ولا تراه أداة تقيس `getBoundingClientRect`.
 *
 * ## العلاج: لا طبقة عائمة أصلًا
 *
 * الأزرار نزلت إلى **صفّ شريط الساعة نفسه** — الشريط الوحيد الموجود في
 * أعلى كل صفحة — وصار الشريط `fixed` بسندٍ في المسار (`.nx-topbar-spacer`)
 * يحجز ارتفاعه. فالمحتوى يمرّ **خلف سطحٍ مرسوم** لا خلال قرصٍ شفّاف، ولا
 * تبقى في النظام طبقةٌ عائمة يمكن أن تنزلق أو يُرى المحتوى عبرها.
 *
 * وثبات الشريط الآن أقوى مما كان: `sticky` كان يكذب لأن سلفه حاوية سكرول،
 * و`fixed` لا يسأل عن السلف.
 *
 * ## والساعة لا تُقصّ — قرار المالك ٢٠٢٦/٠٨/٠٦ باقٍ
 *
 * يومها كان الزوج يطفو **داخل** الشريط فيقصّ التاريخ (المرفق IMG_9412)،
 * فنزل الزوج وسقط الممرّ المحجوز. وعودتهما اليوم إلى الصفّ نفسه ليست
 * نقضًا لذلك القرار: الفارق أنهما **عضوان في الصفّ** يأخذان عرضهما من
 * `flex` لا يطفوان فوقه، وخانة الساعة `flex: 1 1 auto` تأخذ ما بقي.
 * وقِيس العرض الباقي على ٣٩٠ بكسل قبل الاعتماد.
 *
 * ## ثلاثة نطاقات لا نطاق واحد
 *
 *   ① **المبدّل — الرئيسية وحدها** («في أعلى الصفحة الرئيسية»). والرئيسية
 *      مسارَان لصفحةٍ واحدة (`/` و`/blueprint` يصيّران `BlueprintPage`
 *      نفسه)، فالنطاق الصفحة لا العنوان.
 *      **ومكانه صفّ ترويسة النظام لا هذا الشريط** (مركز القيادة، أمر المالك
 *      ٢٠٢٦/١٠/١٣ — «طبّق هذا الشكل بالتمام والكمال»: الشمس بين التطبيقات
 *      والمساعدة كما في الصورة). فالقرار هنا (`showTheme`) والرسم في
 *      `SystemHeader` وحده — **وهذا الشريط لا يرسم مبدّلًا أصلًا**، فلا
 *      مبدّلان على صفحةٍ واحدة بنيويًّا لا بشرطٍ يُنسى.
 *   ② **الهوم — كل صفحةٍ ليست الرئيسية.** الحاجة مقيسة لا مقدَّرة: الشريط
 *      الجانبي خمسة أزرار ليس فيها الرئيسية (أمر المالك ٢٠٢٦/٠٨/٢٠)،
 *      والشعار ليس رابطًا، ولوحة الأوامر بلا زرٍّ ظاهر فلا تُفتح باللمس.
 *   ③ **الرجوع — ما له أبٌ يختلف عن الهوم.** القرار في `resolveBackTarget`
 *      لا هنا. وشاشةُ المستوى الأوّل مخرجها الهوم، فزرُّ رجوعٍ يقصده تكرارٌ
 *      نهى عنه المالك صراحةً (فقرة ١١٧٥).
 */
import { useCallback } from "react";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Home } from "lucide-react";
import { LiveClock } from "@/components/LiveClock";
import { useI18n } from "@/lib/i18n";
import { resolveBackTarget } from "@/lib/nav/drilldowns";
import { isRouteHidden } from "@/lib/nav/hidden-routes";

/**
 * الرئيسية بمسارَيها: `index.tsx` و`blueprint.tsx` يصيّران `BlueprintPage`
 * نفسه — «تسجيلان لصفحةٍ واحدة». فنطاق المبدّل الصفحة لا العنوان، وإلا
 * ظهر على أحدهما وغاب عن الآخر وهما شاشةٌ واحدة.
 */
const HOME_PATHS: ReadonlySet<string> = new Set(["/", "/blueprint"]);

/** المسار بلا مائلة ختامية — `/sec/` و`/sec` مكانٌ واحد. */
function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export type ChromeSlots = {
  /** الهوم: كل صفحةٍ ليست الرئيسية. */
  showHome: boolean;
  /** الرجوع: ما له أبٌ يختلف عن الهوم — الوجهة نفسها لا مجرّد راية. */
  backTarget: string | null;
  /**
   * المبدّل: الرئيسية وحدها — ويرسمه صفّ ترويسة النظام (`SystemHeader`) لا
   * هذا الشريط (مركز القيادة ٢٠٢٦/١٠/١٣). مبدّلٌ واحد على الصفحة.
   */
  showTheme: boolean;
};

/**
 * قرار النطاقات الثلاثة — **دالّة خالصة، مصدرٌ واحد يقرؤه الشريط وحارسه.**
 *
 * خالصةٌ عمدًا (وجود المسار والحجب يُحقنان): فتُختبر بالمساواة على عشرات
 * المسارات بلا مُسيّر ولا DOM — وهذا هو الفرق بين حارسٍ يقيس القاعدة
 * وحارسٍ يقرأ نصّ المكوّن.
 */
export function resolveChromeSlots(
  pathname: string,
  routeExists: (path: string) => boolean,
  isHidden: (path: string) => boolean,
): ChromeSlots {
  const onHomePage = HOME_PATHS.has(normalizePath(pathname));
  return {
    showHome: !onHomePage,
    backTarget: resolveBackTarget(pathname, routeExists, isHidden),
    showTheme: onHomePage,
  };
}

/**
 * القرار نفسه للمكوّنات: الشريط يقرأ منه الهوم والرجوع، وترويسة النظام تقرأ
 * منه المبدّل — مصدرٌ واحد لا شرطا مسارٍ في ملفّين يفترقان يومًا.
 */
export function useChromeSlots(): ChromeSlots {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // وجود المسار يُسأل عنه المُسيّر نفسه: الاشتقاق النصّي وحده يفتح بابًا
  // إلى 404 حين يبدو المقطع أبًا وليس مسجّلًا.
  const routeExists = useCallback(
    (path: string) => Object.hasOwn(router.routesByPath, path),
    [router],
  );

  return resolveChromeSlots(pathname, routeExists, isRouteHidden);
}

interface TopBarProps {
  /** تُخفى الساعة على `/promo` وحدها؛ والأزرار تبقى بنطاقاتها. */
  readonly showClock?: boolean;
}

export function TopBar({ showClock = true }: TopBarProps) {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const ar = locale === "ar";
  // `showTheme` لا يُقرأ هنا: المبدّل في صفّ ترويسة النظام على الرئيسية.
  const { showHome, backTarget } = useChromeSlots();

  const goHome = useCallback(() => void navigate({ to: "/" }), [navigate]);
  const goBack = useCallback(() => {
    if (backTarget) void navigate({ to: backTarget });
  }, [backTarget, navigate]);

  // شريطٌ بلا ساعةٍ ولا زرّ سطحٌ مرسوم بلا مضمون — ويحجز سنده ارتفاعًا لا
  // شيء فيه. فلا يُركَّب أصلًا.
  if (!showClock && !showHome && !backTarget) return null;

  return (
    <>
      {/* السند: يحجز في المسار ما يشغله الشريط المثبَّت، فيبدأ المحتوى
          تحته لا خلفه. بغيره تُغطّى أول ٤٤ بكسل من كل صفحة. */}
      <div aria-hidden className="nx-topbar-spacer" />

      <div
        dir="ltr"
        // `nx-clock-bar` هو المقبض الذي يقلب هذا الشريط في الوضع الفاتح
        // والداكن (‏١٠ قواعد في styles.css، منها `.nx-clock-bar *` التي
        // تفرض حبر الشريط على كل سليل). **الاسم يبقى وإن صار الشريط أوسع
        // من الساعة**: تغييره تحرير عشر قواعد انقلابٍ دقيقة لا يلتقط
        // خطأها tsc ولا lint — والمكسب اسمٌ فقط.
        className="nx-clock-bar nx-topbar pointer-events-none w-full overflow-hidden border-b border-[#3AE8FF]/30 bg-gradient-to-r from-[#02101e] via-[#04243c] to-[#02101e] shadow-[0_4px_24px_-8px_rgba(0,212,255,0.4)]"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* الارتفاع من `--nx-clockbar-h` لا من أدوات `h-*`: السند يقرأ
            الرقم نفسه، فلو كُتب مرّتين افترقا يومًا بصمت وانكشف تحت
            الشريط خطٌّ فارغ أو اختفت أول سطور الصفحة. */}
        <div className="nx-clock-row relative flex items-center">
          {/* (جهة اليسار كانت للمبدّل على الرئيسية. انتقل إلى صفّ ترويسة
              النظام — مركز القيادة ٢٠٢٦/١٠/١٣ — فلا يُرسم هنا أصلًا.) */}

          {showClock ? (
            <div className="nx-clock-slot pointer-events-auto">
              <LiveClock className="!border-transparent !bg-transparent !px-0 !py-0 !shadow-none" />
            </div>
          ) : (
            // بلا ساعة تبقى الخانة المرنة وحدها، فيلزم الزوج طرفه الأيمن
            // بدل أن ينزلق إلى المنتصف.
            <div className="flex-1" />
          )}

          {/* جهة اليمين: التنقّل — الهوم ثم الرجوع بعده. الهوم أوّلًا فلا
              يتزحزح حين يظهر الرجوع أو يغيب. */}
          {(showHome || backTarget) && (
            <div className="nx-topbar-slot pointer-events-auto" dir={ar ? "rtl" : "ltr"}>
              {showHome && (
                <button
                  type="button"
                  onClick={goHome}
                  aria-label={ar ? "الصفحة الرئيسية" : "Home"}
                  title={ar ? "الصفحة الرئيسية" : "Home"}
                  className="nx-chrome-btn"
                >
                  <Home className="nx-chrome-ico" aria-hidden />
                </button>
              )}
              {backTarget && (
                <button
                  type="button"
                  onClick={goBack}
                  aria-label={ar ? "الرجوع للصفحة السابقة" : "Back"}
                  title={ar ? "الرجوع للصفحة السابقة" : "Back"}
                  className="nx-chrome-btn"
                >
                  {/* السهم يقصد جهة البداية: يمينًا في RTL ويسارًا في LTR. */}
                  <ArrowRight className={`nx-chrome-ico ${ar ? "" : "rotate-180"}`} aria-hidden />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
