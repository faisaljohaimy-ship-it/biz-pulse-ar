/**
 * HoloVideoEngine — محرك الخلفية الهولوغرامية الحية (قرار المالك ٢٠٢٦/٠٨/٠٤).
 *
 * الفيديو الصامت أساسٌ بصري لا بطلًا منفردًا: يُبثّ خلف السطح كطبقة أولى،
 * فوقه غطاء سينمائي داكن يحفظ القراءة، ثم نسيج حبيبي خافت، ثم زجاج
 * البطاقات — فلا تُرى حركته إلا **عبر** الزجاج (backdrop-filter).
 *
 * الإضاءة المحيطية الحية: عيّنة لونية تُقرأ من إطارات الفيديو كل ٣٥٠م.ث
 * على لوحة 8×8، تُنعَّم خطيًّا وتُكتب متغيّرًا `--live-rgb` على جذر
 * المستند — فترث توهّجات البطاقات لونَ اللحظة من الفيلم نفسه، مع سقوط
 * آمن إلى السماوي حين لا فيديو.
 *
 * الأداء والاحترام: إيقاف عند إخفاء التبويب، ولا فيديو إطلاقًا مع تقليل
 * الحركة أو الشفافية أو Save-Data — يبقى الغطاء والتدرّج وحدهما.
 */
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

const VIDEO_SRC = "/holo-bg.mp4";

/** نسيج حبيبي دقيق — SVG turbulence مضمّن، لا أصل شبكي (CSP آمن). */
const NOISE_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E";

function prefersStill(): boolean {
  if (typeof window === "undefined") return true;
  const mq = (q: string) => window.matchMedia?.(q).matches ?? false;
  const saveData =
    (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true;
  return (
    mq("(prefers-reduced-motion: reduce)") ||
    mq("(prefers-reduced-transparency: reduce)") ||
    saveData
  );
}

export function HoloVideoEngine() {
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [still, setStill] = useState(true);

  // القرار على العميل فقط — الخادم يقدّم السكون فلا انزياح ترطيب.
  useEffect(() => {
    setStill(prefersStill());
  }, []);

  // إيقاف/استئناف مع رؤية التبويب — بطارية أولًا.
  useEffect(() => {
    if (still) return;
    const onVisibility = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) v.pause();
      else void v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [still]);

  // العيّنة المحيطية: متوسط 8×8 كل ٣٥٠م.ث بتنعيم خطي — ثم `--live-rgb`.
  useEffect(() => {
    if (still) return;
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    let prev: [number, number, number] | null = null;
    const tick = () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || document.hidden) return;
      try {
        ctx.drawImage(v, 0, 0, 8, 8);
        const d = ctx.getImageData(0, 0, 8, 8).data;
        let r = 0;
        let g = 0;
        let b = 0;
        for (let i = 0; i < d.length; i += 4) {
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
        }
        const n = d.length / 4;
        let next: [number, number, number] = [r / n, g / n, b / n];
        // إضاءة لا طلاء: تُرفع العينة نحو سطوع أدنى كي لا يطفئ مشهدٌ
        // معتم توهّجات الواجهة.
        const lum = 0.299 * next[0] + 0.587 * next[1] + 0.114 * next[2];
        if (lum < 60) {
          // مزجٌ نحو مرساة السماوي لا ضربٌ في معامل: الإطار الأسود الخالص
          // يبقى أسود مهما ضُرب — المزج وحده يرفعه.
          const t = ((60 - lum) / 60) * 0.85;
          const anchor = [34, 211, 238];
          next = [
            next[0] + (anchor[0] - next[0]) * t,
            next[1] + (anchor[1] - next[1]) * t,
            next[2] + (anchor[2] - next[2]) * t,
          ];
        }
        prev = prev
          ? [
              prev[0] + (next[0] - prev[0]) * 0.25,
              prev[1] + (next[1] - prev[1]) * 0.25,
              prev[2] + (next[2] - prev[2]) * 0.25,
            ]
          : next;
        document.documentElement.style.setProperty(
          "--live-rgb",
          `${Math.round(prev[0])} ${Math.round(prev[1])} ${Math.round(prev[2])}`,
        );
      } catch {
        // لوحة ملوّثة أو إطار غير جاهز — تبقى قيمة السقوط.
      }
    };
    const id = window.setInterval(tick, 350);
    return () => {
      window.clearInterval(id);
      document.documentElement.style.removeProperty("--live-rgb");
    };
  }, [still]);

  const light = theme === "light";

  return (
    <div aria-hidden dir="ltr" className="nx-hv pointer-events-none fixed inset-0 z-0">
      {/* الطبقة ١ — الفيلم الصامت */}
      {!still && (
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          className="nx-hv-video"
          data-light={light || undefined}
        />
      )}
      {/* الطبقة ٢ — الغطاء السينمائي (بالرموز فيتبع الوضعين) */}
      <span className="nx-hv-veil" />
      {/* الطبقة ٣ — النسيج الحبيبي */}
      <span className="nx-hv-noise" style={{ backgroundImage: `url("${NOISE_URI}")` }} />
    </div>
  );
}

export default HoloVideoEngine;
