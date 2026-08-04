/**
 * HoloVideoEngine — محرك الخلفية الهولوغرامية الحية (قرار المالك ٢٠٢٦/٠٨/٠٤).
 *
 * الفيديو الصامت أساسٌ بصري لا بطلًا منفردًا: يُبثّ خلف السطح كطبقة أولى,
 * فوقه غطاء سينمائي داكن يحفظ القراءة، ثم نسيج حبيبي خافت، ثم زجاج
 * البطاقات — فلا تُرى حركته إلا **عبر** الزجاج (backdrop-filter).
 *
 * الإضاءة المحيطية الحية: عيّنة لونية تُقرأ من إطارات الفيديو كل ٣٥٠م.ث
 * على لوحة 8×8، تُنعَّم خطيًّا وتُكتب متغيّرًا `--live-rgb` على **حاوية
 * الصفحة لا الجذر** (نطاق إبطال أضيق)، ولا تُكتب إلا حين يتجاوز التغيّر
 * عتبةً — فلا إعادة حساب أنماط بلا داعٍ.
 *
 * WCAG 2.2.2 (إيقاف/إخفاء — مستوى A): زر إيقاف ظاهر للمستخدم يُطفئ
 * الفيلم ويُحفظ اختياره، وتفضيلات النظام (تقليل الحركة/الشفافية/
 * Save-Data) تُراقب حيًّا بمستمعي تغيير لا عند التركيب فقط.
 */
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const VIDEO_SRC = "/holo-bg.mp4";
const STORE_KEY = "nx-holo-bg";

/** نسيج حبيبي دقيق — SVG turbulence مضمّن، لا أصل شبكي (CSP آمن). */
const NOISE_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E";

const PREF_QUERIES = [
  "(prefers-reduced-motion: reduce)",
  "(prefers-reduced-transparency: reduce)",
] as const;

function prefersStill(): boolean {
  if (typeof window === "undefined") return true;
  const saveData =
    (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true;
  return PREF_QUERIES.some((q) => window.matchMedia?.(q).matches ?? false) || saveData;
}

export function HoloVideoEngine() {
  const { theme } = useTheme();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [prefStill, setPrefStill] = useState(true);
  const [userOff, setUserOff] = useState(false);

  // القرار على العميل، ويُراقَب حيًّا: تغيير تفضيل النظام منتصف الجلسة
  // يوقف الفيلم والعيّنة فورًا لا عند إعادة التحميل فقط.
  useEffect(() => {
    setUserOff(window.localStorage?.getItem(STORE_KEY) === "off");
    const update = () => setPrefStill(prefersStill());
    update();
    const queries = PREF_QUERIES.map((q) => window.matchMedia?.(q)).filter(
      Boolean,
    ) as MediaQueryList[];
    queries.forEach((q) => q.addEventListener?.("change", update));
    return () => queries.forEach((q) => q.removeEventListener?.("change", update));
  }, []);

  const active = !prefStill && !userOff;

  // إيقاف/استئناف مع رؤية التبويب — بطارية أولًا. والحركة مُهدَّأة:
  // الفيلم يجري بسرعة ٠٫٤٠ (قرار المالك) فيبقى مشهدًا محيطيًا لا مشتِّتًا،
  // وتُعاد كتابة الإبطاء بعد كل استئناف لأن بعض المتصفحات تصفّره.
  useEffect(() => {
    if (!active) return;
    const v = videoRef.current;
    if (v) v.playbackRate = 0.4;
    const onVisibility = () => {
      const vv = videoRef.current;
      if (!vv) return;
      if (document.hidden) vv.pause();
      else {
        vv.playbackRate = 0.4;
        void vv.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [active]);

  // العيّنة المحيطية: 8×8 كل ٣٥٠م.ث بتنعيم خطي، والكتابة على حاوية
  // الصفحة (الأب المباشر) وبعتبة تغيّر — لا على جذر المستند كل نبضة.
  useEffect(() => {
    if (!active) return;
    const target = wrapRef.current?.parentElement ?? document.documentElement;
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    let prev: [number, number, number] | null = null;
    let written: [number, number, number] | null = null;
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
        // مزجٌ نحو مرساة السماوي لا ضربٌ في معامل: الإطار الأسود الخالص
        // يبقى أسود مهما ضُرب — المزج وحده يرفعه.
        const lum = 0.299 * next[0] + 0.587 * next[1] + 0.114 * next[2];
        if (lum < 60) {
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
        // عتبة الكتابة: تغيّر مجموعه < ٦ لا يستحق إبطال أنماط.
        const delta = written
          ? Math.abs(prev[0] - written[0]) +
            Math.abs(prev[1] - written[1]) +
            Math.abs(prev[2] - written[2])
          : Infinity;
        if (delta >= 6) {
          written = [prev[0], prev[1], prev[2]];
          target.style.setProperty(
            "--live-rgb",
            `${Math.round(prev[0])} ${Math.round(prev[1])} ${Math.round(prev[2])}`,
          );
        }
      } catch {
        // لوحة ملوّثة أو إطار غير جاهز — تبقى قيمة السقوط.
      }
    };
    const id = window.setInterval(tick, 350);
    return () => {
      window.clearInterval(id);
      target.style.removeProperty("--live-rgb");
    };
  }, [active]);

  const light = theme === "light";
  const toggle = () =>
    setUserOff((v) => {
      const next = !v;
      try {
        window.localStorage?.setItem(STORE_KEY, next ? "off" : "on");
      } catch {
        // تخزين محظور — يبقى الاختيار لهذه الجلسة.
      }
      return next;
    });

  return (
    <>
      <div
        ref={wrapRef}
        aria-hidden
        dir="ltr"
        className="nx-hv pointer-events-none fixed inset-0 z-0"
      >
        {/* الطبقة ١ — الفيلم الصامت */}
        {active && (
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

      {/* WCAG 2.2.2: إيقاف الخلفية المتحركة بيد المستخدم — يظهر فقط حين
          لا تفرض تفضيلات النظام السكونَ أصلًا. */}
      {!prefStill && (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={userOff}
          aria-label={
            userOff
              ? ar
                ? "تشغيل الخلفية المتحركة"
                : "Play animated background"
              : ar
                ? "إيقاف الخلفية المتحركة"
                : "Pause animated background"
          }
          title={
            userOff
              ? ar
                ? "تشغيل الخلفية"
                : "Play background"
              : ar
                ? "إيقاف الخلفية"
                : "Pause background"
          }
          className="nx-hv-toggle"
        >
          {userOff ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
        </button>
      )}
    </>
  );
}

export default HoloVideoEngine;
