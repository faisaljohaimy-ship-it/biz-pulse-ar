/**
 * RouteTransition — لغة الانتقال بين الشاشات (قرار المالك ٢٠٢٦/٠٨/٠٦).
 *
 * ## لماذا حركات مختلفة لا حركة واحدة
 *
 * الانتقال ليس زينة: هو ما يخبر المستخدم **أين ذهب**. ولذلك لكل عائلة من
 * الشاشات حركتها، فيُقرأ الانتقال معنًى لا مجرّد سلاسة:
 *
 * | العائلة              | الحركة        | ما تقوله                        |
 * | -------------------- | ------------- | ------------------------------- |
 * | القيادة والعمليات    | دفعٌ محوري    | تنقّلٌ جانبي داخل مستوى واحد     |
 * | الأمن والامتثال      | مصراعٌ يهبط   | لوحةٌ تُركَّب فوق ما قبلها        |
 * | الذكاء والوكلاء      | تركيزُ عدسة   | اقترابٌ من عمقٍ تحليلي           |
 * | التحليل والتقارير    | صعودُ بيانات  | صفٌّ يرتفع كما يُبنى تقرير       |
 * | الرئيسية             | استقرارٌ هادئ | عودةٌ إلى نقطة الأصل             |
 *
 * ## القيود التي حكمت التنفيذ
 *
 * - **`transform` و`opacity` فقط** (وضبابةٌ واحدة قصيرة على عائلة الذكاء).
 *   لا `width` ولا `top` — تلك تُعيد التخطيط في كل إطار.
 * - **`mode="wait"`**: الخروج يكتمل قبل الدخول، فلا تتراكب شاشتان. والخروج
 *   قصير عمدًا (‏٠٫١٦ث) لأن كل زيادة فيه تأخيرٌ محسوسٌ في الاستجابة.
 * - **`initial={false}`**: أول رسم لا يتحرّك. بغيرها تُتحرّك الصفحة عند
 *   الترطيب فتظهر وميضةٌ وإزاحةُ تخطيط (CLS) في كل فتح.
 * - **مفتاح الحركة الواحد**: `data-nx-motion="off"` يُسكِتها كما يُسكِت
 *   النبضات والفيلم — مفتاحٌ واحد للصفحة كلّها، لا مفتاحٌ لكل طبقة.
 *   ويُقرأ تفضيل النظام كذلك.
 * - **RTL**: محور الدفع يتبع اتجاه الوثيقة، فالانتقال في العربية يمضي في
 *   اتجاه القراءة لا عكسه.
 * - **الأجهزة الضعيفة**: تُختصر المدد وتُلغى الضبابة.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { useRouterState } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

/** منحنى الخروج السينمائي المعتمد في طبقة الحركة. */
const EASE = [0.16, 1, 0.3, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

type Family = "command" | "security" | "intelligence" | "analytics" | "home" | "default";

/**
 * عائلة المسار — بالبادئة لا بقائمة مغلقة، فالشاشة الجديدة تأخذ حركة
 * عائلتها تلقائيًّا بلا تسجيلٍ ثانٍ يُنسى.
 */
export function routeFamily(pathname: string): Family {
  const p = pathname.toLowerCase();
  if (p === "/" || p.startsWith("/blueprint")) return "home";
  if (
    p.startsWith("/mission-control") ||
    p.startsWith("/situation-room") ||
    p.startsWith("/urgent-ops") ||
    p.startsWith("/boardroom") ||
    p.startsWith("/executive-map")
  ) {
    return "command";
  }
  if (
    p.startsWith("/sec") ||
    p.startsWith("/hcis") ||
    p.startsWith("/governance") ||
    p.startsWith("/risk") ||
    p.startsWith("/ptw") ||
    p.startsWith("/hajj")
  ) {
    return "security";
  }
  if (
    p.startsWith("/finn") ||
    p.startsWith("/agents") ||
    p.startsWith("/digital-twin") ||
    p.startsWith("/rag") ||
    p.startsWith("/knowledge")
  ) {
    return "intelligence";
  }
  if (
    p.startsWith("/observability") ||
    p.startsWith("/analytics") ||
    p.startsWith("/bi") ||
    p.startsWith("/reports") ||
    p.startsWith("/integrations")
  ) {
    return "analytics";
  }
  return "default";
}

/** يبني متغيّرات العائلة بعد حساب الاتجاه وقدرة الجهاز. */
function buildVariants(family: Family, dirSign: number, lowEnd: boolean): Variants {
  const enter = { duration: lowEnd ? 0.26 : 0.42, ease: EASE };
  const leave = { duration: lowEnd ? 0.12 : 0.16, ease: EASE_IN };
  const push = (lowEnd ? 18 : 34) * dirSign;

  switch (family) {
    case "command":
      return {
        initial: { opacity: 0, x: push, scale: 0.994 },
        animate: { opacity: 1, x: 0, scale: 1, transition: enter },
        exit: { opacity: 0, x: -push * 0.45, scale: 0.997, transition: leave },
      };
    case "security":
      // مصراعٌ يهبط: `scaleY` من أعلى — لوحةٌ تُركَّب فوق ما قبلها.
      return {
        initial: { opacity: 0, y: lowEnd ? -10 : -18, scaleY: 0.985 },
        animate: { opacity: 1, y: 0, scaleY: 1, transition: enter },
        exit: { opacity: 0, y: 8, scaleY: 0.995, transition: leave },
      };
    case "intelligence":
      /* تركيز عدسة — **بالمقياس والشفافية وحدهما، بلا مرشّح.**
       *
       * كانت هذه العائلة تستعمل `filter: blur()`، وهي الخاصيّة الوحيدة في
       * الملف التي خرجت عن قاعدته المعلنة (تحويلٌ وشفافية لا غير). وثمنها
       * لم يكن أداءً بل صحّةً:
       *
       * `motion` يُعيد `transform` إلى `none` حين تعود قيمه إلى أصلها،
       * **ولا نظير لذلك للمرشّح** — فيبقى `filter: blur(0px)` مضمَّنًا بعد
       * انتهاء الحركة. و`blur(0px)` ليست `none`: أي قيمةٍ محسوبة للمرشّح
       * غير `none` تُنشئ containing block (Filter Effects L1)، فينكسر كل
       * `position: fixed` تحت الغلاف — وهو يلفّ `<Outlet/>`، أي كل شاشة.
       *
       * وأوّل ضحاياه `/rag-search` (من هذه العائلة، ويُصيّر
       * `HoloVideoEngine`): تنساح خلفيته ومعها زرّ `.nx-hv-toggle` وهو
       * آلية الإيقاف الوحيدة لحركةٍ دائمة (WCAG 2.2.2).
       *
       * ولم يكن `onAnimationComplete` كافيًا: `initial={false}` يمنع الحركة
       * عند أوّل تركيب، فلا يُستدعى المُنظِّف أصلًا بينما `motion` يكون قد
       * كتب قيمة المرشّح. قِيس بعد المحاولة: `blur(0px)` باقيةٌ والخلفية
       * تنساح. فالعلاج ألّا يُكتب المرشّح رأسًا.
       *
       * والمقياس وحده يؤدّي المعنى: العدسة تتراجع من ١٫٠٣ إلى ١٫٠٠. */
      return {
        initial: { opacity: 0, scale: lowEnd ? 1.012 : 1.03 },
        animate: { opacity: 1, scale: 1, transition: enter },
        exit: { opacity: 0, scale: 0.994, transition: leave },
      };
    case "analytics":
      return {
        initial: { opacity: 0, y: lowEnd ? 12 : 24 },
        animate: { opacity: 1, y: 0, transition: enter },
        exit: { opacity: 0, y: -8, transition: leave },
      };
    case "home":
      return {
        initial: { opacity: 0, scale: lowEnd ? 1.004 : 1.012 },
        animate: { opacity: 1, scale: 1, transition: { ...enter, duration: lowEnd ? 0.3 : 0.5 } },
        exit: { opacity: 0, scale: 0.998, transition: leave },
      };
    default:
      return {
        initial: { opacity: 0, y: lowEnd ? 6 : 12 },
        animate: { opacity: 1, y: 0, transition: enter },
        exit: { opacity: 0, y: -6, transition: leave },
      };
  }
}

/** جهازٌ ضعيف: ذاكرة ≤2GB، أو نوى قليلة حين لا تتوفّر قراءة الذاكرة. */
function detectLowEnd(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (nav.deviceMemory !== undefined) return nav.deviceMemory <= 2;
  return (nav.hardwareConcurrency ?? 8) <= 4;
}

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { locale } = useI18n();
  const systemReduced = useReducedMotion();

  // الحالة تبدأ «قادرة» لتطابق ما يرسله الخادم، ثم تُقرأ بعد الترطيب —
  // فلا اختلاف بين أول رسمٍ على الجهتين.
  const [lowEnd, setLowEnd] = useState(false);
  const [switchedOff, setSwitchedOff] = useState(false);
  /** مرجع الغلاف — يُنزع عنه المرشّح الباقي عند انتهاء الحركة (انظر أدناه). */
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLowEnd(detectLowEnd()), []);

  // مفتاح الحركة الواحد يُقرأ من الجذر ويُراقَب: من أطفأ الحركة على صفحة
  // يجدها مطفأة على كل صفحة، وفورًا لا بعد إعادة تحميل.
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setSwitchedOff(root.getAttribute("data-nx-motion") === "off");
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ["data-nx-motion"] });
    return () => mo.disconnect();
  }, []);

  const still = switchedOff || systemReduced;

  if (still) {
    // لا AnimatePresence إطلاقًا حين يُطلب السكون: الحضور وحده يؤخّر تركيب
    // الشاشة التالية بمقدار الخروج، وهو تأخيرٌ بلا مقابل هنا.
    return <>{children}</>;
  }

  const dirSign = locale === "ar" ? -1 : 1;
  const variants = buildVariants(routeFamily(pathname), dirSign, lowEnd);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        ref={wrapRef}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        /* حزامٌ ثانٍ فوق الحمّالة: لا عائلة تكتب مرشّحًا بعد اليوم (انظر
         * `buildVariants`)، لكن لو أُعيد يومًا فلن يبقى مضمَّنًا بعد الحركة.
         * السطر رخيص، والعطل الذي يمنعه كسَرَ كل `position: fixed` في
         * النظام. */
        onAnimationComplete={() => wrapRef.current?.style.removeProperty("filter")}
        /* الأصل من الأعلى ليقرأ «المصراع» هبوطًا لا تمدّدًا من الوسط.

           **و`will-change` أُزيلت — كانت تكسر كل `position: fixed` في النظام.**

           كانت مكتوبة `willChange: "transform, opacity"` **دائمة** لا أثناء
           الحركة وحدها. و`will-change: transform` تُنشئ containing block
           جديدًا تمامًا كما يفعل `transform` نفسه؛ فكل عنصر `fixed` داخل
           الصفحة صار ثابتًا **بالنسبة إلى هذا الغلاف** لا إلى الشاشة —
           وارتفاع الغلاف هو ارتفاع المستند. أي: يمشي مع السحب.

           وأوّل ضحاياه فيلم الرئيسية (`HoloVideoEngine` داخل `BlueprintPage`
           داخل `<Outlet/>` داخل هذا الغلاف). ولهذا قال المالك «كما كانت في
           أوّل عمل»: كانت ثابتة فعلًا، حتى أُدخل انتقال المسارات فوقها.

           قِيس على متصفّح حقيقي لا استُنتج — صفحة ٣٠٠٠ بكسل وعنصر
           `fixed inset-0`:
             • مع will-change: المقاس ٣٩٠×٢٥٠٠ (ارتفاع السلف)، وعند السحب
               ٦٠٠ ينتقل top من ٠ إلى **−٦٠٠**. يمشي مع الصفحة.
             • بدونها:      المقاس ٣٩٠×٨٤٤ (إطار العرض)، وtop يبقى **٠**.

           والإزالة صحيحة بذاتها أيضًا: `will-change` أداةُ تلميحٍ للإطار
           الأوّل، لا نمطٌ دائم — إبقاؤها يحجز طبقة تركيب لكل صفحة طوال
           عمرها. و`motion` يضعها بنفسه أثناء الحركة ثم يرفعها. */
        style={{ transformOrigin: "top center" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default RouteTransition;
