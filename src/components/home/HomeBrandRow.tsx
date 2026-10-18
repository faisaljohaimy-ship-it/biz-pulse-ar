/**
 * صفّ الهوية — لوحتا المالك **كما هما**، فوقهما ماءٌ سينمائي (أمر المالك
 * ٢٠٢٦/١٠/١٧ بنصّه: «ضع هذه الصور المرفقة كعلامة كما هي واحدة فالزاوية اليمين في اعلى الصفحة الرئيسية والاخرى فالمنتصف واجعلها تتحرك بحركة مائية سينيمائية عصرية»؛
 * وبقرار AskUserQuestion في اليوم نفسه: لوحة الشعار «منظومة
 * القرار والإنجاز الذكي» في الزاوية اليمنى العليا، والبانر «سَدِيد | SADEED» في
 * وسط أعلى الصفحة — صفٌّ تحت الترويسة وفوق المؤشرات).
 *
 * ## الصورة أوّلًا، والفيلم فوقها
 *
 * كل لوحة `<img>` من ملفّ المالك نفسه (WebP على ثلاث درجات، `srcset`) — هي
 * ما يُرسم من أوّل إطار وما يُقرأ (نصّ بديل بما كُتب على اللوحة) وما يبقى لمن
 * لا فيلم له. وفوقها `<video>` صامتٌ يُركَّب **بعد أوّل رسمة** ولمن:
 *   • لم يطلب تقليل الحركة (`prefers-reduced-motion`)، ولم يُطفئ الحركة
 *     بمفتاح النظام (`html[data-nx-motion="off"]`)، وليس في الوضع الآمن؛
 *   • ولم يطلب توفير البيانات (`navigator.connection.saveData`).
 * والفيلم حلقةُ ماءٍ مصيَّرة مرّةً بـRemotion (`remotion/brand/`) فوق الصورة
 * نفسها — انكسارٌ وتموّجات كاوية وبريقٌ على القمم (بلا لمعةٍ ماسحة)، بلا صوتٍ في الحاوية —
 * فكلفته في المتصفّح فكّ ترميزٍ لا حساب. يقف خارج الإطار، ويقف تحت لوحة سَدِيد
 * على اللمس بقاعدة فيلم الخلفية نفسها (`holdFilmUnderPanel`)، وإن تعذّر
 * تحميله زال وبقيت الصورة.
 *
 * ## لا ادّعاء
 *
 * اللوحتان تحملان نصّهما كما كتبه المالك ولا يُضاف هنا رقمٌ ولا شعار ولا
 * شريك. والبريق الذي يتبع المؤشّر (`--gx`/`--gy`) متغيّرٌ يُمرَّر لا قيمةٌ
 * نهائية (المادة ٣٣).
 */
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { isSafeMode } from "@/lib/sadeed/self-healing/crash-loop";
import { holdFilmUnderPanel } from "@/components/home/HoloVideoEngine";
import "@/styles/home/home-brand.css";

/** نسبة اللوحتين كما رُسمتا (PNG 2172×724 = 3:1). */
export const BRAND_RATIO = { width: 2172, height: 724 } as const;

/** فوقه يُعرض البانر بعرضه الكامل وتُختار حلقته العريضة. */
export const BRAND_WIDE_QUERY = "(min-width: 900px)";

type Plate = {
  readonly posters: Readonly<Record<number, string>>;
  readonly films: { readonly wide: string; readonly narrow: string };
  readonly sizes: string;
  readonly ar: string;
  readonly en: string;
};

/** لوحتا الهوية: صورٌ من ملفّي المالك وحلقتاهما المصيَّرتان. */
export const HOME_BRAND: { readonly banner: Plate; readonly mark: Plate } = {
  banner: {
    posters: {
      800: "/home/brand/sadeed-banner-800.webp",
      1200: "/home/brand/sadeed-banner-1200.webp",
      1600: "/home/brand/sadeed-banner-1600.webp",
    },
    films: {
      wide: "/media/brand/sadeed-banner-1600.mp4",
      narrow: "/media/brand/sadeed-banner-800.mp4",
    },
    // عرض البانر المرسوم فعلًا (قِيس على 390–1920): ‏800 فوق 1608، وبين 900
    // و1608 ما يبقى بعد حاشيتي الشعار والشريط الجانبي — لا 800 ثابتة تُنزّل
    // نسخة 1600 على شاشات DPR2 بين 900 و1600.
    sizes:
      "(min-width: 1608px) 800px, (min-width: 1530px) calc(100vw - 808px), (min-width: 1177px) calc(66vw - 288px), (min-width: 1024px) calc(100vw - 688px), (min-width: 900px) calc(100vw - 464px), calc(100vw - 32px)",
    ar: "سَدِيد | SADEED — مساعد ذكاء اصطناعي يعطي رؤية تنفيذية على الأمن الصناعي في جميع المناطق السعودية.",
    en: "SADEED — an AI assistant giving executive visibility over industrial security across all Saudi regions.",
  },
  mark: {
    posters: {
      320: "/home/brand/sadeed-mark-320.webp",
      480: "/home/brand/sadeed-mark-480.webp",
      640: "/home/brand/sadeed-mark-640.webp",
    },
    films: {
      wide: "/media/brand/sadeed-mark-640.mp4",
      narrow: "/media/brand/sadeed-mark-640.mp4",
    },
    // عرض لوحة الشعار: clamp(200px, 17vw, 260px) عريضًا، و180 ضيّقًا.
    sizes: "(min-width: 1530px) 260px, (min-width: 1177px) 17vw, (min-width: 900px) 200px, 180px",
    ar: "SADEED — منظومة القرار والإنجاز الذكي",
    en: "SADEED — the intelligent decision and delivery system",
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
 * هل استقرّت الصفحة؟ — بعد حدث `load` وخمول المتصفّح. الحلقتان ~1.3 MB على الجوال،
 * وكانتا تُطلبان مع الترطيب فتنافسان الصورة الكبرى (LCP) والخطوط والحزم على شبكةٍ
 * بطيئة (Lighthouse ٢٠٢٦/١٠/١٨: طُلبتا قبل رسم البانر). الصورة الساكنة تُرى حتى ذلك.
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

/** مفتاح «إيقاف حركة الماء» — تفضيلٌ لهذا المتصفّح وحده، والتخزين المحجوب لا يكسر شيئًا. */
const PAUSE_KEY = "nx-brand-motion";

/**
 * إيقاف الحلقتين بيد المستخدم (WCAG 2.2.2 «Pause, Stop, Hide»): حلقتان بلا نهاية
 * فوق نصّ اللوحتين، ومفتاح النظام `data-nx-motion` بلا كاتبٍ في الواجهة اليوم —
 * فلا مخرج إلا تفضيل نظام التشغيل. يُقرأ بعد التركيب فلا يختلف HTML الخادم.
 */
function usePausedPreference(): [boolean, (next: boolean) => void] {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    try {
      setPaused(localStorage.getItem(PAUSE_KEY) === "paused");
    } catch {
      /* التخزين محجوب — تبقى الحركة */
    }
  }, []);
  const update = (next: boolean) => {
    setPaused(next);
    try {
      if (next) localStorage.setItem(PAUSE_KEY, "paused");
      else localStorage.removeItem(PAUSE_KEY);
    } catch {
      /* التخزين محجوب — يسري الاختيار في هذه الزيارة وحدها */
    }
  };
  return [paused, update];
}

function BrandFilm({ plate, play }: { plate: Plate; play: boolean }) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const ref = useRef<HTMLVideoElement>(null);

  // الحلقة بعرض الشاشة عند التركيب: العريضة فوق 900px وإلا الضيّقة.
  useEffect(() => {
    setSrc(window.matchMedia(BRAND_WIDE_QUERY).matches ? plate.films.wide : plate.films.narrow);
  }, [plate]);

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
  // **وبلا `poster`:** الصورة تحته هي الملصق. سمة `poster` جعلت الفيلم — وهو
  // يُركَّب بعد الترطيب — مرشّحَ LCP على الجوال ونزّلت نسخة 1600 فوق نسخة
  // `srcset` (قِيس بـLighthouse ٢٠٢٦/١٠/١٨)، والفيلم قبل إطاره الأوّل شفّاف فلا
  // وميض (قِيس في Chromium).
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

function BrandPlate({ kind, ar, play }: { kind: "banner" | "mark"; ar: boolean; play: boolean }) {
  const plate = HOME_BRAND[kind];
  const ref = useRef<HTMLElement>(null);
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
    <figure ref={ref} dir="ltr" data-kind={kind} className="nx-brand" onPointerMove={onMove}>
      <img
        src={largest}
        srcSet={srcSet}
        sizes={plate.sizes}
        width={BRAND_RATIO.width}
        height={BRAND_RATIO.height}
        alt={ar ? plate.ar : plate.en}
        decoding="async"
        fetchPriority={kind === "banner" ? "high" : "auto"}
        className="nx-brand-poster"
      />
      <BrandFilm plate={plate} play={play} />
      <span aria-hidden className="nx-brand-glare" />
    </figure>
  );
}

export function HomeBrandRow() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const allowed = useFilmAllowed();
  const [paused, setPaused] = usePausedPreference();
  const settled = useSettled();
  const play = allowed && !paused && settled;
  const pauseLabel = ar ? "إيقاف حركة الماء" : "Pause water motion";
  return (
    // الترتيب `ltr` كصفوف الرئيسية (D5): البانر وسطًا والشعار في الزاوية
    // اليمنى **فيزيائيًّا** في اللغتين — موضعه من أمر المالك لا من اتجاه الكتابة.
    <section aria-label={ar ? "هوية سَدِيد" : "SADEED brand"} dir="ltr" className="nx-home-brand">
      <BrandPlate kind="banner" ar={ar} play={play} />
      {/* لوحة الشعار رابطُ الرئيسية كعُرف الشعارات. **واسمه مكتوبٌ صريحًا:**
          `<figure>` داخل الرابط يقطع أخذ الاسم من النصّ البديل، فقاس Chromium
          اسمًا فارغًا (WCAG 2.4.4 · 4.1.2). والاسم يحوي نصّ اللوحة المرئي (2.5.3). */}
      <Link
        to="/"
        className="nx-brand-link"
        aria-label={ar ? `${HOME_BRAND.mark.ar} — الرئيسية` : `${HOME_BRAND.mark.en} — Home`}
      >
        <BrandPlate kind="mark" ar={ar} play={play} />
      </Link>
      {/* إيقاف الحلقتين (WCAG 2.2.2) — في الحاشية المقابلة للشعار، خارج اللوحتين
          فلا يُكتب شيءٌ فوق علامة المالك (B2)، ولا يظهر حيث لا حركة أصلًا. */}
      {allowed && (
        <button
          type="button"
          className="nx-brand-toggle nx-focus-ring"
          aria-pressed={paused}
          aria-label={pauseLabel}
          title={pauseLabel}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
        </button>
      )}
    </section>
  );
}
