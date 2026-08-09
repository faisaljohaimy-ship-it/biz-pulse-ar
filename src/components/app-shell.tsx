import { Link, useLocation } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bot,
  Boxes,
  Building2,
  Cctv,
  Compass,
  FileText,
  FolderKanban,
  FolderOpen,
  Footprints,
  Gauge,
  Grid3x3,
  Home,
  LayoutDashboard,
  Map as MapIcon,
  LogOut,
  LogIn,
  Menu,
  Mic,
  Plug,
  Radar,
  RadioTower,
  Settings,
  Shield,
  ShieldAlert,
  ShieldUser,
  Siren,
  Sparkles,
  Waypoints,
  Wrench,
  ExternalLink as ExternalLinkIcon,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";

/**
 * لكنات دوائر الأيقونات — تدور على عناصر الشريط فيأخذ كلٌّ لونه.
 *
 * لونٌ واحد لكل الأيقونات يجعل الشريط جدارًا سماويًّا لا يُميَّز فيه عنصر
 * عن جاره إلا بالنص؛ والتفاوت يجعل الموضع نفسه علامةً تُحفظ بالعين.
 * أسماء رموز من طبقة الرموز لا قيمًا نهائية (المادة ٣٣).
 */
const ORB_HUES = [
  "var(--tone-cyan)",
  "var(--tone-blue)",
  "var(--tone-violet)",
  "var(--tone-emerald)",
  "var(--tone-amber)",
] as const;

/** إيقاع النبض بالثواني — يتفاوت قليلًا فلا تخفق الأيقونات دفعةً واحدة. */
const ORB_BEATS = ["1.05s", "1.2s", "0.95s", "1.35s", "1.12s"] as const;
import { useI18n } from "@/lib/i18n";
import { moduleByRoute, moduleExternalUrl } from "@/lib/nav/modules";
import { screenNameAr, screenNameEn } from "@/lib/nav/screen-names";
import { brandName } from "@/lib/domain";
import { SadeedName, SadeedWordmark } from "@/components/brand/SadeedWordmark";
import { pageBackdropFor } from "@/lib/nav/page-backdrops";
import { GlossyImageBackdrop } from "@/components/backdrops/GlossyImageBackdrop";
import { AuroraFantasyBackdrop } from "@/components/backdrops/AuroraFantasyBackdrop";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { useRegion } from "@/lib/region-context";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { OrgSwitcher } from "@/components/org/org-switcher";
import { RegionSwitcher } from "@/components/RegionSwitcher";
import { NexusOrb } from "@/components/executive/NexusOrb";
import { BackHomeControls } from "@/components/layout/GlobalBackButton";
import { TopUtilityBar } from "@/components/nav/TopUtilityBar";
import { CommandPalette } from "@/components/executive/CommandPalette";

type NavItem = { to: string; icon: ComponentType<{ className?: string }>; label: string };
type NavGroup = { label: string; items: NavItem[] };

export function AppShell({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const pageBackdrop = pageBackdropFor(loc.pathname);
  return (
    // No shell-wide backdrop-filter: it sits over the solid body colour, so
    // the blur is visually a no-op — yet it forces a full-viewport blur every
    // frame and was measured to halve scroll fps on weak GPUs.
    <div className="nexus-app-shell relative flex min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#04070F]/55">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {pageBackdrop ? (
          <GlossyImageBackdrop src={pageBackdrop} className="absolute inset-0 z-0" opacity={0.55} />
        ) : (
          // Pages without a themed photo get a cinematic "fantastical" aurora
          // backdrop (pure CSS/SVG) so no surface is ever a flat dark void.
          <AuroraFantasyBackdrop className="z-0" intensity={0.85} />
        )}
        <div className="absolute -top-40 start-[-10%] h-[480px] w-[480px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-160px] end-[-10%] h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl" />
      </div>

      <aside className="nexus-sidebar hidden shrink-0 border-e border-sidebar-border glass-sidebar md:flex md:w-56 md:flex-col lg:w-60 xl:w-64 2xl:w-72">
        <SidebarBody />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="nexus-mobile-header sticky top-0 z-40 flex h-14 w-full max-w-[100vw] items-center justify-between gap-3 border-b border-border glass px-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <NexusOrb
                isOpen={open}
                onClick={() => setOpen((v) => !v)}
                controls="nexus-mobile-nav"
              />
            </SheetTrigger>
            <SheetContent
              id="nexus-mobile-nav"
              side="right"
              className="w-72 glass-sidebar p-0 text-sidebar-foreground"
            >
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* الرجوع/الرئيسية داخل الصفّ بجوار مدار النوافذ (قرار المالك
              ٢٠٢٦/٠٨/٠٦): محاذاةٌ بالتخطيط لا بحسابٍ عائم — فيُفسح لهما
              الصفّ بدل أن يجلسا فوق الشعار. */}
          <BackHomeControls />

          <div className="flex min-w-0 items-center gap-2">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-glow">
              <img
                src="/brand-icon.png"
                alt={brandName(locale === "ar")}
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 rounded-lg animate-pulse-ring" />
            </div>
            <SadeedName size="sm" />
          </div>
          {/* OWNER DIRECTIVE: مبدّل الوضع يُحذف من الشريط العلوي ويبقى في
              الشريط الجانبي وحده —
              كان مكرَّرًا في الموضعين. الرئيسية استثناء لأنها خارج هذه القشرة
              ولا شريط جانبي لها، فمبدّلها في HomeTopNav. */}
          <div className="flex items-center gap-2">
            <TopUtilityBar />
            <OrgSwitcher compact />
          </div>
        </header>
        <main className="nexus-main min-w-0 flex-1">
          <div className="relative mx-auto w-full max-w-[1680px] 2xl:max-w-[2040px] [@media(min-width:2200px)]:max-w-[2400px]">
            {/* زر الرجوع صار واحدًا عامًّا في الجذر (قرار المالك ٢٠٢٦/٠٨/٠٥)
                — فلم يبقَ هنا إلا شريط الأدوات على الشاشات الواسعة. */}
            {loc.pathname !== "/" && (
              <div className="sticky top-14 z-30 hidden w-full items-center justify-end gap-3 px-3 pt-3 md:top-3 md:flex md:px-4">
                <TopUtilityBar />
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
      {/* Global command palette on non-home routes (home mounts its own with cinema handler). */}
      {loc.pathname !== "/" && <CommandPalette />}
      {/* Legacy ExecutiveOverlay removed — FINN singleton lives at root. */}
    </div>
  );
}

function useNavGroups(): NavGroup[] {
  const { locale } = useI18n();
  const ar = (arText: string, enText: string) => (locale === "ar" ? arText : enText);
  // Single source of truth: any nav item whose route is a canonical module
  // takes its label + icon from the module registry, so a module's identity
  // can never drift between the sidebar and the dashboard (constitution 13.5).
  // Routes not in the registry (sub-pages, admin) keep their own labels.
  const canon = (i: NavItem): NavItem => {
    const m = moduleByRoute(i.to);
    return m ? { to: i.to, icon: m.icon, label: locale === "ar" ? m.ar : m.en } : i;
  };
  const groups: NavGroup[] = [
    {
      label: ar("الرئيسية", "Home"),
      items: [
        { to: "/", icon: Home, label: ar("الرئيسية", "Home") },
        // «خريطة النظام» (/guide) — الخريطة الدستورية للوحدات (المادة ٢١).
        // كانت الصفحة بلا رابط وارد واحد في المنظومة كلها، فلا يبلغها إلا من
        // يحفظ عنوانها. هذا مدخلها الدائم من الشريط الجانبي.
        { to: "/guide", icon: Compass, label: ar("خريطة النظام", "System Map") },
      ],
    },
    {
      // وحدات كانونية خمس من `lib/nav/modules.ts` كانت غير قابلة للبلوغ من أي
      // سطح تنقّل حيّ (لا الشريط الجانبي ولا الشريط العلوي ولا درج القمرة):
      // /mission-control · /situation-room · /executive-map · /urgent-ops ·
      // /boardroom. تُعرض هنا في مجموعتها الوظيفية، وأسماؤها وأيقوناتها
      // تأتي من السجل عبر canon() فلا تنحرف عن الشبكة أو خريطة النظام.
      label: ar("القيادة والعمليات", "Command & Operations"),
      items: [
        // الاسمان محروسان في screen-names.ts («مركز القيادة» و«غرفة العمليات»
        // انحرفا سابقًا بين شاشتين)، فيُقرآن من المصدر ولا يُعاد كتابتهما.
        {
          to: "/mission-control",
          icon: Gauge,
          label: ar(screenNameAr("/mission-control"), screenNameEn("/mission-control")),
        },
        {
          to: "/situation-room",
          icon: Radar,
          label: ar(screenNameAr("/situation-room"), screenNameEn("/situation-room")),
        },
        { to: "/executive-map", icon: MapIcon, label: ar("الخريطة التنفيذية", "Executive Map") },
        { to: "/urgent-ops", icon: Siren, label: ar("العاجل", "Urgent Ops") },
        { to: "/boardroom", icon: Building2, label: ar("قاعة المجلس", "Boardroom") },
      ],
    },
    {
      label: ar("العمليات", "Operations"),
      items: [
        // The name comes from the registry: this row used to say «غرفة
        // العمليات», which is /situation-room's name, so two sidebar entries
        // read the same and landed elsewhere. See lib/nav/screen-names.ts.
        { to: "/sec", icon: Activity, label: ar(screenNameAr("/sec"), screenNameEn("/sec")) },
        // «اللوحة التنفيذية» لوحة مؤشرات لا تاج: `Crown` كانت تقول «امتياز»
        // لا «لوحة»، وهي دلالة لا وجود لها في الشاشة نفسها.
        { to: "/sec/exec", icon: LayoutDashboard, label: ar("اللوحة التنفيذية", "Exec Dashboard") },
        { to: "/sec/circles", icon: Building2, label: ar("الدوائر", "Circles") },
        { to: "/sec/sections", icon: Grid3x3, label: ar("الأقسام", "Sections") },
        // `Rocket` = إطلاق، لا **إدارة** مشاريع. لوح المشاريع هو الدلالة.
        { to: "/sec/projects", icon: FolderKanban, label: ar("المشاريع", "Projects") },
        { to: "/sec/maintenance", icon: Wrench, label: ar("الصيانة", "Maintenance") },
        // «الامتثال HCIS» (/hcis) DELETED by owner directive ٢٠٢٦/٠٨/٠٩ — the
        // screen, its route, its icon and its data layer were removed from the
        // tree entirely. This is a deletion, not a hide: no hidden-routes entry
        // and no redirect stub exist for it.
        // «تصاريح العمل الرقمية» (/ptw) HIDDEN by owner directive — غير قابلة
        // للتطبيق حالياً. See src/lib/nav/hidden-routes.ts. Note /sec/permits
        // («التصاريح») is a DIFFERENT screen and stays visible.
        { to: "/sec/incidents", icon: ShieldAlert, label: ar("البلاغات", "Incidents") },
        // الدورية جولةٌ راجلة، والرادار كشفٌ عن بُعد — و`Radar` أيقونة «غرفة
        // العمليات» في السجل الكانوني، فقرأ البندان بأيقونة واحدة.
        { to: "/sec/patrols", icon: Footprints, label: ar("الدوريات", "Patrols") },
        // `Cctv` كاميرا مراقبة فعليًّا؛ `Camera` كاميرا تصوير.
        { to: "/sec/cctv", icon: Cctv, label: ar("CCTV", "CCTV") },
        { to: "/sec/kpi", icon: BarChart3, label: ar("مؤشرات الأداء", "KPIs") },
        // الاسم نفسه («التوأم الرقمي») في السجل الكانوني يحمل `Boxes` — واسمٌ
        // واحد بأيقونتين انحرافٌ في الهوية (المادة 13.5).
        { to: "/sec/twin", icon: Boxes, label: ar("التوأم الرقمي", "Digital Twin") },
      ],
    },
    {
      label: ar("الذكاء", "Intelligence"),
      items: [
        { to: "/finn", icon: Sparkles, label: ar("سَدِيد", "SADEED") },
        { to: "/voice", icon: Mic, label: ar("المساعد الصوتي", "Voice Assistant") },
        { to: "/agents", icon: Bot, label: ar("منصة عمليات الوكلاء", "Agent Operations Platform") },
        // هاتان الشاشتان كانتا موجودتين بلا رابط في أي سطح تنقّل، فلم يكن
        // للمالك سبيل لبلوغهما إلا بكتابة العنوان يدويًا (بندا المراجعة 52 و54).
        { to: "/finn-analytics", icon: BarChart3, label: ar("تحليلات سَدِيد", "SADEED Analytics") },
        { to: "/observability", icon: RadioTower, label: ar("الرصد والتكاليف", "Observability") },
      ],
    },
    {
      label: ar("المعرفة", "Knowledge"),
      items: [
        { to: "/sec/reports", icon: FileText, label: ar("التقارير", "Reports") },
        { to: "/integrations", icon: Plug, label: ar("التكاملات", "Integrations") },
        // `Bot` أيقونة **منصة الوكلاء** نفسها أعلاه؛ وهذا البند رابطٌ لا وكيل —
        // فِعلُه الوصل (MCP) لا التشغيل.
        { to: "/connect", icon: Waypoints, label: ar("ربط الوكلاء (MCP)", "Agent Connect (MCP)") },
        { to: "/files", icon: FolderOpen, label: ar("الملفات", "Files") },
      ],
    },
    {
      label: ar("الإدارة", "Administration"),
      items: [
        // `Shield` أيقونة وحدة **الأمن الصناعي** الكانونية؛ ولوحة الإدارة
        // إدارةُ مستخدمين وأدوار لا وحدةُ أمن صناعي.
        { to: "/admin", icon: ShieldUser, label: ar("لوحة الإدارة", "Admin Panel") },
        { to: "/settings", icon: Settings, label: ar("الإعدادات", "Settings") },
      ],
    },
  ];
  return groups.map((g) => ({ ...g, items: g.items.map(canon) }));
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { t, locale } = useI18n();
  const loc = useLocation();
  const groups = useNavGroups();
  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Sticky header — org identity + region switcher */}
      <div className="sticky top-0 z-10 border-b border-sidebar-border bg-sidebar/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-glow">
            <img
              src="/brand-icon.png"
              alt={brandName(locale === "ar")}
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 rounded-xl animate-pulse-ring" />
          </div>
          <div className="min-w-0 flex-1">
            {/* The mark, not a string. Every previous rename failed here because
                this slot held a hard-coded literal that no locale could reach. */}
            <SadeedWordmark size="sm" showDescriptor />
          </div>
        </div>
        <div className="space-y-2 px-3 pb-3">
          <OrgSwitcher />
          <RegionSwitcher onNavigate={onNavigate} />
        </div>
      </div>

      {/* Scrollable middle */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {groups.map((g) => (
          <div key={g.label} className="mb-5">
            <div className="px-3 pb-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
              {g.label}
            </div>
            <div className="space-y-1">
              {g.items.map((it, itemIndex) => {
                const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
                // External sister platform (Nusuk): the sidebar entry is a
                // real anchor that opens the platform in a new tab directly.
                const registryEntry = moduleByRoute(it.to);
                const externalUrl = registryEntry ? moduleExternalUrl(registryEntry) : null;
                if (externalUrl) {
                  const ItIcon = it.icon;
                  return (
                    <a
                      key={it.to}
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="يُفتح في نافذة جديدة"
                      onClick={onNavigate}
                      className="group relative flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-foreground/75 transition-[background-color,color,transform] hover:bg-sidebar-accent/40 hover:text-sidebar-foreground active:scale-[0.98]"
                    >
                      <span
                        className="nx-orb grid size-8 shrink-0 place-items-center rounded-lg transition-colors"
                        style={{
                          ["--orb-accent" as string]: ORB_HUES[itemIndex % ORB_HUES.length],
                          ["--orb-speed" as string]: ORB_BEATS[itemIndex % ORB_BEATS.length],
                        }}
                      >
                        <ItIcon className="size-4" aria-hidden />
                      </span>
                      <span className="truncate">{it.label}</span>
                      <ExternalLinkIcon
                        className="ms-auto size-3.5 shrink-0 text-primary/70"
                        aria-hidden
                      />
                    </a>
                  );
                }
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-[background-color,color]",
                      active
                        ? "bg-gradient-to-l from-primary/15 to-transparent text-sidebar-foreground"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-y-2 end-0 w-1 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
                      />
                    )}
                    <span
                      className={cn(
                        "nx-orb grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
                        active
                          ? "nx-icon-pulse bg-primary/15 text-primary"
                          : "bg-muted/30 text-muted-foreground group-hover:bg-muted/50 group-hover:text-foreground",
                      )}
                      data-orb-active={active || undefined}
                      style={{
                        ["--orb-accent" as string]: ORB_HUES[itemIndex % ORB_HUES.length],
                        ["--orb-speed" as string]: ORB_BEATS[itemIndex % ORB_BEATS.length],
                      }}
                    >
                      <it.icon className="nx-icon-soft size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sticky footer — user chip + round icon actions */}
      <div className="sticky bottom-0 border-t border-sidebar-border bg-sidebar/95 px-3 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <UserChip />
          <div className="ms-auto flex shrink-0 items-center gap-1.5">
            <LangIconToggle />
            <SignOutIcon />
          </div>
        </div>
      </div>
    </div>
  );
}

function LangIconToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <button
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className="grid size-9 place-items-center rounded-full border border-sidebar-border bg-card text-[12px] font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
      aria-label={t("lang.label")}
    >
      {locale === "ar" ? "EN" : "AR"}
    </button>
  );
}

function SignOutIcon() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  // Guest (open browsing, no session): offer a way INTO the real login page
  // instead of a no-op sign-out. Authenticated users get the sign-out action.
  if (!user) {
    return (
      <Link
        to="/auth"
        search={{ redirect: typeof window !== "undefined" ? window.location.pathname : "/" }}
        className="grid size-9 place-items-center rounded-full border border-sidebar-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-primary"
        aria-label={t("auth.signin")}
        title={t("auth.signin")}
      >
        <LogIn className="size-4" data-flip-rtl />
      </Link>
    );
  }
  return (
    <button
      onClick={() => signOut()}
      className="grid size-9 place-items-center rounded-full border border-sidebar-border bg-card text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
      aria-label={t("auth.signout")}
      title={t("auth.signout")}
    >
      <LogOut className="size-4" data-flip-rtl />
    </button>
  );
}

function LangToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <button
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      aria-label={t("lang.label")}
    >
      {t("lang.toggle")}
    </button>
  );
}

function UserChip() {
  const { user } = useAuth();
  const { locale } = useI18n();
  const { region } = useRegion();
  const displayName =
    locale === "ar"
      ? `إدارة ${region.labelAr.replace(/^الأمن الصناعي — /, "الأمن الصناعي بالمنطقة ").replace("المنطقة المنطقة", "المنطقة")}`
      : region.labelEn;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2" title={user?.email ?? undefined}>
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
        أ
      </div>
      <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground" dir="rtl">
        {displayName}
      </div>
    </div>
  );
}
