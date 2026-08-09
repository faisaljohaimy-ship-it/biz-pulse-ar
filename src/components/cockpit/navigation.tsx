/**
 * DesktopSideNavigation — وجهات مجمَّعة في خمس مجموعات، كلّها مسارات حيّة
 * (لا مسار مُخفى ولا جذع إعادة توجيه — التدقيق موثّق في `./actions.ts`)،
 * مع حالة نشِطة وحضور SADEED المصغّر. سطح المكتب: شريط ثابت ≥1280px.
 * الجوال/اللوحي: القائمة نفسها داخل درج Sheet يُفتح من زر القائمة.
 *
 * وحدات القيادة والعمليات الخمس (`/mission-control` · `/situation-room` ·
 * `/executive-map` · `/urgent-ops` · `/boardroom`) كانت مسجّلة في
 * `lib/nav/modules.ts` وغير مذكورة في أي سطح تنقّل حيّ، فأُضيفت هنا ضمن
 * مجموعتها الوظيفية بأسمائها الكانونية نفسها.
 *
 * لماذا `<a href>` لا `Link` في هذا الملف وحده: صفحة القمرة مصمّمة لتُرسَم
 * خارج الموجّه (انظر `CockpitUrlSync` في `routes/-nx-cockpit-page.tsx`
 * واختبار `src/test/nx-cockpit.test.tsx` الذي يرسمها بلا RouterProvider)،
 * و`Link` يرمي خارج سياق الموجّه فيُسقط المجموعة كلها. بقية أسطح التنقّل
 * (الشريط الجانبي والرئيسية) تستخدم `Link` الحقيقي.
 */
import * as React from "react";
import {
  Bot,
  Boxes,
  Building2,
  Cable,
  Compass,
  FileText,
  Gauge,
  Landmark,
  LayoutGrid,
  BookOpen,
  Map as MapIcon,
  Radar,
  Settings,
  Shield,
  Ship,
  Siren,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSadeed } from "@/lib/sadeed-core/hooks/useSadeed";
import { NxSadeedPresence } from "@/components/nx";
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

interface NavGroup {
  /** عنوان المجموعة — اسمٌ مسموع لقائمتها عبر aria-labelledby. */
  readonly labelAr: string;
  readonly labelEn: string;
  readonly items: readonly NavItem[];
}

const NAV_GROUPS: readonly NavGroup[] = [
  {
    labelAr: "القمرة",
    labelEn: "COCKPIT",
    items: [
      {
        actionId: "nav.home",
        labelAr: "الرئيسية",
        labelEn: "EXECUTIVE VIEW",
        icon: LayoutGrid,
        current: true,
      },
    ],
  },
  {
    labelAr: "القيادة والعمليات",
    labelEn: "COMMAND & OPERATIONS",
    items: [
      {
        actionId: "nav.missionControl",
        labelAr: "مركز القيادة",
        labelEn: "MISSION CONTROL",
        icon: Gauge,
      },
      {
        actionId: "nav.situationRoom",
        labelAr: "غرفة العمليات",
        labelEn: "SITUATION ROOM",
        icon: Radar,
      },
      {
        actionId: "nav.executiveMap",
        labelAr: "الخريطة التنفيذية",
        labelEn: "EXECUTIVE MAP",
        icon: MapIcon,
      },
      { actionId: "nav.operations", labelAr: "التشغيل", labelEn: "OPERATIONS", icon: Wrench },
      { actionId: "nav.urgentOps", labelAr: "العاجل", labelEn: "URGENT OPS", icon: Siren },
      { actionId: "nav.boardroom", labelAr: "قاعة المجلس", labelEn: "BOARDROOM", icon: Building2 },
    ],
  },
  {
    labelAr: "الأداء والحوكمة",
    labelEn: "PERFORMANCE & GOVERNANCE",
    items: [
      { actionId: "nav.indicators", labelAr: "المؤشرات", labelEn: "INDICATORS", icon: Gauge },
      { actionId: "nav.risks", labelAr: "المخاطر", labelEn: "RISKS", icon: Shield },
      { actionId: "nav.governance", labelAr: "الحوكمة", labelEn: "GOVERNANCE", icon: Landmark },
      { actionId: "nav.reports", labelAr: "التقارير", labelEn: "REPORTS", icon: FileText },
    ],
  },
  {
    labelAr: "الذكاء والمعرفة",
    labelEn: "INTELLIGENCE & KNOWLEDGE",
    items: [
      { actionId: "nav.agents", labelAr: "الوكلاء", labelEn: "AGENTS", icon: Bot },
      { actionId: "nav.knowledge", labelAr: "المعرفة", labelEn: "KNOWLEDGE", icon: BookOpen },
      { actionId: "nav.integrations", labelAr: "التكاملات", labelEn: "INTEGRATIONS", icon: Cable },
    ],
  },
  {
    labelAr: "النظام",
    labelEn: "SYSTEM",
    items: [
      { actionId: "nav.sectors", labelAr: "القطاعات", labelEn: "SECTORS", icon: Boxes },
      { actionId: "nav.settings", labelAr: "الإعدادات", labelEn: "SETTINGS", icon: Settings },
    ],
  },
];

/** صنف الرابط الواحد — مشترك بين عناصر القائمة ورابط تذييل خريطة النظام. */
const NAV_LINK_CLASS =
  "flex min-h-11 items-center gap-3 rounded-nx-12 px-3 py-2 text-start transition-[background-color,border-color,color] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {NAV_GROUPS.map((group) => {
        const headingId = `nx-nav-group-${group.labelEn.replace(/[^a-z]+/gi, "-").toLowerCase()}`;
        return (
          <div key={group.labelEn} className="flex flex-col gap-1">
            <h2
              id={headingId}
              // النص عريض وعالي التباين في الوضعين — لا رمادي باهت.
              className="px-3 pb-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-nx-pearl/72"
              dir="rtl"
            >
              {group.labelAr}
            </h2>
            <ul className="flex flex-col gap-1" aria-labelledby={headingId}>
              {group.items.map((item) => {
                const action = getCockpitAction(item.actionId);
                const Icon = item.icon;
                const className = cn(
                  NAV_LINK_CLASS,
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
                    <a
                      href={action.target ?? "/nx-cockpit"}
                      data-action={item.actionId}
                      aria-label={item.labelAr}
                      aria-current={item.current ? "page" : undefined}
                      className={className}
                      onClick={() => {
                        emitCockpitAction(item.actionId);
                        if (!item.current) onNavigate?.();
                      }}
                    >
                      {body}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function NavFooter({ onNavigate }: { onNavigate?: () => void }) {
  const { open } = useSadeed();
  const systemMap = getCockpitAction("nav.systemMap");
  return (
    <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-3">
      {/* خريطة النظام (/guide) — المدخل الوحيد إليها من القمرة. */}
      <a
        href={systemMap.target ?? "/guide"}
        data-action="nav.systemMap"
        aria-label={systemMap.labelAr}
        className={cn(NAV_LINK_CLASS, "text-nx-pearl/72 hover:bg-white/6 hover:text-nx-pearl")}
        onClick={() => {
          emitCockpitAction("nav.systemMap");
          onNavigate?.();
        }}
      >
        <Compass aria-hidden className="size-4 shrink-0" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold">{systemMap.labelAr}</span>
          <span className="truncate text-[12px] font-semibold tracking-wide opacity-72" dir="ltr">
            SYSTEM MAP
          </span>
        </span>
      </a>
      <button
        type="button"
        data-action="sadeed.chat.open"
        onClick={() => {
          emitCockpitAction("sadeed.chat.open");
          open({ focus: true });
        }}
        className="nx-glass-e1 rounded-nx-12 flex min-h-11 items-center gap-3 px-3 py-2 text-start transition-[border-color] duration-[var(--nx-anim-fast)] hover:border-nx-cyan/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
      >
        <NxSadeedPresence state="idle" mode="advisory" size="sm" />
        <span className="flex flex-col">
          <span className="text-sm font-bold text-nx-pearl">سَدِيد</span>
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
        <NavFooter onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
