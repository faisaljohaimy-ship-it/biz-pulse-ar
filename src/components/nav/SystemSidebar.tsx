/**
 * الشريط الجانبي للنظام — **نسخةٌ واحدة تُركَّب في القشرة وفي الرئيسية.**
 *
 * أمر المالك ٢٠٢٦/٠٩/٢٩: الشريط في النظام كلّه، بعناصر التصميم العشرين.
 * العناصر تُقرأ من `SYSTEM_NAV` وحده، والمناطق من `REGIONS` وحدها،
 * والاسم المحروس من `screen-names` — فلا قائمة ثانية تفترق عن الأولى.
 *
 * والألوان من طبقة الرموز فتنقلب مع الوضع (المواد ٣٢–٣٤): السطح معتم في
 * الوضعين (الشريط لا يقرأ الفيلم تحته)، والعنصر النشط لوحٌ بنبرة
 * `--tone-blue` حبرُه `--surface` — ٦٫٧:١ في الفاتح ونحو ٧:١ في الداكن.
 */
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronDown, ShieldHalf } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { REGIONS, REGION_ACCENT_HEX } from "@/lib/regions";
import { useRegion } from "@/lib/region-context";
import { screenNameAr, screenNameEn } from "@/lib/nav/screen-names";
import { SYSTEM_NAV, type SystemNavLeaf } from "@/lib/nav/system-nav";
import { useSadeedStore } from "@/lib/sadeed-core/state/sadeed-store";
import { brandName } from "@/lib/domain";
import { SadeedLockup } from "@/components/brand/SadeedMark";

/** الاسم: من السجل الكانوني إن كان محروسًا، وإلا من العنصر نفسه. */
function labelOf(item: SystemNavLeaf | { ar: string; en: string }, ar: boolean): string {
  if ("labelRoute" in item && item.labelRoute) {
    return ar ? screenNameAr(item.labelRoute) : screenNameEn(item.labelRoute);
  }
  return (ar ? item.ar : item.en) ?? "";
}

/** النشط: المطابقة التامة للرئيسية، والبادئة لغيرها — إلا لاسمٍ مستعار. */
function isActive(pathname: string, item: SystemNavLeaf): boolean {
  if (item.to === "/") return pathname === "/";
  if (item.labelRoute) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + "/");
}

const ROW =
  "group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--tone-blue)]";
const ROW_IDLE =
  "text-[color:var(--ink-2)] hover:bg-[color:var(--chip-strong)] hover:text-[color:var(--ink)]";
const ROW_ACTIVE =
  "bg-[color:var(--tone-blue)] text-[color:var(--surface)] shadow-[0_6px_18px_-8px_color-mix(in_srgb,var(--tone-blue)_70%,transparent)]";

export function SystemSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { pathname } = useLocation();
  const { setRegion, region } = useRegion();
  const enqueue = useSadeedStore((s) => s.enqueue);

  // المجموعة مفتوحةٌ ابتداءً إن كان أحد أبنائها هو الصفحة الحالية.
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const item of SYSTEM_NAV) {
      if (item.kind !== "group") continue;
      init[item.id] =
        item.children === "regions"
          ? pathname === "/sec"
          : item.children.some((c) => isActive(pathname, c));
    }
    return init;
  });

  return (
    <nav aria-label={ar ? "التنقّل الرئيسي" : "Main navigation"} className="space-y-1">
      {SYSTEM_NAV.map((item) => {
        if (item.kind === "group") {
          const expanded = !!open[item.id];
          const panelId = `sysnav-${item.id}`;
          const GroupIcon = item.icon;
          return (
            <div key={item.id}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen((s) => ({ ...s, [item.id]: !s[item.id] }))}
                className={cn(ROW, ROW_IDLE)}
              >
                <GroupIcon aria-hidden className="size-5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{ar ? item.ar : item.en}</span>
                <ChevronDown
                  aria-hidden
                  className={cn("size-4 shrink-0 transition-transform", expanded && "rotate-180")}
                />
              </button>
              {expanded && (
                <div id={panelId} className="mt-1 space-y-0.5 ps-8">
                  {item.children === "regions"
                    ? REGIONS.map((r) => {
                        const active = pathname === "/sec" && region.id === r.id;
                        return (
                          <Link
                            key={r.id}
                            to="/sec"
                            onClick={() => {
                              setRegion(r.id);
                              onNavigate?.();
                            }}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              ROW,
                              "min-h-10 text-[13px]",
                              active ? ROW_ACTIVE : ROW_IDLE,
                            )}
                          >
                            {/* لون المنطقة متغيّرٌ يُمرَّر لا قيمةٌ نهائية (المادة ٣٤ §٣). */}
                            <span
                              aria-hidden
                              className="size-2.5 shrink-0 rounded-full bg-[color:var(--region-tint)]"
                              style={{ ["--region-tint" as string]: REGION_ACCENT_HEX[r.id] }}
                            />
                            <span className="truncate">{ar ? r.shortAr : r.shortEn}</span>
                          </Link>
                        );
                      })
                    : item.children.map((c) => {
                        const active = isActive(pathname, c);
                        const ChildIcon = c.icon;
                        return (
                          <Link
                            key={c.id}
                            to={c.to}
                            onClick={onNavigate}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              ROW,
                              "min-h-10 text-[13px]",
                              active ? ROW_ACTIVE : ROW_IDLE,
                            )}
                          >
                            <ChildIcon aria-hidden className="size-4 shrink-0" />
                            <span className="truncate">{labelOf(c, ar)}</span>
                          </Link>
                        );
                      })}
                </div>
              )}
            </div>
          );
        }

        const Icon = item.icon;
        const label = labelOf(item, ar);

        if (item.kind === "sadeed") {
          // فعلٌ لا انتقال: لوحة سَدِيد الواحدة تُفتح حيث أنت.
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                enqueue({ kind: "open" });
                onNavigate?.();
              }}
              className={cn(ROW, ROW_IDLE)}
            >
              <Icon aria-hidden className="size-5 shrink-0 text-[color:var(--tone-blue)]" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
            </button>
          );
        }

        const active = isActive(pathname, item);
        return (
          <Link
            key={item.id}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(ROW, active ? ROW_ACTIVE : ROW_IDLE)}
          >
            <Icon aria-hidden className="size-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** بطاقة الختام — شعار المنتج لا شعارٌ لجهةٍ أخرى. */
export function SystemSidebarCard() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <div className="rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface-2)] p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color:var(--tone-blue)] text-[color:var(--surface)]">
          <ShieldHalf aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-[color:var(--ink)]">
            {ar ? "معًا نحو بيئة آمنة" : "Together for a safer site"}
          </p>
          <p className="truncate text-[12px] text-[color:var(--ink-2)]">{brandName(ar)}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * الشريط الكامل للشاشات العريضة — **مثبَّتٌ مع سندٍ في المسار.**
 *
 * `fixed` لا `sticky`: `body` حاوية السكرول (سلفه `overflow-x: hidden`)
 * فلا يلصق شيءٌ به — قِيس. والسند بالعرض نفسه يحجز مكانه في الصفّ، فلا
 * يغطّي الشريطُ المحتوى ولا ينكشف تحته فراغ.
 */
function SidebarBrand() {
  const { locale } = useI18n();
  return <SadeedLockup ar={locale === "ar"} />;
}

export function SystemSidebar() {
  return (
    <>
      <div
        aria-hidden
        data-nx-presentation-hide
        className="nx-sysnav-spacer hidden shrink-0 lg:block lg:w-64 xl:w-72"
      />
      <aside
        data-nx-presentation-hide
        className="nx-sysnav z-20 hidden border-e border-[color:var(--hairline)] bg-[color:var(--surface)] lg:flex lg:w-64 lg:flex-col xl:w-72"
      >
        {/* الهوية أعلى الشريط كما في التصميم — العلامة المتّجهة واسمها. */}
        <div className="border-b border-[color:var(--hairline)] px-4 py-3">
          <SidebarBrand />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <SystemSidebarNav />
        </div>
        <div className="px-3 pb-4">
          <SystemSidebarCard />
        </div>
      </aside>
    </>
  );
}
