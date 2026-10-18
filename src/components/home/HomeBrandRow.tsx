/**
 * صفّ الهوية — شريط «مزايا سَدِيد» المتحرك، وتحته لوحة المالك **كما هي** بعرض العمود
 * كاملًا، فوقها ماءٌ سينمائي.
 *
 * ## الأوامر
 *
 * • ٢٠٢٦/١٠/١٧: «ضع هذه الصور المرفقة كعلامة كما هي … واجعلها تتحرك بحركة مائية
 *   سينيمائية عصرية» — البانر «سَدِيد | SADEED» في وسط أعلى الصفحة.
 * • ٢٠٢٦/١٠/١٨ (R3) بنصّه: «اجعل المستطيل الذي يتوسط الشاشة لعلامة سديد كما فالمرفق على
 *   امتداد الصفحة متناسقاً مع العناصر وكون الشريط الإعلاني المتحرك باستمرار يعلو علامة
 *   سديد الموجودة فالمرفق» — فالبانر بعرض العمود نفسه (حافّتا صفّ المؤشرات والبطاقات
 *   تحته، بلا رقمٍ يُزامَن: ابنٌ في شبكة `.nx-home-arrange`)، والشريط فوقه
 *   (`HomeTicker`).
 * • وموجّه المرحلة في اليوم نفسه — مهمّةٌ للمالك **كما نقلها منسّق البناء بصياغته، لا
 *   بنصّ المالك**: إطارٌ مستقبليّ حول البانر (تدرّج أزرق كهربائي/سماوي، إضاءة زجاج
 *   محسوبة، عمق) وتوهّجٌ محيطٌ ينجرف ببطء خلفه، دون أن يغطّي مؤشّرًا أو محتوى تشغيليًّا.
 * • ولوحة الشعار «منظومة القرار والإنجاز الذكي» **خرجت من هذا الصفّ** (R4: إلى رأس
 *   الشريط الجانبي بعبارةٍ جديدة) — ومعها رابطها وصورها وحلقتها وتركيبها في Remotion.
 *
 * ## الصورة أوّلًا، والفيلم فوقها
 *
 * اللوحة `<img>` من ملفّ المالك نفسه (WebP على أربع درجات حتى دقّته الأصلية 2172،
 * `srcset`) — هي ما يُرسم من أوّل إطار وما يُقرأ (نصٌّ بديل بما كُتب على اللوحة) وما
 * يبقى لمن لا فيلم له. وفوقها `<video>` صامتٌ يُركَّب **بعد `load` والخمول** ولمن:
 *   • لم يطلب تقليل الحركة (`prefers-reduced-motion`)، ولم يُطفئ الحركة بمفتاح النظام
 *     (`html[data-nx-motion="off"]`)، وليس في الوضع الآمن؛
 *   • ولم يطلب توفير البيانات (`navigator.connection.saveData`)؛
 *   • ولم يُوقف الحركة بزرّ «إيقاف الحركة» في طرف الشريط (WCAG 2.2.2).
 * والحلقة تُختار **بالحاجة المقيسة** (`pickFilm`: عرض اللوحة المرسوم × كثافة الشاشة)
 * لا باستعلام عرض — فلا تُكبَّر حلقةٌ فوق صورةٍ أحدّ منها فيلين نصّ اللوحة العربي
 * والإنجليزي لحظة يظهر الفيلم. يقف خارج الإطار، وتحت لوحة سَدِيد على اللمس
 * (`holdFilmUnderPanel`)، وإن تعذّر زال وبقيت الصورة.
 *
 * ## لا ادّعاء، ولا كتابة على اللوحة
 *
 * اللوحة تحمل نصّها كما كتبه المالك؛ لا يُضاف فوقها نصٌّ ولا رقمٌ ولا لمعةٌ ماسحة
 * (حذفها المالك من النظام كلّه ٢٠٢٦/٠٨/٢٠). والإطار والتوهّج **حولها** لا عليها،
 * والبريق الذي يتبع المؤشّر (`--gx`/`--gy`) متغيّرٌ يُمرَّر لا قيمةٌ نهائية (المادة ٣٣).
 */
import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { useI18n } from "@/lib/i18n";
import { isSafeMode } from "@/lib/sadeed/self-healing/crash-loop";
import { holdFilmUnderPanel } from "@/components/home/HoloVideoEngine";
import { HomeTicker } from "@/components/home/HomeTicker";
import "@/styles/home/home-brand.css";

/** نسبة اللوحة كما رُسمت (PNG 2172×724 = 3:1). */
export const BRAND_RATIO = { width: 2172, height: 724 } as const;

/** حلقات الماء المصيَّرة (`remotion/brand/`) — عرض كل حلقة بالبكسل ومصدرها. */
export const BRAND_FILMS = [
  { width: 804, src: "/media/brand/sadeed-banner-800.mp4" },
  { width: 1608, src: "/media/brand/sadeed-banner-1600.mp4" },
  { width: 2172, src: "/media/brand/sadeed-banner-2172.mp4" },
] as const;

export type BrandFilm = (typeof BRAND_FILMS)[number];

/** أقصى تكبيرٍ مقبول لحلقةٍ فوق حاجتها قبل الانتقال إلى الأكبر. */
export const FILM_UPSCALE_LIMIT = 1.15;

/**
 * الحلقة بالحاجة: عرض اللوحة المرسوم × كثافة الشاشة (سقفها 2 — ما فوقها لا تفصله العين
 * على هذا الحجم، والجوال بكثافة 3 يبقى على حلقته الخفيفة). أصغر حلقةٍ لا تُكبَّر فوق
 * `FILM_UPSCALE_LIMIT`، وإلا الكبرى (دقّة اللوحة الأصلية).
 */
export function pickFilm(cssWidth: number, dpr: number): BrandFilm {
  const need = Math.max(0, cssWidth) * Math.min(Math.max(dpr || 1, 1), 2);
  return (
    BRAND_FILMS.find((film) => film.width * FILM_UPSCALE_LIMIT >= need) ??
    BRAND_FILMS[BRAND_FILMS.length - 1]
  );
}

type Plate = {
  readonly posters: Readonly<Record<number, string>>;
  readonly sizes: string;
  readonly ar: string;
  readonly en: string;
};

/** لوحة الهوية: صورٌ من ملفّ المالك (حتى دقّته الأصلية) ونصّها البديل بما كُتب عليها. */
export const HOME_BRAND: { readonly banner: Plate } = {
  banner: {
    posters: {
      800: "/home/brand/sadeed-banner-800.webp",
      1200: "/home/brand/sadeed-banner-1200.webp",
      1600: "/home/brand/sadeed-banner-1600.webp",
      2172: "/home/brand/sadeed-banner-2172.webp",
    },
    // عرض اللوحة المرسوم = عمود المحتوى ناقص الإطار (حلقة 6px من 768 وفوق، و4px دونه،
    // وحدٌّ شعري على كل جانب). والعمود: `max-w-[1440px]` بحاشيتي `px-4` في
    // `-blueprint-page.tsx` (‏1408 من 1664px فوق)، وبعد الشريط الجانبي من 1024 — عرضه
    // الرمز `--nx-sysnav-w: 14rem` في `home-chrome.css` (‏`100vw − 256`) — و`100vw − 32`
    // دونه. تغيّرُ أيٍّ منها يغيّر هذا السطر في الدفعة نفسها.
    sizes:
      "(min-width: 1664px) 1394px, (min-width: 1024px) calc(100vw - 270px), (min-width: 768px) calc(100vw - 46px), calc(100vw - 42px)",
    ar: "سَدِيد | SADEED — مساعد ذكاء اصطناعي يعطي رؤية تنفيذية على الأمن الصناعي في جميع المناطق السعودية.",
    en: "SADEED — an AI assistant giving executive visibility over industrial security across all Saudi regions.",
  },
};

/**
 * هل يُركَّب الفيلم؟ — بعد أوّل رسمة، ويتبدّل مع تفضيل الحركة ومفتاح النظام
 * والوضع الآمن في أثناء الجلسة. `false` قبل التركيب فلا فيلم في HTML الخادم.
 */
function useFilmAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    const sync = () =>
      setAllowed(
        !reduce.matches &&
          !isSafeMode() &&
          root.getAttribute("data-nx-motion") !== "off" &&
          connection?.saveData !== true,
      );
    sync();
    reduce.addEventListener("change", sync);
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-nx-motion", "class"] });
    return () => {
      reduce.removeEventListener("change", sync);
      observer.disconnect();
    };
  }, []);
  return allowed;
}

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * هل استقرّت الصفحة؟ — بعد حدث `load` وخمول المتصفّح. الحلقات تُطلب بعدها، فلا تنافس
 * الصورة الكبرى (LCP) والخطوط والحزم على شبكةٍ بطيئة (Lighthouse ٢٠٢٦/١٠/١٨: طُلبت
 * قبل رسم البانر). الصورة الساكنة تُرى حتى ذلك.
 */
function useSettled(): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const w = window as IdleWindow;
    let idle = 0;
    let timer = 0;
    const go = () => {
      if (w.requestIdleCallback)
        idle = w.requestIdleCallback(() => setSettled(true), { timeout: 2000 });
      else timer = window.setTimeout(() => setSettled(true), 300);
    };
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    return () => {
      window.removeEventListener("load", go);
      if (idle) w.cancelIdleCallback?.(idle);
      if (timer) window.clearTimeout(timer);
    };
  }, []);
  return settled;
}

/**
 * مفتاح «إيقاف الحركة» — تفضيلٌ لهذا المتصفّح وحده، والتخزين المحجوب لا يكسر شيئًا. الاسم
 * نفسه منذ كان يوقف الماء وحده: من أوقفه قبلُ يبقى موقوفًا (الشريط والتوهّج معه الآن).
 */
const PAUSE_KEY = "nx-brand-motion";

/**
 * واجهة الإيقاف خارج هذا الصفّ — **مجمَّدة بين مسارات البناء (٢٠٢٦/١٠/١٨)**: فيلم الخلفية
 * (`HoloVideoEngine`) وغيره يقرؤون حال الزرّ الواحد من سمةٍ على الجذر وحدثٍ على النافذة،
 * لا من هذا الملف. السمة `data-nx-motion-paused="1"` حين يُوقف وتُحذف حين يُستأنف،
 * والحدث `nx:motion-pause` بـ`{ paused }` عند كل تبدّل وعند استعادة التفضيل المحفوظ.
 * **كاتبُ السمة هذا الملف وحده** (المادة ٣٢).
 */
export const MOTION_PAUSE_EVENT = "nx:motion-pause";

function announcePause(paused: boolean): void {
  const root = document.documentElement;
  if (paused) root.dataset.nxMotionPaused = "1";
  else delete root.dataset.nxMotionPaused;
  window.dispatchEvent(new CustomEvent(MOTION_PAUSE_EVENT, { detail: { paused } }));
}

/**
 * إيقاف الحركة كلّها بيد المستخدم (WCAG 2.2.2 «Pause, Stop, Hide»): شريطٌ يجري بلا نهاية،
 * وحلقة ماءٍ فوق نصّ اللوحة، وتوهّجٌ ينجرف خلف إطارها، وفيلم الخلفية عبر الواجهة أعلاه —
 * ومفتاح النظام `data-nx-motion` بلا كاتبٍ في الواجهة اليوم. يُقرأ بعد التركيب فلا يختلف
 * HTML الخادم، و`known` يقول متى قُرئ: قبله لا حركة تبدأ، فمن أوقفها لا يرى منها إطارًا.
 */
function usePausedPreference(): [boolean, (next: boolean) => void, boolean] {
  const [paused, setPaused] = useState(false);
  const [known, setKnown] = useState(false);
  useEffect(() => {
    try {
      setPaused(localStorage.getItem(PAUSE_KEY) === "paused");
    } catch {
      /* التخزين محجوب — تبقى الحركة */
    }
    setKnown(true);
  }, []);
  // الحال إلى الواجهة المجمَّدة: عند استعادة المحفوظ ثم عند كل تبدّل.
  useEffect(() => {
    if (known) announcePause(paused);
  }, [known, paused]);
  const update = (next: boolean) => {
    setPaused(next);
    try {
      if (next) localStorage.setItem(PAUSE_KEY, "paused");
      else localStorage.removeItem(PAUSE_KEY);
    } catch {
      /* التخزين محجوب — يسري الاختيار في هذه الزيارة وحدها */
    }
  };
  return [paused, update, known];
}

/** هل الصفّ خارج الإطار؟ — فيقف الشريط والتوهّج (الفيلم يراقب نفسه). */
function useOffscreen(ref: RefObject<HTMLElement | null>): boolean {
  const [offscreen, setOffscreen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const watcher = new IntersectionObserver(([entry]) => {
      if (entry) setOffscreen(!entry.isIntersecting);
    });
    watcher.observe(el);
    return () => watcher.disconnect();
  }, [ref]);
  return offscreen;
}

function BrandFilm({ artRef, play }: { artRef: RefObject<HTMLDivElement | null>; play: boolean }) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const ref = useRef<HTMLVideoElement>(null);

  // الحلقة بحاجة اللوحة المرسومة عند التركيب: عرضها × كثافة الشاشة (`pickFilm`).
  useEffect(() => {
    const width = artRef.current?.getBoundingClientRect().width ?? window.innerWidth;
    setSrc(pickFilm(width, window.devicePixelRatio).src);
  }, [artRef]);

  // الفيلم يظهر حين يُعرض إطاره فعلًا — لا يُعوَّل على شفافية ما قبل الإطار
  // الأوّل في كل محرّك (قِيست في Chromium وحده).
  useEffect(() => {
    if (!play) setReady(false);
  }, [play]);

  useEffect(() => {
    const video = ref.current;
    if (!play || !src || !video) return;
    const release = holdFilmUnderPanel(video);
    // خارج الإطار لا فكّ ترميز: يقف على إطاره ويستأنف حين يعود.
    let watcher: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      watcher = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          if (entry.isIntersecting) {
            const resumed = video.play() as Promise<void> | undefined;
            // منعُ التشغيل (وضع توفير الطاقة في iOS) يُسقط الفيلم فتبقى الصورة —
            // لا إطارًا متجمّدًا بزرّ تشغيل فوق اللوحة. والمقاطعة بالإيقاف عابرة.
            resumed?.catch((err: unknown) => {
              if (err instanceof DOMException && err.name === "NotAllowedError") setFailed(true);
            });
          } else {
            video.pause();
          }
        },
        { threshold: 0.05 },
      );
      watcher.observe(video);
    }
    return () => {
      release();
      watcher?.disconnect();
    };
  }, [play, src]);

  if (!play || failed || !src) return null;
  // مصدران للحلقة نفسها: H.264 أوّلًا (فكّ عتادي في كل متصفّح تجاري)، ثم
  // VP9/WebM لبناءات Chromium بلا ترميزات احتكارية. **خطأ `<source>` واحد
  // يصعد في شجرة React إلى `onError` العنصر** (قِيس: كان يُسقط الفيلم قبل أن
  // يُجرَّب المصدر الثاني)، فلا يُعدّ فشلًا إلا ما استهدف العنصر نفسه أو جاء
  // بعد استنفاد المصادر (`NETWORK_NO_SOURCE`) — وعندها تبقى الصورة وحدها.
  // **وبلا `poster`:** الصورة تحته هي الملصق؛ سمة `poster` نزّلت نسخة 1600 فوق
  // اختيار `srcset`. وحذفُها لا يُخرج الفيلم من LCP: في Lighthouse الجوال كان
  // الفيلم عنصر LCP في جولتين من ثلاث (٢٠٢٦/١٠/١٨ — مسجَّلٌ لا مُعالَج). والفيلم
  // قبل إطاره الأوّل شفّاف فلا وميض (قِيس في Chromium).
  return (
    <video
      ref={ref}
      className="nx-brand-film"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
      disablePictureInPicture
      data-ready={ready || undefined}
      onPlaying={() => setReady(true)}
      onError={(e) => {
        const video = e.currentTarget;
        if (e.target === video || video.networkState === video.NETWORK_NO_SOURCE) setFailed(true);
      }}
    >
      <source src={src} type="video/mp4" />
      <source src={src.replace(/\.mp4$/, ".webm")} type="video/webm" />
    </video>
  );
}

function BrandPlate({ ar, play }: { ar: boolean; play: boolean }) {
  const plate = HOME_BRAND.banner;
  const ref = useRef<HTMLElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const widths = Object.keys(plate.posters)
    .map(Number)
    .sort((a, b) => a - b);
  const largest = plate.posters[widths[widths.length - 1]];
  const srcSet = widths.map((w) => `${plate.posters[w]} ${w}w`).join(", ");

  // البريق يتبع مؤشّر الفأرة وحده: متغيّران على الحاوية، والرسم في CSS (وهو خلف
  // بوابة الحركة هناك) — اللمس والقلم لا يحملان بريقًا فلا يُحسب لهما شيء.
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    // المسرح: التوهّج المحيط خلف الإطار (طبقةٌ سفلى في سياق تكديسٍ معزول) — ظلٌّ
    // يذوب حول اللوحة لا عليها، ولا يبلغ الشريط وصفّ المؤشرات إلا أثرًا (نحو 3%)،
    // والمؤشرات بعده في DOM مرسومةٌ فوقه.
    <div className="nx-brand-stage">
      <span aria-hidden className="nx-brand-halo" />
      <figure ref={ref} dir="ltr" data-kind="banner" className="nx-brand" onPointerMove={onMove}>
        <div ref={artRef} className="nx-brand-art">
          <img
            src={largest}
            srcSet={srcSet}
            sizes={plate.sizes}
            width={BRAND_RATIO.width}
            height={BRAND_RATIO.height}
            alt={ar ? plate.ar : plate.en}
            decoding="async"
            fetchPriority="high"
            className="nx-brand-poster"
          />
          <BrandFilm artRef={artRef} play={play} />
          <span aria-hidden className="nx-brand-glare" />
        </div>
      </figure>
    </div>
  );
}

export function HomeBrandRow() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const allowed = useFilmAllowed();
  const [paused, setPaused, known] = usePausedPreference();
  const settled = useSettled();
  const play = allowed && !paused && settled;
  const ref = useRef<HTMLElement>(null);
  const offscreen = useOffscreen(ref);
  return (
    // الترتيب `ltr` كصفوف الرئيسية (D5)، والشريط يعلن لغته بنفسه. الشريط أوّلًا في
    // DOM كما على الشاشة — ثم اللوحة بعرض العمود.
    <section
      ref={ref}
      aria-label={ar ? "هوية سَدِيد" : "SADEED brand"}
      dir="ltr"
      className="nx-home-brand"
      data-run={known || undefined}
      data-paused={paused || undefined}
      data-offscreen={offscreen || undefined}
    >
      <HomeTicker paused={paused} offscreen={offscreen} ready={known} onPausedChange={setPaused} />
      <BrandPlate ar={ar} play={play} />
    </section>
  );
}
