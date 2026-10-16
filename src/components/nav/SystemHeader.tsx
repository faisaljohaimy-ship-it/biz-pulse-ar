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
 * **والترتيب يتبع حاويته:** على الرئيسية تُركَّب الترويسة في صفٍّ `ltr`
 * (قرار المالك D5) فتُرسم يسارًا ← يمينًا كما في الصورة — البحث يسارًا
 * والمستخدم يمينًا. والأوراق التي تحمل نصًّا (البحث وبطاقة المستخدم) تعلن
 * اتجاه لغتها بنفسها، فلا يقلب ترتيبُ الصفّ نصَّها العربي.
 *
 * **والهيئة هيئة الصورة** (أمر المالك ٢٠٢٦/١٠/١٤ «طبق الصورة بحذافيرها»):
 * حقل بحثٍ مستدير بعدستين، وأقراصٌ مستديرة فاتحة للأيقونات (الجرس أزرق
 * ممتلئ وشارته حمراء، ثم الرسائل والتطبيقات والشمس والمساعدة)، ثم بطاقة
 * المستخدم: الصورة بنقطة حضورٍ خضراء، والاسم الأول والدور. القرص المرسوم
 * ٣٦px داخل هدف لمسٍ ٤٤px (المواصفة §3.7) — والأنماط في
 * `styles/home/home-chrome.css` بطبقة الرموز وحدها. والشعار على الرئيسية:
 * في رأس الشريط الجانبي على الشاشات العريضة، وهنا حين يختفي الشريط.
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Grid3x3,
  Menu,
  MessageCircleMore,
  MessageCircleQuestionMark,
  Moon,
  Search,
  Siren,
  Sun,
  UserRound,
} from "lucide-react";
import { Suspense, lazy, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { MODULES } from "@/lib/nav/modules";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { listMyOrgs, type OrgRole } from "@/lib/org/org.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  SadeedWingLockup,
  SystemSidebarCard,
  SystemSidebarNav,
} from "@/components/nav/SystemSidebar";
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
  const simAr = simulated ? " (محاكاة مرجعية)" : "";
  const simEn = simulated ? " (reference simulation)" : "";
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
 * (الافتراض منذ N1)، والقمر في الداكن. والزرّ زرُّ الترويسة نفسه (`ICON_BTN`)
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

/** دور العضوية بلسانيه — من مصدرٍ حقيقي وحده (`org_members.role`). */
const ROLE_LABEL: Record<OrgRole, { ar: string; en: string }> = {
  owner: { ar: "مالك المؤسسة", en: "Organization owner" },
  admin: { ar: "مسؤول النظام", en: "Administrator" },
  manager: { ar: "مدير", en: "Manager" },
  operator: { ar: "مشغّل", en: "Operator" },
  viewer: { ar: "مشاهد", en: "Viewer" },
};

/** البادئات التي لا تقوم اسمًا وحدها: «عبد الله» اسمٌ أوّل واحد لا «عبد». */
const NAME_PREFIXES: ReadonlySet<string> = new Set(["عبد", "ابو", "أبو"]);

/**
 * الاسم الأول لصاحب الجلسة وحده (قرار المالك N4) — من اسمه في حسابه، لا من
 * بريده ولا من اسم غيره. وبلا اسمٍ في الحساب لا يُختلق اسم: «حسابي».
 */
function firstNameOf(fullName: string | undefined | null): string | null {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (NAME_PREFIXES.has(parts[0]) && parts[1]) return `${parts[0]} ${parts[1]}`;
  return parts[0];
}

/**
 * بطاقة المستخدم كما في الصورة: الصورة يمينًا بنقطة حضورٍ خضراء، وبجانبها
 * الاسم والدور.
 *
 * **لا اسمٌ مخترَع ولا دورٌ مخترَع** (المواصفة §3.11، N4): الزائر «زائر» /
 * «زائر النظام»؛ والمسجَّل اسمه الأول ودوره في مؤسسته الحالية — من عضويته
 * (`listMyOrgs`، المفتاح نفسه الذي يقرؤه مبدّل المؤسسة فلا طلبان) — وإلا سقط
 * سطر الدور ولم يُخمَّن. والنقطة الخضراء حضور الجلسة المفتوحة على هذه الشاشة.
 */
function UserChip({ ar }: { ar: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const meta = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
  const fetchOrgs = useServerFn(listMyOrgs);
  // قراءة حساب صاحب الجلسة لا قراءة عرض: الزائر لا عضوية له فلا تُطلب.
  const { data: orgs } = useQuery({
    queryKey: ["my-orgs", user?.id ?? "anon"],
    queryFn: () => fetchOrgs(),
    staleTime: 60_000,
    enabled: !authLoading && user != null,
  });
  const membership = orgs?.find((o) => o.is_current) ?? orgs?.[0];
  const roleLabel = membership ? ROLE_LABEL[membership.role] : undefined;

  const first = firstNameOf(meta.full_name || meta.name);
  const name = user ? (first ?? (ar ? "حسابي" : "My account")) : ar ? "زائر" : "Guest";
  const role = user
    ? roleLabel
      ? ar
        ? roleLabel.ar
        : roleLabel.en
      : null
    : ar
      ? "زائر النظام"
      : "System guest";
  // الاسم المقروء يحوي النصّ المرئي بترتيبه (WCAG 2.5.3).
  const label = [name, role, ar ? "الإعدادات" : "settings"].filter(Boolean).join(" — ");
  const initial = first?.charAt(0);

  return (
    <Link
      to="/settings"
      aria-label={label}
      title={label}
      dir={ar ? "rtl" : "ltr"}
      className="nx-focus-ring nx-hdr-user flex min-w-0 items-center"
    >
      <span className="nx-hdr-avatar" aria-hidden>
        {user && meta.avatar_url ? (
          <img src={meta.avatar_url} alt="" width={46} height={46} className="nx-hdr-avatar-img" />
        ) : user && initial ? (
          <span className="nx-hdr-avatar-initial">{initial}</span>
        ) : (
          <UserRound className="nx-hdr-avatar-glyph" />
        )}
        <span className="nx-hdr-presence" />
      </span>
      <span className="nx-hdr-user-text">
        <span className="nx-hdr-user-name">{name}</span>
        {role ? <span className="nx-hdr-user-role">{role}</span> : null}
      </span>
    </Link>
  );
}

/**
 * زرّ القائمة للشاشات الضيّقة — حيث يختفي الشريط الجانبي.
 *
 * رُئي غيابه بلقطةٍ على 390: الرئيسية بلا شريطٍ ولا طريقٍ إليه، فعناصر
 * التصميم العشرون لا تُبلغ من الجوال. والقشرة لها درجُها، فالزرّ هنا لمن
 * يطلبه (`withMenu`) — الرئيسية — لا لكل سطح فيتكرّر الدرج.
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
      {/* الدرج يخرج من اليسار في اللغتين: الزرّ لا يُركَّب إلا على الرئيسية
          (`withMenu`)، وشريطها يسارًا وزرّه أوّل الصفّ يسارًا (قرار المالك
          D5) — فالدرج يخرج من حيث الزرّ ومن حيث الشريط على الشاشة العريضة،
          وصفوفه بهيئة الشريط نفسه (`side="left"`). */}
      <SheetContent
        side="left"
        dir={ar ? "rtl" : "ltr"}
        className="nx-sysnav-sheet w-80 overflow-y-auto bg-[color:var(--surface)] p-3"
      >
        <SheetTitle className="sr-only">{ar ? "القائمة الرئيسية" : "Main menu"}</SheetTitle>
        <div className="pt-8">
          <SystemSidebarNav side="left" onNavigate={() => setOpen(false)} />
          <div className="mt-4">
            <SystemSidebarCard />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SystemHeader({ withMenu = false }: { withMenu?: boolean }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  // القرار الواحد (`resolveChromeSlots`): المبدّل للرئيسية وحدها، والهوم لكل
  // صفحةٍ غيرها — فغياب الهوم هو «نحن على الرئيسية» بلا شرط مسارٍ ثانٍ هنا.
  const { showTheme, showHome } = useChromeSlots();
  const onHome = !showHome;
  return (
    <header
      data-nx-presentation-hide
      data-chrome={onHome ? "home" : undefined}
      // السطح والحافّة والارتفاع (64px) والحواشي في `.nx-hdr` — مقيسةٌ على
      // الصورة. والفجوات أضيق دون `sm`: لولا التضييق ضاق زرّ البحث على ٣٧٥ دون
      // أرضية اللمس 44. والقشرة لا ترسم هذه الترويسة دون `md` أصلًا.
      className="nx-hdr flex items-center"
    >
      {withMenu && <MobileMenu ar={ar} />}
      {/* الشعار في الترويسة حين يختفي الشريط وحده (md–lg): على الشاشة العريضة
          يحمله رأس الشريط بمحاذاة هذا الصفّ، ودون md لا يتّسع الصفّ له. */}
      {onHome && <SadeedWingLockup className="nx-hdr-brand" />}
      <button
        type="button"
        onClick={openCommandPalette}
        dir={ar ? "rtl" : "ltr"}
        // الحقل المرسوم (36px مستديرًا) طبقةٌ داخل هدفٍ 44px — `.nx-hdr-search`.
        className="nx-focus-ring nx-hdr-search flex min-w-0 items-center text-start"
      >
        <Search aria-hidden className="nx-hdr-search-ico size-5 shrink-0" />
        <span className="truncate">
          {ar
            ? "ابحث في النظام … ( مواقع, أفراد, حوادث, كاميرات, تقارير)"
            : "Search the system … (sites, people, incidents, cameras, reports)"}
        </span>
        {onHome ? (
          // العدسة الثانية في طرف الحقل كما رُسمت (الصورة بلا اختصار لوحة).
          <Search aria-hidden className="nx-hdr-search-end ms-auto size-4 shrink-0" />
        ) : (
          <kbd className="ms-auto hidden whitespace-nowrap rounded border border-[color:var(--hairline)] px-1.5 text-[12px] sm:inline">
            Ctrl K
          </kbd>
        )}
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
        <UserChip ar={ar} />
      </div>
    </header>
  );
}
