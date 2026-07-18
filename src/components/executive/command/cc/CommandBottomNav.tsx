/**
 * CommandBottomNav — the command center's horizontal navigation bar. Every
 * item is a living icon that links to a REAL route. Horizontally scrollable on
 * narrow screens so it stays a single row on every device.
 */
import { Link } from "@tanstack/react-router";
import {
  Activity,
  FileText,
  FolderKanban,
  Home,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

const NAV: { ar: string; en: string; to: string; icon: LucideIcon }[] = [
  { ar: "الرئيسية", en: "Home", to: "/", icon: Home },
  { ar: "الأداء", en: "Performance", to: "/analytics", icon: Activity },
  { ar: "المشاريع", en: "Projects", to: "/mission-control", icon: FolderKanban },
  { ar: "الموارد", en: "Resources", to: "/agents", icon: Users },
  { ar: "المخاطر", en: "Risk", to: "/risk", icon: ShieldAlert },
  { ar: "التقارير", en: "Reports", to: "/executive-reports", icon: FileText },
  { ar: "الذكاء الاصطناعي", en: "AI", to: "/aria", icon: Sparkles },
  { ar: "الإعدادات", en: "Settings", to: "/governance", icon: Settings },
];

export function CommandBottomNav({ ar, accent }: { ar: boolean; accent: string }) {
  return (
    <nav
      aria-label={ar ? "التنقّل الرئيسي" : "Primary navigation"}
      className="mt-3 flex items-center justify-between gap-1 rounded-2xl border border-white/10 bg-black/30 px-2 py-1.5 backdrop-blur-md"
      style={{ ["--acc" as string]: accent }}
    >
      {NAV.map((n, i) => {
        const Icon = n.icon;
        const active = i === 0;
        return (
          <Link
            key={n.to + n.en}
            to={n.to as "/"}
            aria-label={ar ? n.ar : n.en}
            aria-current={active ? "page" : undefined}
            className="group flex min-h-11 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-center transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc)]/60 active:scale-[0.96] active:bg-white/10"
            style={active ? { background: `${accent}18` } : undefined}
          >
            <Icon
              className="nx-icon-soft h-4 w-4"
              style={{ color: active ? accent : "rgba(255,255,255,0.65)" }}
              aria-hidden
            />
            <span
              className="line-clamp-1 text-[8px] font-medium sm:text-[9px]"
              style={{ color: active ? accent : "rgba(255,255,255,0.6)" }}
            >
              {ar ? n.ar : n.en}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default CommandBottomNav;
