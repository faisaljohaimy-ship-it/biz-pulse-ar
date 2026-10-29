/**
 * قشرة النظام الواحدة — **تُركَّب مرّةً واحدة في الجذر حول كل صفحة نظام.**
 *
 * أمر المالك ٢٠٢٦/١٠/١٨ (آخر نصٍّ صريح، المادة ٣٥): «اجعل جميع صفحات النظام
 * بنفس تخطيط وهيئة الصفحة الرئيسية». فما كانت الرئيسية تركّبه لنفسها (الشريط
 * الجانبي يسارًا · الترويسة بدرجها · لوحة الأوامر · الخلفية) صار هنا، يلفّ
 * الرئيسية والصفحات الداخلية الـ١٠٥ معًا — نسخةٌ واحدة لا نسختان تفترقان.
 * وهو ناسخٌ لعبارة D5 «وبقية الصفحات على شريطها الأيمن» (٢٠٢٦/١٠/١٣):
 * الشريط يسارًا فيزيائيًّا في كل صفحة، والمحتوى يقرأ بلغته (`<main dir>` في
 * `app-shell.tsx` — بغيره تنقلب الصفحات الداخلية كلّها إلى `ltr`).
 *
 * ## لماذا في الجذر لا في كل صفحة (الخيار H في خطّة القشرة)
 *
 * `RouteTransition` يلفّ `<Outlet/>` بمفتاح المسار، فكل ما داخله يُفكّ ويُعاد
 * تركيبه مع كل نقرة. والقشرة كانت داخله: قِيس الشريط والترويسة يُعاد تركيبهما،
 * وشفافية الشريط تهبط إلى ٠ في منتصف الانتقال، وعلى `/` ← `/files` يقفز الشريط
 * من x=0 إلى x=1248. هنا القشرة **خارج** الانتقال: الصفحة وحدها تتحرّك، والشريط
 * يحفظ مجموعاته المفتوحة وموضع سكروله، ولا سلفٌ متحوِّل فوق عنصره المثبَّت.
 * وتُصيَّر على الخادم للصفحات الداخلية أيضًا (`_authenticated` ‏`ssr:false`
 * كان يؤخّرها إلى ما بعد JS).
 *
 * ## القرار من المطابقات لا من العنوان
 *
 * أثناء الانتقال يتبدّل `location.pathname` قبل `matches` — فشرطٌ يخلط
 * الاثنين يرى لحظةً «لا قشرة» بين صفحتي نظام فيفكّها ويعيدها. فالحكم كلّه من
 * معرّفات المسارات المطابَقة: الشجرة نفسها التي يصيّرها `<Outlet/>`.
 *
 * ## الفروق الباقية فروق خانات لا فروق هيئة (قرارات المالك)
 *
 * مبدّل الوضع على الرئيسية وحدها، و«بلّغ» على الداخلية وحدها — يقرّرهما
 * `useChromeSlots()` في `SystemHeader`. والفيلم للرئيسية وحدها (`film`)،
 * والسطح الساكن نفسه خلف كل صفحة.
 */
import { useRef, type MouseEvent, type ReactNode } from "react";
import { HoloVideoEngine } from "@/components/home/HoloVideoEngine";
import { CommandPalette } from "@/components/executive/CommandPalette";
import { SystemSidebar } from "@/components/nav/SystemSidebar";
import { SystemHeader } from "@/components/nav/SystemHeader";
import { useI18n } from "@/lib/i18n";
import "@/styles/home/home-chrome.css";

/** الرئيسية بمسارَيها — `index.tsx` و`blueprint.tsx` يصيّران `BlueprintPage` نفسه. */
export const HOME_ROUTE_IDS: ReadonlySet<string> = new Set(["/", "/blueprint"]);

/** تخطيط صفحات النظام — كل مسارٍ تحته صفحة نظام (`src/routes/_authenticated/**`). */
export const SYSTEM_LAYOUT_ROUTE_ID = "/_authenticated";

/**
 * صفحات نظامٍ خارج `_authenticated` — **وجهاتٌ في تنقّل النظام نفسه**: لوحة الأوامر
 * (في كل صفحة) تفتح مسرح العمليات ومنظومة الوكلاء ورحلة الوكلاء، وبطاقة الوكلاء
 * تفتح المسرح. والثلاث تشغيليةٌ ممنوعة الفهرسة (`/nx-` في `operational-noindex`)
 * لا واجهاتٌ عامّة. فلو خرجت من القشرة لاختفى الشريط والترويسة بنقرةٍ من داخل
 * النظام — خلاف «جميع صفحات النظام». وما لا يبلغه تنقّل النظام من `/nx-*` (‏atlas ·
 * sovereign · twin، والقمرة المحجوبة) يبقى بهيئته المستقلّة.
 */
export const SYSTEM_SHOWCASE_ROUTE_IDS: ReadonlySet<string> = new Set([
  "/nx-ops",
  "/nx-agents",
  "/nx-flow",
]);

/**
 * `home` — القشرة بالفيلم · `system` — القشرة بالسطح الساكن · `none` — لا قشرة
 * (الصفحات العامّة: التسعير والثقة وبوّابة الدخول وبقية الواجهات، بهيئتها).
 */
export type ChromeMode = "home" | "system" | "none";

/**
 * قرار القشرة — **دالّة خالصة** على معرّفات المسارات المطابَقة، فيُختبر بالمساواة
 * بلا مُسيّر ولا DOM. والرئيسية تُقدَّم لأنها خارج `_authenticated`.
 */
export function chromeModeFor(routeIds: readonly string[]): ChromeMode {
  if (routeIds.some((id) => HOME_ROUTE_IDS.has(id))) return "home";
  if (
    routeIds.some(
      (id) =>
        id === SYSTEM_LAYOUT_ROUTE_ID ||
        id.startsWith(`${SYSTEM_LAYOUT_ROUTE_ID}/`) ||
        SYSTEM_SHOWCASE_ROUTE_IDS.has(id),
    )
  ) {
    return "system";
  }
  return "none";
}

/** هل الصفحة صفحة نظام تلبس القشرة؟ */
export function isSystemRoute(routeIds: readonly string[]): boolean {
  return chromeModeFor(routeIds) !== "none";
}

/**
 * `mode` من `chromeModeFor` — و`none` يمرّر الصفحة بلا قشرة، فيبقى في الجذر
 * تركيبٌ واحد لـ`RouteTransition` لا فرعان يفترقان.
 */
export function SystemChrome({ children, mode }: { children: ReactNode; mode: ChromeMode }) {
  if (mode === "none") return <>{children}</>;
  return <Chrome film={mode === "home"}>{children}</Chrome>;
}

function Chrome({ children, film }: { children: ReactNode; film: boolean }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const contentRef = useRef<HTMLDivElement>(null);

  /**
   * «تخطَّ إلى المحتوى» (WCAG 2.4.1): روابط الشريط (عددها من `SYSTEM_NAV` لا من
   * هنا) وأدوات الترويسة تسبق المحتوى في كل صفحة. والهدف `<main>` الصفحة أيًّا
   * كان مُصيّرها — يُعطى `tabindex="-1"` عند الحاجة فيقبل التركيز البرمجيّ، ولا
   * يُغيَّر العنوان.
   */
  const skipToContent = (e: MouseEvent<HTMLAnchorElement>) => {
    const box = contentRef.current;
    const main = box?.querySelector<HTMLElement>("main") ?? box;
    if (!main) return;
    e.preventDefault();
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    main.focus();
  };

  return (
    <div
      // الصفّ يسارًا ← يمينًا (D5 ممدودًا بأمر ٢٠٢٦/١٠/١٨): السند أوّل الصفّ فيقع
      // يسارًا، والترويسة ترث الترتيب. وكل ورقةٍ تحمل نصًّا تعلن لغتها بنفسها.
      // **بلا سطحٍ مرسوم على الجذر:** الخلفية `.nx-hv` في أسفل الطبقات
      // (`.nx-chrome > .nx-hv` في home-chrome.css)، فزينة الصفحة ذات الطبقة
      // السالبة تبقى فوقها في كل حال — لا تومض أثناء الانتقال ثم تختفي تحتها.
      // و`overflow-x-clip` لا `overflow-hidden`: الثانية تصنع حاوية سكرول.
      dir="ltr"
      className="nx-bp-surface nx-chrome relative flex min-h-screen overflow-x-clip text-[color:var(--ink)]"
    >
      <a
        href="#nx-content"
        onClick={skipToContent}
        dir={ar ? "rtl" : "ltr"}
        className="nx-skip-link nx-focus-ring"
      >
        {ar ? "تخطَّ إلى المحتوى" : "Skip to content"}
      </a>
      <SystemSidebar />
      {/* لوحة الأوامر الواحدة في النظام — زرّ البحث في الترويسة و Ctrl/⌘+K. */}
      <CommandPalette />
      <HoloVideoEngine film={film} />
      <div className="relative min-w-0 flex-1">
        <SystemHeader />
        {/* المحتوى بلغته: الصفّ `ltr` (الشريط يسارًا)، والصفحات بُنيت على اتجاه
            اللغة الموروث — فيُعاد هنا لكل صفحة مهما كان مُصيّرها (الحاوية الداخلية
            `AppShell` تكتبه أيضًا على `<main>`). والرئيسية تكتب `ltr` على `<main>`
            بنفسها (D5). */}
        <div
          id="nx-content"
          ref={contentRef}
          dir={ar ? "rtl" : "ltr"}
          className="nx-chrome-content"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default SystemChrome;
