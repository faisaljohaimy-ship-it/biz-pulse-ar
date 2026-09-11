/**
 * قشرة الأعلى — ثلاثة أزرار مثبّتة (أمر المالك ٢٠٢٦/٠٩/١١).
 *
 * نصّ الأمر: «أضف أيقونة زر تغيير الوضعية ثابتة في أعلى الصفحة الرئيسية +
 * أيقونة الهوم في أعلى صفحات النظام التي تحتاج إلى زر الهوم ثابتة +
 * أيقونة الرجوع للصفحة السابقة في أعلى صفحات النظام التي تحتاج إليها،
 * جميعها ثابتة في أعلى الصفحات مع اختيار الشكل المناسب والموقع المناسب
 * والتنسيق الدقيق ذي الجمالية والتناسق مع الصفحات».
 *
 * ## ثلاثة نطاقات لا نطاق واحد — وهذا لبّ الأمر
 *
 * سبق أن كانت هذه الأزرار موجودة ثم أُزيلت كلُّها (٢٠٢٦/٠٩/١٠). وعودتها
 * اليوم **ليست استرجاعًا**: الأمر يحدّد لكل زرٍّ نطاقه بعبارته، والجرس لم
 * يُذكر فلم يعُد.
 *
 *   ① **المبدّل — الرئيسية وحدها.** «في أعلى الصفحة الرئيسية». والرئيسية
 *      مسارَان لصفحةٍ واحدة (`/` و`/blueprint` يصيّران `BlueprintPage`
 *      نفسه)، فالنطاق الصفحة لا العنوان.
 *   ② **الهوم — كل صفحةٍ ليست الرئيسية.** «الصفحات التي تحتاج إلى زر
 *      الهوم»: الحاجة هنا مقيسة لا مقدَّرة — الشريط الجانبي خمسة أزرار
 *      ليس فيها الرئيسية (أمر المالك ٢٠٢٦/٠٨/٢٠)، والشعار ليس رابطًا،
 *      ولوحة الأوامر بلا زرٍّ ظاهر فلا تُفتح باللمس. فكل شاشةٍ داخلية
 *      تحتاجه فعلًا، والرئيسية وحدها لا تحتاج زرًّا إلى نفسها.
 *   ③ **الرجوع — ما له أبٌ يختلف عن الهوم.** «الصفحات التي تحتاج إليها».
 *      والقرار في `resolveBackTarget` لا هنا: خريطةٌ يدوية تسبق اشتقاقًا
 *      من المسار مشروطًا بوجود المسار وعدم حجبه. وشاشةُ المستوى الأوّل
 *      مخرجها الهوم، فزرُّ رجوعٍ يقصده تكرارٌ نهى عنه المالك صراحةً
 *      (فقرة ١١٧٥): «الرجوع الذي يفعل فعل الهوم تكرارٌ يُكتفى عنه بالهوم».
 *
 * ولأن النطاقات ثلاثة متقاطعة، جُمعت في مكوّنٍ واحد: قرارُ «أيُّ زرٍّ على
 * أيّ صفحة» يُقرأ في موضعٍ واحد بدل ثلاثة ملفّات وشرطٍ رابع في الجذر —
 * وتلك البعثرة هي ما أنتج سابقًا مبدّلَين متراكبَين على الرئيسية.
 *
 * ## «ثابتة» — الدرس المقيس لا النيّة
 *
 * الطبقة `fixed` بإحداثيات من **طبقة الرموز وحدها**. وهذا ليس ذوقًا:
 * قِيست الإحداثيات فعلًا على تسعة مسارات × قبل/بعد السكرول × مقاسين حين
 * كان الموضع يتبع حالة DOM (`body:has(.nexus-sidebar)`)، فظهرت قفزة
 * ‏68px→272px بعد ~٢٫٥ث من كل فتح — لأن الشرط لا يصدق إلا بعد تركيب
 * القشرة (`ssr:false`). فالقاعدة المستخلَصة: **لا `:has()` على إحداثيات
 * المثبَّت أبدًا**؛ وما يحتاج معرفة القشرة (حشوة الشريط الجانبي) يُزاح هو
 * لا المثبَّت.
 *
 * ومعها ثلاثة دروس مقيسة أخرى، كلٌّ منها وُلد من شكوى: إعفاءٌ من حركة
 * الدخول `nx-ico-rise` (الزرّ كان «ينهض» 5.76px بعد كل تحميل)، ونزعُ
 * التوهّج عن الطبقتين الزائفتين وعن الرمز نفسه، وطبقةٌ عند 120 تعلو حاجب
 * لوحة سَدِيد (105) وصندوقها (110) — وإلا رُسم الزرّ ظاهرًا **ولا يُنقر**.
 * تفصيلها في `top-chrome.contract.test.ts` وفي طبقة الأنماط.
 *
 * ## الشكل — قرصٌ واحد لثلاثتها
 *
 * ‏44×44 دائريّ زجاجيّ من طبقة الرموز (`--chip` · `--hairline` · `--ink-2`)،
 * وهو مقاس `NexusOrb` المجاور في ترويسة الجوال ومقاس أدنى هدف لمس مقبول
 * (WCAG 2.5.8) معًا. والتناسق مقصود: زرٌّ بهيئةٍ غير هيئة جيرانه في الصفّ
 * نفسه يُقرأ صفًّا ثانيًا لا عضوًا في الصفّ.
 */
import { useCallback } from "react";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Home, Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { resolveBackTarget } from "@/lib/nav/drilldowns";
import { isRouteHidden } from "@/lib/nav/hidden-routes";

/**
 * الرئيسية بمسارَيها: `index.tsx` و`blueprint.tsx` يصيّران `BlueprintPage`
 * نفسه — «تسجيلان لمساعد واحد». فنطاق المبدّل الصفحة لا العنوان، وإلا
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
  /** المبدّل: الرئيسية وحدها. */
  showTheme: boolean;
};

/**
 * قرار النطاقات الثلاثة — **دالّة خالصة، مصدرٌ واحد يقرأه المكوّن
 * وبصمتُه معًا.**
 *
 * خالصةٌ عمدًا (وجود المسار والحجب يُحقنان): فتُختبر بالمساواة على عشرات
 * المسارات بلا مُسيّر ولا DOM — وهذا هو الفرق بين حارسٍ يقيس القاعدة
 * وحارسٍ يقرأ نصّ المكوّن.
 *
 * وواحدةٌ عمدًا: البصمة في ترويسة الجوال تحجز عرض ما يُرسم فعلًا — زرٌّ
 * أم زرّان — لا عرضًا ثابتًا. ولو حُسب الشرط مرّتين لانفصلا يومًا بصمت،
 * فيجلس الشعار تحت زرٍّ أو يبقى فراغٌ بعرض 52px بلا شيء فيه.
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

function useChromeSlots(): ChromeSlots {
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

/**
 * بصمة القدم في صفّ ترويسة الجوال — **حجز مساحة لا أزرار.**
 *
 * المثبَّت يطفو فوق هذا الصفّ بعد مدار النوافذ مباشرةً، وهناك يجلس الشعار.
 * فبغير هذه الخانة يُحجب الشعار خلف الأزرار — قِيس: المثبَّت يبدأ عند
 * 4.25rem والشعار عند 4.5rem. والحجز يجعل `justify-between` يوزّع جيران
 * الترويسة كما لو كانت الأزرار بينهم، فينزل الشعار بعدها لا تحتها.
 *
 * ولا شجرة وصول لها: الأزرار الحقيقية في المثبَّت، وتكرارها هنا يعطي
 * قارئ الشاشة زرَّي «رئيسية» لا واحدًا.
 */
export function TopChromeSpacer({ className = "" }: { className?: string } = {}) {
  const { showHome, backTarget } = useChromeSlots();
  if (!showHome && !backTarget) return null;
  return (
    <div
      aria-hidden="true"
      className={`invisible pointer-events-none flex shrink-0 items-center gap-2 ${className}`}
    >
      {showHome && <span className="size-11 shrink-0" />}
      {backTarget && <span className="size-11 shrink-0" />}
    </div>
  );
}

export function TopChrome() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const { toggle } = useTheme();
  const ar = locale === "ar";
  const { showHome, backTarget, showTheme } = useChromeSlots();

  const goHome = useCallback(() => void navigate({ to: "/" }), [navigate]);
  const goBack = useCallback(() => {
    if (backTarget) void navigate({ to: backTarget });
  }, [backTarget, navigate]);

  return (
    <>
      {/* جهة البداية (اليمين في RTL): التنقّل — الهوم ثم الرجوع بعده.
          الهوم أوّلًا فلا يتزحزح حين يظهر الرجوع أو يغيب. */}
      {(showHome || backTarget) && (
        <div className="nx-chrome-pin nx-chrome-pin--nav" dir="rtl">
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

      {/* جهة النهاية (اليسار في RTL): التفضيل — المبدّل على الرئيسية وحدها.
          الطرفان محورٌ أفقيّ واحد بالقياس لا بالتقريب: المتغيّرات نفسها. */}
      {showTheme && (
        <div className="nx-chrome-pin nx-chrome-pin--pref">
          <button
            type="button"
            onClick={toggle}
            aria-label={ar ? "تبديل الوضع الفاتح/الداكن" : "Toggle light/dark mode"}
            title={ar ? "تبديل الوضع الفاتح/الداكن" : "Toggle light/dark mode"}
            className="nx-chrome-btn"
          >
            {/* الأيقونتان مرسومتان معًا، ويُظهر `styles.css` ما يوافق صنف
                الجذر. الرسم من الحالة كان يُظهر أيقونة الوضع الخطأ حتى
                يكتمل الترطيب — وميضةٌ على كل فتح لمن اختار الفاتح. */}
            <Sun className="nx-chrome-ico nx-chrome-ico--sun" aria-hidden />
            <Moon className="nx-chrome-ico nx-chrome-ico--moon" aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}
