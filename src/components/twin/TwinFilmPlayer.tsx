/**
 * مشغّل «فيلم التوأم الرقمي» المضمَّن — أمر المالك ٢٠٢٦/١٠/٢٣ («اظف فديو موشن جرافيتي مختص
 * بالتوأم الرقمي سينمائي احترافي جداً مميز» و«راجع المرفقات للتحسين»).
 *
 * يحلّ محلّ صورةٍ خارجية فيها واجهةٌ مخبوزة بأرقامها المختلَقة، وإطارٍ `<iframe>` يحمل
 * قشرة التطبيق مرّتين. فيلمٌ **مضمَّنٌ في الصفحة** لا إطار، والنصّ حول الصفحة نصٌّ حقيقيّ
 * خارج مساحة الفيديو لا فوقها.
 *
 * ## ما يفعله
 *
 * • **مرّةً ثم يثبت** على إطاره الأخير — بلا `loop`. والعودة إلى الإطار لا تُعيد فيلمًا انتهى؛
 *   الإعادة بيد الزائر وحده.
 * • **يبدأ وحده حين يظهر** (`IntersectionObserver`) ويقف حين يخرج، ولا يُركَّب عنصر الفيديو ولا
 *   يُطلب ملفّه قبل أوّل ظهور. وتحت لوحة سَدِيد على اللمس يقف بالطبقة المشتركة
 *   `holdFilmUnderPanel` — لا نسخةٌ ثانية منها (المادة ٣١).
 * • **البوابات**: تقليل الحركة، وتوفير البيانات أو الاتصال البطيء ⇐ الملصق وزرّ تشغيل (يبدأ بنقرة
 *   الزائر وحدها)؛ وإيقاف الحركة في النظام (`data-nx-motion="off"` أو
 *   `data-nx-motion-paused="1"`) أو الوضع الآمن ⇐ الملصق فقط. القرار كلّه في
 *   `twin-film-model.ts` (`filmGate`).
 * • **زرٌّ واحد ظاهر دائمًا** (WCAG 2.2.2): تشغيل ⇄ إيقاف ⇄ متابعة ⇄ إعادة عرض ⇄ إعادة محاولة.
 *   هو نفسه عنصر DOM واحد عبر الحالات كلّها، فلا يسقط التركيز عنه عند الإعادة (درس مراجعة
 *   الرئيسية، WCAG 2.4.3). وهدفه ≥ 44px.
 * • **يسقط إلى الملصق** إن تعذّر الفيلم (404 أو ترميز)، وإن منع المتصفّح التشغيل (وضع توفير الطاقة
 *   على iOS) بقي الملصق والزرّ يشغّله من داخل النقرة.
 * • الفيديو `muted playsInline` و`aria-hidden`؛ والمنطقة (`<figure>`) تحمل وصفًا نصّيًّا صادقًا
 *   وإفصاحًا مرئيًّا بأنه فيلمٌ مُصيَّر مسبقًا لا بثّ ولا بيانات تشغيلية.
 * • **الصوت** (أمر المالك ٢٠٢٦/١٠/٢٣ «تعمل تلقائيًا مع عمل الفيديوهات»): متى كان في الملفّ مسار
 *   صوت (`TWIN_FILM_HAS_AUDIO`) يُحاوَل التشغيل **بصوته** أوّلًا؛ فإن منعه المتصفّح عاد صامتًا وانتظر
 *   أوّل لمسة (لا يُفرَض صوتٌ على متصفّحٍ يمنعه — سياسة التشغيل التلقائي)، وزرّ الصوت ظاهرٌ دائمًا.
 *   ويُسكته سَدِيد (ينطق أو لوحته مفتوحة) بالمصدر المشترك `film-audio-hold` نفسه الذي يتبعه فيلم
 *   الرئيسية — لا فيلمٌ يتكلّم فوق سَدِيد. تفضيل الزائر في `twin-film-sound-pref.ts` وحده.
 *
 * ## ما لا يفعله
 *
 * لا يكتب سمة `data-nx-motion-paused` (كاتبها الوحيد صفّ الهوية في الرئيسية، المادة ٣٢)، ولا
 * يكتب شيئًا في التخزين المحلي. **يقرأ** اختيار «إيقاف الحركة» المحفوظ (`nx-brand-motion`) كما تقرؤه
 * لوحة الهوية في كل صفحة، فمن أوقف الحركة في الرئيسية ثم فتح هذه الصفحة بتحميلٍ كامل (إشارة
 * مرجعية، رابط مشارَك، تحديث) لا يبدأ له فيلم — السمة لا تصل وحدها، فالاختيار المحفوظ يكفي.
 *
 * ## ثباتُ ما يعمل
 *
 * فيلمٌ بدأ تلقائيًّا لا يُفكّ بتذبذب الاتصال (4g⇄3g على الشبكة المتنقلة): `saver` تمنع **البدء**
 * لا **المتابعة**، فالفيلم الذي عرض إطاره بالفعل (`played`) يبقى. ما يُفكّه إيقاف الحركة (`off`) أو
 * تقليلها (`reduced`) أو الفشل — وبفكّه يسقط حقّ البقاء فلا يعود وحده على اتصالٍ بطيء.
 */
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Ref } from "react";
import { Pause, Play, RefreshCw, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { requestCinematicFullscreen } from "@/lib/cinematic/fullscreen";
import { isSafeMode } from "@/lib/sadeed/self-healing/crash-loop";
import { filmAudioHeld, watchFilmAudioHold } from "@/lib/sadeed/film-audio-hold";
import {
  MOTION_PAUSED_ATTR,
  MOTION_PAUSE_EVENT,
  holdFilmUnderPanel,
} from "@/components/home/HoloVideoEngine";
import {
  MOTION_PREF_KEY,
  MOTION_PREF_PAUSED,
  TWIN_FILM_HAS_AUDIO,
  TWIN_FILM_POSTER,
  TWIN_FILM_SECONDS,
  TWIN_FILM_TEXT,
  VISIBLE_RATIO,
  controlFor,
  filmGate,
  offCause,
  soundAudible,
  soundStateOf,
  upgradeTwinFilm,
  webmOf,
  type FilmAction,
  type FilmControl,
  type FilmGate,
  type FilmStatus,
  type GateSignals,
  type OffCause,
  type SoundState,
  type TwinFilmLocale,
} from "@/components/twin/twin-film-model";
import { readSoundWanted, writeSoundWanted } from "@/components/twin/twin-film-sound-pref";
import "@/styles/twin-film.css";

type ConnectionInfo = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

const connectionOf = (): ConnectionInfo | undefined =>
  (navigator as Navigator & { connection?: ConnectionInfo }).connection;

/** اختيار «إيقاف الحركة» المحفوظ — قراءةٌ فقط؛ والتخزين المحجوب يعني «لا اختيار محفوظ» لا عطلًا. */
function savedMotionPause(): boolean {
  try {
    return localStorage.getItem(MOTION_PREF_KEY) === MOTION_PREF_PAUSED;
  } catch {
    return false;
  }
}

function readSignals(): GateSignals {
  const root = document.documentElement;
  const connection = connectionOf();
  return {
    reducedMotion:
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: connection?.saveData === true,
    effectiveType: connection?.effectiveType,
    motionOff: root.getAttribute("data-nx-motion") === "off",
    motionPaused: root.getAttribute(MOTION_PAUSED_ATTR) === "1" || savedMotionPause(),
    safeMode: isSafeMode(),
  };
}

/**
 * البوابة الحيّة: `null` قبل التركيب (HTML الخادم ملصقٌ فقط — لا فيلم ولا حكم)، ثم تتبدّل مع تفضيل
 * الحركة والاتصال ومفتاح النظام وزرّ الإيقاف والوضع الآمن في أثناء الجلسة.
 */
function useFilmGate(): { gate: FilmGate | null; cause: OffCause } {
  const [gate, setGate] = useState<FilmGate | null>(null);
  const [cause, setCause] = useState<OffCause>("system");
  useEffect(() => {
    const sync = () => {
      const signals = readSignals();
      setGate(filmGate(signals));
      setCause(offCause(signals));
    };
    const reduce =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const connection = connectionOf();
    sync();
    reduce?.addEventListener?.("change", sync);
    connection?.addEventListener?.("change", sync);
    window.addEventListener(MOTION_PAUSE_EVENT, sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-nx-motion", MOTION_PAUSED_ATTR, "class"],
    });
    return () => {
      reduce?.removeEventListener?.("change", sync);
      connection?.removeEventListener?.("change", sync);
      window.removeEventListener(MOTION_PAUSE_EVENT, sync);
      observer.disconnect();
    };
  }, []);
  return { gate, cause };
}

/**
 * ملء الشاشة: مدعومٌ حيث `document.fullscreenEnabled` (لا على iPhone لغير الفيديو)، والحال حيّة.
 * للصفحة الحاضنة إن كان زرّ ملء الشاشة عندها لا في المشغّل.
 */
export function useFullscreen(): { supported: boolean; active: boolean } {
  const [state, setState] = useState({ supported: false, active: false });
  useEffect(() => {
    const read = () =>
      setState({
        supported: document.fullscreenEnabled === true,
        active: document.fullscreenElement != null,
      });
    read();
    document.addEventListener("fullscreenchange", read);
    return () => document.removeEventListener("fullscreenchange", read);
  }, []);
  return state;
}

/**
 * يحرّر مفكّك الترميز فور الفكّ لا عند جمع المهملات — وعلى iOS الذاكرة تُحتسب على الصفحة (درس P0
 * ٢٠٢٦/١٠/١٤). عنصرٌ منزوع من الشجرة يحتفظ بمفكّكه ومخزنه حتى يُجمع.
 */
function releaseVideo(video: HTMLVideoElement): void {
  try {
    video.pause();
    for (const source of Array.from(video.querySelectorAll("source"))) source.remove();
    video.removeAttribute("src");
    video.load();
  } catch {
    /* محرّكٌ بلا هذه الدوال — لا يضرّ */
  }
}

/** أيقونة الزرّ الواحد لكل فعل — تُصدَّر ليرسم شريط `/cinematic` زرّه المرآة بالأيقونة نفسها. */
export const FILM_ACTION_ICONS: Readonly<Record<FilmAction, typeof Play>> = {
  play: Play,
  pause: Pause,
  resume: Play,
  replay: RotateCcw,
  retry: RefreshCw,
};

/** ما يُمكّن الصفحة الحاضنة من زرّها الخاص (شريط `/cinematic`) دون أن تمسّ عنصر الفيديو. */
export interface TwinFilmHandle {
  /** الزرّ الواحد نفسه: يشغّل أو يوقف أو يتابع أو يعيد بحسب الحال. */
  readonly toggle: () => void;
  /** ملء الشاشة للمشغّل كلّه (الفيلم وزرّه ووصفه)، أو الخروج منه. */
  readonly toggleFullscreen: () => void;
}

export interface TwinFilmPlayerProps {
  /** الإطار فوق الطيّة (LCP): ملصقه بأولوية عالية لا كسولًا. */
  readonly priority?: boolean;
  /** يُبلَّغ بالزرّ الواحد كلما تبدّل (حال/اسم/تعليق). يُمرَّر مستقرًّا (`setState`). */
  readonly onControlChange?: (control: FilmControl) => void;
  readonly ref?: Ref<TwinFilmHandle>;
}

export function TwinFilmPlayer({ priority = false, onControlChange, ref }: TwinFilmPlayerProps) {
  const { locale } = useI18n();
  const lang: TwinFilmLocale = locale === "en" ? "en" : "ar";
  const text = TWIN_FILM_TEXT[lang];
  const { gate, cause } = useFilmGate();
  const uid = useId();

  const figureRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);

  /** ظهر الإطار مرّةً — قبلها لا عنصر فيديو ولا طلب ملف. */
  const [armed, setArmed] = useState(false);
  /** طلب الزائر التشغيل بنقرته — وحده يفتح البوابتين `reduced` و`saver`. */
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  /** عرض إطاره فعلًا (`playing`) في هذا التركيب — وحده يُبقيه تحت `saver` فلا يُفكّه تذبذب الاتصال. */
  const [played, setPlayed] = useState(false);
  const [playState, setPlayState] = useState<"playing" | "paused">("playing");
  const [src, setSrc] = useState<string | null>(null);
  /** تعذّر الملصق نفسه (404): يزول فيبقى سطح الإطار الهادئ لا أيقونة صورةٍ مكسورة فوقه. */
  const [posterFailed, setPosterFailed] = useState(false);

  /**
   * الصوت (ما دام في الملفّ مسار صوت): المرغوب (تفضيل الزائر) · الموقوف (سَدِيد ينطق أو لوحته مفتوحة) ·
   * المفتوح (سُمح للمتصفّح: نجح تشغيلٌ بصوت، أو لمسة). في مرجعٍ لا في حالة: يقرؤه `run` داخل نقرةٍ
   * ولا ينتظر إعادة رسم، و`soundState` مرآته للرسم.
   */
  const sound = useRef({ wanted: true, held: false, unlocked: false, denied: false });
  const [soundState, setSoundState] = useState<SoundState>("blocked");

  const visible = useRef(false);
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  /** أوقفه الزائر بزرّه — فلا يستأنفه الظهور. */
  const userPaused = useRef(false);
  /** أوقفه خروجه من الإطار — فيستأنف بعودته. */
  const autoPaused = useRef(false);

  const keepsPlaying = gate === "saver" && played;
  const allowed = gate !== null && gate !== "off" && (gate === "open" || started || keepsPlaying);
  const mounted = allowed && (armed || started) && !failed && src !== null;
  const status: FilmStatus = failed ? "failed" : finished ? "ended" : mounted ? playState : "idle";
  const control = useMemo(() => controlFor(status, gate, lang, cause), [status, gate, lang, cause]);

  useEffect(() => {
    onControlChange?.(control);
  }, [control, onControlChange]);

  // الملصق الذي فشل قبل الترطيب لا يصل حدثُ خطئه إلى React: يُكتشف بحاله (مكتملٌ بلا عرض).
  useEffect(() => {
    const img = posterRef.current;
    if (img && img.complete && img.naturalWidth === 0) setPosterFailed(true);
  }, []);

  /** المصدر المعروض الآن، والأفضل لإطارٍ كبر بعد التركيب (ترقيةٌ فقط)، والزمن المحفوظ لعبور الترقية. */
  const srcRef = useRef<string | null>(null);
  const wanted = useRef<string | null>(null);
  const carry = useRef<number | null>(null);

  /**
   * يطبّق الترقية المؤجَّلة متى كان آمنًا: لا عنصر فيديو (يُغيَّر المصدر مباشرةً) أو عنصرٌ **لا يعمل**
   * (موقوف/منتهٍ/مرفوض). فيلمٌ يعمل لا يُبدَّل مصدره: `load()` يُسقط إطاره الحاليّ فيُرى الملصق
   * خلفه وميضًا في منتصف العرض — فتنتظر الترقيةُ أوّل توقفٍ أو نهاية (`onPause`/`onEnded`)، وعندها يُحفَظ
   * الموضع ويُستعاد عند `loadedmetadata` ويبقى الفيلم على حاله (موقوفًا أو منتهيًا).
   */
  const settle = useCallback(() => {
    const next = wanted.current;
    if (next === null || next === srcRef.current) return;
    const video = videoRef.current;
    if (video && srcRef.current !== null) {
      if (!video.paused && !video.ended) return;
      carry.current = video.currentTime;
    }
    srcRef.current = next;
    setSrc(next);
  }, []);

  // الدرجة بحاجة الإطار المرسوم: عرضه × كثافة الشاشة — عند التركيب، ثم كلما تبدّل الإطار (تدوير الجوال،
  // تكبير النافذة، ملء الشاشة). ترقيةٌ فقط: إطارٌ يصغر لا يُخفِّض.
  useEffect(() => {
    const measure = () => {
      const width = frameRef.current?.getBoundingClientRect().width || window.innerWidth;
      wanted.current = upgradeTwinFilm(wanted.current, width, window.devicePixelRatio);
      settle();
    };
    measure();
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const watcher = new ResizeObserver(measure);
    watcher.observe(frame);
    return () => watcher.disconnect();
  }, [settle]);

  // مصدرٌ تبدّل والعنصر قائم: تُعاد قراءة `<source>` ثم يُستعاد الموضع. (`load()` يوقف الفيلم؛ ومن طلب
  // التشغيل بعدها — الظهور أو الزائر — يعمل من الموضع المستعاد.) والموضع لا يُستعاد إلا حين يكون
  // مَقروءًا (`seekable`): مضيفٌ بلا HTTP Range لا يتيح القفز إلى ما لم يُحمَّل بعد (قِيس على `wrangler dev`
  // المحلي) فيُرجَأ إلى `progress`/`canplaythrough` حتى يكفي ما حُمِّل بدل أن يعود الفيلم إلى 0 بصمت.
  useEffect(() => {
    const video = videoRef.current;
    const at = carry.current;
    carry.current = null;
    if (!video || at === null) return;
    const events = ["loadedmetadata", "progress", "canplaythrough"] as const;
    const stop = () => events.forEach((type) => video.removeEventListener(type, attempt));
    const attempt = () => {
      const total = video.duration;
      const target = Number.isFinite(total) ? Math.min(at, total) : at;
      const ranges = video.seekable;
      if (ranges.length === 0 || ranges.end(ranges.length - 1) < target - 0.05) return;
      video.currentTime = target;
      stop();
    };
    events.forEach((type) => video.addEventListener(type, attempt));
    video.load();
    return stop;
  }, [src]);

  const progress = useCallback((video: HTMLVideoElement, done = false) => {
    const total =
      Number.isFinite(video.duration) && video.duration > 0 ? video.duration : TWIN_FILM_SECONDS;
    const ratio = done ? 1 : Math.min(1, Math.max(0, video.currentTime / total));
    barRef.current?.style.setProperty("--twin-progress", String(ratio));
  }, []);

  /** يطبّق حال الصوت على العنصر ويعكسها للرسم. القرار كلّه في `soundAudible` — هنا تنفيذٌ فقط. */
  const applySound = useCallback(() => {
    const { wanted, held, unlocked } = sound.current;
    const video = videoRef.current;
    // خارج الشاشة لا يُسمَع الفيلم أبدًا: استئناف لوحة سَدِيد (`holdFilmUnderPanel`) لا يمرّ بفحص الظهور.
    if (video && TWIN_FILM_HAS_AUDIO)
      video.muted = !(soundAudible(wanted, held, unlocked) && visible.current);
    setSoundState(soundStateOf(wanted, held, unlocked));
  }, []);

  const run = useCallback(
    (video: HTMLVideoElement) => {
      userPaused.current = false;
      autoPaused.current = false;
      setPlayState("playing");
      // يبدأ بصوته إن أُذن له: يُحاوَل بصوتٍ أوّلًا، فإن منعه المتصفّح (`NotAllowedError`) عاد صامتًا
      // وانتظر أوّل لمسة. لا يُحاوَل تحت سَدِيد ولا بعد أن أسكته الزائر.
      const s = sound.current;
      s.held = TWIN_FILM_HAS_AUDIO ? filmAudioHeld() : false;
      // لا يُحاوَل بصوتٍ بعد رفضٍ سابق إلى أن تأتي لمسة (`denied`)، ولا خارج الشاشة.
      const audible = TWIN_FILM_HAS_AUDIO && s.wanted && !s.held && !s.denied && visible.current;
      if (TWIN_FILM_HAS_AUDIO) {
        video.muted = !audible;
        // «مفتوح» تفاؤلًا طوال المحاولة (فلا تُسكته إشعارٌ يصل قبل ردّ المتصفّح ولا يومض تلميح المنع)،
        // ويُصحَّح برفضها.
        if (audible) s.unlocked = true;
        setSoundState(soundStateOf(s.wanted, s.held, s.unlocked));
      }
      const played = video.play() as Promise<void> | undefined;
      // منعُ التشغيل (توفير الطاقة على iOS) أو رفضه يُبقي الملصق والزرّ يشغّله من داخل النقرة.
      // والمقاطعة بالإيقاف (`AbortError`) ليست رفضًا — حدث `pause` يحمل الحال.
      played?.catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (audible && err instanceof DOMException && err.name === "NotAllowedError") {
          s.unlocked = false;
          s.denied = true;
          video.muted = true;
          applySound();
          (video.play() as Promise<void> | undefined)?.catch((e: unknown) => {
            if (!(e instanceof DOMException && e.name === "AbortError")) setPlayState("paused");
          });
          return;
        }
        setPlayState("paused");
      });
    },
    [applySound],
  );

  // التفضيل المحفوظ يُقرأ بعد الترطيب (لا في الرسم الأوّل فلا اختلاف بين HTML الخادم والعميل).
  useEffect(() => {
    if (!TWIN_FILM_HAS_AUDIO) return;
    sound.current.wanted = readSoundWanted();
    applySound();
  }, [applySound]);

  // سَدِيد ينطق أو لوحته مفتوحة: يُسكت الفيلم (لا يوقف)، ويعود صوته بزوال السبب.
  useEffect(() => {
    if (!TWIN_FILM_HAS_AUDIO) return;
    return watchFilmAudioHold(() => {
      sound.current.held = filmAudioHeld();
      applySound();
    });
  }, [applySound]);

  // أوّل لمسة تفتح الصوت إن منعه المتصفّح — وحدها تكفي (إيماءة المستخدم تسمح بفكّ الكتم). `pointerdown`
  // اللمسيّ ليس إيماءةً (لا تنشيط) فيُتجاهَل، أمّا `click` فيُقبَل من الإصبع أيضًا (يحمل `pointerType`
  // «touch» ولا يُفلتَر). ومفتاحٌ كـTab ليس قبولًا بالصوت — فلا `keydown` (Enter/Space على زرٍّ يُطلقان
  // `click`). لمسة زرّ الصوت نفسه يعالجها الزرّ.
  useEffect(() => {
    if (!TWIN_FILM_HAS_AUDIO || !mounted) return;
    const gestures = ["pointerdown", "click"] as const;
    const unlock = (event: Event) => {
      if (event.type === "pointerdown" && (event as PointerEvent).pointerType === "touch") return;
      if (event.target instanceof Element && event.target.closest(".twin-film-sound")) return;
      const s = sound.current;
      s.denied = false; // لمسةٌ جديدة: يُحاوَل بصوتٍ ثانيةً (استئناف/إعادة عرض داخل النقرة).
      if (s.unlocked) return;
      s.unlocked = true;
      applySound();
    };
    gestures.forEach((type) => document.addEventListener(type, unlock, true));
    return () => gestures.forEach((type) => document.removeEventListener(type, unlock, true));
  }, [mounted, applySound]);

  const onSound = () => {
    const s = sound.current;
    s.denied = false;
    if (soundStateOf(s.wanted, s.held, s.unlocked) === "off" || !s.unlocked) {
      s.wanted = true;
      s.unlocked = true;
    } else {
      s.wanted = false;
    }
    writeSoundWanted(s.wanted);
    applySound();
  };

  // الظهور: أوّل ظهورٍ يفتح التركيب، والخروج يوقف الفيلم، والعودة تستأنف ما أوقفه الخروج وحده —
  // لا ما أوقفه الزائر ولا ما انتهى.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (typeof IntersectionObserver === "undefined") {
      visible.current = true;
      setArmed(true);
      return;
    }
    const watcher = new IntersectionObserver(
      (entries) => {
        // السجلّات تصل الأقدم أولًا، وقد تتراكم عدّة سجلّات في مهمّةٍ مشغولة: الحاكم **الأحدث** لا الأقدم.
        const entry = entries[entries.length - 1];
        if (!entry) return;
        const seen = entry.isIntersecting && (entry.intersectionRatio ?? 1) >= VISIBLE_RATIO;
        visible.current = seen;
        if (seen) setArmed(true);
        const video = videoRef.current;
        if (!video) return;
        if (TWIN_FILM_HAS_AUDIO) applySound(); // يُسكَت بخروجه من الشاشة ويعود صوته بعودته.
        if (!seen) {
          if (!video.paused) {
            autoPaused.current = true;
            video.pause();
          }
          return;
        }
        if (autoPaused.current && !userPaused.current && !finishedRef.current && !video.ended) {
          run(video);
        }
      },
      { threshold: [0, VISIBLE_RATIO] },
    );
    watcher.observe(frame);
    return () => watcher.disconnect();
  }, [run, applySound]);

  // عنصر الفيديو مركَّبًا: تحت لوحة سَدِيد يقف (الطبقة المشتركة)، ويبدأ إن كان إطاره ظاهرًا أو طلبه
  // الزائر — ولا يبدأ فيلمٌ انتهى (عاد بعد زوال بوابة).
  useEffect(() => {
    const video = videoRef.current;
    if (!mounted || !video) return;
    setReady(false);
    // عنصرٌ جديد على بدايته: الشريط يتبعه لا عرضه القديم (فيلمٌ انتهى يبقى شريطه ممتلئًا).
    progress(video, finishedRef.current);
    const release = holdFilmUnderPanel(video);
    if (!finishedRef.current && (visible.current || startedRef.current)) run(video);
    return () => {
      release();
      releaseVideo(video);
      // فُكّ (إيقاف حركة · تقليلها · فشل): سقط حقّ البقاء تحت `saver`، فلا يعود وحده على اتصالٍ بطيء.
      setPlayed(false);
    };
  }, [mounted, run, progress]);

  const begin = () => {
    startedRef.current = true;
    userPaused.current = false;
    setStarted(true);
  };

  const onControl = () => {
    if (gate === null || gate === "off") return;
    const video = videoRef.current;
    switch (control.action) {
      case "play":
        begin();
        break;
      case "pause":
        userPaused.current = true;
        autoPaused.current = false;
        video?.pause();
        break;
      case "resume":
        if (video) run(video);
        else begin();
        break;
      case "replay":
        finishedRef.current = false;
        setFinished(false);
        begin();
        if (video) {
          video.currentTime = 0;
          progress(video);
          run(video);
        }
        break;
      case "retry":
        setFailed(false);
        begin();
        break;
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    // المساعد المشترك يحتفظ بتنشيط المستخدم ويحتوي الرفض (لا استثناء يتسرّب من المتصفّح).
    void requestCinematicFullscreen(figureRef.current);
  };

  useImperativeHandle(ref, () => ({ toggle: onControl, toggleFullscreen }));

  const Icon = FILM_ACTION_ICONS[control.action];

  return (
    <figure
      ref={figureRef}
      className="twin-film"
      aria-label={text.title}
      aria-describedby={`${uid}-desc ${uid}-cap`}
      data-status={status}
      data-gate={gate ?? undefined}
    >
      <div ref={frameRef} className="twin-film-frame">
        {/* الملصق أوّلًا: ما يُرسم من أوّل إطار وما يبقى لمن لا فيلم له. زخرفةٌ لقارئ الشاشة —
            الوصف على المنطقة. */}
        {!posterFailed && (
          <img
            ref={posterRef}
            className="twin-film-poster"
            src={TWIN_FILM_POSTER.src}
            width={TWIN_FILM_POSTER.width}
            height={TWIN_FILM_POSTER.height}
            alt=""
            decoding="async"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            onError={() => setPosterFailed(true)}
          />
        )}
        {mounted && src && (
          // مصدران للحلقة نفسها: H.264 أوّلًا ثم VP9/WebM لبناءات Chromium بلا ترميزات احتكارية.
          // خطأ `<source>` واحد يصعد في React إلى `onError` العنصر (قِيس في الرئيسية)، فلا يُعدّ
          // فشلًا إلا ما استهدف العنصر نفسه أو جاء بعد استنفاد المصادر. وبلا `loop` وبلا
          // `controls` وبلا `poster`: الصورة تحته هي الملصق، والإعادة بيد الزائر.
          <video
            ref={videoRef}
            className="twin-film-video"
            muted
            playsInline
            preload="auto"
            aria-hidden
            tabIndex={-1}
            disablePictureInPicture
            disableRemotePlayback
            data-ready={ready || undefined}
            onPlaying={() => {
              setReady(true);
              setPlayed(true);
            }}
            onPlay={() => setPlayState("playing")}
            onPause={(e) => {
              // عند النهاية يصل `pause` قبل `ended` و`ended` يحمل الحال: تطبيق الترقية هنا يستدعي `load()`
              // الذي يلغي المهام المعلّقة ومنها `ended` (قِيس في Chromium) — فتُترك لـ`onEnded`.
              if (e.currentTarget.ended) return;
              setPlayState("paused");
              settle();
            }}
            onTimeUpdate={(e) => progress(e.currentTarget)}
            onEnded={(e) => {
              finishedRef.current = true;
              setFinished(true);
              setPlayState("paused");
              progress(e.currentTarget, true);
              settle();
            }}
            onError={(e) => {
              const video = e.currentTarget;
              if (e.target === video || video.networkState === video.NETWORK_NO_SOURCE) {
                setFailed(true);
              }
            }}
          >
            <source src={src} type="video/mp4" />
            <source src={webmOf(src)} type="video/webm" />
          </video>
        )}
      </div>
      <div ref={barRef} className="twin-film-bar">
        <button
          type="button"
          className="twin-film-btn twin-film-toggle nx-focus-ring"
          data-action={control.action}
          aria-label={control.label}
          aria-disabled={control.disabled || undefined}
          aria-describedby={control.hint ? `${uid}-hint` : undefined}
          title={control.label}
          onClick={onControl}
        >
          <Icon aria-hidden size={20} />
          <span className="twin-film-btn-text">{control.label}</span>
        </button>
        {TWIN_FILM_HAS_AUDIO && mounted && (
          // زرّ الصوت: اسمٌ ثابت وحالةٌ في `aria-pressed` (لا اسمٌ يتبدّل مع الحال). يظهر مع عنصر الفيديو
          // وحده — لا صوت يُتحكَّم به قبله.
          <button
            type="button"
            className="twin-film-btn twin-film-sound nx-focus-ring"
            aria-pressed={soundState === "on" || soundState === "held"}
            aria-describedby={
              soundState === "held" || soundState === "blocked" ? `${uid}-sound-hint` : undefined
            }
            onClick={onSound}
          >
            {soundState === "on" || soundState === "held" ? (
              <Volume2 aria-hidden size={20} />
            ) : (
              <VolumeX aria-hidden size={20} />
            )}
            <span className="twin-film-btn-text">{text.sound.name}</span>
          </button>
        )}
        <span aria-hidden className="twin-film-progress">
          <i />
        </span>
      </div>
      {control.hint && (
        <p id={`${uid}-hint`} className="twin-film-hint" role="status">
          {control.hint}
        </p>
      )}
      {TWIN_FILM_HAS_AUDIO && mounted && (soundState === "held" || soundState === "blocked") && (
        <p id={`${uid}-sound-hint`} className="twin-film-hint" role="status">
          {soundState === "held" ? text.sound.held : text.sound.blocked}
        </p>
      )}
      <p id={`${uid}-desc`} className="twin-film-sr">
        {text.description}
      </p>
      <figcaption id={`${uid}-cap`} className="twin-film-caption">
        <strong>{text.kind}</strong>
        <span aria-hidden> · </span>
        <span>{text.meta}</span>
        <br />
        {text.disclosure}
      </figcaption>
    </figure>
  );
}
