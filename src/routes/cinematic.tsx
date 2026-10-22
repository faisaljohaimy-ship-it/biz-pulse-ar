import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import "@/styles/sadeed-cinematic.css";

const HERO_IMAGE =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_3KxKtVFWvluaVdLG50fo5o0e6hi/a7564544-d20b-4d75-8af2-7a2fede4cd55.png";

export const Route = createFileRoute("/cinematic")({
  head: () => ({
    meta: [
      { title: "SADEED | التجربة السينمائية" },
      { name: "description", content: "عرض موشن جرافيك سينمائي تفاعلي للتوأم الرقمي والأمن الصناعي" },
    ],
  }),
  component: SadeedCinematicExperience,
});

function SadeedCinematicExperience() {
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const stage = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);
  return (
    <main className="sd-cinema" dir="rtl">
      <div className="sd-cinema-toolbar">
        <Link to="/" className="sd-cinema-back">العودة إلى سديد</Link>
        <span className="sd-cinema-label">SADEED · CINEMATIC DIGITAL TWIN</span>
        <div className="sd-cinema-actions">
          <button type="button" className="sd-cinema-control" onClick={() => setPlaying(v => !v)} aria-pressed={playing}>
            {playing ? "⏸ إيقاف الحركة" : "▶ تشغيل العرض"}
          </button>
          <button type="button" className="sd-cinema-control" onClick={() => stage.current?.requestFullscreen?.()} aria-label="عرض بملء الشاشة">
            ⛶ ملء الشاشة
          </button>
        </div>
      </div>
      <section ref={stage} className={`sd-cinema-stage ${playing ? "is-playing" : ""}`} aria-label="موشن جرافيك سينمائي تفاعلي لمنشآت الطاقة">
        <div className="sd-cinema-picture"><img src={HERO_IMAGE} alt="منشآت كهرباء السعودية والتوأم الرقمي" loading="eager" /></div>
        <div className="sd-cinema-particles" aria-hidden="true" />
        <div className="sd-cinema-scan" aria-hidden="true" />
        <div className="sd-cinema-orbit orbit-a" aria-hidden="true" />
        <div className="sd-cinema-orbit orbit-b" aria-hidden="true" />
        <div className="sd-cinema-grid" aria-hidden="true" />
        <div className="sd-cinema-vignette" aria-hidden="true" />
        <div className="sd-cinema-headline">
          <span>SADEED AI OS / DIGITAL COMMAND</span>
          <h1>التوأم الرقمي للأمن الصناعي</h1>
          <p>طاقة متصلة · استجابة ذكية · رؤية وطنية</p>
        </div>
        <div className="sd-cinema-bottom"><span className="sd-cinema-live"><i /> DIGITAL TWIN</span><span>SADEED · INDUSTRIAL SECURITY</span></div>
      </section>
      <p className="sd-cinema-disclosure">مشهد موشن جرافيك سينمائي يعمل داخل المتصفح، وليس ملف فيديو MP4 أو بثًا حيًا. أي أرقام ظاهرة داخل الرسم توضيحية وليست بيانات تشغيلية مباشرة.</p>
    </main>
  );
}
