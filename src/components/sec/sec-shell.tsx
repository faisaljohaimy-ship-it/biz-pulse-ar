import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  Footprints,
  KeyRound,
  Siren,
  Cctv,
  History,
  Clock,
  ClipboardCheck,
  Building2,
  Grid3x3,
  Network,
  Wrench,
  FolderKanban,
  LayoutDashboard,
  Building,
  OctagonAlert,
  CheckCircle2,
} from "lucide-react";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
const ITEMS: Item[] = [
  // The section index is the section's OVERVIEW. It used to be labelled «غرفة
  // العمليات» — the name /situation-room already owns. See screen-names.ts.
  { to: "/sec", label: "نظرة عامة", icon: Activity },
  // الأيقونات هنا هي أيقونات الشريط الجانبي نفسها لنفس المسار ونفس الاسم
  // (المادة 13.5): `Crown` كانت تقول «امتياز» لا «لوحة»، و`Rocket` تقول
  // «إطلاق» لا «إدارة مشاريع»، و`Radar` كشفٌ عن بُعد لا جولةٌ راجلة،
  // و`Camera` كاميرا تصوير لا كاميرا مراقبة، و`ShieldCheck` امتثالٌ لا أقسام.
  { to: "/sec/exec", label: "اللوحة التنفيذية", icon: LayoutDashboard },
  { to: "/sec/twin", label: "التوأم الرقمي", icon: Network },
  // «الدوائر» و«الأقسام» حُجبتا بأمر المالك ٢٠٢٦/٠٨/٢٠ («حذف الواجهة
  // بالكامل») — hidden-routes.ts، ومساراهما يعودان إلى /sec.
  { to: "/sec/projects", label: "المشاريع", icon: FolderKanban },
  { to: "/sec/maintenance", label: "الصيانة", icon: Wrench },
  { to: "/sec/incidents", label: "البلاغات", icon: AlertTriangle },
  { to: "/sec/patrols", label: "الدوريات", icon: Footprints },
  // الاسم تبع إعادة تسمية الواجهة بأمر المالك ٢٠٢٦/٠٨/٢٠ (المادة 13.5:
  // اسم واحد في كل سطح) — التاريخ اليومي يظهر في ترويسة الصفحة لا هنا.
  { to: "/sec/access", label: "صلاحيات دخول اليوم", icon: KeyRound },
  // «الزوار» و«المقاولين» و«المركبات» و«التصاريح» حُذفت من الشريط بأمر
  // المالك ٢٠٢٦/٠٨/٢٠ — مدخلها صار بطاقات صفحة «صلاحيات دخول اليوم»
  // (/sec/access) بأسهم انتقال. الصفحات نفسها حيّة لم تُمسّ.
  { to: "/sec/emergency", label: "الطوارئ", icon: Siren },
  { to: "/sec/cctv", label: "CCTV", icon: Cctv },
  { to: "/sec/risks", label: "سجل المخاطر", icon: ShieldAlert },
  // نُقلت من الوحدة المستقلة /governance بقرار المالك ٢٠٢٦/٠٨/١٢ — الأيقونة نفسها من سجل الوحدات (المادة 13.5).
  { to: "/sec/governance", label: "الحوكمة", icon: ClipboardCheck },
  { to: "/sec/shifts", label: "الورديات", icon: Clock },
  { to: "/sec/facilities", label: "حالة المواقع", icon: Building2 },
  // `ListChecks` قائمة مهام؛ والخط الزمني تسلسلٌ في الزمن لا قائمة تُشطب.
  { to: "/sec/timeline", label: "الخط الزمني", icon: History },
  // ── دفعة ٢٠٢٦/٠٨/٢٠ (٣) ──
  // حُجبت أربع شاشات بأمر المالك («حذف الواجهة بالكامل»): مستودع المعرفة،
  // التكاملات (جاهزية التكامل)، حماية الأصول، مؤشرات الأداء — ومعها
  // «ملاحظات السلامة» (بنصّه: سلامةٌ لا أمن صناعي). و«التقارير» بقيت شاشةً
  // حيّة لكن مدخلها الشريط الجانبي وحده («الاكتفاء بوجودها في الشريط
  // الجانبي الأيمن») فسقط بندها من هذا الشريط.
];

export function SecSubNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="sticky top-0 z-20 -mx-4 mb-4 overflow-x-auto border-b border-border bg-background/80 px-4 backdrop-blur md:mx-0 md:rounded-xl md:border md:px-3">
      <ul className="flex min-w-max gap-1 py-2">
        {ITEMS.map((it) => {
          const active = pathname === it.to || (it.to !== "/sec" && pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  // ≥44px touch target on mobile/tablet (constitution art. 5);
                  // compact on desktop where pointer precision is higher.
                  "inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors md:min-h-0 md:py-1.5",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SecPageHeader({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children?: React.ReactNode;
}) {
  return (
    // Unified holographic identity (styles.css .holo-* system): the same
    // hairline-glow language as the module grid, on every sec page header.
    <div className="holo-card mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl px-4 py-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {badge && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[12px] font-medium text-amber-600 dark:text-amber-400">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export type StatTone = "default" | "danger" | "warning" | "success";

/**
 * نغمات بطاقة المؤشر — «خطر» و«تحذير» يفترقان في أكثر من اللون.
 *
 * OWNER DIRECTIVE: keep danger red and warning amber, and make the difference
 * visible in the background, the border, the icon, the text colour, the status
 * badge, and the hover state — do NOT unify them.
 *
 * WHY THE ICON SHAPE CARRIES THE MEANING, NOT THE HUE
 * The card used to differ by hue alone: a red border over a 5% red wash versus
 * an amber border over a 5% amber wash, with identical text and no icon. On an
 * industrial-security board that is a safety defect, not a styling one —
 * red/amber is the exact pair that protanopia and deuteranopia collapse, so
 * roughly one man in twelve could not tell a critical card from a caution card.
 * WCAG 2.2 §1.4.1 says colour may not be the only carrier of information.
 *
 * The shapes follow the safety-sign convention the operators already read:
 *   octagon = stop / critical · triangle = caution · circle = normal
 * so the card is legible in greyscale, on a sunlit screen, and to a colour-blind
 * shift supervisor.
 */
export const STAT_TONES: Record<
  StatTone,
  {
    card: string;
    icon: typeof AlertTriangle | null;
    iconCls: string;
    value: string;
    badge: string | null;
    badgeCls: string;
  }
> = {
  default: {
    card: "border-border hover:bg-muted/40",
    icon: null,
    iconCls: "",
    value: "text-foreground",
    badge: null,
    badgeCls: "",
  },
  danger: {
    card: "border-red-500/50 bg-red-500/10 hover:bg-red-500/15",
    icon: OctagonAlert,
    iconCls: "text-red-600 dark:text-red-400",
    value: "text-red-700 dark:text-red-300",
    badge: "خطر",
    badgeCls: "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300",
  },
  warning: {
    card: "border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/15",
    icon: AlertTriangle,
    iconCls: "text-amber-600 dark:text-amber-400",
    value: "text-amber-700 dark:text-amber-300",
    badge: "تحذير",
    badgeCls: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  success: {
    card: "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/15",
    icon: CheckCircle2,
    iconCls: "text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-300",
    badge: "سليم",
    badgeCls: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
};

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: StatTone;
}) {
  const t = STAT_TONES[tone];
  const Icon = t.icon;
  return (
    <div className={cn("nx-glass relative rounded-xl border p-4 transition-colors", t.card)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {/* aria-hidden: the badge beside it already states the tone in words,
              so announcing the icon would repeat it to a screen reader. */}
          {Icon && <Icon aria-hidden className={cn("h-4 w-4 shrink-0", t.iconCls)} />}
          <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className={cn("text-2xl font-bold", t.value)}>{value}</div>
        {t.badge && (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[12px] font-semibold leading-none",
              t.badgeCls,
            )}
          >
            {t.badge}
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-[12px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function SecLoading({ rows = 12 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="holo-card h-16 animate-pulse rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}

export function SecError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="holo-card flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center">
      <AlertTriangle className="h-9 w-9 text-amber-500" />
      <div className="text-base font-semibold text-foreground">تعذّر تحميل المؤشرات</div>
      <p className="max-w-sm text-sm text-muted-foreground">
        حدث تأخّر مؤقّت في جلب البيانات. أعد المحاولة.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}

/**
 * ٢٠٢٦/٠٨/٢٧ — الشدة قد تكون غير مقيسة (صفوف «تقرير البلاغات» الحقيقية):
 * `null`/`undefined` ⇒ رقاقة محايدة **بحدّ متقطع** — الشكل مع الكلمة
 * («غير مصنف» يكتبها المستدعي)، لا اللون وحده (WCAG 2.2 §1.4.1).
 */
export function severityClass(sev: string | null | undefined) {
  if (sev == null) return "border-dashed bg-muted text-muted-foreground border-border";
  switch (sev) {
    case "critical":
      return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
    case "high":
      return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
    case "medium":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "low":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
export function statusClass(s: string) {
  if (["open", "active", "new", "inside", "approved"].includes(s))
    return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
  if (["investigating", "pending", "scheduled", "expected"].includes(s))
    return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
  if (["contained", "completed", "left", "resolved"].includes(s))
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  if (["closed", "expired", "offline", "missed", "revoked", "overdue"].includes(s))
    return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
  return "bg-muted text-muted-foreground border-border";
}
