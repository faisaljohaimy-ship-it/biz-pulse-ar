import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Activity, AlertTriangle, ShieldAlert, Radar, KeyRound, UserCheck, HardHat,
  Car, FileBadge, Siren, Camera, Eye, ListChecks, BarChart3, FileText,
  Clock, Boxes, Building2, Brain, ShieldCheck, Plug, Network, Wrench, Rocket, Crown, Building, BookOpen,
} from "lucide-react";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
const ITEMS: Item[] = [
  { to: "/sec", label: "غرفة العمليات", icon: Activity },
  { to: "/sec/exec", label: "اللوحة التنفيذية", icon: Crown },
  { to: "/sec/twin", label: "التوأم الرقمي", icon: Network },
  { to: "/sec/circles", label: "الدوائر", icon: Building },
  { to: "/sec/sections", label: "الأقسام", icon: ShieldCheck },
  { to: "/sec/projects", label: "المشاريع", icon: Rocket },
  { to: "/sec/maintenance", label: "أوامر العمل", icon: Wrench },
  { to: "/sec/incidents", label: "البلاغات", icon: AlertTriangle },
  { to: "/sec/patrols", label: "الدوريات", icon: Radar },
  { to: "/sec/access", label: "التحكم بالدخول", icon: KeyRound },
  { to: "/sec/visitors", label: "الزوار", icon: UserCheck },
  { to: "/sec/contractors", label: "المقاولين", icon: HardHat },
  { to: "/sec/vehicles", label: "المركبات", icon: Car },
  { to: "/sec/permits", label: "التصاريح", icon: FileBadge },
  { to: "/sec/emergency", label: "الطوارئ", icon: Siren },
  { to: "/sec/cctv", label: "CCTV", icon: Camera },
  { to: "/sec/safety", label: "ملاحظات السلامة", icon: Eye },
  { to: "/sec/risks", label: "سجل المخاطر", icon: ShieldAlert },
  { to: "/sec/kpi", label: "مؤشرات الأداء", icon: BarChart3 },
  { to: "/sec/reports", label: "التقارير", icon: FileText },
  { to: "/sec/shifts", label: "الورديات", icon: Clock },
  { to: "/sec/assets", label: "حماية الأصول", icon: Boxes },
  { to: "/sec/facilities", label: "حالة المواقع", icon: Building2 },
  { to: "/sec/timeline", label: "الخط الزمني", icon: ListChecks },
  { to: "/sec/ai", label: "توصيات ARIA", icon: Brain },
  { to: "/sec/integrations", label: "التكاملات", icon: Plug },
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
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
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
  title, subtitle, badge, children,
}: { title: string; subtitle?: string; badge?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {badge && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
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

export function StatCard({
  label, value, hint, tone = "default",
}: { label: string; value: string | number; hint?: string; tone?: "default" | "danger" | "warning" | "success" }) {
  const toneCls = {
    default: "border-border",
    danger: "border-red-500/40 bg-red-500/5",
    warning: "border-amber-500/40 bg-amber-500/5",
    success: "border-emerald-500/40 bg-emerald-500/5",
  }[tone];
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm", toneCls)}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function SampleBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
      Sample data — لم يُربط بنظام مباشر بعد
    </span>
  );
}

export function severityClass(sev: string) {
  switch (sev) {
    case "critical": return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
    case "high": return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
    case "medium": return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "low": return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}
export function statusClass(s: string) {
  if (["open", "active", "new", "inside", "approved"].includes(s)) return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
  if (["investigating", "pending", "scheduled", "expected"].includes(s)) return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
  if (["contained", "completed", "left", "resolved"].includes(s)) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  if (["closed", "expired", "offline", "missed", "revoked", "overdue"].includes(s)) return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
  return "bg-muted text-muted-foreground border-border";
}
