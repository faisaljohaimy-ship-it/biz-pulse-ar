/**
 * ترويسة النظام — بحث · جرس · رسائل · تطبيقات · مساعدة · المستخدم.
 *
 * أمر المالك ٢٠٢٦/٠٩/٢٩ («تفعيل جميع الأيقونات»): لا زرّ بلا وجهةٍ حيّة
 * أو فعلٍ حقيقي. وما لا مصدر له في النظام لا يُختلق له:
 *   • **الجرس** عاد بأمرٍ صريح بعد حظره، ويعدّ «الأعمال العاجلة المفتوحة»
 *     (`urgent_open`) ويفتح `/urgent-ops` — وحين يأتي من المحاكاة المرجعية
 *     تقول الشارة ذلك بنفسها (المادة ٦). لا صندوق إشعارات
 *     يُقرأ في النظام، فلا يُسمّى العدّاد «إشعارات». وحين لا يصل الرقم لا
 *     تُرسم شارةٌ بصفر — الصفر قياسٌ لا غياب (المادة ٢٧).
 *   • **الرسائل**: لا صندوق رسائل؛ الوجهة محادثات سَدِيد.
 *   • **التطبيقات**: قائمةٌ من السجل الكانوني `MODULES` — كلُّها حيّة.
 *   • **مبدّل الوضع — هنا على الرئيسية وحدها** (مركز القيادة، أمر المالك
 *     ٢٠٢٦/١٠/١٣): بين التطبيقات والمساعدة كما في الصورة. نطاقه يقرّره
 *     `resolveChromeSlots` في `TopBar.tsx` (`showTheme`) — المصدر الواحد —
 *     والشريط العلوي لم يعد يرسم مبدّلًا، فلا مبدّلان على صفحة.
 *
 * **والترتيب يتبع حاويته:** تُركَّب الترويسة في صفّ القشرة `ltr` (قرار المالك
 * D5، ممدودًا إلى كل صفحة بأمر ٢٠٢٦/١٠/١٨) فتُرسم يسارًا ← يمينًا كما في
 * الصورة — البحث يسارًا والمستخدم يمينًا. والأوراق التي تحمل نصًّا (البحث
 * وبطاقة المستخدم) تعلن اتجاه لغتها بنفسها، فلا يقلب ترتيبُ الصفّ نصَّها العربي.
 *
 * **والهيئة هيئة الصورة في كل صفحة** (أمرا المالك ٢٠٢٦/١٠/١٤ «طبق الصورة
 * بحذافيرها» و٢٠٢٦/١٠/١٨ «بنفس تخطيط وهيئة الصفحة الرئيسية»): حقل بحثٍ مستدير
 * بعدستين، وأقراصٌ مستديرة فاتحة للأيقونات (الجرس أزرق ممتلئ وشارته حمراء، ثم
 * الرسائل والتطبيقات والشمس والمساعدة)، ثم بطاقة المستخدم: الصورة بنقطة حضورٍ
 * خضراء، والاسم الأول والدور — وهي زرّ قائمة الحساب (`AccountMenu`: اللغة ·
 * المنطقة · المؤسسة · الإعدادات). القرص المرسوم ٣٦px داخل هدف لمسٍ ٤٤px
 * (المواصفة §3.7) — والأنماط في `styles/home/home-chrome.css` بطبقة الرموز
 * وحدها. ولوحة الهوية في رأس الشريط الجانبي على الشاشات العريضة، وهنا حين
 * يختفي الشريط (768–1023)، وفي رأس الدرج.
 *
 * **والفروق الباقية فروق خانات لا هيئة** (قرارات المالك): المبدّل على الرئيسية
 * وحدها، و«بلّغ» على غيرها وحدها — يقرّرهما `useChromeSlots()`.
 */
import { Link, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Grid3x3,
  IdCard,
  Menu,
  MessageCircleMore,
  MessageCircleQuestionMark,
  Moon,
  Search,
  Siren,
  Sun,
} from "lucide-react";
import { Suspense, lazy, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { MODULES } from "@/lib/nav/modules";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SadeedEmblem, SadeedPlateLockup } from "@/components/brand/SadeedPlateLockup";
import { SadeedName } from "@/components/brand/SadeedWordmark";
import { SystemSidebarCard, SystemSidebarNav } from "@/components/nav/SystemSidebar";
import { AccountMenu } from "@/components/nav/AccountMenu";
import { useChromeSlots } from "@/components/nav/TopBar";
import "@/styles/home/home-chrome.css";

/**
 * زرّ أيقونة الترويسة. **حلقة التركيز في `.nx-icon-btn` (styles.css) لا في
 * أدوات Tailwind:** القاعدة العامة `:where(button, a, …):focus-visible` خارج
 * الطبقات فتغلب الأدوات المطبَّقة، فكانت الحلقة `--pv-edge` بتباين 1.60:1 على
 * الفاتح (قاسه حارس الجودة) — عيبٌ لازم الترويسة منذ المرحلة ١.
 *
 * والقرص المرسوم (٣٦px) طبقةٌ زائفة داخل الزرّ (`.nx-hdr-btn::before`)، والزرّ
 * نفسه ٤٤×٤٤ — هدف اللمس أوسع من الرسم كما تسمح المواصفة §3.7.
 */
const ICON_BTN = "nx-icon-btn nx-hdr-btn relative grid shrink-0 place-items-center";

/**
 * «دخول الموظفين» — مدخل الدخول للزائر بجوار بطاقته (أمر المالك ٢٠٢٦/١٠/١٨: «Add a
 * prominent, professional employee-login entry point … reuse the current authentication
 * infrastructure»). يقود إلى `/auth` القائمة نفسها (Supabase بالبريد وكلمة المرور، أو
 * Google) بـ`mode=signin` و`redirect` إلى الصفحة الحالية — لا نموذج جديد ولا مسار مخترَع
 * ولا صلاحية من رقمٍ وظيفي أو دورٍ في العميل؛ والصفحات المحمية تبقى خلف التحقّق نفسه.
 * ويختفي للمسجَّل (بطاقته تكفي) وأثناء التحقّق من الجلسة (لا وميض ولا ترطيبٌ مختلف).
 *
 * **المقاس يقرّر الهيئة لا الوجود** (قِيس الصفّ ٢٠٢٦/١٠/١٨: الحبّة باسمها فاضت 136px على
 * 390 و48 على 640 و30 على 768): باسمها من 1024، وقرصًا 44px دونها والاسم اسمه المقروء،
 * ودون 640 لا مكان في الصفّ فتكون أوّل ما في الدرج (`variant="drawer"`) باسمها كاملًا —
 * مدخلٌ واحد ظاهر في كل مقاس، لا اثنان.
 */
function EmployeeLogin({
  ar,
  variant = "header",
  onNavigate,
}: {
  ar: boolean;
  variant?: "header" | "drawer";
  onNavigate?: () => void;
}) {
  const { user, loading } = useAuth();
  const { pathname, searchStr } = useLocation();
  if (loading || user) return null;
  const back = pathname.startsWith("/auth") ? undefined : `${pathname}${searchStr ?? ""}`;
  const label = ar ? "دخول الموظفين" : "Employee sign-in";
  return (
    <Link
      to="/auth"
      search={{ mode: "signin", redirect: back }}
      onClick={onNavigate}
      className={`nx-focus-ring nx-hdr-login${variant === "drawer" ? " nx-hdr-login--drawer" : ""}`}
      title={label}
    >
      <IdCard aria-hidden className="nx-hdr-login-ico" />
      <span className="nx-hdr-login-label">{label}</span>
    </Link>
  );
}

/** لوحة الأوامر الواحدة تستمع لهذا الحدث — لا نسخةٌ ثانية منها هنا. */
function openCommandPalette() {
  window.dispatchEvent(new Event("nx:open-command-palette"));
}

function UrgentBell({ ar }: { ar: boolean }) {
  // القراءة نفسها التي تقرؤها الرئيسية وبمفتاحها — ذاكرةٌ واحدة لا طلبان.
  const { loading: authLoading } = useAuth();
  const getState = useServerFn(getCommandCenterState);
  const { data } = useQuery({
    queryKey: ["blueprint-state"],
    queryFn: () => getState(),
    enabled: !authLoading,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const count = data?.counters.urgent_open ?? null;
  // **الرقم من المحاكاة المرجعية حين لا تصل صفوفٌ حيّة** — فيُقال ذلك على
  // الشارة نفسها لا في تعليقٍ فوقها (المادة ٦). كُتب هنا أوّلًا «مقيسٌ فعلًا»
  // فقِيس ردّ الخادم ومعرّفاته `sim-ca-*`: رقمُ محاكاة يُقرأ كأنه حيّ.
  const simulated = data?.simulation ?? false;
  const simAr = simulated ? " (بيانات مرجعية، ليست حيّة)" : "";
  const simEn = simulated ? " (reference data, not live)" : "";
  const label = ar
    ? count == null
      ? "الأعمال العاجلة — لم يُقَس"
      : `الأعمال العاجلة المفتوحة: ${count}${simAr}`
    : count == null
      ? "Urgent work — not measured"
      : `Open urgent work: ${count}${simEn}`;
  return (
    <Link to="/urgent-ops" aria-label={label} title={label} className={ICON_BTN}>
      {/* الجرس أزرق ممتلئ كما في الصورة — اللون والملء من `.nx-hdr-bell`. */}
      <Bell aria-hidden className="nx-hdr-bell size-5" />
      {count != null && count > 0 && (
        <span
          aria-hidden
          // الموضع أعلى يمين القرص كما رُسم، فيزيائيًّا لا منطقيًّا: الشارة على
          // كتف الجرس في الصفحتين، لا تنقلب بلغة الصفّ. واللون من
          // `.nx-hdr-badge` (home-chrome.css): أحمر والرقم أبيض كما في الصورة.
          // **والمحاكاة شارةٌ مخطّطة كهرمانية** (`data-simulated`) — **بلا حرف
          // «م»** بأمر المالك ٢٠٢٦/٠٩/٢٩ («ازل حرف الميم»)، تبعًا لرفعه الشارات
          // من كل شاشة ٢٠٢٦/٠٨/١١. والإفصاح باقٍ نصًّا في `title`/`aria-label`.
          data-simulated={simulated || undefined}
          className="nx-hdr-badge"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

/**
 * «بلّغ» — بلاغ أمني جديد من أي صفحة (أمر المالك ٢٠٢٦/٠٩/٢٩).
 *
 * النموذج يُحمَّل **عند أول ضغطة** لا مع الترويسة: الترويسة في كل صفحة،
 * والنموذج يجرّ الحوارات ودوالّ الخادم — وحِملٌ في كل صفحة لزرٍّ يُضغط أحيانًا
 * يكسر ميزانية الأداء بلا مقابل.
 */
const LazyNewIncidentDialog = lazy(() =>
  import("@/components/sec/oms-dialogs").then((m) => ({ default: m.NewIncidentDialog })),
);

function QuickReport({ ar }: { ar: boolean }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const label = ar ? "بلّغ الآن — بلاغ أمني جديد" : "Report now — new security incident";
  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
        className={`${ICON_BTN} nx-quick-report`}
      >
        <Siren aria-hidden className="size-5" />
      </button>
      {loaded && (
        <Suspense fallback={null}>
          <LazyNewIncidentDialog open={open} onOpenChange={setOpen} withTrigger={false} />
        </Suspense>
      )}
    </>
  );
}

function AppsMenu({ ar }: { ar: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ar ? "وحدات النظام" : "System modules"}
          title={ar ? "وحدات النظام" : "System modules"}
          className={ICON_BTN}
        >
          <Grid3x3 aria-hidden className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2" dir={ar ? "rtl" : "ltr"}>
        <ul className="grid grid-cols-2 gap-1">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <li key={m.to}>
                <Link
                  to={m.to}
                  className="nx-focus-ring flex min-h-11 items-center gap-2 rounded-lg px-2 text-[13px] font-medium text-[color:var(--ink-2)] hover:bg-[color:var(--chip-strong)] hover:text-[color:var(--ink)]"
                >
                  <Icon aria-hidden className="size-4 shrink-0 text-[color:var(--tone-blue)]" />
                  <span className="truncate">{ar ? m.ar : m.en}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/**
 * مبدّل الوضع — **النسخة الوحيدة في النظام**، على الرئيسية وحدها.
 *
 * الأيقونتان مرسومتان معًا ويُظهر `home-chrome.css` ما يوافق صنف الجذر: الرسم
 * من حالة React يُظهر أيقونة الوضع الخطأ حتى يكتمل الترطيب — وميضةٌ على كل
 * فتح. **والأيقونة أيقونة الوضع القائم** كما في الصورة: الشمس في الفاتح
 * (والداكن هو الافتراض منذ ٢٠٢٦/١٠/٢٤)، والقمر في الداكن. والزرّ زرُّ الترويسة نفسه (`ICON_BTN`)
 * بحلقة تركيزه وأرضية لمسه 44px.
 */
function HeaderThemeSwitch({ ar }: { ar: boolean }) {
  const { toggle } = useTheme();
  const label = ar ? "تبديل الوضع الفاتح/الداكن" : "Toggle light/dark mode";
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} className={ICON_BTN}>
      <Sun aria-hidden className="nx-hdr-theme-sun size-5" />
      <Moon aria-hidden className="nx-hdr-theme-moon size-5" />
    </button>
  );
}

/**
 * زرّ القائمة للشاشات الضيّقة (دون 1024) — حيث يختفي الشريط الجانبي.
 *
 * رُئي غيابه بلقطةٍ على 390: الرئيسية بلا شريطٍ ولا طريقٍ إليه، فعناصر
 * التصميم (عشرون يومها؛ اثنا عشر منذ أمر ٢٠٢٦/١٠/٢٩) لا تُبلغ من الجوال.
 * **وهو الدرج الوحيد في النظام** منذ القشرة الواحدة (٢٠٢٦/١٠/١٨): درج القشرة
 * القديمة (`NexusOrb`، من اليمين) سقط معها، فلا درجان يفترقان.
 */
function MobileMenu({ ar }: { ar: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={ar ? "القائمة الرئيسية" : "Main menu"}
          title={ar ? "القائمة الرئيسية" : "Main menu"}
          className={`${ICON_BTN} lg:hidden`}
        >
          <Menu aria-hidden className="size-5" />
        </button>
      </SheetTrigger>
      {/* الدرج يخرج من اليسار في اللغتين: الشريط يسارًا في كل صفحة وزرّه أوّل
          الصفّ يسارًا (D5 ممدودًا) — فالدرج يخرج من حيث الزرّ ومن حيث الشريط
          على الشاشة العريضة، وصفوفه بهيئة الشريط نفسه، ورأسه لوحة الهوية. */}
      <SheetContent
        side="left"
        dir={ar ? "rtl" : "ltr"}
        className="nx-sysnav-sheet w-80 overflow-y-auto bg-[color:var(--surface)] p-3"
      >
        <SheetTitle className="sr-only">{ar ? "القائمة الرئيسية" : "Main menu"}</SheetTitle>
        {/* اللوحة في طرف البداية وزرّ الإغلاق في طرف النهاية — صفٌّ واحد لا
            يتراكبان (`.nx-drawer-brand` يحجز للزرّ مكانه). */}
        <div className="nx-drawer-brand">
          <SadeedPlateLockup variant="drawer" />
        </div>
        <EmployeeLogin ar={ar} variant="drawer" onNavigate={() => setOpen(false)} />
        <SystemSidebarNav onNavigate={() => setOpen(false)} />
        <div className="mt-4">
          <SystemSidebarCard />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SystemHeader() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  // القرار الواحد (`resolveChromeSlots`): المبدّل للرئيسية وحدها، والهوم لكل
  // صفحةٍ غيرها — فغياب الهوم هو «نحن على الرئيسية» بلا شرط مسارٍ ثانٍ هنا.
  const { showTheme, showHome } = useChromeSlots();
  const onHome = !showHome;
  return (
    <>
      {/* سند الترويسة المثبَّتة دون 1024 (`.nx-hdr-spacer`): يحجز ارتفاعها في
          المسار فلا يبدأ المحتوى خلفها — نمط الشريط العلوي نفسه. */}
      <div aria-hidden data-nx-presentation-hide className="nx-hdr-spacer" />
      <header
        data-nx-presentation-hide
        // هيئة القشرة الواحدة في كل صفحة (أمر المالك ٢٠٢٦/١٠/١٨) — الحواشي
        // والمقاسات المقيسة على الصورة مقيّدةٌ بهذه السمة في home-chrome.css.
        data-chrome="system"
        // السطح والحافّة والارتفاع (64px) والحواشي في `.nx-hdr` — مقيسةٌ على
        // الصورة. والفجوات أضيق دون `sm`: لولا التضييق ضاق زرّ البحث على ٣٧٥ دون
        // أرضية اللمس 44. **ومثبَّتةٌ دون 1024** تحت الشريط العلوي: درجها وبحثها
        // و«بلّغ» وقائمة الحساب لا تمضي مع السكرول (ترويسة الجوال القديمة كانت
        // لاصقة؛ و`sticky` لا يلصق هنا لأن `body` حاوية السكرول — درس الشريط).
        className="nx-hdr flex items-center"
      >
        <MobileMenu ar={ar} />
        {/* الهوية على الجوال (دون 768): الرمز السداسي واسم المنتج نصًّا — ترويسة
            الجوال القديمة كانت تحملهما، فلا تُترك الصفحات الداخلية بلا هوية. والرمز
            زخرفيّ لأن الاسم بجانبه مقروء. */}
        <span className="nx-hdr-mark">
          <SadeedEmblem decorative className="nx-hdr-mark-emblem" />
          <SadeedName size="sm" className="nx-hdr-mark-name" />
        </span>
        {/* لوحة الهوية في الترويسة حين يختفي الشريط وحده (768–1023): على الشاشة
            العريضة يحملها رأس الشريط، ودون 768 الرمز والاسم أعلاه (واللوحة في الدرج). */}
        <SadeedPlateLockup variant="header" className="nx-hdr-brand" />
        <button
          type="button"
          onClick={openCommandPalette}
          dir={ar ? "rtl" : "ltr"}
          // الاختصار لم يسقط بسقوط شارته المرئية: لوحة الأوامر تفتح بـCtrl/⌘+K،
          // ويُعلَن هنا للتقنيات المساعدة.
          aria-keyshortcuts="Control+K Meta+K"
          // الحقل المرسوم (36px مستديرًا) طبقةٌ داخل هدفٍ 44px — `.nx-hdr-search`.
          // ودون 640 قرصٌ بعدسته وحدها (النصّ مخفيٌّ بصريًّا باقٍ اسمًا مقروءًا) —
          // ليتّسع الصفّ للهوية.
          className="nx-focus-ring nx-hdr-search flex min-w-0 items-center text-start"
        >
          <Search aria-hidden className="nx-hdr-search-ico size-5 shrink-0" />
          <span className="nx-hdr-search-label truncate">
            {ar
              ? "ابحث في النظام … ( مواقع, أفراد, حوادث, كاميرات, تقارير)"
              : "Search the system … (sites, people, incidents, cameras, reports)"}
          </span>
          {/* العدسة الثانية في طرف الحقل كما رُسمت (الصورة بلا اختصار لوحة). */}
          <Search aria-hidden className="nx-hdr-search-end ms-auto size-4 shrink-0" />
        </button>
        {/* الأقراص كما رُسمت يسارًا ← يمينًا: الجرس · الرسائل · التطبيقات ·
          الشمس · المساعدة، ثم المستخدم. **و«بلّغ» خارج الرئيسية وحدها:** الصورة
          بلا زرّه («طبق الصورة بحذافيرها»، ٢٠٢٦/١٠/١٤ — آخر نصٍّ للمالك على
          الرئيسية، المادة ٣٥)، وهو باقٍ في ترويسة كل صفحةٍ غيرها وفي رأس صفحة
          البلاغات — فالمدخلان («الاثنان»، ٢٠٢٦/٠٩/٢٩) قائمان. */}
        <div className="nx-hdr-tools ms-auto flex shrink-0 items-center">
          {!onHome && <QuickReport ar={ar} />}
          <UrgentBell ar={ar} />
          <Link
            to="/assistant"
            aria-label={ar ? "محادثات سَدِيد" : "SADEED conversations"}
            title={ar ? "محادثات سَدِيد" : "SADEED conversations"}
            className={`${ICON_BTN} hidden sm:grid`}
          >
            <MessageCircleMore aria-hidden className="size-5" />
          </Link>
          <AppsMenu ar={ar} />
          {showTheme && <HeaderThemeSwitch ar={ar} />}
          <Link
            to="/guide"
            aria-label={ar ? "دليل النظام" : "System guide"}
            title={ar ? "دليل النظام" : "System guide"}
            className={`${ICON_BTN} hidden sm:grid`}
          >
            <MessageCircleQuestionMark aria-hidden className="size-5" />
          </Link>
          <EmployeeLogin ar={ar} />
          {/* بطاقة المستخدم زرّ قائمة الحساب: اللغة · المنطقة · المؤسسة ·
            الإعدادات — ما كان في شريط القشرة القديمة لم يسقط. */}
          <AccountMenu ar={ar} />
        </div>
      </header>
    </>
  );
}
