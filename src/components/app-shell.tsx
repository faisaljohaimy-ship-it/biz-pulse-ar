import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, BarChart3, Sparkles, Settings, LogOut, Menu, Bot } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 start-[-10%] h-[480px] w-[480px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-160px] end-[-10%] h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl" />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-e border-sidebar-border glass-sidebar md:flex md:flex-col">
        <SidebarBody />
      </aside>

      {/* Mobile header + sheet */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border glass px-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
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
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Bot className="h-4 w-4 text-primary-foreground" />
              <span className="absolute inset-0 rounded-lg animate-pulse-ring" />
            </div>
            <span className="text-sm font-bold tracking-tight">Nexus</span>
          </div>
          <LangAndUser compact />
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const loc = useLocation();
  const items = [
    { to: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { to: "/analytics", icon: BarChart3, label: t("nav.analytics") },
    { to: "/assistant", icon: Sparkles, label: t("nav.assistant") },
    { to: "/settings", icon: Settings, label: t("nav.settings") },
  ];
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-sidebar-foreground">Nexus AI OS</div>
          <div className="truncate text-[11px] text-muted-foreground">{t("app.tagline")}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((it) => {
          const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
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
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <LangAndUser />
      </div>
    </div>
  );
}

function LangAndUser({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const { user, signOut } = useAuth();
  return (
    <div className={cn("flex items-center gap-2", compact ? "" : "justify-between")}>
      <button
        onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
        className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        aria-label={t("lang.label")}
      >
        {t("lang.toggle")}
      </button>
      {!compact && (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{user?.email}</div>
          <Button variant="ghost" size="icon-sm" onClick={() => signOut()} title={t("auth.signout")}>
            <LogOut className="h-3.5 w-3.5" data-flip-rtl />
          </Button>
        </div>
      )}
    </div>
  );
}
