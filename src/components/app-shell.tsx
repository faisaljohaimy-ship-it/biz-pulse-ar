import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  Bot,
  Users,
  Mic,
  FolderUp,
  Store,
  BookOpen,
  Workflow,
  BookMarked,
  Shield,
  ListChecks,
  Sun,
  Moon,
  FileText,
  Crown,
  Boxes,
  Plug,
  Network,
  GitMerge,
  Brain,
  Presentation,
  Briefcase,
  Gavel,
  Building2,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Ghost,
  Zap,
  GitBranch,
  Volume2,
  Layers,
  MapPin,
  Play,
  Activity,
  Wrench, Radio, Stethoscope, GraduationCap,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
// Legacy ExecutiveOverlay removed — replaced by the ARIA Singleton (`<AriaCopilot />`
// mounted once in `src/routes/__root.tsx`). See `src/lib/aria-core/README.md`.
import { OrgSwitcher } from "@/components/org/org-switcher";


type NavItem = { to: string; icon: ComponentType<{ className?: string }>; label: string };
type NavGroup = { label: string; items: NavItem[] };

export function AppShell({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="nexus-app-shell relative flex min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 start-[-10%] h-[480px] w-[480px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-160px] end-[-10%] h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl" />
      </div>

      <aside className="nexus-sidebar hidden shrink-0 border-e border-sidebar-border glass-sidebar md:flex md:w-56 md:flex-col lg:w-60 xl:w-64 2xl:w-72">
        <SidebarBody />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="nexus-mobile-header sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border glass px-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side={locale === "ar" ? "right" : "left"}
              className="w-72 glass-sidebar p-0 text-sidebar-foreground"
            >
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg shadow-glow">
              <img src="/nexus-icon.png" alt="Nexus AI OS Logo" className="h-full w-full object-cover" />
              <span className="absolute inset-0 rounded-lg animate-pulse-ring" />
            </div>
            <span className="text-sm font-bold tracking-tight">Nexus</span>
          </div>
          <div className="flex items-center gap-2">
            <OrgSwitcher compact />
            <ThemeToggle />
          </div>
        </header>
        <main className="nexus-main min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1680px] 2xl:max-w-[2040px] [@media(min-width:2200px)]:max-w-[2400px]">
            {children}
          </div>
        </main>
      </div>
      {/* Legacy ExecutiveOverlay removed — ARIA singleton lives at root. */}
    </div>

  );
}

function useNavGroups(): NavGroup[] {
  const { t, locale } = useI18n();
  const ar = (loc: string, arText: string, enText: string) => (loc === "ar" ? arText : enText);
  return [
    {
      label: t("nav.group.workspace"),
      items: [
        { to: "/theater", icon: Crown, label: ar(locale, "مسرح القيادة التنفيذية", "Executive Theater") },
        { to: "/situation-room", icon: Crown, label: ar(locale, "غرفة الموقف التنفيذية", "Executive Situation Room") },
        { to: "/bridge", icon: Crown, label: ar(locale, "جسر القيادة التنفيذي", "Executive Command Bridge") },
        { to: "/mission-control", icon: ShieldCheck, label: ar(locale, "مركز القيادة التنفيذي", "Mission Control") },
        { to: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
        { to: "/investor", icon: Presentation, label: ar(locale, "مركز القيادة الاستثماري", "Investor Command Center") },
        { to: "/tasks", icon: ListChecks, label: t("nav.tasks") },
        { to: "/files", icon: FolderUp, label: t("nav.files") },
      ],
    },
    {
      label: ar(locale, "الأمن الصناعي - المنطقة الغربية", "Industrial Security - Western Region"),
      items: [
        { to: "/sec", icon: ShieldCheck, label: ar(locale, "غرفة العمليات", "Ops Room") },
        { to: "/sec/exec", icon: Crown, label: ar(locale, "اللوحة التنفيذية", "Exec Dashboard") },
        { to: "/sec/twin", icon: Network, label: ar(locale, "التوأم الرقمي", "Digital Twin") },
        { to: "/sec/circles", icon: Building2, label: ar(locale, "الدوائر", "Circles") },
        { to: "/sec/sections", icon: Shield, label: ar(locale, "الأقسام", "Sections") },
        { to: "/sec/projects", icon: Rocket, label: ar(locale, "المشاريع", "Projects") },
        { to: "/sec/maintenance", icon: Workflow, label: ar(locale, "أوامر العمل", "Work Orders") },
        { to: "/sec/incidents", icon: ShieldAlert, label: ar(locale, "البلاغات", "Incidents") },
        { to: "/sec/cctv", icon: Layers, label: ar(locale, "CCTV", "CCTV") },
        { to: "/sec/kpi", icon: BarChart3, label: ar(locale, "مؤشرات الأداء", "KPIs") },
        { to: "/sec/ai", icon: Brain, label: ar(locale, "توصيات ARIA", "ARIA Recos") },
        { to: "/hajj", icon: MapPin, label: ar(locale, "عمليات الحج — مشاعر 1447", "Hajj Ops — Mashaer 1447") },
      ],
    },
    {
      label: t("nav.group.executive"),
      items: [
        { to: "/executive", icon: Crown, label: ar(locale, "غرفة القيادة التنفيذية", "Executive HQ") },
        { to: "/fabric", icon: Layers, label: ar(locale, "النسيج الذكي", "Intelligence Fabric") },
        { to: "/briefing", icon: FileText, label: t("nav.briefing") },
        { to: "/chief-of-staff", icon: Crown, label: t("nav.chief") },
        { to: "/intelligence", icon: Brain, label: t("nav.intelligence") },
        { to: "/boardroom", icon: Presentation, label: t("nav.boardroom") },
        { to: "/memory", icon: Brain, label: ar(locale, "ذاكرة المؤسسة", "Memory") },
        { to: "/crisis", icon: Zap, label: ar(locale, "تنبؤ الأزمات", "Crisis") },
        { to: "/execution", icon: GitBranch, label: ar(locale, "ذكاء التنفيذ", "Execution") },
        { to: "/forgotten", icon: Ghost, label: ar(locale, "ما الذي نُسي؟", "Forgotten") },
        { to: "/executive-map", icon: MapPin, label: ar(locale, "الخريطة التنفيذية", "Executive Map") },
        { to: "/executive-reports", icon: FileText, label: ar(locale, "التقارير التنفيذية", "Executive Reports") },
      ],
    },
    {
      label: t("nav.group.enterprise"),
      items: [
        { to: "/cockpit", icon: Crown, label: ar(locale, "قمرة القيادة", "Cockpit") },
        { to: "/portfolio", icon: Briefcase, label: ar(locale, "المحفظة", "Portfolio") },
        { to: "/decisions", icon: Gavel, label: ar(locale, "القرارات", "Decisions") },
        { to: "/departments", icon: Building2, label: ar(locale, "الأقسام", "Departments") },
        { to: "/transformation", icon: Rocket, label: ar(locale, "التحول", "Transformation") },
        { to: "/risk", icon: ShieldAlert, label: ar(locale, "المخاطر", "Risk") },
        { to: "/governance", icon: ShieldCheck, label: ar(locale, "الحوكمة", "Governance") },
        { to: "/outcomes", icon: TrendingUp, label: ar(locale, "النتائج", "Outcomes") },
        { to: "/analyst", icon: Brain, label: ar(locale, "محلل AI", "AI Analyst") },
        { to: "/digital-twin", icon: Boxes, label: t("nav.twin") },
        { to: "/integrations", icon: Plug, label: t("nav.integrations") },
        { to: "/ai-ops", icon: Network, label: t("nav.aiops") },
        { to: "/orchestration", icon: GitMerge, label: t("nav.orchestration") },
      ],
    },
    {
      label: t("nav.group.intelligence"),
      items: [
        { to: "/aria", icon: Brain, label: ar(locale, "ARIA — مركز الذكاء", "ARIA Console") },
        { to: "/assistant", icon: Sparkles, label: t("nav.assistant") },
        { to: "/agents", icon: Bot, label: t("nav.agents") },
        { to: "/voice", icon: Mic, label: t("nav.voice") },
        { to: "/tts", icon: Volume2, label: t("nav.tts") },
        { to: "/workflows", icon: Workflow, label: t("nav.workflows") },
        { to: "/tools", icon: Wrench, label: ar(locale, "الأدوات", "Tools") },
        { to: "/execution", icon: Activity, label: ar(locale, "مركز التنفيذ الحي", "Execution Center") },
        { to: "/events", icon: Radio, label: ar(locale, "بث الأحداث", "Event Stream") },
        { to: "/exec", icon: Play, label: ar(locale, "وحدة تحكم التنفيذ", "Execution Console") },
        { to: "/operations", icon: Activity, label: ar(locale, "مركز العمليات الحي", "Operations Center") },
        { to: "/health", icon: ShieldCheck, label: ar(locale, "صحة المنظومة", "Enterprise Health") },
        { to: "/diagnostics", icon: Stethoscope, label: ar(locale, "تشخيصات التشغيل", "Runtime Diagnostics") },
        { to: "/readiness", icon: ShieldCheck, label: ar(locale, "جاهزية الإنتاج", "Production Readiness") },
        { to: "/prompts", icon: BookMarked, label: t("nav.prompts") },
        { to: "/marketplace", icon: Store, label: t("nav.marketplace") },
        { to: "/knowledge", icon: BookOpen, label: t("nav.knowledge") },
        { to: "/learn", icon: GraduationCap, label: locale === "ar" ? "جسر المعرفة التنفيذي" : "Executive Knowledge Bridge" },
        { to: "/analytics", icon: BarChart3, label: t("nav.analytics") },
      ],
    },
    {
      label: t("nav.group.collab"),
      items: [{ to: "/team", icon: Users, label: t("nav.team") }],
    },
    {
      label: t("nav.group.admin"),
      items: [
        { to: "/admin", icon: Shield, label: t("nav.admin") },
        { to: "/settings", icon: Settings, label: t("nav.settings") },
      ],
    },
  ];
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const loc = useLocation();
  const groups = useNavGroups();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-glow">
          <img src="/nexus-icon.png" alt="Nexus AI OS" className="h-full w-full object-cover" />
          <span className="absolute inset-0 rounded-xl animate-pulse-ring" />
        </div>
        <div className="nexus-brand-text min-w-0">
          <div className="truncate text-sm font-bold text-sidebar-foreground">Nexus AI OS</div>
          <div className="truncate text-[11px] text-muted-foreground">{t("app.tagline")}</div>
        </div>
      </div>

      <div className="border-b border-sidebar-border px-3 py-3">
        <OrgSwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto p-3">


        {groups.map((g) => (
          <div key={g.label} className="mb-4">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {g.label}
            </div>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    <it.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="truncate">{it.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle />
          <LangToggle />
        </div>
        <UserChip />
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      aria-label={t("theme.toggle")}
    >
      {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
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
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const displayName = "إدارة الأمن الصناعي بالمنطقة الغربية";
  return (
    <div className="nexus-user-meta flex min-w-0 items-center gap-2" title={user?.email ?? undefined}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
        أ
      </div>
      <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground" dir="rtl">{displayName}</div>
      <Button variant="ghost" size="icon-sm" onClick={() => signOut()} title={t("auth.signout")}>
        <LogOut className="h-3.5 w-3.5" data-flip-rtl />
      </Button>
    </div>

  );
}
