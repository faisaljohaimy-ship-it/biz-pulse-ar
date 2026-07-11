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
  Presentation,
  Radar,
  RadioTower,
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
import { NexusOrb } from "@/components/executive/NexusOrb";
import { SectorGlobeCorner } from "@/components/executive/SectorGlobeCorner";

type NavItem = { to: string; icon: ComponentType<{ className?: string }>; label: string };
type NavGroup = { label: string; items: NavItem[] };

export function AppShell({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="nexus-app-shell relative flex min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#04070F]/55 backdrop-blur-[2px]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
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
              side={locale === "ar" ? "right" : "left"}
              className="w-72 glass-sidebar p-0 text-sidebar-foreground"
            >
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg shadow-glow">
              <img
                src="/nexus-icon.png"
                alt="Nexus AI OS Logo"
                className="h-full w-full object-cover"
              />
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
          <div className="relative mx-auto w-full max-w-[1680px] 2xl:max-w-[2040px] [@media(min-width:2200px)]:max-w-[2400px]">
            {/* Cinematic sector globe — pinned to the windows workspace corner
                (top-right in RTL). Sticky so it persists as windows scroll. */}
            <div className="pointer-events-none sticky top-0 z-30 h-0">
              <div className="absolute top-16 start-3 md:top-3 md:start-4">
                <SectorGlobeCorner />
              </div>
            </div>
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
      items: [{ to: "/", icon: Home, label: ar("الرئيسية", "Home") }],
    },
    {
      label: ar("العمليات", "Operations"),
      items: [
        { to: "/sec", icon: Activity, label: ar("غرفة العمليات", "Ops Room") },
        { to: "/sec/exec", icon: Crown, label: ar("اللوحة التنفيذية", "Exec Dashboard") },
        { to: "/sec/circles", icon: Building2, label: ar("الدوائر", "Circles") },
        { to: "/sec/sections", icon: Grid3x3, label: ar("الأقسام", "Sections") },
        { to: "/sec/projects", icon: Rocket, label: ar("المشاريع", "Projects") },
        { to: "/sec/maintenance", icon: Wrench, label: ar("أوامر العمل", "Work Orders") },
        { to: "/sec/incidents", icon: ShieldAlert, label: ar("البلاغات", "Incidents") },
        { to: "/sec/patrols", icon: Radar, label: ar("الدوريات", "Patrols") },
        { to: "/sec/cctv", icon: Camera, label: ar("CCTV", "CCTV") },
        { to: "/sec/kpi", icon: BarChart3, label: ar("مؤشرات الأداء", "KPIs") },
        { to: "/sec/twin", icon: Network, label: ar("التوأم الرقمي", "Digital Twin") },
        { to: "/hajj", icon: MapPin, label: ar("عمليات الحج", "Hajj Ops") },
      ],
    },
    {
      label: ar("الذكاء", "Intelligence"),
      items: [
        { to: "/aria", icon: Sparkles, label: ar("ARIA", "ARIA") },
        { to: "/voice", icon: Mic, label: ar("المساعد الصوتي", "Voice Assistant") },
        { to: "/agents", icon: Bot, label: ar("الوكلاء", "Agents") },
        { to: "/sec/ai", icon: Brain, label: ar("توصيات ARIA", "ARIA Recos") },
      ],
    },
    {
      label: ar("العرض التنفيذي", "Executive Showcase"),
      items: [
        {
          to: "/executive-bridge",
          icon: RadioTower,
          label: ar("جسر القيادة التنفيذي", "Command Bridge"),
        },
        {
          to: "/executive-showcase",
          icon: Presentation,
          label: ar("العرض التنفيذي", "Executive Showcase"),
        },
      ],
    },
    {
      label: ar("المعرفة", "Knowledge"),
      items: [
        { to: "/executive-reports", icon: FileText, label: ar("التقارير", "Reports") },
        { to: "/integrations", icon: Plug, label: ar("التكاملات", "Integrations") },
        { to: "/files", icon: FolderOpen, label: ar("الملفات", "Files") },
      ],
    },
    {
      label: ar("الإدارة", "Administration"),
      items: [
        { to: "/admin", icon: Shield, label: ar("لوحة الإدارة", "Admin Panel") },
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
    <div className="flex h-full flex-col bg-sidebar">
      {/* Sticky header — org identity + region switcher */}
      <div className="sticky top-0 z-10 border-b border-sidebar-border bg-sidebar/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-glow">
            <img src="/nexus-icon.png" alt="Nexus AI OS" className="h-full w-full object-cover" />
            <span className="absolute inset-0 rounded-xl animate-pulse-ring" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-sidebar-foreground">Nexus AI OS</div>
            <div className="truncate text-[11px] text-muted-foreground">{t("app.tagline")}</div>
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
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
              {g.label}
            </div>
            <div className="space-y-1">
              {g.items.map((it) => {
                const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all",
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
                        "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
                        active
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/30 text-muted-foreground group-hover:bg-muted/50 group-hover:text-foreground",
                      )}
                    >
                      <it.icon className="size-4" />
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
            <ThemeIconToggle />
            <SignOutIcon />
          </div>
        </div>
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

function ThemeIconToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="grid size-9 place-items-center rounded-full border border-sidebar-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
      aria-label={t("theme.toggle")}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function LangIconToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <button
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className="grid size-9 place-items-center rounded-full border border-sidebar-border bg-card text-[11px] font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
      aria-label={t("lang.label")}
    >
      {locale === "ar" ? "EN" : "AR"}
    </button>
  );
}

function SignOutIcon() {
  const { signOut } = useAuth();
  const { t } = useI18n();
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
