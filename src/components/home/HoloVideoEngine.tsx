/**
 * HoloVideoEngine — محرك الخلفية الهولوغرامية الحية (قرار المالك ٢٠٢٦/٠٨/٠٤).
 *
 * الفيديو الصامت أساسٌ بصري لا بطلًا منفردًا: يُبثّ خلف السطح كطبقة أولى,
 * فوقه غطاء سينمائي داكن يحفظ القراءة، ثم نسيج حبيبي خافت، ثم زجاج
 * البطاقات — فلا تُرى حركته إلا **عبر** الزجاج (backdrop-filter).
 *
 * **متحرّكة دائمًا (قرار المالك ٢٠٢٦/٠٨/٠٥):** تفضيلات النظام لا توقف
 * الفيلم بعد اليوم — كانت prefers-reduced-motion على أجهزة العرض تطفئه
 * فتبدو الرئيسية واقفة. الإيقاف بيد المستخدم وحده عبر زر ظاهر دائم
 * (WCAG 2.2.2)، واختياره محفوظ.
 *
 * **حلقة بلا لُحمة — والطريقة تتبع المصدر لا العكس.** كل مقطع يُعتمد يُقاس
 * أولًا: تشابه إطاره الأخير بالأول مقابل تشابه انتقالٍ عادي داخله. فإن كان
 * السيْر أدنى من العادي فالمصدر لا يلتقي طرفاه، ويُعاد تركيبه **بندولًا**
 * (ذهابٌ ثم عودة بلا إطار مكرّر عند المفصل) — وهو ما لزم لمقطع النفق الأزرق
 * قبله. وإن كان السيْر أعلى فالمصدر حلقةٌ مصمَّمة أصلًا، والبندول حينها ضررٌ
 * خالص: يُضاعف الحجم ويُشغّل نصف الدورة بالمقلوب بلا حاجة.
 *
 * **المشهد الحالي (قرار المالك ٢٠٢٦/٠٨/٠٨):** مقطع الطرفية المرفق من المالك —
 * **حلقة أصلية**، قيست في المصدر ٠٫٩٦٦ عند السيْر مقابل ٠٫٩١٣ و٠٫٨٧١
 * لانتقالين عاديين. فلا بندول: ٩٦٠ إطارًا · ٤٨ إ/ث · ٢٠٫٠ث تصير ٦٦٫٧ث على
 * سرعة ٠٫٣٠، و٣٫٦٤ MiB.
 *
 * والمعدّل رُفع من ٣٠ إلى ٤٨ بتنعيم حركي بالمزج (`minterpolate=mi_mode=blend`)
 * لأن ٣٠×٠٫٣٠ = ٩ إطارات جديدة في الثانية تُرى متقطّعة؛ والمزج لا التعويض
 * الحركي لأن المشهد نصٌّ متحرّك تُمزّقه متجهات الحركة.
 *
 * **درسٌ من التنفيذ: التنعيم يكسر الحلقة إن طُبِّق على نسخة واحدة.** المرة
 * الأولى أعطت ٩٥٧ إطارًا لا ٩٦٠ — فالإطار الأخير لا جار له بعده يُمزَج به،
 * فهبط السيْر إلى ٠٫٨٨٦ بينما جيرانه ٠٫٩٩. العلاج: يُغذّى المصدر **مرّتين**
 * (`-stream_loop 1`) ثم يُنعَّم ثم تُقتطع دورةٌ كاملة من الوسط، حيث لكل إطار
 * جاران حقيقيّان. النتيجة المقيسة: السيْر ٠٫٩٩٢ مقابل ٠٫٩٧٥–٠٫٩٨٧ للعادي —
 * أي أن اللُّحمة أنعم من متوسط الفيلم نفسه.
 *
 * **علامة الطرف الثالث تُفحص في كل مصدر.** المقطع السابق (النفق الأزرق) كان
 * يحمل `@le.clown97` محروقةً في كل إطار، ولأن `.nx-hv-video` تستعمل
 * `object-fit: fill` — لا قصّ عند العرض — كانت ستظهر على كل مقاس، فقُصَّت.
 * مقطع الطرفية الحالي فُحص أعلاه وأسفله عبر الدورة كاملة: لا علامة، فلا قصّ.
 *
 * لا مسار صوت في الملف — الخلفية صامتة بحكم التصميم، فبقاؤه وزنٌ بلا فائدة.
 *
 * الإضاءة المحيطية الحية: عيّنة لونية تُقرأ من إطارات الفيديو كل ٣٥٠م.ث
 * على لوحة 8×8، تُنعَّم خطيًّا وتُكتب متغيّرًا `--live-rgb` على **حاوية
 * الصفحة لا الجذر** (نطاق إبطال أضيق)، ولا تُكتب إلا حين يتجاوز التغيّر
 * عتبةً — فلا إعادة حساب أنماط بلا داعٍ.
 */
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const STORE_KEY = "nx-holo-bg";
const RATE = 0.3;

/** أحداث التعثّر التي تُوقظ الحارس — خارج المكوّن فلا تُبنى كل إعادة رسم. */
const MEDIA_EVENTS = ["stalled", "suspend", "pause", "ended"] as const;
/** أول إيماءة من المستخدم هي ما يفكّ حظر التشغيل التلقائي في المتصفحات. */
const GESTURE_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

/** نسيج حبيبي دقيق — SVG turbulence مضمّن، لا أصل شبكي (CSP آمن). */
const NOISE_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E";

/**
 * خلفية واحدة للنظام كلّه (قرار المالك ٢٠٢٦/٠٨/٠٨): كانت ثلاثة ملفات —
 * `holo-bg-2` للوكلاء و`holo-bg-3` للبحث المعرفي — فحُذفت، ومعها المُعامل
 * `src` الذي كان يختار بينها. ملفٌ واحد يعني تخزينًا مؤقتًا واحدًا يُصيبه
 * المتصفح عبر الصفحات بدل ثلاث تنزيلات.
 */
export function HoloVideoEngine() {
  const src = "/holo-bg.mp4";
  const { locale } = useI18n();
  const ar = locale === "ar";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [userOff, setUserOff] = useState(false);
  const [suppressed, setSuppressed] = useState(false);

  // ظهور فوري بلا تأخير (قرار المالك): الفيلم يُرسم من الخادم نفسه ويبدأ
  // فور توفر أول إطار؛ ولا يُطفأ إلا إن كان المستخدم أوقفه سابقًا.
  useEffect(() => {
    setUserOff(window.localStorage?.getItem(STORE_KEY) === "off");
  }, []);

  // تفضيلان يُخفيان الفيلم في طبقة الرموز أصلًا: «قلّل الشفافية» يُخفي
  // `.nx-hv-video`، و«الألوان القسرية» تُخفي `.nx-hv` كلها. لكن الإخفاء
  // بصريّ فقط — فكان العنصر يبقى مركَّبًا: الملف يُحمَّل، ويُفكّ ترميزه ٤٨
  // إطارًا في الثانية، وحارس الثانيتين يعمل، وعيّنة اللون تقرأ منه كل ٣٥٠م.ث
  // لسطحٍ لا يراه أحد — على جهازٍ صاحبُه غالبًا طلب التخفيف لسببٍ وجيه.
  // والأسوأ أثرًا: العيّنة تظل تكتب `--live-rgb` فتتبدّل ألوان توهّج
  // البطاقات بلا مصدرٍ مرئي يفسّرها. القراءة هنا تُنهي ذلك كلّه.
  useEffect(() => {
    const queries = [
      window.matchMedia?.("(prefers-reduced-transparency: reduce)"),
      window.matchMedia?.("(forced-colors: active)"),
    ].filter(Boolean) as MediaQueryList[];
    if (!queries.length) return;
    const sync = () => setSuppressed(queries.some((q) => q.matches));
    sync();
    for (const q of queries) q.addEventListener("change", sync);
    return () => {
      for (const q of queries) q.removeEventListener("change", sync);
    };
  }, []);

  const active = !userOff && !suppressed;

  // مفتاح الحركة الواحد (WCAG 2.2.2): هذا الزر كان يوقف الفيلم وحده، فتبقى
  // نبضات أيقونات الصفحة تعمل بعد أن يطلب المستخدم السكون صراحةً. الراية
  // تُكتب على الجذر من هنا — من JS لا من الترميز، فلا تُفرض عند كل إعادة
  // رسم — وطبقة الرموز في styles.css تُسكِت بها كل حركة زخرفية دائمة.
  useEffect(() => {
    const root = document.documentElement;
    if (userOff) root.setAttribute("data-nx-motion", "off");
    else root.removeAttribute("data-nx-motion");
  }, [userOff]);

  // إيقاف/استئناف مع رؤية التبويب — بطارية أولًا. والحركة مُهدَّأة:
  // الفيلم يجري بسرعة ٠٫٣٠ (قرار المالك) فيبقى مشهدًا محيطيًا لا مشتِّتًا,
  // وتُعاد كتابة الإبطاء بعد كل استئناف لأن بعض المتصفحات تصفّره.
  //
  // **الاستمرار قيدٌ لا أمنية (قرار المالك ٢٠٢٦/٠٨/٠٦):** الفيلم لا يقف.
  // `play()` تُرفض صامتةً في حالات حقيقية — سياسة التشغيل التلقائي قبل أول
  // إيماءة, ووضع توفير الطاقة على iOS, وتعثّر فكّ الترميز على شبكة بطيئة —
  // وكل واحدة منها تترك الخلفية ساكنة بلا أثر في الشاشة يدلّ على السبب.
  // لذلك: حارسٌ دوريّ يعيد التشغيل ويعيد كتابة السرعة، ويستيقظ كذلك على
  // أول إيماءة من المستخدم (وهي ما تفكّ حظر التشغيل التلقائي أصلًا).
  // الإيقاف المقصود وحده يُحترم: التبويب المخفي، واختيار المستخدم الصريح.
  useEffect(() => {
    if (!active) return;
    // العنصر يُلتقط مرّة هنا ويُستعمل في الربط والفكّ معًا. قراءة
    // `videoRef.current` داخل دالة التنظيف تقرأ ما صار إليه المرجع لا ما
    // رُبط عليه — فإن تبدّل العنصر بقيت مستمعاته معلّقة عليه إلى الأبد،
    // ومع دوريّة كل ثانيتين يصير التسريب تراكميًّا. (رصده eslint هنا.)
    const video = videoRef.current;
    if (!video) return;

    const resume = () => {
      if (document.hidden) return;
      if (video.playbackRate !== RATE) video.playbackRate = RATE;
      if (video.paused || video.ended) void video.play().catch(() => {});
    };

    resume();

    const onVisibility = () => {
      if (document.hidden) video.pause();
      else resume();
    };

    document.addEventListener("visibilitychange", onVisibility);
    // الأحداث تلتقط التعثّر فور وقوعه؛ والدورية تمسك ما لا يُطلق حدثًا
    // (رفض تلقائي صامت، أو تجميد على خلفية النظام).
    for (const ev of MEDIA_EVENTS) video.addEventListener(ev, resume);
    for (const ev of GESTURE_EVENTS) window.addEventListener(ev, resume, { passive: true });
    const id = window.setInterval(resume, 2000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      for (const ev of MEDIA_EVENTS) video.removeEventListener(ev, resume);
      for (const ev of GESTURE_EVENTS) window.removeEventListener(ev, resume);
      window.clearInterval(id);
    };
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
        {/* الطبقة ١ — الفيلم الصامت يملأ الشاشة كلها (قرار المالك) */}
        {active && (
          // **لا `autoPlay` ولا `preload="auto"` — عن قصد.** كلاهما يبدأ من
          // مُحلِّل HTML قبل أن يعمل أي JS، ولذلك ثلاث نتائج خاطئة معًا:
          //   ① `playbackRate` لا تُضبط إلا من JS، فالفيلم كان يبدأ بسرعة
          //      ١٫٠ — أي ٣٫٣ أضعاف ما طلبه المالك — ثم يهبط فجأةً إلى ٠٫٣٠
          //      عند الترطيب. لُكنةٌ ظاهرة على كل فتحةٍ من الذاكرة المؤقتة.
          //   ② من أوقف الخلفية صراحةً يراها تعمل من جديد حتى يكتمل
          //      الترطيب — والزرّ هو آلية الوصول الوحيدة هنا (WCAG 2.2.2)
          //      بعد أن أُلغيت الاستجابة لـ prefers-reduced-motion.
          //   ③ الملف يُحمَّل كاملًا على المسار الحرج ولو كان مُطفأً.
          // البديل: `resume()` في التأثير يضبط السرعة **ثم** يشغّل. الثمن
          // تأخّرٌ بمقدار الترطيب قبل أول حركة، وهو أهون من لُكنةٍ وسرعةٍ
          // مخالفة وتحميلٍ لا يُرى.
          <video
            ref={videoRef}
            src={src}
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            className="nx-hv-video"
          />
        )}
        {/* الطبقة ٢ — الغطاء السينمائي (بالرموز فيتبع الوضعين) */}
        <span className="nx-hv-veil" />
        {/* الطبقة ٣ — النسيج الحبيبي */}
        <span className="nx-hv-noise" style={{ backgroundImage: `url("${NOISE_URI}")` }} />
      </div>

      {/* WCAG 2.2.2: الحركة الدائمة يقابلها زر إيقاف دائم الظهور بيد المستخدم.
          موضعه في styles.css: الركن السفلي المقابل لمُطلق فِن في الاتجاهين
          معًا، وهدف لمسه ٤٤×٤٤ على الجوال (WCAG 2.5.8). */}
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
        {userOff ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
      </button>
    </>
  );
}

export default HoloVideoEngine;
