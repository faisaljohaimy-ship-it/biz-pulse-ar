/**
 * DesktopSideNavigation — 14 destinations mapped to REAL routes, active
 * state, dark-contrast toggle, and the FINN mini-presence. Desktop: fixed
 * rail ≥1280px. Mobile/tablet: the same list inside a Sheet drawer opened
 * from the header menu button.
 */
import * as React from "react";
import {
  Bot,
  Boxes,
  Brain,
  Cable,
  FileText,
  Gauge,
  Landmark,
  LayoutGrid,
  BookOpen,
  Moon,
  Settings,
  Shield,
  Ship,
  Sun,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { useFinn } from "@/lib/finn-core/hooks/useFinn";
import { NxFinnPresence } from "@/components/nx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { emitCockpitAction, getCockpitAction, type CockpitActionId } from "./actions";

interface NavItem {
  actionId: CockpitActionId;
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** The cockpit itself — rendered active, no navigation. */
  current?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    actionId: "nav.home",
    labelAr: "الرئيسية",
    labelEn: "EXECUTIVE VIEW",
    icon: LayoutGrid,
    current: true,
  },
  { actionId: "nav.sectors", labelAr: "القطاعات", labelEn: "SECTORS", icon: Boxes },
  { actionId: "nav.commandBridge", labelAr: "جسر القيادة", labelEn: "COMMAND BRIDGE", icon: Ship },
  { actionId: "nav.indicators", labelAr: "المؤشرات", labelEn: "INDICATORS", icon: Gauge },
  { actionId: "nav.agents", labelAr: "الوكلاء", labelEn: "AGENTS", icon: Bot },
  { actionId: "nav.operations", labelAr: "التشغيل", labelEn: "OPERATIONS", icon: Wrench },
  { actionId: "nav.risks", labelAr: "المخاطر", labelEn: "RISKS", icon: Shield },
  { actionId: "nav.governance", labelAr: "الحوكمة", labelEn: "GOVERNANCE", icon: Landmark },
  { actionId: "nav.knowledge", labelAr: "المعرفة", labelEn: "KNOWLEDGE", icon: BookOpen },
  { actionId: "nav.integrations", labelAr: "التكاملات", labelEn: "INTEGRATIONS", icon: Cable },
  { actionId: "nav.reports", labelAr: "التقارير", labelEn: "REPORTS", icon: FileText },
  { actionId: "nav.settings", labelAr: "الإعدادات", labelEn: "SETTINGS", icon: Settings },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1" aria-label="وجهات النظام">
      {NAV_ITEMS.map((item) => {
        const action = getCockpitAction(item.actionId);
        const Icon = item.icon;
        const className = cn(
          "flex min-h-11 items-center gap-3 rounded-nx-12 px-3 py-2 text-start transition-[background-color,border-color,color] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan",
          item.current
            ? "nx-glass-e1 border border-nx-cyan/40 text-nx-pearl shadow-[var(--nx-glow-focus)]"
            : "text-nx-pearl/64 hover:bg-white/6 hover:text-nx-pearl",
        );
        const body = (
          <>
            <Icon aria-hidden className="size-4 shrink-0" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold">{item.labelAr}</span>
              <span
                className="truncate text-[12px] font-semibold tracking-wide opacity-72"
                dir="ltr"
              >
                {item.labelEn}
              </span>
            </span>
          </>
        );
        return (
          <li key={item.actionId}>
            {item.current ? (
              <a
                href={action.target ?? "/nx-cockpit"}
                data-action={item.actionId}
                aria-current="page"
                className={className}
                onClick={() => emitCockpitAction(item.actionId)}
              >
                {body}
              </a>
            ) : (
              <a
                href={action.target}
                data-action={item.actionId}
                className={className}
                onClick={() => {
                  emitCockpitAction(item.actionId);
                  onNavigate?.();
                }}
              >
                {body}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function NavFooter() {
  const { open } = useFinn();
  return (
    <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-3">
      <button
        type="button"
        data-action="finn.chat.open"
        onClick={() => {
          emitCockpitAction("finn.chat.open");
          open({ focus: true });
        }}
        className="nx-glass-e1 rounded-nx-12 flex min-h-11 items-center gap-3 px-3 py-2 text-start transition-[border-color] duration-[var(--nx-anim-fast)] hover:border-nx-cyan/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
      >
        <NxFinnPresence state="idle" mode="advisory" size="sm" />
        <span className="flex flex-col">
          <span className="text-sm font-bold text-nx-pearl">FINN</span>
          <span className="text-[12px] text-nx-success">المساعد التنفيذي · متصل</span>
        </span>
      </button>
    </div>
  );
}

export function DesktopSideNavigation() {
  return (
    <aside
      data-testid="side-navigation"
      aria-label="التنقل الرئيسي"
      className="sticky top-4 hidden max-h-[calc(100dvh-2rem)] w-44 shrink-0 flex-col gap-3 overflow-y-auto xl:flex"
    >
      <NavList />
      <NavFooter />
    </aside>
  );
}

export function MobileNavigationDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-72 flex-col gap-4 overflow-y-auto border-white/10 bg-nx-obsidian text-nx-pearl"
      >
        <SheetHeader>
          <SheetTitle className="text-start font-bold text-nx-pearl">وجهات سَدِيد</SheetTitle>
        </SheetHeader>
        <NavList onNavigate={() => onOpenChange(false)} />
        <NavFooter />
      </SheetContent>
    </Sheet>
  );
}
