/**
 * ExperienceLevelBar — bottom utility bar: the three experience levels
 * (executive / operational / technical — real density switches), search,
 * dashboards, settings and the user chip. Sticky on desktop, in-flow on
 * small screens (package 03: never overlap content).
 */
import * as React from "react";
import { LayoutDashboard, Search, Settings, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ExperienceLevel } from "./repository";
import { useCockpit } from "./use-cockpit";
import { emitCockpitAction, getCockpitAction, type CockpitActionId } from "./actions";

const LEVELS: readonly {
  id: ExperienceLevel;
  actionId: CockpitActionId;
  labelAr: string;
  labelEn: string;
}[] = [
  {
    id: "executive",
    actionId: "level.executive",
    labelAr: "المستوى التنفيذي",
    labelEn: "EXECUTIVE VIEW",
  },
  {
    id: "operational",
    actionId: "level.operational",
    labelAr: "المستوى التشغيلي",
    labelEn: "OPERATIONAL VIEW",
  },
  {
    id: "technical",
    actionId: "level.technical",
    labelAr: "المستوى التقني",
    labelEn: "TECHNICAL VIEW",
  },
];

export function ExperienceLevelBar() {
  const { level, setLevel, openDrawer } = useCockpit();
  const { user } = useAuth();

  return (
    <footer
      data-testid="experience-level-bar"
      className="nx-glass-e1 rounded-nx-16 sticky bottom-2 z-20 flex flex-wrap items-center justify-between gap-3 border border-white/10 px-3 py-2 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 text-[12px] text-nx-pearl/56">
        <span className="font-bold text-nx-pearl">SADEED</span>
        <span dir="ltr">v2 · Enterprise</span>
      </div>

      {/* A density switch, not tabs revealing panels: a labeled group of
          toggle buttons (aria-pressed) is the correct, keyboard-native
          pattern — each button sits in natural tab order. */}
      <div role="group" aria-label="مستوى العرض" className="flex items-center gap-1">
        {LEVELS.map((entry) => {
          const active = level === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={active}
              data-action={entry.actionId}
              data-level={entry.id}
              onClick={() => {
                emitCockpitAction(entry.actionId);
                setLevel(entry.id);
              }}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center rounded-nx-12 px-3 py-1 transition-[background-color,border-color,color] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan",
                active
                  ? "nx-glass-e1 border border-nx-cyan/50 text-nx-pearl shadow-[var(--nx-glow-focus)]"
                  : "text-nx-pearl/56 hover:bg-white/6 hover:text-nx-pearl",
              )}
            >
              <span className="text-xs font-semibold">{entry.labelAr}</span>
              <span className="text-[12px] tracking-wide opacity-64" dir="ltr">
                {entry.labelEn}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-action="search.open"
          aria-label="فتح البحث"
          onClick={() => {
            emitCockpitAction("search.open");
            openDrawer({ type: "search" });
          }}
          className="nx-holo-icon rounded-nx-12 inline-flex size-11 items-center justify-center text-nx-pearl/72 transition-[border-color,color] duration-[var(--nx-anim-fast)] hover:border-nx-cyan/40 hover:text-nx-pearl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
        >
          <Search aria-hidden className="size-4" />
        </button>
        <a
          href={getCockpitAction("dashboards.open").target}
          data-action="dashboards.open"
          aria-label="فتح لوحات المعلومات"
          onClick={() => emitCockpitAction("dashboards.open")}
          className="nx-holo-icon rounded-nx-12 inline-flex size-11 items-center justify-center text-nx-pearl/72 transition-[border-color,color] duration-[var(--nx-anim-fast)] hover:border-nx-cyan/40 hover:text-nx-pearl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
        >
          <LayoutDashboard aria-hidden className="size-4" />
        </a>
        <a
          href={getCockpitAction("settings.open").target}
          data-action="settings.open"
          aria-label="فتح الإعدادات"
          onClick={() => emitCockpitAction("settings.open")}
          className="nx-holo-icon rounded-nx-12 inline-flex size-11 items-center justify-center text-nx-pearl/72 transition-[border-color,color] duration-[var(--nx-anim-fast)] hover:border-nx-cyan/40 hover:text-nx-pearl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
        >
          <Settings aria-hidden className="size-4" />
        </a>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-action="user.menu"
              aria-label="فتح قائمة المستخدم"
              onClick={() => emitCockpitAction("user.menu")}
              className="nx-glass-e1 rounded-nx-12 inline-flex min-h-11 items-center gap-2 px-3 text-xs text-nx-pearl/80 transition-[border-color] duration-[var(--nx-anim-fast)] hover:border-nx-cyan/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
            >
              <UserRound aria-hidden className="size-4" />
              <span className="hidden sm:inline">{user?.email ? "حساب موثق" : "زائر"}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-white/10 bg-nx-obsidian text-nx-pearl">
            <DropdownMenuLabel>{user?.email ? "جلسة موثقة" : "وضع الزائر"}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem asChild>
              <a href="/settings" className="cursor-pointer">
                الإعدادات
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={user?.email ? "/" : "/auth"} className="cursor-pointer">
                {user?.email ? "الرئيسية" : "تسجيل الدخول"}
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </footer>
  );
}
