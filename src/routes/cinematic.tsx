import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import "@/styles/sadeed-cinematic.css";

const HERO_IMAGE = "https://d2ol7oe51mr4n9.cloudfront.net/user_3KxKtVFWvluaVdLG50fo5o0e6hi/a7564544-d20b-4d75-8af2-7a2fede4cd55.png";

export const Route = createFileRoute("/cinematic")({
  head: () => ({
    meta: [
      { title: "SADEED | التجربة السينمائية" },
      { name: "description", content: "مشهد سينمائي تفاعلي للتوأم الرقمي والأمن الصناعي في سديد" },
    ],
  }),
  component: SadeedCinematicExperience,
});

function SadeedCinematicExperience() {
  const [playing, setPlaying] = useState(true);
  return (
    <main className="sd-cinema" dir="rtl">
      <div className="sd-cinema-toolbar">
        <Link to="/" className="sd-cinema-back">العودة إلى سديد</Link>
        <span className="sd-cinema-label">SADEED · DIGITAL TWIN EXPERIENCE</span>
        <button type="button" onClick={() => setPlaying((v) => !v)} aria-pressed={playing} className="sd-cinema-control">
          {playing ? "إيقاف الحركة" : "تشغيل الحركة"}
        </button>
      </div>
      <section className={`sd-cinema-stage ${playing ? "is-playing" : ""}`} aria-label="عرض سينمائي تفاعلي للأمن الصناعي">
        <div className="sd-cinema-picture">
          <img src={HERO_IMAGE} alt="مشهد سديد للتوأم الرقمي، منشآت الكهرباء، شبكات الربط والمؤشرات التشغيلية" loading="eager" />
        </div>
        <div className="sd-cinema-scan" aria-hidden="true" />
        <div className="sd-cinema-orbit orbit-a" aria-hidden="true" />
        <div className="sd-cinema-orbit orbit-b" aria-hidden="true" />
        <div className="sd-cinema-headline">
          <span>SADEED AI OS</span>
          <h1>التوأم الرقمي للأمن الصناعي</h1>
          <p>رؤية تشغيلية مترابطة · منشآت · مناطق · قرارات</p>
        </div>
      </section>
      <p className="sd-cinema-disclosure">عرض بصري متحرك مستوحى من تصميم سديد، وليس بثًا حيًا أو فيديو MP4. المؤشرات الظاهرة داخل الصورة توضيحية وليست بيانات تشغيلية مباشرة.</p>
    </main>
  );
}
