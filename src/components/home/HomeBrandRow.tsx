/** Owner update: narrated identity first, then the unchanged command-room photograph. */
import { useEffect, useRef, useState, type RefObject } from "react";
import { useI18n } from "@/lib/i18n";
import { HomeTicker } from "@/components/home/HomeTicker";
import { IdentityFilmHero } from "@/components/home/IdentityFilmHero";
import { CommandRoomScreens } from "@/components/home/CommandRoomScreens";
import "@/styles/home/home-brand.css";

export const BRAND_RATIO = { width: 1320, height: 720 } as const;
// Shared historical tier tolerance; the opening film remains unchanged in the gallery.
export const FILM_UPSCALE_LIMIT = 1.15;
export {
  FILM_PLAYBACK_RATE,
  FILM_SOURCE_SECONDS,
  FILM_EFFECTIVE_SECONDS,
  filmRateFor,
  holdFilmRate,
} from "./brand-film-playback";

export const HOME_OPENING_IMAGE = {
  src: "/home/command-room/command-room-1320.webp",
  srcSet:
    "/home/command-room/command-room-640.webp 640w, /home/command-room/command-room-1320.webp 1320w",
  sizes: "(min-width: 1664px) 1394px, (min-width: 1024px) calc(100vw - 270px), calc(100vw - 46px)",
  alt: {
    ar: "غرفة قيادة زرقاء بخرائط ومؤشرات ومكاتب؛ صورة توضيحية.",
    en: "Blue command room with maps, dashboards and desks; illustrative image.",
  },
} as const;

export const HOME_BRAND = {
  banner: {
    title: { ar: "سديد", en: "SADEED" },
    tagline: {
      ar: "مساعد ذكاء اصطناعي يعطي رؤية تنفيذية على الأمن الصناعي في جميع المناطق السعودية.",
      en: "An AI assistant giving executive insight into industrial security across all Saudi regions.",
    },
  },
} as const;

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

/** Read legacy preferences after hydration; no retired pause-button setter is retained. */
function useMotionReady(): boolean {
  const [known, setKnown] = useState(false);
  useEffect(() => {
    try {
      // لا زرّ في الشريط يلغي الإيقاف بعد ٢٠٢٦/١٠/٢٥ («أزل علامة التوقف والاستمرار»): فتفضيلٌ قديم
      // «paused» يُمحى هنا ولا يُطبَّق، وإلا بقي الشريط والماء والتوهّج مجمَّدةً بلا مخرج.
      if (localStorage.getItem(PAUSE_KEY) === "paused") localStorage.removeItem(PAUSE_KEY);
    } catch {
      /* التخزين محجوب — تبقى الحركة */
    }
    setKnown(true);
  }, []);
  // Preserve the sole root-attribute/event writer and its post-read timing.
  useEffect(() => {
    if (known) announcePause(false);
  }, [known]);
  return known;
}

/** هل الصفّ خارج الإطار؟ — فيقف الشريط والتوهّج والجوهرة (الفيلم يراقب نفسه). */
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

function useRoomMotion(
  ref: RefObject<HTMLElement | null>,
  ready: boolean,
  paused: boolean,
): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || !ready || paused || typeof IntersectionObserver === "undefined") {
      setActive(false);
      return;
    }
    const root = document.documentElement;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let inView = false;
    const sync = () =>
      setActive(
        inView &&
          document.visibilityState === "visible" &&
          !reduced?.matches &&
          root.getAttribute("data-nx-motion") !== "off" &&
          root.getAttribute("data-nx-motion-paused") !== "1" &&
          !root.classList.contains("safe-mode"),
      );
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      inView = Boolean(entry?.isIntersecting);
      sync();
    });
    observer.observe(node);
    const mutations = new MutationObserver(sync);
    mutations.observe(root, {
      attributes: true,
      attributeFilter: ["data-nx-motion", "data-nx-motion-paused", "class"],
    });
    document.addEventListener("visibilitychange", sync);
    window.addEventListener(MOTION_PAUSE_EVENT, sync);
    reduced?.addEventListener?.("change", sync);
    sync();
    return () => {
      observer?.disconnect();
      mutations.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener(MOTION_PAUSE_EVENT, sync);
      reduced?.removeEventListener?.("change", sync);
    };
  }, [ref, ready, paused]);
  return active;
}

export function HomeBrandRow() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const known = useMotionReady();
  const ref = useRef<HTMLElement>(null);
  const offscreen = useOffscreen(ref);
  const imageRef = useRef<HTMLDivElement>(null);
  const [roomPaused, setRoomPaused] = useState(false);
  const roomActive = useRoomMotion(imageRef, known, roomPaused);
  const plate = HOME_BRAND.banner;
  return (
    <section
      ref={ref}
      aria-label={ar ? "هوية سَدِيد" : "SADEED brand"}
      dir="ltr"
      className="nx-home-brand"
      data-run={known || undefined}
      data-offscreen={offscreen || undefined}
    >
      <HomeTicker offscreen={offscreen} ready={known} />
      <IdentityFilmHero />
      <figure className="nx-brand" data-kind="command-room" data-testid="home-opening-image">
        <div ref={imageRef} className="nx-command-room-stage">
          <img
            src={HOME_OPENING_IMAGE.src}
            srcSet={HOME_OPENING_IMAGE.srcSet}
            sizes={HOME_OPENING_IMAGE.sizes}
            width={BRAND_RATIO.width}
            height={BRAND_RATIO.height}
            alt={ar ? HOME_OPENING_IMAGE.alt.ar : HOME_OPENING_IMAGE.alt.en}
            loading="lazy"
            decoding="async"
            fetchPriority="auto"
            className="nx-command-room-poster"
          />
          <CommandRoomScreens active={roomActive} />
        </div>
        <figcaption className="nx-command-room-copy" dir={ar ? "rtl" : "ltr"}>
          <p className="nx-brand-title" dir="ltr">
            <span lang="en">{plate.title.en}</span>
            <span aria-hidden className="nx-brand-divider" />
            <span lang="ar" dir="rtl">
              {plate.title.ar}
            </span>
          </p>
          <p className="nx-brand-tagline" lang={ar ? "ar" : "en"}>
            {ar ? plate.tagline.ar : plate.tagline.en}
          </p>
          <p className="nx-command-room-disclosure">
            {ar
              ? "صورة توضيحية؛ خرائطها ومؤشراتها ليست بيانات تشغيلية حية."
              : "Illustrative image; its maps and indicators are not live operational data."}
          </p>
          <button
            type="button"
            className="twin-film-btn nx-focus-ring nx-command-room-motion-toggle"
            aria-pressed={roomPaused}
            onClick={() => setRoomPaused((value) => !value)}
          >
            {ar
              ? roomPaused
                ? "تحريك الشاشات"
                : "إيقاف حركة الشاشات"
              : roomPaused
                ? "Animate screens"
                : "Pause screen motion"}
          </button>
        </figcaption>
      </figure>
    </section>
  );
}
