/**
 * الشريط الجانبي للنظام — **نسخةٌ واحدة، تركّبها قشرة النظام وحدها.**
 *
 * أمر المالك ٢٠٢٦/٠٩/٢٩: الشريط في النظام كلّه، بعناصر التصميم — وهي اثنا
 * عشر منذ أمر ٢٠٢٦/١٠/٢٩ «احذف الموجود فالمرفق من النافذه فقط» (ثمانية صفوف
 * سقطت من النافذة وحدها، وصفحاتها حيّة؛ التفصيل في رأس `system-nav.ts`).
 * العناصر تُقرأ من `SYSTEM_NAV` وحده، والمناطق من `REGIONS` وحدها،
 * والاسم المحروس من `screen-names` — فلا قائمة ثانية تفترق عن الأولى.
 *
 * والألوان من طبقة الرموز فتنقلب مع الوضع (المواد ٣٢–٣٤): السطح معتم في
 * الوضعين (الشريط لا يقرأ الفيلم تحته)، والعنصر النشط لوحٌ بنبرة
 * `--tone-blue` حبرُه `--surface` — ٦٫٧:١ في الفاتح ونحو ٧:١ في الداكن.
 *
 * ## يسارًا في كل صفحة (D5 وN4 ٢٠٢٦/١٠/١٣–١٤، ممدودين بأمر ٢٠٢٦/١٠/١٨)
 *
 * كان الشريط يسارًا على الرئيسية وحدها («كما في الصورة حرفيًّا») وعلى جهة
 * البداية في بقية الصفحات. ثم أمر المالك ٢٠٢٦/١٠/١٨: «اجعل جميع صفحات النظام
 * بنفس تخطيط وهيئة الصفحة الرئيسية» — فسقطت الجهة الثانية (`start`) وصار
 * الشريط شريطًا واحدًا بهيئة مخطّط مركز القيادة في كل صفحة:
 *   • **الصفّ يسارًا ← يمينًا**: الأيقونة على حافّة الشاشة يسارًا، والاسم
 *     بجانبها، والسهم في الطرف الأيمن. والاسم نفسه يعلن لغته (`dir`)، فلا
 *     يُقلب نصٌّ عربي لينقلب الترتيب — القاعدة نفسها في `-blueprint-page`.
 *   • ثلاثة صفوف أولى طليقة (الرئيسية · مركز القيادة · سَدِيد AI)، ثم **لوحٌ
 *     مجمَّع** فاتح يحمل بقية الأقسام — `.nx-sysnav-box`.
 *   • رأس الشريط **لوحة الهوية** «SADEED · Industrial Security AI OS» (أمر
 *     المالك ٢٠٢٦/١٠/١٨ — `SadeedPlateLockup`)، بخانةٍ مقيسة للوحة 3:1 بعرض
 *     الشريط.
 * والأنماط كلّها في `styles/home/home-chrome.css`، ومحدِّد الجهة
 * `[data-side="left"]` باقٍ مكتوبًا على الشريط وسنده وقائمته — قيمةٌ واحدة.
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
import { SadeedPlateLockup } from "@/components/brand/SadeedPlateLockup";
import { PalmSilhouette, SkylineSilhouette } from "@/components/brand/SkylineSilhouette";
import { FinnNavEntry } from "@/components/finn/FinnNavEntry";
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
 * القائمة — في الشريط (≥1024) وفي درج الترويسة (دونه)، بالهيئة نفسها.
 *
 * **جهةٌ واحدة: يسارًا فيزيائيًّا في اللغتين.** كانت هنا جهتان — `start`
 * للقشرة و`left` للرئيسية (D5) — وسقطت الأولى بأمر المالك ٢٠٢٦/١٠/١٨ «بنفس
 * تخطيط وهيئة الصفحة الرئيسية». فالصفّ يسارًا ← يمينًا، والنصّ داخله بلغته.
 */
export function SystemSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
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
      // الصفّ يسارًا ← يمينًا في كل صفحة (D5 ممدودًا ٢٠٢٦/١٠/١٨): الأيقونة على
      // حافّة الشاشة كما رُسمت، والاسم يعلن لغته بنفسه.
      dir="ltr"
      data-side="left"
      className="nx-sysnav-nav"
    >
      <div className="nx-sysnav-list">{primary.map(renderItem)}</div>
      {/* اللوح المجمَّع: بقية الأقسام على سطحٍ فاتح واحد كما في الصورة. */}
      <div className="nx-sysnav-list nx-sysnav-box">
        {rest.map(renderItem)}
        {/* «فِن» — للمالك وحده، والحكم من الخادم (يعيد null لغيره). خارج SYSTEM_NAV
            عمدًا: سجلّه اثنا عشر عنصرًا (أمر ٢٠٢٦/١٠/٢٩) يقرؤها كل مستخدم (انظر
            `owner-nav.ts`). */}
        <FinnNavEntry
          classes={{ row: ROW, idle: ROW_IDLE, active: ROW_ACTIVE }}
          textDir={textDir}
          onNavigate={onNavigate}
        />
      </div>
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
 * الشريط الكامل للشاشات العريضة — **مثبَّتٌ مع سندٍ في المسار.**
 *
 * `fixed` لا `sticky`: `body` حاوية السكرول (سلفه `overflow-x: hidden`)
 * فلا يلصق شيءٌ به — قِيس. والسند بالعرض نفسه يحجز مكانه في الصفّ، فلا
 * يغطّي الشريطُ المحتوى ولا ينكشف تحته فراغ.
 *
 * الجهة تُكتب سمةً (`data-side="left"`) على الشريط **وسنده معًا**، وقواعدها في
 * `styles/home/home-chrome.css` تسمّي الاثنين في المحدِّد نفسه — فلا يفترقان
 * (عقد «السند يتبع الشريط»). والعرض نفسه مكتوبٌ على الاثنين (`lg:w-56` =
 * 14rem، القاعدة نفسها في الأنماط). والسند أوّل عضوٍ في صفّ القشرة `ltr`،
 * فيقع يسارًا في كل صفحة.
 */
export function SystemSidebar() {
  const { locale } = useI18n();
  return (
    <>
      <div
        aria-hidden
        data-nx-presentation-hide
        className="nx-sysnav-spacer hidden shrink-0 lg:block lg:w-56"
        data-side="left"
      />
      {/* السطح والحافّة من `.nx-sysnav[data-side="left"]` (home-chrome.css): سطح
          القشرة المعتم، والخطّ الفاصل طبقةٌ تبدأ تحت صفّ الترويسة. */}
      <aside
        data-nx-presentation-hide
        className="nx-sysnav z-20 hidden lg:flex lg:w-56 lg:flex-col"
        data-side="left"
        // اتجاه اللغة على الشريط نفسه: يُركَّب في صفٍّ `ltr` (D5)، وقائمته
        // تبقى بترتيبها العربي لا يقلبها ترتيب الصفحة.
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        {/* لوحة الهوية في الزاوية التي تعلو الشريط (أمر المالك ٢٠٢٦/١٠/١٨) —
            الخانة مقيسة للوحة 3:1 بعرض الشريط (`.nx-sysnav-brand` في
            home-chrome.css)، والصورة من مكوّنها الواحد. */}
        <div className="nx-sysnav-brand border-b border-[color:var(--hairline)]">
          <SadeedPlateLockup variant="sidebar" />
        </div>
        <div className="nx-sysnav-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <SystemSidebarNav />
        </div>
        <div className="nx-sysnav-foot px-3 pb-4">
          <SystemSidebarCard />
        </div>
      </aside>
    </>
  );
}
