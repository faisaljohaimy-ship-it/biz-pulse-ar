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
 *
 * ## الرئيسية «كما في الصورة» (قرارا المالك D5 وN4، ٢٠٢٦/١٠/١٣–١٤)
 *
 * على الرئيسية (`side="left"`) يُرسم الشريط كما في مخطّط مركز القيادة:
 *   • **الصفّ يسارًا ← يمينًا**: الأيقونة على حافّة الشاشة يسارًا، والاسم
 *     بجانبها، والسهم في الطرف الأيمن. والاسم نفسه يعلن لغته (`dir`)، فلا
 *     يُقلب نصٌّ عربي لينقلب الترتيب — القاعدة نفسها في `-blueprint-page`.
 *   • ثلاثة صفوف أولى طليقة (الرئيسية · مركز القيادة · سَدِيد AI)، ثم **لوحٌ
 *     مجمَّع** فاتح يحمل بقية الأقسام — `.nx-sysnav-box`.
 *   • رأس الشريط شعار الجناح وكلمة SADEED بارتفاع صفّ الترويسة نفسه (64px)
 *     وحافّته — فيُقرأ الاثنان صفًّا واحدًا كما رُسما.
 * والأنماط كلّها في `styles/home/home-chrome.css` مقيّدةً بـ`[data-side="left"]`
 * فلا يتغيّر شريط القشرة في بقية الصفحات (جهة البداية، يمينًا في العربية).
 */
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { REGIONS, REGION_ACCENT_HEX } from "@/lib/regions";
import { useRegion } from "@/lib/region-context";
import { screenNameAr, screenNameEn } from "@/lib/nav/screen-names";
import { SYSTEM_NAV, type SystemNavItem, type SystemNavLeaf } from "@/lib/nav/system-nav";
import { useSadeedStore } from "@/lib/sadeed-core/state/sadeed-store";
import { PRODUCT_BRAND } from "@/lib/domain";
import { SadeedLockup } from "@/components/brand/SadeedMark";
import { SadeedWingMark } from "@/components/brand/SadeedWingMark";
import { PalmSilhouette, SkylineSilhouette } from "@/components/brand/SkylineSilhouette";
import "@/styles/home/home-chrome.css";

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

/**
 * الصفّ. **حلقة التركيز من `.nx-focus-ring` (styles.css) لا من أدوات
 * Tailwind:** القاعدة العامة `:where(button, a, …):focus-visible` خارج الطبقات
 * فتغلب أي أداة مطبَّقة — فكانت `focus-visible:outline-*` هنا أصنافًا ميتة
 * (الدرس نفسه في أزرار الترويسة، المواصفة §3.7).
 */
const ROW =
  "nx-sysnav-row nx-focus-ring group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start text-[14px] font-semibold transition-colors";
const ROW_IDLE =
  "text-[color:var(--ink-2)] hover:bg-[color:var(--chip-strong)] hover:text-[color:var(--ink)]";
const ROW_ACTIVE =
  "nx-sysnav-row--active bg-[color:var(--tone-blue)] text-[color:var(--surface)] shadow-[0_6px_18px_-8px_color-mix(in_srgb,var(--tone-blue)_70%,transparent)]";

/**
 * الصفوف الطليقة قبل اللوح المجمَّع: حتى عنصر سَدِيد وما قبله، كما في الصورة
 * (الرئيسية · مركز القيادة · سَدِيد AI). يُشتقّ من السجل نفسه لا من قائمةٍ
 * ثانية: لو تغيّر ترتيب `SYSTEM_NAV` تبعه التقسيم.
 */
function splitPrimary(items: readonly SystemNavItem[]) {
  const cut = items.findIndex((i) => i.kind === "sadeed");
  const at = cut < 0 ? 0 : cut + 1;
  return [items.slice(0, at), items.slice(at)] as const;
}

/**
 * جهة الشريط:
 *   • `start` (الافتراض) — طرف الكتابة المنطقي: يمينًا في العربية.
 *   • `left` — **يسارًا فيزيائيًّا في اللغتين**، للرئيسية وحدها: قرار المالك
 *     D5 (٢٠٢٦/١٠/١٣) «كما في الصورة حرفيًّا» — الشريط يسارًا والترتيب
 *     يسارًا ← يمينًا، والنصّ داخله عربيّ `rtl` كما هو.
 */
export type SystemSidebarSide = "start" | "left";

export function SystemSidebarNav({
  onNavigate,
  side = "start",
}: {
  onNavigate?: () => void;
  side?: SystemSidebarSide;
}) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  /** اتجاه لغة الاسم — يُكتب على كل اسم فلا يقلبه ترتيبُ الصفّ (D5). */
  const textDir = ar ? "rtl" : "ltr";
  const { pathname } = useLocation();
  const { setRegion, region } = useRegion();
  const enqueue = useSadeedStore((s) => s.enqueue);
  const [primary, rest] = splitPrimary(SYSTEM_NAV);

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

  const renderItem = (item: SystemNavItem) => {
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
            data-nav-id={item.id}
          >
            <GroupIcon aria-hidden className="nx-sysnav-ico size-5 shrink-0" />
            <span dir={textDir} className="nx-sysnav-label min-w-0 flex-1 truncate">
              {ar ? item.ar : item.en}
            </span>
            <ChevronDown
              aria-hidden
              className={cn(
                "nx-sysnav-chev size-4 shrink-0 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
          {expanded && (
            <div id={panelId} className="nx-sysnav-sub mt-1 space-y-0.5 ps-8">
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
                        className={cn(ROW, "min-h-10 text-[13px]", active ? ROW_ACTIVE : ROW_IDLE)}
                      >
                        {/* لون المنطقة متغيّرٌ يُمرَّر لا قيمةٌ نهائية (المادة ٣٤ §٣). */}
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full bg-[color:var(--region-tint)]"
                          style={{ ["--region-tint" as string]: REGION_ACCENT_HEX[r.id] }}
                        />
                        <span dir={textDir} className="nx-sysnav-label min-w-0 flex-1 truncate">
                          {ar ? r.shortAr : r.shortEn}
                        </span>
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
                        className={cn(ROW, "min-h-10 text-[13px]", active ? ROW_ACTIVE : ROW_IDLE)}
                      >
                        <ChildIcon aria-hidden className="nx-sysnav-ico size-4 shrink-0" />
                        <span dir={textDir} className="nx-sysnav-label min-w-0 flex-1 truncate">
                          {labelOf(c, ar)}
                        </span>
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
          className={cn(ROW, ROW_IDLE, "nx-sysnav-row--sadeed")}
          data-nav-id={item.id}
        >
          <Icon
            aria-hidden
            className="nx-sysnav-ico size-5 shrink-0 text-[color:var(--tone-blue)]"
          />
          <span dir={textDir} className="nx-sysnav-label min-w-0 flex-1 truncate">
            {label}
          </span>
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
        data-nav-id={item.id}
      >
        <Icon aria-hidden className="nx-sysnav-ico size-5 shrink-0" />
        <span dir={textDir} className="nx-sysnav-label min-w-0 flex-1 truncate">
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      aria-label={ar ? "التنقّل الرئيسي" : "Main navigation"}
      // على الرئيسية الصفّ يسارًا ← يمينًا (D5): الأيقونة على حافّة الشاشة
      // كما رُسمت. وفي القشرة يبقى الاتجاه موروثًا (البداية، يمينًا بالعربية).
      dir={side === "left" ? "ltr" : undefined}
      data-side={side}
      className="nx-sysnav-nav"
    >
      <div className="nx-sysnav-list">{primary.map(renderItem)}</div>
      {/* اللوح المجمَّع: بقية الأقسام على سطحٍ فاتح واحد كما في الصورة. */}
      <div className="nx-sysnav-list nx-sysnav-box">{rest.map(renderItem)}</div>
    </nav>
  );
}

/**
 * بطاقة الختام — «معاً نحو بيئة آمنة» كما رُسمت (قرار المالك ٢٠٢٦/١٠/١٤،
 * §2.1: النصّ كما في الصورة ونقطته الخضراء، فوق أفقٍ عند الغسق).
 *
 * **سطحٌ داكن ذاتيّ في الوضعين** كبطاقة الصورة: سماء غسقٍ من رموز الهوية
 * الثابتة (`--nx-*`) لا من رموز الوضع، فلا تنقلب سماءً بيضاء في الفاتح.
 * والحبر يُعاد تعريفه محلّيًّا في `.nx-sysnav-card` كما تفعل `.nx-arabia`.
 *
 * **والنخلة وحدها بلا سيفين** — الشعار الوطني مقيّد الاستعمال نظامًا، وهو
 * انحرافٌ مقصود عن «كل شيء» أُبلغ به المالك (§2.1). والأفق والنخلة زخرفٌ
 * (`aria-hidden`) فالبطاقة تُقرأ نصًّا: العبارة واسم الجهة.
 */
export function SystemSidebarCard() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <div dir={ar ? "rtl" : "ltr"} className="nx-sysnav-card">
      <SkylineSilhouette className="nx-sysnav-card-skyline" />
      <PalmSilhouette className="nx-sysnav-card-palm" />
      <div className="nx-sysnav-card-text">
        <p className="nx-sysnav-card-title">
          {ar ? "معاً نحو بيئة آمنة" : "Together toward a safe environment"}
        </p>
        <p className="nx-sysnav-card-org">
          <span aria-hidden className="nx-sysnav-card-dot" />
          <span>{ar ? "السعودية للطاقة" : "Saudi Energy"}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * شعار الرئيسية كما رُسم (قرار المالك N4): الجناح + «SADEED» +
 * «Industrial Security AI OS». الاسم من مصدره الواحد (`PRODUCT_BRAND`)، والجناح
 * `currentColor` فلونه من `.nx-wing-lockup` في طبقة الرموز.
 *
 * يُرسم في رأس الشريط على الشاشات العريضة، وفي الترويسة نفسها حين يختفي
 * الشريط (`SystemHeader`) — نسخةٌ واحدة لا اثنتان تفترقان.
 */
export function SadeedWingLockup({ className }: { className?: string }) {
  return (
    <span dir="ltr" lang="en" className={cn("nx-wing-lockup", className)}>
      <SadeedWingMark size={52} className="nx-wing-lockup-mark" />
      <span className="nx-wing-lockup-text">
        <span className="nx-wing-lockup-name">{PRODUCT_BRAND.en.name}</span>
        <span className="nx-wing-lockup-tag">Industrial Security AI OS</span>
      </span>
    </span>
  );
}

/**
 * الشريط الكامل للشاشات العريضة — **مثبَّتٌ مع سندٍ في المسار.**
 *
 * `fixed` لا `sticky`: `body` حاوية السكرول (سلفه `overflow-x: hidden`)
 * فلا يلصق شيءٌ به — قِيس. والسند بالعرض نفسه يحجز مكانه في الصفّ، فلا
 * يغطّي الشريطُ المحتوى ولا ينكشف تحته فراغ.
 */
function SidebarBrand({ side }: { side: SystemSidebarSide }) {
  const { locale } = useI18n();
  if (side === "left") return <SadeedWingLockup />;
  return <SadeedLockup ar={locale === "ar"} />;
}

/**
 * الجهة تُكتب سمةً (`data-side`) على الشريط **وسنده معًا**، وقواعدها في
 * `styles/home/home-layout.css` تسمّي الاثنين في المحدِّد نفسه — فلا يفترقان
 * (عقد «السند يتبع الشريط»). والسند عضوٌ في صفّ الصفحة، فيقع يسارًا لأنه
 * أوّل صفٍّ `ltr` على الرئيسية.
 */
export function SystemSidebar({ side = "start" }: { side?: SystemSidebarSide }) {
  const { locale } = useI18n();
  return (
    <>
      <div
        aria-hidden
        data-nx-presentation-hide
        className="nx-sysnav-spacer hidden shrink-0 lg:block lg:w-64 xl:w-72"
        data-side={side}
      />
      <aside
        data-nx-presentation-hide
        className="nx-sysnav z-20 hidden border-e border-[color:var(--hairline)] bg-[color:var(--surface)] lg:flex lg:w-64 lg:flex-col xl:w-72"
        data-side={side}
        // اتجاه اللغة على الشريط نفسه: قد يُركَّب في صفٍّ `ltr` (الرئيسية،
        // D5)، وقائمته تبقى بترتيبها العربي لا يقلبها ترتيب الصفحة.
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        {/* الهوية أعلى الشريط — على الرئيسية شعار الجناح بارتفاع صفّ
            الترويسة وحافّته، فيُقرآن صفًّا واحدًا كما في الصورة. */}
        <div className="nx-sysnav-brand border-b border-[color:var(--hairline)] px-4 py-3">
          <SidebarBrand side={side} />
        </div>
        <div className="nx-sysnav-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <SystemSidebarNav side={side} />
        </div>
        <div className="nx-sysnav-foot px-3 pb-4">
          <SystemSidebarCard />
        </div>
      </aside>
    </>
  );
}
