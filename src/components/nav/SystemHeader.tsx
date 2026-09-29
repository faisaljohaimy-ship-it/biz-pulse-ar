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
 *   • **مبدّل الوضع** ليس هنا: مصدره الواحد `TopBar` (عقد `open-changelog`).
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Bell, CircleHelp, LayoutGrid, Menu, MessageSquare, Search, Siren } from "lucide-react";
import { Suspense, lazy, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { MODULES } from "@/lib/nav/modules";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SystemSidebarCard, SystemSidebarNav } from "@/components/nav/SystemSidebar";

/**
 * زرّ أيقونة الترويسة. **حلقة التركيز في `.nx-icon-btn` (styles.css) لا في
 * أدوات Tailwind:** القاعدة العامة `:where(button, a, …):focus-visible` خارج
 * الطبقات فتغلب الأدوات المطبَّقة، فكانت الحلقة `--pv-edge` بتباين 1.60:1 على
 * الفاتح (قاسه حارس الجودة) — عيبٌ لازم الترويسة منذ المرحلة ١.
 */
const ICON_BTN =
  "nx-icon-btn relative grid size-11 shrink-0 place-items-center rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface)] text-[color:var(--ink-2)] transition-colors hover:bg-[color:var(--chip-strong)] hover:text-[color:var(--ink)]";

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
      <Bell aria-hidden className="size-5" />
      {count != null && count > 0 && (
        <span
          aria-hidden
          data-simulated={simulated || undefined}
          className={
            simulated
              ? // المحاكاة شارةٌ مخطّطة كهرمانية — **بلا حرف «م»** بأمر المالك
                // ٢٠٢٦/٠٩/٢٩ («ازل حرف الميم»)، تبعًا لرفعه الشارات من كل شاشة
                // ٢٠٢٦/٠٨/١١. والإفصاح باقٍ نصًّا في `title`/`aria-label`.
                "absolute -end-2 -top-1.5 flex min-w-5 items-center gap-0.5 rounded-full border border-dashed border-[color:var(--tone-amber)] bg-[color:var(--surface)] px-1 text-[12px] font-bold leading-5 text-[color:var(--tone-amber)]"
              : "absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[color:var(--tone-rose)] px-1 text-[12px] font-bold leading-5 text-[color:var(--surface)]"
          }
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
          <LayoutGrid aria-hidden className="size-5" />
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

function UserChip({ ar }: { ar: boolean }) {
  const { user } = useAuth();
  const meta = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
  // لا اسمٌ مخترَع ولا دورٌ مخترَع: الزائر «زائر»، والدور لا مصدر له.
  const name = meta.full_name || meta.name || user?.email || (ar ? "زائر" : "Guest");
  const initial = name.trim().charAt(0) || "؟";
  return (
    <Link
      to="/settings"
      aria-label={ar ? `حساب ${name} — الإعدادات` : `${name} — settings`}
      title={ar ? `حساب ${name} — الإعدادات` : `${name} — settings`}
      className="nx-focus-ring flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-2 hover:bg-[color:var(--chip-strong)]"
    >
      {meta.avatar_url ? (
        <img src={meta.avatar_url} alt="" className="size-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[color:var(--tone-blue)] text-[14px] font-bold text-[color:var(--surface)]"
        >
          {initial}
        </span>
      )}
      <span className="hidden min-w-0 truncate text-[14px] font-semibold text-[color:var(--ink)] xl:block">
        {name}
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
      <SheetContent
        side={ar ? "right" : "left"}
        className="nx-sysnav-sheet w-80 overflow-y-auto bg-[color:var(--surface)] p-3"
      >
        <SheetTitle className="sr-only">{ar ? "القائمة الرئيسية" : "Main menu"}</SheetTitle>
        <div className="pt-8">
          <SystemSidebarNav onNavigate={() => setOpen(false)} />
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
  return (
    <header
      data-nx-presentation-hide
      className="flex items-center gap-2 border-b border-[color:var(--hairline)] bg-[color:var(--surface)] px-3 py-2 sm:gap-3 sm:px-4"
    >
      {withMenu && <MobileMenu ar={ar} />}
      <button
        type="button"
        onClick={openCommandPalette}
        className="nx-focus-ring flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface-2)] px-3 text-start text-[14px] text-[color:var(--ink-3)] hover:border-[color:var(--tone-blue)] md:max-w-xl"
      >
        <Search aria-hidden className="size-5 shrink-0" />
        <span className="truncate">
          {ar
            ? "ابحث في النظام… (مواقع · أحداث · تقارير)"
            : "Search the system… (sites · events · reports)"}
        </span>
        <kbd className="ms-auto hidden whitespace-nowrap rounded border border-[color:var(--hairline)] px-1.5 text-[12px] sm:inline">
          Ctrl K
        </kbd>
      </button>
      <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <QuickReport ar={ar} />
        <UrgentBell ar={ar} />
        <Link
          to="/assistant"
          aria-label={ar ? "محادثات سَدِيد" : "SADEED conversations"}
          title={ar ? "محادثات سَدِيد" : "SADEED conversations"}
          className={`${ICON_BTN} hidden sm:grid`}
        >
          <MessageSquare aria-hidden className="size-5" />
        </Link>
        <AppsMenu ar={ar} />
        <Link
          to="/guide"
          aria-label={ar ? "دليل النظام" : "System guide"}
          title={ar ? "دليل النظام" : "System guide"}
          className={`${ICON_BTN} hidden sm:grid`}
        >
          <CircleHelp aria-hidden className="size-5" />
        </Link>
        <UserChip ar={ar} />
      </div>
    </header>
  );
}
