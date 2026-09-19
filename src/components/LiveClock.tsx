/**
 * LiveClock — global live Gregorian clock strip.
 *
 * Single source of truth for the platform's date/time chip. Mounted once
 * from src/routes/__root.tsx so it appears on every route.
 *
 * Rules (per spec):
 *  • Gregorian only, both AR + EN labels.
 *  • Digits are ALWAYS Latin (0–9) via `numberingSystem: "latn"` —
 *    never Arabic-Indic (٠-٩), even when the surrounding UI is RTL.
 *  • Ticks every 1000 ms via setInterval (cleaned on unmount).
 *  • Standardized on Asia/Riyadh so the executive audience sees one wall
 *    clock regardless of the viewer's laptop timezone.
 *  • tabular-nums for stable width — the seconds do not cause jitter.
 */
import { useEffect, useState } from "react";
import { LottieIcon } from "@/components/icons/LottieIcon";

const TZ = "Asia/Riyadh";

// Explicit `numberingSystem: "latn"` forces English digits even under ar-*.
const gregDateEn = new Intl.DateTimeFormat("en-GB-u-nu-latn", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TZ,
  numberingSystem: "latn",
});
/**
 * الدرجة المضغوطة دون sm — **رقميّة لا مختصرة بالحروف.**
 *
 * الشريط صار يحمل الأزرار إلى جانب الساعة (أمر المالك ٢٠٢٦/٠٩/١٢)، فضاقت
 * خانة الساعة ولم يعد النصّ الكامل «Friday, 19 September 2026» يسعها دون
 * sm. وقرار المالك ٢٠٢٦/٠٨/٠٦ صريح: **الساعة لا تُقصّ.**
 *
 * وكانت الدرجة المضغوطة `month: "short"` ⇒ «19 Sept 2026». وأسقطها فحصُ
 * الإنتاج على `neexios.com` عند 375 بكسل — لا بحكمٍ نظريّ. والسبب أنّ
 * الخانة ضاقت من تحتها لا أنّ التاريخ طال: رفعُ قرص اللمس من 40 إلى 44
 * (‏٢٠٢٦/٠٩/١٨، لأرضية WCAG) أخذ من الباقي ثمانية بكسلات. أي أنّ إصلاح
 * أرضيةِ لمسٍ كسر قاعدةَ عرضٍ في الطرف الآخر من الصفّ نفسه — وهذا ما
 * يجعل الطرفين يُقاسان معًا لا كلٌّ على حدة.
 *
 * والعلاج رقميّ لا حذفٌ لدرجة: «19/09/2026» **لا يفقد معلومة** — لا اليوم
 * ولا الشهر ولا السنة — بينما حذف السنة كان سيوفّر أكثر ويُفقد ما لا
 * يُستنتج.
 *
 * **والأرقام مقيسة في متصفّح لا مقدَّرة** (‏`--nx-clockbar` على
 * `/sec/governance`): التاريخ 76px، والفائض عن حدّ الخانة 8px عند 360 ·
 * 23 عند 375 · 38 عند 390. ودون 360 لا يسع، ويتكفّل القناع المتدرّج
 * (‏`.nx-clock-slot` دون sm) بإخفات طرفه بدل قصٍّ حادّ — وهي الدرجة
 * المعلنة للأعرض الأضيق، لا ادّعاء تغطية.
 *
 * و`tabular-nums` مفروضة على الحاوية، فالعرض **ثابت لا يتذبذب** مع تغيّر
 * الأرقام: قياسُ يومٍ واحد يصحّ على السنة كلّها.
 */
const gregDateShortEn = new Intl.DateTimeFormat("en-GB-u-nu-latn", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TZ,
  numberingSystem: "latn",
});
const gregDateAr = new Intl.DateTimeFormat("ar-u-nu-latn", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TZ,
  numberingSystem: "latn",
});
const timeFmt = new Intl.DateTimeFormat("en-GB-u-nu-latn", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: TZ,
  numberingSystem: "latn",
});

interface LiveClockProps {
  readonly variant?: "chip" | "inline";
  readonly showArabic?: boolean;
  readonly className?: string;
}

export function LiveClock({ variant = "chip", showArabic = true, className = "" }: LiveClockProps) {
  // Initialised synchronously so the SSR HTML already contains a real
  // timestamp — the clock is NEVER an empty chip. The client re-stamps on
  // hydration (suppressHydrationWarning below) then ticks every second.
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const dEn = gregDateEn.format(now);
  const dEnShort = gregDateShortEn.format(now);
  const dAr = showArabic ? gregDateAr.format(now) : "";
  const t = timeFmt.format(now);

  if (variant === "inline") {
    return (
      <span
        dir="ltr"
        className={`inline-flex items-center gap-2 text-[12px] font-medium tabular-nums text-white/70 ${className}`}
        aria-label="Live Gregorian date and time (Asia/Riyadh)"
      >
        <span suppressHydrationWarning className="whitespace-nowrap">
          {dEn}
        </span>
        <span aria-hidden className="text-white/30">
          ·
        </span>
        <span suppressHydrationWarning className="whitespace-nowrap text-white/90">
          {t}
        </span>
      </span>
    );
  }

  return (
    <div
      role="group"
      aria-label="Live platform · Gregorian date and time (Asia/Riyadh)"
      dir="ltr"
      // الفجوة 1 دون sm لا 2: خمسة أبناء بينهم أربع فجوات، فكل ربع rem
      // مقتطع يردّ 16px إلى التاريخ. والصيغة الرقمية وحدها تركت الفائض عند
      // 360 بكسل **صفرًا بالضبط** — وصفرٌ ليس نجاحًا بل حدٌّ يقلبه أيّ
      // تقريبٍ أو خطٍّ بديل. وبها صار 8px. و360 عرضٌ شائع لا طرفيّ.
      // وفوق sm تبقى 2 كما كانت — لا شيء يتغيّر حيث لم يكن عطل.
      className={`inline-flex items-center gap-1 rounded-full border border-[#3AE8FF]/30 bg-black/50 px-3 py-1 text-[12px] font-medium tabular-nums text-white/85 shadow-[0_0_20px_rgba(0,212,255,0.18)] backdrop-blur-md sm:gap-2 ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        {/* مؤشّر «حيّ» بحركة Lottie — ولونه من الرموز لا من الملف.
            الحركة هنا تحمل معنًى (النظام يبثّ الآن)، وهو الشرط الوحيد
            الذي يسوّغ حلقةً لا تنتهي في هذا النظام.
            والرمز الساكن (النقطة) هو الأصل: يُصيَّر على الخادم ويبقى وحده
            عند تخفيض الحركة أو تعذّر التحميل. */}
        <LottieIcon
          src="/lottie/nx-pulse.json"
          className="nx-lottie-live relative inline-flex h-3.5 w-3.5"
          label="حيّ"
        >
          <span className="relative inline-block h-2 w-2 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
        </LottieIcon>
        <span className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#3AE8FF]">
          Live
        </span>
      </span>
      <span aria-hidden className="text-white/20">
        ·
      </span>
      <span suppressHydrationWarning className="whitespace-nowrap text-white">
        {t}
      </span>
      <span aria-hidden className="text-white/20">
        ·
      </span>
      {/* سُلّم ثلاث درجات، كلٌّ منها مقيس على عرض الخانة الباقي بعد
          الأزرار: المضغوط دون 640، والكامل فوقها، والعربي يُضاف فوق 768
          (عند 640 بالضبط يقيس الكامل مع العربي 522 والخانة 512 — فيُقصّ). */}
      <span suppressHydrationWarning className="whitespace-nowrap text-white/80 sm:hidden">
        {dEnShort}
      </span>
      <span suppressHydrationWarning className="hidden whitespace-nowrap text-white/80 sm:inline">
        {dEn}
      </span>
      {showArabic && dAr && (
        <>
          <span aria-hidden className="hidden text-white/20 md:inline">
            ·
          </span>
          <span
            suppressHydrationWarning
            dir="rtl"
            lang="ar"
            className="hidden whitespace-nowrap text-white/70 md:inline"
            style={{ fontFamily: '"IBM Plex Sans Arabic","Tajawal",ui-sans-serif,system-ui' }}
          >
            {dAr}
          </span>
        </>
      )}
    </div>
  );
}

export default LiveClock;
