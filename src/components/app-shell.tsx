import { Link, useLocation } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bot,
  Brain,
  Building2,
  Camera,
  Crown,
  FileText,
  FolderOpen,
  Grid3x3,
  Home,
  LogOut,
  MapPin,
  Menu,
  Mic,
  Moon,
  Network,
  Plug,
  Radar,
  Rocket,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Sun,
  Wrench,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { useRegion } from "@/lib/region-context";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { OrgSwitcher } from "@/components/org/org-switcher";
import { RegionSwitcher } from "@/components/RegionSwitcher";


type NavItem = { to: string; icon: ComponentType<{ className?: string }>; label: string };
type NavGroup = { label: string; items: NavItem[] };


export function AppShell({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="nexus-app-shell relative flex min-h-screen bg-[#04070F]/55 backdrop-blur-[2px]">
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
  const { locale } = useI18n();
  const ar = (arText: string, enText: string) => (locale === "ar" ? arText : enText);
  return [
    {
      label: ar("الرئيسية", "Home"),
      items: [
        { to: "/", icon: Home, label: ar("الرئيسية", "Home") },
      ],
    },
    {
      label: ar("العمليات", "Operations"),
      items: [
        { to: "/sec",             icon: Activity,    label: ar("غرفة العمليات", "Ops Room") },
        { to: "/sec/exec",        icon: Crown,       label: ar("اللوحة التنفيذية", "Exec Dashboard") },
        { to: "/sec/circles",     icon: Building2,   label: ar("الدوائر", "Circles") },
        { to: "/sec/sections",    icon: Grid3x3,     label: ar("الأقسام", "Sections") },
        { to: "/sec/projects",    icon: Rocket,      label: ar("المشاريع", "Projects") },
        { to: "/sec/maintenance", icon: Wrench,      label: ar("أوامر العمل", "Work Orders") },
        { to: "/sec/incidents",   icon: ShieldAlert, label: ar("البلاغات", "Incidents") },
        { to: "/sec/patrols",     icon: Radar,       label: ar("الدوريات", "Patrols") },
        { to: "/sec/cctv",        icon: Camera,      label: ar("CCTV", "CCTV") },
        { to: "/sec/kpi",         icon: BarChart3,   label: ar("مؤشرات الأداء", "KPIs") },
        { to: "/sec/twin",        icon: Network,     label: ar("التوأم الرقمي", "Digital Twin") },
        { to: "/hajj",            icon: MapPin,      label: ar("عمليات الحج", "Hajj Ops") },
      ],
    },
    {
      label: ar("الذكاء", "Intelligence"),
      items: [
        { to: "/aria",    icon: Sparkles, label: ar("ARIA", "ARIA") },
        { to: "/voice",   icon: Mic,      label: ar("المساعد الصوتي", "Voice Assistant") },
        { to: "/agents",  icon: Bot,      label: ar("الوكلاء", "Agents") },
        { to: "/sec/ai",  icon: Brain,    label: ar("توصيات ARIA", "ARIA Recos") },
      ],
    },
    {
      label: ar("المعرفة", "Knowledge"),
      items: [
        { to: "/executive-reports", icon: FileText,    label: ar("التقارير", "Reports") },
        { to: "/integrations",      icon: Plug,        label: ar("التكاملات", "Integrations") },
        { to: "/files",             icon: FolderOpen,  label: ar("الملفات", "Files") },
      ],
    },
    {
      label: ar("الإدارة", "Administration"),
      items: [
        { to: "/admin",    icon: Shield,   label: ar("لوحة الإدارة", "Admin Panel") },
        { to: "/settings", icon: Settings, label: ar("الإعدادات", "Settings") },
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

      <div className="space-y-2 border-b border-sidebar-border px-3 py-3">
        <OrgSwitcher />
        <RegionSwitcher onNavigate={onNavigate} />
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
  const { t, locale } = useI18n();
  const { region } = useRegion();
  const displayName = locale === "ar"
    ? `إدارة ${region.labelAr.replace(/^الأمن الصناعي — /, "الأمن الصناعي بالمنطقة ").replace("المنطقة المنطقة", "المنطقة")}`
    : region.labelEn;
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
