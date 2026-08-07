/**
 * LottieIcon — أيقونة Lottie تتبع الوضعين ولون المنطقة، وتفشل إلى lucide.
 *
 * قرار المالك ٢٠٢٦/٠٨/٠٧: Lottie يُنفَّذ، ومعه الطبقة التي تجعل ألوانه
 * تتبع الوضعين. المنع السابق كان صحيحًا في سببه (bodymovin يخزّن اللون
 * قيمةً نهائية `"c":{"k":[r,g,b,1]}` ولا يعرف `currentColor`)، وهذا الملف
 * هو الجواب عليه لا الالتفاف حوله.
 *
 * ════════════════════════════════════════════════════════════════════════
 * ① كيف يُحلّ اللون — القاعدة تغلب السمة، ولا حاجة إلى `!important`
 * ════════════════════════════════════════════════════════════════════════
 *
 * قُرئ من مصدر `lottie_light` المثبَّت (5.13.0) وقيس على كروميوم:
 *
 *   • المشغّل يكتب اللون **سمةَ عرض** لا أسلوبًا مضمّنًا:
 *     `fill="rgb(r,g,b)"` و`stroke="rgb(r,g,b)"` على `<path>` مولَّد لكل
 *     نمط. والسطر الوحيد الذي يكتب `style.fill` في المستودع كلّه معطَّل
 *     بتعليق (`SolidElement.js:16`). فلا منافس مضمّن أصلًا.
 *   • وسمة العرض تدخل الترتيب التتابعي **قبل كل تصريحات المؤلّف**، فأي
 *     قاعدة CSS تغلبها بلا `!important` وبلا منافسة نوعية.
 *
 * ولهذا لا تعني إعادة الكتابة شيئًا: المشغّل يظلّ يكتب قيمةً **لا تُستعمل**.
 * وهذا هو الفارق الحاسم عن مسار «جافاسكربت يمشي على الشجرة ويستبدل»:
 * المشي وحده يُمحى في ثلاثة مواضع مثبتة —
 *
 *   ‑ كل إطار تتغيّر فيه قيمة لونية ذات إطارات مفاتيح،
 *   ‑ كل دورة تكرار (`_isFirstFrame` يُرفع من جديد في `show()`),
 *   ‑ وكل نقطة تدخل فيها طبقةٌ مداها `[ip, op)` — حتى لو كان لونها ثابتًا.
 *
 * وتصحيحه يستلزم معالج `drawnFrame` يعيد المشي كل إطار، وهو ما يمنعه رأس
 * `src/styles/icon-motion.css` صراحةً (إعادة الطلاء كل إطار محصورة
 * بالأسطح الكبيرة قليلة العدد). و`enterFrame` خطّافٌ خاطئ أصلًا: يقع
 * **قبل** التصيير فيقرأ قيم الإطار السابق (قيس: `enterFrame` يعطي
 * `rgb(255,0,0)` بينما `drawnFrame` يعطي `rgb(63,0,191)` للإطار نفسه).
 *
 * فالمسار المعتمد: **قاعدة CSS منشورة مرّة على الوثيقة**، ومشيةٌ واحدة
 * بعد `DOMLoaded` وظيفتها التطبيع والتدقيق لا الحمل (انظر ③).
 *
 * ════════════════════════════════════════════════════════════════════════
 * ② لماذا القاعدة ليست شاملة — خطران مقيسان يُحلّان بالنطاق لا بالقوّة
 * ════════════════════════════════════════════════════════════════════════
 *
 *   • **الأقنعة**: مسارات القناع تحمل `fill="#ffffff"`/`#000000` وهما
 *     **دلالة** لا لون — تغييرهما يمحو القناع. لكنّها كلّها تُلحق بـ
 *     `globalData.defs`، و`<defs>` ابنٌ مباشر للجذر والفنّ في `<g>`
 *     شقيقة (قُرئ في المشغّل: `svgElement.appendChild(defs)` ثم
 *     `svgElement.appendChild(g)`). فجذر المحدِّد `> svg > g` لا يبلغ
 *     `defs` أبدًا. وينطبق هذا على `clipPath` و`alphaRect` للـmatte.
 *   • **التدرّجات**: المسار يحمل `fill="url(#id)"`، وقاعدة شاملة تقتله
 *     (قيس: التدرّج يُدمَّر تحت `svg > g path { fill: currentColor }`).
 *     فالاستثناء مكتوب في المحدِّد نفسه: `:not([fill^="url("])`.
 *     والمحدِّد يُعاد تقييمه حيًّا مع تبدّل السمة، فالاستثناء يصمد ولو
 *     تبدّل مرجع التدرّج في أثناء التشغيل.
 *
 * وشرطُ **وجود** السمة (`[fill]` لا `*`) مقصود كذلك: مسار الحدّ يأخذ
 * `fill-opacity="0"` مرّة عند البناء، ومسار التعبئة لا `stroke` له —
 * فقاعدةٌ تكتب `stroke: currentColor` على كل شيء تُثخن الفنّ بحدٍّ لم
 * يطلبه أحد.
 *
 * ════════════════════════════════════════════════════════════════════════
 * ③ لماذا القاعدة في JS لا في ملف CSS
 * ════════════════════════════════════════════════════════════════════════
 *
 * المحدِّد عقدٌ بين هذا المكوّن وبين الشجرة التي يولّدها المشغّل. وضعُه
 * هنا يجعله مقروءًا مع سببه، ويجعل اختبار العقد يفحص **النصّ ذاته** الذي
 * يُنشر لا نسخةً منه. ولا يمسّ ميزانية CSS (0.53 من 0.60 MiB) لأنه يسافر
 * في مقطع JavaScript. والسلسلة بلا تعليقات عمدًا — الشرح هنا مجّاني
 * لأنّ المصغِّر ينزعه، أمّا ما داخل السلسلة فيُشحن حرفًا حرفًا.
 *
 * ولا لون حرفيًّا في هذا الملف كلّه: `currentColor` وحده، فيرث الرمز
 * `--ink` ولون المنطقة من طبقة الرموز وينقلب بين الوضعين بلا سطر
 * جافاسكربت وبلا إعادة تحميل (قيس: فاتح `rgb(0,128,255)` ← داكن
 * `rgb(230,240,255)` بتبديل الصنف وحده).
 *
 * ════════════════════════════════════════════════════════════════════════
 * ④ ما لا يفعله هذا المكوّن — عمدًا
 * ════════════════════════════════════════════════════════════════════════
 *
 *   • **لا `filter` ولا `will-change` ولا `contain` ولا `content-visibility`
 *     على الغلاف.** أيٌّ منها يُنشئ containing block فيكسر كل
 *     `position: fixed` تحته — عطلٌ وقع في هذا النظام وأُصلح.
 *   • **لا حلقة تقفز إلى بدايتها.** إيقاع الطبقة `alternate`: تمضي وتعود.
 *     و`loop: true` في bodymovin يقفز إلى الإطار ٠، فالتكرار هنا مبنيّ
 *     على `loop: false` + عكس الاتجاه عند `complete` (وهو الحدث الذي
 *     **لا يقع أبدًا** مع `loop: true`). لا يوجد خيار يطلب القفزة.
 *   • **لا `progressiveLoad`.** تركُه `false` هو ما يضمن أنّ `DOMLoaded`
 *     يرى الشجرة كاملة، فتكفي مشيةٌ واحدة.
 *   • **لا مشغّل أصلًا عند السكون** — لا حركةٌ بمدّة صفر. وهو نفس ما
 *     يفعله `RouteTransition` حين يُطلب السكون.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AnimationItem } from "lottie-web";

/** الغلاف — يحمل حالة العرض ويقرؤها المحدِّد. */
export const LOTTIE_STATE_ATTR = "data-nx-lottie";
/** الحاوية التي يكتب فيها المشغّل شجرته. */
export const LOTTIE_ART_CLASS = "nx-lottie-art";
/** الرمز الساكن (lucide) — يبقى في الشجرة ليحجز المقاس ويعود عند أي عطل. */
export const LOTTIE_STATIC_CLASS = "nx-lottie-static";

const STYLE_ELEMENT_ID = "nx-lottie-color-sync";

/**
 * نطاق الطلاء: `> svg > g` حصرًا.
 *
 * `defs` شقيقة `g` لا ابنتها، فالأقنعة و`clipPath` والتدرّجات المعرَّفة
 * خارج نطاق القاعدة بنيويًّا لا بالاستثناء.
 */
const PAINT_SCOPE = `.${LOTTIE_ART_CLASS} > svg > g`;

/**
 * شرط العنصر المطلي: السمة موجودة، وليست مرجع تدرّج، وليست `none`.
 * الثلاثة معًا — إسقاط أيٍّ منها يكسر شيئًا مقيسًا (انظر ② في الرأس).
 */
function paintedBy(attr: "fill" | "stroke"): string {
  return `[${attr}]:not([${attr}^="url("]):not([${attr}="none"])`;
}

/** محدِّد التعبئة — مُصدَّر ليفحصه اختبار العقد على شجرة حقيقية. */
export const LOTTIE_FILL_SELECTOR = `${PAINT_SCOPE} ${paintedBy("fill")}`;
/** محدِّد الحدّ — مُصدَّر لنفس السبب. */
export const LOTTIE_STROKE_SELECTOR = `${PAINT_SCOPE} ${paintedBy("stroke")}`;

/**
 * القاعدة المنشورة. بلا `!important` — سمة العرض تُغلب بالمرتبة لا بالقوّة.
 *
 * البند الأخير: **الألوان القسرية**. الفنّ الملوّن بقيم نهائية يبقى ظاهرًا
 * في `forced-colors` بلونٍ مستعار لا يعني شيئًا، فيسقط ويعود الرمز الساكن.
 * وهو حزامٌ فوق بوّابة الجافاسكربت (`readStill`) لا بديلٌ عنها: البوّابة
 * تمنع تحميل المشغّل رأسًا، وهذه تحمي اللحظة التي يُفعَّل فيها الوضع
 * والمشغّل قائم قبل أن يصل خبر `matchMedia`.
 */
export const LOTTIE_COLOR_CSS = [
  `${LOTTIE_FILL_SELECTOR}{fill:currentColor}`,
  `${LOTTIE_STROKE_SELECTOR}{stroke:currentColor}`,
  `[${LOTTIE_STATE_ATTR}="playing"] .${LOTTIE_STATIC_CLASS}{opacity:0}`,
  `@media (forced-colors:active){.${LOTTIE_ART_CLASS}{display:none}` +
    `[${LOTTIE_STATE_ATTR}="playing"] .${LOTTIE_STATIC_CLASS}{opacity:1}}`,
].join("");

/** تُنشر مرّة واحدة على الوثيقة، وعند أول تحميل فعلي لا عند الاستيراد. */
function ensureColorStyle(): void {
  if (document.getElementById(STYLE_ELEMENT_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = LOTTIE_COLOR_CSS;
  document.head.appendChild(style);
}

/** سجلّ التحذيرات — الخطأ يُسجَّل مرّة لا يُبتلع ولا يُكرَّر ٣١ مرّة. */
const warned = new Set<string>();

function warnOnce(key: string, detail?: unknown): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[LottieIcon] ${key} — بقيت الأيقونة الساكنة.`, detail);
}

/** يُفرَّغ بين الاختبارات وحدها؛ لا يُستدعى في الإنتاج. */
export function __resetLottieWarnings(): void {
  warned.clear();
}

/**
 * مشيةٌ واحدة بعد `DOMLoaded` — تطبيعٌ وتدقيق، لا حاملٌ للّون.
 *
 * الحامل هو القاعدة (①). وهذه المشية تفعل شيئين لا تفعلهما القاعدة:
 *
 *   ١. تجعل الشجرة صادقة عن نفسها: من يفتح أدوات المطوّر أو ينسخ الـSVG
 *      يجد `currentColor` لا `rgb(…)` متجمّدة. والمشغّل سيعيد كتابة
 *      بعضها لاحقًا — ولا ضرر، لأنّ المكتوب لا يُستعمل.
 *   ٢. تُحصي مراجع التدرّج. التدرّج لونٌ مؤلَّف داخل الملف: القاعدة
 *      تستثنيه عمدًا كي لا تهدمه، ومعنى ذلك أنّه **لا يتبع الوضعين**.
 *      فيُبلَّغ عنه في التطوير بدل أن يُكتشف في عرضٍ تنفيذي.
 */
export function normalizeLottieColors(host: Element): {
  painted: number;
  gradients: number;
} {
  const group = host.querySelector(":scope > svg > g");
  if (!group) return { painted: 0, gradients: 0 };

  let painted = 0;
  let gradients = 0;

  for (const node of Array.from(group.querySelectorAll("[fill], [stroke]"))) {
    for (const attr of ["fill", "stroke"] as const) {
      const value = node.getAttribute(attr);
      if (value === null || value === "none" || value === "currentColor") continue;
      // مرجع تدرّج: يُحصى ولا يُمسّ — تحويله إلى لونٍ واحد يهدم التدرّج.
      if (value.startsWith("url(")) {
        gradients += 1;
        continue;
      }
      node.setAttribute(attr, "currentColor");
      painted += 1;
    }
  }

  return { painted, gradients };
}

/**
 * مفاتيح السكون الأربعة، تُجمع بـ OR كما في `RouteTransition`.
 *
 * الثلاثة الأولى مفاتيح النظام والتطبيق والتعافي. والرابع
 * (`forced-colors`) ليس مفتاح حركة بل مفتاح صدق: فنٌّ ملوّن بقيمٍ نهائية
 * لا معنى له في لوحة ألوانٍ قسرية، والرمز الساكن يُرسم بلون النظام.
 */
function readStill(): boolean {
  const root = document.documentElement;
  if (root.getAttribute("data-nx-motion") === "off") return true;
  if (root.classList.contains("safe-mode")) return true;
  if (typeof window.matchMedia !== "function") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  if (window.matchMedia("(forced-colors: active)").matches) return true;
  return false;
}

export type LottieIconProps = {
  /**
   * أيقونة lucide الساكنة. تُصيَّر على الخادم وفي أول رسمٍ على العميل،
   * وتبقى وحدها عند أي سكون أو عطل. ليست بديلًا احتياطيًّا يُركَّب عند
   * الفشل — هي الأصل، والحركة تُركَّب فوقها.
   */
  children: ReactNode;
  /** مسار ملف Lottie (يجلبه المشغّل بنفسه عبر `path`). */
  src?: string;
  /**
   * أو بياناتٌ محمّلة مسبقًا. **يجب أن يكون مرجعًا ثابتًا** (ثابت على
   * مستوى الوحدة أو `useMemo`)؛ مرجعٌ جديد كل رسم يهدم المشغّل ويعيد
   * بناءه.
   */
  animationData?: unknown;
  /** ضلع المربّع بالبكسل — يُحجز قبل التحميل فلا انزياح ولا وميض. */
  size?: number;
  className?: string;
  /**
   * وصفٌ للقارئ الشاشي. بغيره الأيقونة زخرفية: الغلاف كلّه `aria-hidden`
   * فلا يسمع المستخدم الرمز مرّتين (ساكنًا ومتحرّكًا).
   */
  label?: string;
  /**
   * حلقة مرتدّة: تمضي وتعود. `false` = تُعرض مرّة وتسكن.
   * لا خيار ثالث — القفزة إلى البداية ليست من إيقاع الطبقة.
   */
  bounce?: boolean;
  /** مضاعف السرعة. المنحنى نفسه يأتي من ملف Lottie لا من هنا. */
  speed?: number;
};

export function LottieIcon({
  children,
  src,
  animationData,
  size = 24,
  className,
  label,
  bounce = true,
  speed = 1,
}: LottieIconProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  /**
   * تبدأ `true` — أي: الخادم وأوّل رسمٍ على العميل متطابقان (رمزٌ ساكن
   * وحده). لا `window` ولا `document` ولا `navigator` خارج المؤثّرات:
   * أيّ واحدة منها تُسقط الصفحة بـ500 في التصيير الخادمي.
   */
  const [still, setStill] = useState(true);
  const [playing, setPlaying] = useState(false);

  // ① مفاتيح السكون — تُقرأ فورًا ثم تُراقَب حيًّا. من أطفأ الحركة يجدها
  //   مطفأة في اللحظة نفسها، لا بعد إعادة تحميل.
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setStill(readStill());
    sync();

    const observer = new MutationObserver(sync);
    // `class` مطلوبة لأجل `safe-mode` — يكتبها كاسر دورة الأعطال على
    // الجذر بعد محاولتَي إقلاع غير مكتملتين.
    observer.observe(root, { attributes: true, attributeFilter: ["data-nx-motion", "class"] });

    const queries =
      typeof window.matchMedia === "function"
        ? [
            window.matchMedia("(prefers-reduced-motion: reduce)"),
            window.matchMedia("(forced-colors: active)"),
          ]
        : [];
    for (const query of queries) query.addEventListener?.("change", sync);

    return () => {
      observer.disconnect();
      for (const query of queries) query.removeEventListener?.("change", sync);
    };
  }, []);

  // ② التحميل الكسول ثم الدورة الكاملة.
  useEffect(() => {
    if (still) return;
    // يُلتقط مرّة عند التركيب — قراءته من `ref.current` في التنظيف تعطي
    // `null` بعد أن تكون React قد نزعت العقدة، فلا يُدمَّر المشغّل.
    const host = hostRef.current;
    if (!host) return;
    if (typeof src !== "string" && animationData == null) return;

    const key = src ?? "animationData";
    let cancelled = false;
    let anim: AnimationItem | null = null;
    let watcher: IntersectionObserver | null = null;
    let direction: 1 | -1 = 1;

    const onFailed = (reason?: unknown) => {
      if (cancelled) return;
      warnOnce(`تعذّر تشغيل ${key}`, reason);
      setPlaying(false);
      // لا `destroy()` هنا: نحن داخل حلقة بثّ أحداث المشغّل نفسه، وهدم
      // البنية أثناء المرور عليها عطلٌ ثانٍ فوق الأوّل. التنظيف يتكفّل.
      try {
        anim?.pause();
      } catch {
        /* مشغّلٌ نصف مبنيّ — لا شيء يُفعل. */
      }
    };

    const onReady = () => {
      if (cancelled || !anim) return;
      const audit = normalizeLottieColors(host);
      if (import.meta.env.DEV && audit.gradients > 0) {
        warnOnce(
          `${key} يحوي ${audit.gradients} مرجع تدرّج`,
          "التدرّج لونٌ مؤلَّف في الملف: يبقى كما هو ولا يتبع الوضعين.",
        );
      }
      setPlaying(true);

      if (typeof IntersectionObserver === "undefined") {
        anim.play();
        return;
      }
      // ③ لا إطار واحد خارج الشاشة. ٣١ أيقونة في الشريط الجانبي معًا،
      //   وما لا يُرى لا يستحقّ دورة رسم. الهامش يبدأ الحركة قبل الظهور
      //   بقليل فلا تُقبض الأيقونة متجمّدة عند حافّة الشاشة.
      watcher = new IntersectionObserver(
        (entries) => {
          if (!anim) return;
          if (entries.some((entry) => entry.isIntersecting)) anim.play();
          else anim.pause();
        },
        { rootMargin: "96px" },
      );
      watcher.observe(host);
    };

    // الارتداد: `complete` هو الحدث الوحيد الصالح لهذا — مع `loop: true`
    // لا يقع أبدًا، ومع `loop: false` يقع عند طرفَي المدى معًا (قُرئ في
    // `advanceTime`: عند `nextValue >= totalFrames - 1` وعند `< 0`).
    const onComplete = () => {
      if (cancelled || !anim) return;
      direction = direction === 1 ? -1 : 1;
      anim.setDirection(direction);
      anim.play();
    };

    const boot = async () => {
      try {
        const mod = await import("lottie-web/build/player/lottie_light");
        if (cancelled) return;
        // القاعدة تسبق أوّل رسم: `loadAnimation` يرسم الإطار ٠ متزامنًا،
        // فلو تأخّرت القاعدة عنه لظهرت وميضةٌ بلون الملف.
        ensureColorStyle();

        const player = mod.default;
        const base = {
          container: host,
          renderer: "svg" as const,
          // التكرار يُدار هنا لا في المشغّل — انظر `onComplete`.
          loop: false,
          // لا إطار قبل أن يراه أحد؛ `DOMLoaded` يعرض الإطار ٠ ساكنًا.
          autoplay: false,
          rendererSettings: {
            // **لا تُرفع أبدًا**: رفعها يبني الطبقات على دفعات فلا يرى
            // `DOMLoaded` الشجرة كاملة، وتسقط ضمانة المرور الواحد.
            progressiveLoad: false,
            hideOnTransparent: true,
            focusable: false,
            preserveAspectRatio: "xMidYMid meet",
          },
        };

        anim =
          animationData != null
            ? player.loadAnimation({ ...base, animationData })
            : player.loadAnimation({ ...base, path: src });

        anim.addEventListener("DOMLoaded", onReady);
        // **قناتان لا قناة.** `data_failed` عطلٌ قاتل: الملف لم يُحمَّل، فلا
        // شيء يُرسم — والسقوط إلى الرمز الساكن هو الصواب.
        anim.addEventListener("data_failed", onFailed);
        // أمّا `error` فقناةٌ عامّة في bodymovin تشمل `renderFrameError`
        // وهو **غير قاتل**: إطارٌ واحد تعذّر استيفاؤه والمشغّل حيّ. وربطها
        // بـ`onFailed` كان يوقف المشغّل (`pause()`) على أوّل تعثّر، ويترك
        // الرمز الساكن مخفيًّا — فيرى المستخدم أيقونةً متجمّدة لا الاحتياط.
        //
        // ونجا ذلك بالصدفة الزمنية وحدها: الخطأ يقع قبل `DOMLoaded`،
        // فيعيده `onReady` إلى التشغيل بعده. لو تأخّر إطارًا واحدًا لتجمّد
        // بلا مُوقِظ إلا عبور `IntersectionObserver`.
        anim.addEventListener("error", (reason: unknown) => {
          warnOnce(`تعثّر إطار في ${key}`, reason);
        });
        if (bounce) anim.addEventListener("complete", onComplete);
        if (speed !== 1) anim.setSpeed(speed);
      } catch (reason) {
        onFailed(reason);
      }
    };

    // ④ بعد خلوّ الخيط لا معه: ١٦٨ كيلوبايت من التحليل لا تُزاحم الترطيب.
    //   `requestIdleCallback` غير موجود على سفاري، والسقوط إلى مؤقّت.
    let idleId = 0;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => void boot(), { timeout: 2000 });
    } else {
      timerId = setTimeout(() => void boot(), 350);
    }

    return () => {
      cancelled = true;
      if (idleId) window.cancelIdleCallback(idleId);
      if (timerId !== undefined) clearTimeout(timerId);
      watcher?.disconnect();
      watcher = null;

      const dying = anim;
      anim = null;
      if (dying) {
        try {
          // النزع قبل الهدم: `destroy()` يجعل `_cbs = null`، وأي نزعٍ
          // بعده يقرأ من `null` فيرمي.
          dying.removeEventListener("DOMLoaded", onReady);
          dying.removeEventListener("data_failed", onFailed);
          dying.removeEventListener("error", onFailed);
          dying.removeEventListener("complete", onComplete);
          dying.destroy();
        } catch (reason) {
          warnOnce(`تعذّر هدم ${key}`, reason);
        }
      }
      setPlaying(false);
    };
  }, [still, src, animationData, bounce, speed]);

  const semantics = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <span
      className={["relative inline-flex items-center justify-center", className]
        .filter(Boolean)
        .join(" ")}
      /* المقاس محجوز قبل أن يوجد المشغّل — ولا لون في الأسلوب المضمّن
         إطلاقًا: اللون يأتي من `currentColor` عبر طبقة الرموز. */
      style={{ width: size, height: size }}
      /* تُكتب حرفيًّا لا عبر الثابت: JSX يحتاج اسمًا ساكنًا. واختبار العقد
         يثبّت تطابقها مع `LOTTIE_STATE_ATTR` فلا ينفرط أحدهما عن الآخر. */
      data-nx-lottie={playing ? "playing" : "static"}
      {...semantics}
    >
      <span className={`${LOTTIE_STATIC_CLASS} inline-flex`}>{children}</span>
      {!still ? (
        /* لا `filter` ولا `will-change` ولا `contain` — الغلاف لا يُنشئ
           containing block. و`absolute` لا تُنشئه، فالتراكب آمن. */
        <span ref={hostRef} className={`${LOTTIE_ART_CLASS} absolute inset-0`} aria-hidden="true" />
      ) : null}
    </span>
  );
}

export default LottieIcon;
