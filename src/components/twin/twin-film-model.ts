/**
 * «فيلم التوأم الرقمي» — القرار الخالص للمشغّل (`TwinFilmPlayer`).
 *
 * منطقٌ بلا DOM يُختبر بالمساواة: أيّ الأصول يُختار، ومتى يُسمح للفيلم أن يبدأ
 * وحده، وماذا يفعل الزرّ الواحد في كل حال، وما يُقال للزائر بلغته. المكوّن يقرأ
 * هذا الملف ولا يقرّر شيئًا من عنده — فحارس العقد
 * (`twin-film.contract.test.ts`) يحرس القرار لا نصّ JSX.
 *
 * ## ما هو الفيلم، وما ليس
 *
 * ملف فيديو موشن جرافيك **مُصيَّر مسبقًا** (30 ث، بلا صوت) يشرح فكرة التوأم
 * الرقمي — لا بثّ حيّ ولا بيانات تشغيلية (المادة ٢٧). هذا الإفصاح يسكن هنا
 * مرّةً واحدة ويظهر مع المشغّل في كل صفحة تضمّه، فلا تنحرف صفحتان عن بعضهما.
 *
 * ## عقد الأصول (يصيّرها مسارٌ آخر — لا تُكتب بدائلها في المستودع)
 *
 *   public/media/twin/sadeed-twin-1280.{mp4,webm}   H.264 / VP9، بلا مسار صوت
 *   public/media/twin/sadeed-twin-640.{mp4,webm}
 *   public/media/twin/sadeed-twin-poster.webp       1280×720
 */

/**
 * مدّة الفيلم بالثواني — **مكرَّرة عمدًا** من `remotion/twin/timeline.ts`
 * (`TWIN_FILM_SECONDS`): `remotion/` أداة بناء خارج حزمة التطبيق فلا تُستورد منها.
 * والعقد يقرأ الملفّين ويقارنهما، فتبدّل أحدهما دون الآخر يحمرّ هناك لا هنا.
 */
export const TWIN_FILM_SECONDS = 30;

/** الملصق: أوّل ما يُرسم، وما يبقى لمن لا فيلم له. */
export const TWIN_FILM_POSTER = {
  src: "/media/twin/sadeed-twin-poster.webp",
  width: 1280,
  height: 720,
} as const;

/** درجتا الفيلم — عرض كلٍّ ومصدره (MP4 أوّلًا، وتوأمه WebM بالامتداد نفسه). */
export const TWIN_FILMS = [
  { width: 640, src: "/media/twin/sadeed-twin-640.mp4" },
  { width: 1280, src: "/media/twin/sadeed-twin-1280.mp4" },
] as const;

export type TwinFilmTier = (typeof TWIN_FILMS)[number];

/**
 * أقصى تكبيرٍ مقبول لدرجةٍ فوق حاجتها قبل الانتقال إلى الأكبر. القيمة نفسها
 * `FILM_UPSCALE_LIMIT` في `HomeBrandRow` — لا تُستورد من هناك لأنّ ذلك الملف يجرّ
 * معه الشريط والموسيقى وCSS الرئيسية إلى مسار `/cinematic`؛ والعقد يقارن القيمتين.
 */
export const TWIN_UPSCALE_LIMIT = 1.15;

/**
 * الدرجة بالحاجة المقيسة: عرض الإطار المرسوم × كثافة الشاشة (سقفها 2). أصغر درجةٍ
 * لا تُكبَّر فوق `TWIN_UPSCALE_LIMIT`، وإلا الكبرى. فجوّالٌ بإطار 358px على شاشة 3×
 * يأخذ 640، ومكتبٌ بإطار 900px يأخذ 1280.
 */
export function pickTwinFilm(cssWidth: number, dpr: number): TwinFilmTier {
  const need = Math.max(0, cssWidth) * Math.min(Math.max(dpr || 1, 1), 2);
  return (
    TWIN_FILMS.find((film) => film.width * TWIN_UPSCALE_LIMIT >= need) ??
    TWIN_FILMS[TWIN_FILMS.length - 1]
  );
}

/**
 * الترقية فقط (#15): إطارٌ يكبر بعد التركيب (تدوير الجوال، تكبير النافذة، ملء الشاشة) يرفع الدرجة إلى
 * ما يحتاجه، وإطارٌ يصغر يُبقي الكبرى — فلا يُنزَّل ملفٌّ ثانٍ ولا يُبدَّل المصدر لتوفيرٍ لا يُرى.
 * `currentSrc` غير المعروف (أو `null`) يُعامَل كلا شيء فتُختار الدرجة بالحاجة كما في `pickTwinFilm`.
 */
export function upgradeTwinFilm(currentSrc: string | null, cssWidth: number, dpr: number): string {
  const wanted = pickTwinFilm(cssWidth, dpr);
  const current = TWIN_FILMS.find((film) => film.src === currentSrc);
  return current && current.width >= wanted.width ? current.src : wanted.src;
}

/** توأم WebM للمصدر — الحلقة نفسها بترميزٍ آخر لبناءات Chromium بلا H.264. */
export function webmOf(mp4: string): string {
  return mp4.replace(/\.mp4$/, ".webm");
}

/* ── البوابات ───────────────────────────────────────────────────────────── */

/**
 * `open` يبدأ وحده عند ظهوره · `reduced` و`saver` ملصقٌ وزرّ تشغيل (يبدأ بنقرة
 * الزائر وحدها) · `off` ملصقٌ فقط والزرّ مُعلَّق بسببه.
 */
export type FilmGate = "open" | "reduced" | "saver" | "off";

/** أنواع الاتصال التي نعدّها بطيئةً على ملفٍّ مدّته 30 ث (تصنيف المتصفّح `effectiveType`). */
export const SLOW_CONNECTIONS: readonly string[] = ["slow-2g", "2g", "3g"];

export type GateSignals = {
  /** `prefers-reduced-motion: reduce`. */
  readonly reducedMotion: boolean;
  /** `navigator.connection.saveData`. */
  readonly saveData: boolean;
  /** `navigator.connection.effectiveType` إن عُرف. */
  readonly effectiveType?: string;
  /** `html[data-nx-motion="off"]` — مفتاح النظام. */
  readonly motionOff: boolean;
  /** `html[data-nx-motion-paused="1"]` — زرّ «إيقاف الحركة» الواحد في النظام. */
  readonly motionPaused: boolean;
  /** الوضع الآمن بعد حلقة انهيار. */
  readonly safeMode: boolean;
};

/**
 * مفتاح «إيقاف الحركة» المحفوظ وقيمته — **مكرَّران عمدًا** من `HomeBrandRow` (`PAUSE_KEY`) و`SadeedPlateLockup`
 * (`SAVED_PAUSE_KEY`): لا يُستوردان لأنّ الأوّل يجرّ الشريط والموسيقى وCSS الرئيسية إلى `/cinematic`
 * (قاعدة `TWIN_UPSCALE_LIMIT` نفسها). والعقد يقارنهما بالمصدرين نصًّا فلا ينحرف أحدها. والمشغّل
 * **يقرؤه ولا يكتبه** (#14): من أوقف الحركة في الرئيسية ثم فتح صفحةً أخرى بتحميلٍ كامل لا تصله السمة
 * (كاتبها صفّ الرئيسية وحده) لكن يصله اختياره المحفوظ.
 */
export const MOTION_PREF_KEY = "nx-brand-motion";
export const MOTION_PREF_PAUSED = "paused";

/**
 * البوابة من الإشارات. الأولويّة لما يفرضه النظام كلّه (إيقاف الحركة والوضع
 * الآمن) على ما يطلبه الجهاز (تقليل الحركة) على ما تفرضه الشبكة (توفير البيانات) —
 * فمن أوقف الحركة في النظام لا يبدأ له فيلمٌ بنقرةٍ تتنازعها طبقة الإيقاف المشتركة.
 */
export function filmGate(s: GateSignals): FilmGate {
  if (s.motionOff || s.motionPaused || s.safeMode) return "off";
  if (s.reducedMotion) return "reduced";
  if (s.saveData || (s.effectiveType !== undefined && SLOW_CONNECTIONS.includes(s.effectiveType))) {
    return "saver";
  }
  return "open";
}

/**
 * سبب البوابة `off` (#13/#17) — ما يُقال للزائر يتبع السبب: زرّ «إيقاف الحركة» في الرئيسية يزيل `motionPaused`
 * وحده، ولا يزيل الوضع الآمن (بعد حلقة انهيار) ولا `data-nx-motion="off"` (لا كاتب له في الواجهة).
 * `pause-button` ⇐ الزرّ وحده؛ وأيّ سببٍ آخر معه أو دونه ⇐ `system` (لا إحالة إلى زرّ لن يكفي).
 */
export type OffCause = "pause-button" | "system";

export function offCause(s: GateSignals): OffCause {
  return s.motionPaused && !s.safeMode && !s.motionOff ? "pause-button" : "system";
}

/* ── الحال والزرّ الواحد ─────────────────────────────────────────────────── */

export type FilmStatus = "idle" | "playing" | "paused" | "ended" | "failed";
export type FilmAction = "play" | "pause" | "resume" | "replay" | "retry";

/** نصوص المشغّل بلسانيها — والمدّة فيها من `TWIN_FILM_SECONDS` لا رقمٌ مكتوب ثانيةً. */
export const TWIN_FILM_TEXT = {
  ar: {
    kind: "فيلم موشن جرافيك توضيحي",
    title: "فيلم التوأم الرقمي",
    meta: `${TWIN_FILM_SECONDS} ثانية · بلا صوت`,
    disclosure:
      "فيلم مُصيَّر مسبقًا (ملف فيديو توضيحي)، وليس بثًّا حيًّا ولا بيانات تشغيلية؛ وما يظهر فيه من أشكال أو قيم توضيحي لا يمثّل حالة تشغيل فعلية.",
    description: `فيلم موشن جرافيك توضيحي مُصيَّر مسبقًا، مدّته ${TWIN_FILM_SECONDS} ثانية وبلا صوت. تشتعل شبكةٌ ثم تظهر خريطة المملكة بمناطقها الأربع ومنصّةٌ لكل منطقة تتصل بغيرها بخيوط بيانات، ثم تهبط الكاميرا إلى منشأةٍ فيُمسح هيكلها بشعاعٍ ليزري وتضيء أنابيبها ويسري التوجيه ذهابًا والإفادة إيابًا، ثم ترتدّ الكاميرا ويثبت الفيلم على إطاره الأخير.`,
    actions: {
      play: "تشغيل الفيلم",
      pause: "إيقاف الفيلم مؤقتًا",
      resume: "متابعة الفيلم",
      replay: "إعادة عرض الفيلم",
      retry: "إعادة محاولة تحميل الفيلم",
    },
    hints: {
      off: "الحركة موقوفة في النظام، فيُعرض الفيلم صورةً ثابتة.",
      offPaused:
        "الحركة موقوفة في النظام، فيُعرض الفيلم صورةً ثابتة. استأنفها من زرّ «إيقاف الحركة» في الصفحة الرئيسية.",
      reduced:
        "تقليل الحركة مفعّل في جهازك، فلا يبدأ الفيلم تلقائيًا. اضغط «تشغيل الفيلم» متى شئت.",
      saver:
        "توفير البيانات أو الاتصال البطيء مفعّل، فلا يبدأ الفيلم تلقائيًا. اضغط «تشغيل الفيلم» متى شئت.",
      failed: "تعذّر تحميل الفيلم، فتبقى الصورة الثابتة.",
    },
  },
  en: {
    kind: "Illustrative motion-graphics film",
    title: "Digital twin film",
    meta: `${TWIN_FILM_SECONDS} seconds · no sound`,
    disclosure:
      "A pre-rendered illustrative video file, not a live feed and not operational data; the shapes and values in it are illustrative and do not represent actual operating conditions.",
    description: `A pre-rendered illustrative motion-graphics film, ${TWIN_FILM_SECONDS} seconds long and silent. A grid ignites, then a map of the Kingdom appears with its four regions and a platform in each, linked by data arcs. The camera then dives into a facility whose structure is laser-scanned and whose pipes light up as guidance flows out and feedback flows back, before the camera pulls back and the film holds on its last frame.`,
    actions: {
      play: "Play film",
      pause: "Pause film",
      resume: "Resume film",
      replay: "Replay film",
      retry: "Retry loading the film",
    },
    hints: {
      off: "Motion is turned off, so the film is shown as a still image.",
      offPaused:
        "Motion is paused system-wide, so the film is shown as a still image. Resume it with “Pause motion” on the home page.",
      reduced:
        "Reduced motion is on for your device, so the film does not start by itself. Press “Play film” whenever you like.",
      saver:
        "Data saver or a slow connection is on, so the film does not start by itself. Press “Play film” whenever you like.",
      failed: "The film could not be loaded, so the still image remains.",
    },
  },
} as const;

export type TwinFilmLocale = keyof typeof TWIN_FILM_TEXT;

export type FilmControl = {
  readonly status: FilmStatus;
  readonly action: FilmAction;
  readonly label: string;
  /** مُعلَّق (`aria-disabled`) — يبقى مرئيًّا ومركَّزًا وسببه في `hint`. */
  readonly disabled: boolean;
  readonly hint: string | null;
};

const ACTION_OF: Readonly<Record<FilmStatus, FilmAction>> = {
  idle: "play",
  playing: "pause",
  paused: "resume",
  ended: "replay",
  failed: "retry",
};

/**
 * الزرّ الواحد في كل حال — **زرٌّ واحد لا زرّان**: تشغيل ⇄ إيقاف ⇄ متابعة ⇄ إعادة. فيبقى
 * هو نفسه عنصرَ DOM واحدًا عبر الحالات كلّها ولا يسقط التركيز عنه عند الإعادة (درس
 * مراجعة الرئيسية، WCAG 2.4.3)، ويبقى ظاهرًا دائمًا (WCAG 2.2.2).
 */
export function controlFor(
  status: FilmStatus,
  gate: FilmGate | null,
  locale: TwinFilmLocale,
  cause: OffCause = "system",
): FilmControl {
  const t = TWIN_FILM_TEXT[locale];
  const action = ACTION_OF[status];
  let hint: string | null = null;
  if (gate === "off") hint = cause === "pause-button" ? t.hints.offPaused : t.hints.off;
  else if (status === "failed") hint = t.hints.failed;
  else if (status === "idle" && gate === "reduced") hint = t.hints.reduced;
  else if (status === "idle" && gate === "saver") hint = t.hints.saver;
  return { status, action, label: t.actions[action], disabled: gate === "off", hint };
}

/** نسبة الإطار المرئية التي يبدأ عندها الفيلم ويقف دونها. */
export const VISIBLE_RATIO = 0.25;
