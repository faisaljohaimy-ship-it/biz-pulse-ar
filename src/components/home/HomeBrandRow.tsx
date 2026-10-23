/**
 * صفّ الهوية — لوحتا المالك **كما هما**، فوقهما ماءٌ سينمائي (أمر المالك
 * ٢٠٢٦/١٠/١٧: «ضع هذه الصور المرفقة كعلامة كما هي، واحدة في الزاوية اليمنى
 * أعلى الصفحة الرئيسية والأخرى في المنتصف، واجعلها تتحرك بحركة مائية
 * سينمائية عصرية»؛ وبقرار AskUserQuestion في اليوم نفسه: لوحة الشعار «منظومة
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
 * نفسها — انكسارٌ وتموّجات كاوية ولمعةٌ ماسحة، بلا صوتٍ في الحاوية أصلًا —
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
    sizes: "(min-width: 900px) 800px, 100vw",
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
    sizes: "(min-width: 900px) 260px, 180px",
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

function BrandFilm({ plate, poster }: { plate: Plate; poster: string }) {
  const allowed = useFilmAllowed();
  const [failed, setFailed] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const ref = useRef<HTMLVideoElement>(null);

  // الحلقة بعرض الشاشة عند التركيب: العريضة فوق 900px وإلا الضيّقة.
  useEffect(() => {
    setSrc(window.matchMedia(BRAND_WIDE_QUERY).matches ? plate.films.wide : plate.films.narrow);
  }, [plate]);

  useEffect(() => {
    const video = ref.current;
    if (!allowed || !src || !video) return;
    const release = holdFilmUnderPanel(video);
    // خارج الإطار لا فكّ ترميز: يقف على إطاره ويستأنف حين يعود.
    let watcher: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      watcher = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          if (entry.isIntersecting) {
            const resumed = video.play() as Promise<void> | undefined;
            resumed?.catch(() => {});
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
  }, [allowed, src]);

  if (!allowed || failed || !src) return null;
  // مصدران للحلقة نفسها: H.264 أوّلًا (فكّ عتادي في كل متصفّح تجاري)، ثم
  // VP9/WebM لبناءات Chromium بلا ترميزات احتكارية. **خطأ `<source>` واحد
  // يصعد في شجرة React إلى `onError` العنصر** (قِيس: كان يُسقط الفيلم قبل أن
  // يُجرَّب المصدر الثاني)، فلا يُعدّ فشلًا إلا ما استهدف العنصر نفسه أو جاء
  // بعد استنفاد المصادر (`NETWORK_NO_SOURCE`) — وعندها تبقى الصورة وحدها.
  return (
    <video
      ref={ref}
      className="nx-brand-film"
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
      disablePictureInPicture
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

function BrandPlate({ kind, ar }: { kind: "banner" | "mark"; ar: boolean }) {
  const plate = HOME_BRAND[kind];
  const ref = useRef<HTMLElement>(null);
  const widths = Object.keys(plate.posters)
    .map(Number)
    .sort((a, b) => a - b);
  const largest = plate.posters[widths[widths.length - 1]];
  const srcSet = widths.map((w) => `${plate.posters[w]} ${w}w`).join(", ");

  // البريق يتبع المؤشّر: متغيّران على الحاوية، والرسم في CSS.
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
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
      <BrandFilm plate={plate} poster={largest} />
      <span aria-hidden className="nx-brand-glare" />
    </figure>
  );
}

export function HomeBrandRow() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    // الترتيب `ltr` كصفوف الرئيسية (D5): البانر وسطًا والشعار في الزاوية
    // اليمنى **فيزيائيًّا** في اللغتين — موضعه من أمر المالك لا من اتجاه الكتابة.
    <section aria-label={ar ? "هوية سَدِيد" : "SADEED brand"} dir="ltr" className="nx-home-brand">
      <BrandPlate kind="banner" ar={ar} />
      {/* لوحة الشعار رابطُ الرئيسية كعُرف الشعارات؛ اسمه نصّ الصورة البديل. */}
      <Link to="/" className="nx-brand-link">
        <BrandPlate kind="mark" ar={ar} />
      </Link>
    </section>
  );
}
