import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { requestCinematicFullscreen } from "@/lib/cinematic/fullscreen";
import { LocalFilmPreview } from "./LocalFilmPreview";
import "@/styles/sadeed-cinematic.css";
import "@/styles/sadeed-cinematic-playback.css";

const HERO_IMAGE =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_3KxKtVFWvluaVdLG50fo5o0e6hi/a7564544-d20b-4d75-8af2-7a2fede4cd55.png";

const CHAPTERS = [
  {
    label: "المشهد",
    title: "التوأم الرقمي للأمن الصناعي",
    subtitle: "طاقة متصلة · استجابة ذكية · رؤية وطنية",
  },
  { label: "الأصول", title: "من الأصل إلى المعلومة", subtitle: "موقع · مبنى · كاميرا · حساس" },
  {
    label: "القرار",
    title: "من المعلومة إلى القرار",
    subtitle: "مصدر واضح · سياق تشغيلي · مراجعة بشرية",
  },
  { label: "التنفيذ", title: "من القرار إلى التنفيذ", subtitle: "مقترح · اعتماد · تنفيذ موثّق" },
] as const;

export function SadeedCinematicExperience({ embedded = false }: { embedded?: boolean }) {
  const [chapterIndex, setChapterIndex] = useState(0);
  const chapter = CHAPTERS[chapterIndex] ?? CHAPTERS[0];
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageAttempt, setImageAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const stage = useRef<HTMLElement>(null);
  const Container = embedded ? "section" : "main";
  const Heading = embedded ? "h3" : "h1";
  const active = playing && !reducedMotion && pageVisible && !imageFailed;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) setPlaying(false);
    };
    const syncVisibility = () => setPageVisible(document.visibilityState !== "hidden");
    syncMotion();
    syncVisibility();
    preference.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      preference.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  const enterFullscreen = async () => {
    const result = await requestCinematicFullscreen(stage.current);
    setNotice(
      result === "entered"
        ? ""
        : result === "unsupported"
          ? "متصفحك لا يدعم ملء الشاشة لهذا العرض؛ يمكنك متابعته داخل الصفحة."
          : "تعذر فتح ملء الشاشة. يمكنك إعادة المحاولة أو متابعة العرض داخل الصفحة.",
    );
  };

  return (
    <Container className={`sd-cinema ${embedded ? "sd-cinema-embedded" : ""}`} dir="rtl">
      <div className="sd-cinema-toolbar">
        {!embedded && (
          <Link to="/" className="sd-cinema-back">
            العودة إلى سديد
          </Link>
        )}
        <span className="sd-cinema-label">SADEED · CINEMATIC DIGITAL TWIN</span>
        <div className="sd-cinema-actions">
          <button
            type="button"
            className="sd-cinema-control"
            onClick={() => setPlaying((v) => !v)}
            aria-pressed={active}
            disabled={reducedMotion || imageFailed}
          >
            {active ? "⏸ إيقاف الحركة" : "▶ تشغيل العرض"}
          </button>
          <button
            type="button"
            className="sd-cinema-control"
            onClick={() => void enterFullscreen()}
            aria-label="عرض بملء الشاشة"
          >
            ⛶ ملء الشاشة
          </button>
        </div>
      </div>
      <p className="sd-cinema-disclosure" role="status" aria-live="polite">
        {notice || (reducedMotion ? "الحركة متوقفة احترامًا لإعداد تقليل الحركة على جهازك." : "")}
      </p>
      <div className="sd-cinema-chapters" role="group" aria-label="فصول العرض التوضيحي">
        {CHAPTERS.map((item, index) => (
          <button
            key={item.label}
            type="button"
            className="sd-cinema-control"
            aria-pressed={index === chapterIndex}
            onClick={() => setChapterIndex(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section
        ref={stage}
        data-cinema-player="true"
        className={`sd-cinema-stage ${active ? "is-playing" : ""}`}
        aria-label="موشن جرافيك سينمائي تفاعلي لمنشآت الطاقة"
      >
        <div className="sd-cinema-picture">
          <img
            key={imageAttempt}
            src={HERO_IMAGE}
            alt="منشآت كهرباء السعودية والتوأم الرقمي"
            loading="eager"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        </div>
        <div className="sd-cinema-particles" aria-hidden="true" />
        <div className="sd-cinema-scan" aria-hidden="true" />
        <div className="sd-cinema-orbit orbit-a" aria-hidden="true" />
        <div className="sd-cinema-orbit orbit-b" aria-hidden="true" />
        <div className="sd-cinema-grid" aria-hidden="true" />
        <div className="sd-cinema-vignette" aria-hidden="true" />
        <div className="sd-cinema-headline">
          <span>SADEED AI OS / DIGITAL COMMAND</span>
          <Heading>{chapter.title}</Heading>
          <p>{chapter.subtitle}</p>
        </div>
        {imageFailed && (
          <div className="sd-cinema-media-error" role="alert">
            <p>تعذر تحميل المشهد. تحقق من الاتصال وأعد المحاولة.</p>
            <button
              type="button"
              className="sd-cinema-control"
              onClick={() => {
                setImageFailed(false);
                setImageAttempt((v) => v + 1);
              }}
            >
              إعادة تحميل المشهد
            </button>
          </div>
        )}
        <div className="sd-cinema-bottom">
          <span className="sd-cinema-live">
            <i /> DIGITAL TWIN
          </span>
          <span>SADEED · INDUSTRIAL SECURITY</span>
        </div>
      </section>
      <p className="sd-cinema-disclosure">
        مشهد موشن جرافيك سينمائي يعمل داخل المتصفح، وليس ملف فيديو MP4 أو بثًا حيًا. أي أرقام ظاهرة
        داخل الرسم توضيحية وليست بيانات تشغيلية مباشرة.
      </p>
      {!embedded && <LocalFilmPreview onPlaybackStart={() => setPlaying(false)} />}
    </Container>
  );
}
