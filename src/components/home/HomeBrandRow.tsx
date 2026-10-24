/**
 * صفّ الهوية — شريط «مزايا سَدِيد» المتحرك، وتحته لوحة المالك بعرض العمود كاملًا، فوقها
 * فيلمٌ سينمائي يُعرض مرّةً بموسيقاه في حاويته نفسها، والاسم والسطر نصًّا حقيقيًّا فوقهما، ثم «الجوهرة».
 *
 * ## الأوامر
 *
 * • ٢٠٢٦/١٠/١٧: «ضع هذه الصور المرفقة كعلامة كما هي … واجعلها تتحرك بحركة مائية
 *   سينيمائية عصرية» — البانر «سَدِيد | SADEED» في وسط أعلى الصفحة.
 * • ٢٠٢٦/١٠/١٨ (R3) بنصّه: «اجعل المستطيل الذي يتوسط الشاشة لعلامة سديد كما فالمرفق على
 *   امتداد الصفحة متناسقاً مع العناصر وكون الشريط الإعلاني المتحرك باستمرار يعلو علامة
 *   سديد الموجودة فالمرفق» — فالبانر بعرض العمود نفسه (حافّتا صفّ المؤشرات والبطاقات
 *   تحته، بلا رقمٍ يُزامَن: ابنٌ في شبكة `.nx-home-arrange`)، والشريط فوقه
 *   (`HomeTicker`).
 * • وموجّه المرحلة في اليوم نفسه — مهمّةٌ للمالك **كما نقلها منسّق البناء بصياغته، لا
 *   بنصّ المالك**: إطارٌ مستقبليّ حول البانر (تدرّج أزرق كهربائي/سماوي، إضاءة زجاج
 *   محسوبة، عمق) وتوهّجٌ محيطٌ ينجرف ببطء خلفه، دون أن يغطّي مؤشّرًا أو محتوى تشغيليًّا.
 * • ولوحة الشعار «منظومة القرار والإنجاز الذكي» **خرجت من هذا الصفّ** (R4: إلى رأس
 *   الشريط الجانبي بعبارةٍ جديدة) — ومعها رابطها وصورها وحلقتها وتركيبها في Remotion.
 * • ثم في اليوم نفسه بنصّه («SADEED AI OS — CINEMATIC MOTION GRAPHICS VIDEO ENGINE»): «Replace
 *   the static banner artwork in that exact location with the new cinematic experience» و«Prefer
 *   HTML text overlays for important text». فاللوحة **بلا نصّها المخبوز** (ممسوحٌ بملءٍ توافقيّ
 *   خارج المستودع، `remotion/brand/RENDER.md`)، والاسم والسطر **نصٌّ حقيقيّ** فوقها
 *   (`nx-brand-copy`) — حادٌّ ومقروءٌ على الجوال ويُقرأ بقارئ الشاشة، ويخفت مع القصّة ويعود بضوءٍ
 *   عابر لحظة تتكوّن اللوحة.
 * • ثم (R4) بنصّه: «اجعل فديو الموشن جرافتي يبدأ اولاً بصور وذكاء مبهر لمدة ٢٤ ثانيه بسرعة في
 *   اجزاء من الثانية وبمجرد فتح الموقع والدخول عليه وفي اخر الفديو تبنى وتتكون علامة سديد بلمعان
 *   وليزر مذهل واشعاع ثم تثبت اللوحة الاخيرة تدريجياً حتى تتكون وحين اكتمال اللوحة يكون لها بريق
 *   ولمعان وصولات وجولات من الابداعيه الخورافية»، و«واظف الى فديو الموشن قرافيتي افضل واجمل واحدث
 *   موسيقا احترافية عصرية تزيد من جمالية وضع النظام واجعل علامة سديد في النهاية تكون كالجوهرة المشعة
 *   باستمرار وذات توهج لولبي مشع وبلمعان مستمر من الاسفل الى الاعلى». فنسخ حلقةَ الأمر السابق: الفيلم
 *   (زمنه الواحد `remotion/brand/film/timeline.ts`) يبدأ حين تُرسم اللوحة، ويُعرض **مرّةً** ثم يقف
 *   عليها، وبعده «الجوهرة» في CSS (`home-brand.css` ⑦)، وموسيقاه مسارُ صوتٍ في حاويته نفسها.
 * • ثم ٢٠٢٦/١٠/٢٣ بنصّه: «أن يكون الصوت مفعّلًا تلقائيًا مع بداية الفيديو، وأن يكون الصوت متصلًا مع
 *   الفيديو بشكلٍ منسّق وجميل احترافي». فالموسيقى **دُمجت في الفيلم** بعد أن كانت ملفًّا منفصلًا
 *   يُزامَن بالقفز (قِيس على تسجيل المالك: انقطاعٌ كل 0.77 ث على iPhone)، والصوت يُطلب مع أوّل
 *   تشغيل (`bindFilmSound`).
 *
 * ## الصورة أوّلًا، والفيلم فوقها
 *
 * اللوحة `<img>` من ملفّ المالك نفسه بلا نصّه (WebP على أربع درجات حتى دقّته الأصلية 2172،
 * `srcset`) — هي ما يُرسم من أوّل إطار وما يبقى لمن لا فيلم له، وزخرفةٌ لقارئ الشاشة
 * (`alt=""`): الاسم والسطر نصٌّ حقيقيّ فوقها. وفوقها `<video>` بصوته يُركَّب **حين تكتمل الصورة**
 * («وبمجرد فتح الموقع والدخول عليه»: لا بعد `load` الصفحة كلّها وخمولها) ولمن:
 *   • لم يطلب تقليل الحركة (`prefers-reduced-motion`)، ولم يُطفئ الحركة بمفتاح النظام
 *     (`html[data-nx-motion="off"]`)، وليس في الوضع الآمن؛
 *   • ولم يطلب توفير البيانات (`navigator.connection.saveData`)؛
 *   • ولم يُوقف الحركة بزرّ «إيقاف الحركة» في طرف الشريط (WCAG 2.2.2).
 * والحلقة تُختار **بالحاجة المقيسة** (`pickFilm`: عرض اللوحة المرسوم × كثافة الشاشة)
 * لا باستعلام عرض — فلا يلين الفنّ لحظة يظهر الفيلم فوق صورةٍ أحدّ منه. يقف خارج الإطار،
 * وتحت لوحة سَدِيد على اللمس (`holdFilmUnderPanel`)، وإن تعذّر زال وبقيت الصورة والنصّ.
 *
 * ## مرّةً، ثم الجوهرة
 *
 * بلا `loop`: حين ينتهي (`ended`) يُكتب الفصل الرابع `jewel` ويقف حساب الفصول، ولا يُعاد تلقائيًّا —
 * المراقب لا يشغّل فيلمًا انتهى، واستئناف ما تحت اللوحة لما كان يعمل حين أُوقف (والمنتهي موقوف)،
 * والعائد بعد «إيقاف الحركة» يُركَّب بلا تشغيلٍ ولا تحميل. والإعادة بيد الزائر وحده. وإن تعذّر الفيلم
 * بعد أن سُمح به فالجوهرة كذلك — CSS بلا بيانات.
 *
 * ## الموسيقى — مسارٌ في حاوية الفيلم، وزرٌّ للزائر (WCAG 1.4.2)
 *
 * الصوت والصورة مساران في ملفٍّ واحد (MP4: H.264 + AAC · WebM: VP9 + Opus) يفكّهما المتصفّح معًا،
 * فلا شيء يُزامَن بالقفز. **ومدّة الحاوية 26 ث = 24 ث فيلمٌ + ثانيتان** (`FILM_TAIL`) يثبت فيهما الإطار
 * الأخير بينما يذوب ذيل الصدى — والجوهرة تبدأ عند 24 ث لا عند النهاية.
 *
 * **يبدأ بصوت** (`bindFilmSound.begin`): يُرفع الكتم ثم يُشغَّل الفيلم؛ فإن رفض المتصفّح (سياسة
 * التشغيل التلقائي، `NotAllowedError`) بدأ مكتومًا من الإطار نفسه، وأوّل لمسةٍ صالحة في الصفحة —
 * نقرةٌ لا تمريرٌ ولا مفتاح، وليست على أزرار الصفّ، وبعد مهلتها — تفتح الصوت **ويُعاد الفيلم من الثانية 0
 * ليسمعه الزائر كاملًا** (أمر المالك ٢٠٢٦/١٠/٢٤، `restartBefore`): ما دام زمنه دون 24 ث ويُسمع الصوت فعلًا
 * بعدها (ليس «مكتومًا» بتفضيله، والصفّ في الإطار، ولا لوحة سَدِيد)، ومرّةً واحدة؛ وبلا `pause()`. وزرّ الصوت
 * يفتحه دون إعادة.
 * وتفضيل الزائر يُحفظ (`nx-brand-music`) ويُسأل قبل كل رفعٍ للكتم.
 *
 * **والإسكات كتمٌ لا إيقاف:** لوحة سَدِيد، و«إيقاف الحركة»، وتبويبٌ مخفيّ، وسَدِيد ينطق أو يُصغي،
 * وخروج الصفّ من الإطار (ويقف الفيلم فيه لسببٍ آخر: فكّ الترميز)، وكتم الزائر — كلّها
 * `video.muted = true` بلا `pause()` لأجل الصوت، ويعود الصوت بزوال السبب. ولا يُفكّ كتمُ فيلمٍ جارٍ قبل أن يُؤذَن له (Chromium يوقف الفيلم نفسه حينئذٍ).
 *
 * ## لا ادّعاء، والنصّ نصّ المالك
 *
 * الاسم والسطر بنصّ المالك الحرفيّ لا غير — لا رقمٌ ولا ادّعاءٌ يُضاف فوق اللوحة. والضوء
 * العابر على الاسم لحظة الكشف من نصّ آخر أوامره («a subtle blue/cyan light sweep»،
 * ٢٠٢٦/١٠/١٨)، ناسخًا حظر اللمعة الماسحة (٢٠٢٦/٠٨/٢٠) **على هذا الاسم وحده**: مرّةً في العرض
 * خلف بوابة الحركة، لا لمعةٌ دائمة. والإطار والتوهّج **حول** اللوحة لا عليها، والبريق الذي
 * يتبع المؤشّر (`--gx`/`--gy`) متغيّرٌ يُمرَّر لا قيمةٌ نهائية (المادة ٣٣).
 */
import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { isSafeMode } from "@/lib/sadeed/self-healing/crash-loop";
import { filmAudioHeld, watchFilmAudioHold } from "@/lib/sadeed/film-audio-hold";
import { holdFilmUnderPanel } from "@/components/home/HoloVideoEngine";
import { HomeTicker } from "@/components/home/HomeTicker";
import { brandFilmSource } from "@/components/home/brand-film-assets";
import "@/styles/home/home-brand.css";

/** نسبة اللوحة كما رُسمت (PNG 2172×724 = 3:1). */
export const BRAND_RATIO = { width: 2172, height: 724 } as const;

/**
 * الفيلم السينمائي المصيَّر (`remotion/brand/SadeedFilm.tsx`) — عرض كل درجةٍ ومصدرها. لا نصّ فيه،
 * فلا درجة 2172: الحروف HTML حادّةٌ على أي كثافة، والفيلم فوق حاجته على شاشة 2× نعومةٌ سينمائية
 * لا حروفٌ لينة. وفي كل ملفٍّ مسارُ الموسيقى مع الصورة (AAC في MP4 · Opus في WebM).
 */
export const BRAND_FILMS = [
  { width: 804, src: "/media/brand/sadeed-film-804.mp4" },
  { width: 1608, src: "/media/brand/sadeed-film-1608.mp4" },
] as const;

/**
 * لحظتا النصّ في الفيلم (ث) — من زمنه الواحد `remotion/brand/film/timeline.ts`: يخفت الاسم مع اشتعال
 * الرمز في أوّل الفيلم (قبل `ACT.igniteEnd`)، ويعود حين تتكوّن اللوحة حول الرمز (`TEXT_REVEAL`، بين
 * `ACT.forgeEnd` و`ACT.settleEnd`). تغيّرُ الزمن هناك يغيّر هذين الرقمين في الدفعة نفسها.
 */
export const FILM_TEXT = { hideAt: 0.15, revealAt: 21.6, seconds: 24 } as const;

/**
 * ثبات الإطار الأخير بعد زمن الفيلم (ث): الحاوية `FILM_TEXT.seconds + FILM_TAIL` = 26 ث، يقف فيها
 * الإطار واللوحة مكتملة بينما يذوب ذيل صدى الموسيقى. تغيُّره يغيّر مدّة الملفّات في الدفعة نفسها.
 */
export const FILM_TAIL = 2;

export type FilmAct = "hold" | "story" | "reveal" | "jewel";

/**
 * فصل الفيلم عند زمنٍ ما: سكونٌ باللوحة · قصّةٌ بلا نصّ · كشفٌ يعود فيه النصّ · جوهرةٌ من
 * `FILM_TEXT.seconds` (فيجري ثباتُ الذيل وهي ظاهرة). وتُكتب `jewel` أيضًا حين ينتهي الفيلم (`ended`)
 * احتياطًا: مصدرٌ ثانٍ لا يتأخّر عن الأوّل.
 */
export function filmActAt(seconds: number): FilmAct {
  if (seconds < FILM_TEXT.hideAt) return "hold";
  if (seconds < FILM_TEXT.revealAt) return "story";
  return seconds < FILM_TEXT.seconds ? "reveal" : "jewel";
}

export type BrandFilm = (typeof BRAND_FILMS)[number];

/** أقصى تكبيرٍ مقبول لحلقةٍ فوق حاجتها قبل الانتقال إلى الأكبر. */
export const FILM_UPSCALE_LIMIT = 1.15;

/**
 * الحلقة بالحاجة: عرض اللوحة المرسوم × كثافة الشاشة (سقفها 2 — ما فوقها لا تفصله العين
 * على هذا الحجم، والجوال بكثافة 3 يبقى على حلقته الخفيفة). أصغر حلقةٍ لا تُكبَّر فوق
 * `FILM_UPSCALE_LIMIT`، وإلا الكبرى (دقّة اللوحة الأصلية).
 */
export function pickFilm(cssWidth: number, dpr: number): BrandFilm {
  const need = Math.max(0, cssWidth) * Math.min(Math.max(dpr || 1, 1), 2);
  return (
    BRAND_FILMS.find((film) => film.width * FILM_UPSCALE_LIMIT >= need) ??
    BRAND_FILMS[BRAND_FILMS.length - 1]
  );
}

type Plate = {
  readonly posters: Readonly<Record<number, string>>;
  readonly sizes: string;
  readonly title: { readonly ar: string; readonly en: string };
  readonly tagline: { readonly ar: string; readonly en: string };
};

/**
 * لوحة الهوية: صورٌ من ملفّ المالك بلا نصّها (حتى دقّته الأصلية)، والاسم والسطر نصٌّ حقيقي.
 * السطر العربي **بنصّ آخر أوامر المالك** (٢٠٢٦/١٠/١٨، «Preserve the exact … tagline»): «… رؤية
 * تنفيذية **على** الأمن الصناعي …» كما في اللوحة — وكان أمرٌ قبله في اليوم نفسه يكتبها «عن».
 */
export const HOME_BRAND: { readonly banner: Plate } = {
  banner: {
    posters: {
      800: "/home/brand/sadeed-banner-clean-800.webp",
      1200: "/home/brand/sadeed-banner-clean-1200.webp",
      1600: "/home/brand/sadeed-banner-clean-1600.webp",
      2172: "/home/brand/sadeed-banner-clean-2172.webp",
    },
    // عرض اللوحة المرسوم = عمود المحتوى ناقص الإطار (حلقة 6px من 768 وفوق، و4px دونه،
    // وحدٌّ شعري على كل جانب). والعمود: `max-w-[1440px]` بحاشيتي `px-4` في
    // `-blueprint-page.tsx` (‏1408 من 1664px فوق)، وبعد الشريط الجانبي من 1024 — عرضه
    // الرمز `--nx-sysnav-w: 14rem` في `home-chrome.css` (‏`100vw − 256`) — و`100vw − 32`
    // دونه. تغيّرُ أيٍّ منها يغيّر هذا السطر في الدفعة نفسها.
    // ودون 600px تصير اللوحة 2:1 بقصّ جانبيها (`home-brand.css`) فتُرسم أعرض من حاويتها 1.5×.
    sizes:
      "(min-width: 1664px) 1394px, (min-width: 1024px) calc(100vw - 270px), (min-width: 768px) calc(100vw - 46px), (min-width: 600px) calc(100vw - 42px), calc((100vw - 42px) * 1.5)",
    title: { ar: "سديد", en: "SADEED" },
    tagline: {
      ar: "مساعد ذكاء اصطناعي يعطي رؤية تنفيذية على الأمن الصناعي في جميع المناطق السعودية.",
      en: "An AI assistant giving executive insight into industrial security across all Saudi regions.",
    },
  },
};

/**
 * زرّ الموسيقى (WCAG 1.4.2) بلغتيه: التبديل باسمٍ ثابت وحاله في `aria-pressed`، والتلميح يسمّي
 * الفعل؛ وبعد الفيلم «إعادة العرض مع الموسيقى» فعلٌ لا تبديل.
 */
export const SOUND_LABELS = {
  ar: { play: "تشغيل الموسيقى", mute: "كتم الموسيقى", replay: "إعادة العرض مع الموسيقى" },
  en: { play: "Play music", mute: "Mute music", replay: "Replay with music" },
} as const;

/** تفضيل الموسيقى لهذا المتصفّح — `off` حين يكتمها الزائر، وغيابه تشغيلٌ ينتظر إذن المتصفّح. */
export const MUSIC_KEY = "nx-brand-music";

function musicWanted(): boolean {
  try {
    return localStorage.getItem(MUSIC_KEY) !== "off";
  } catch {
    return true; /* التخزين محجوب — والمتصفّح لا يُسمع شيئًا قبل لمسة */
  }
}

function saveMusicWanted(on: boolean): void {
  try {
    if (on) localStorage.removeItem(MUSIC_KEY);
    else localStorage.setItem(MUSIC_KEY, "off");
  } catch {
    /* التخزين محجوب — يسري الاختيار في هذه الزيارة وحدها */
  }
}

/**
 * لمسات الإذن: ضغطة الفأرة والقلم، والنقر (اللمس ينقر ولا يمرّر) — لا التمرير ولا المفاتيح. ضغطة
 * Tab أو سهمٍ ليست قبولًا بالصوت (أمسكته المراجعة)؛ وEnter وSpace على زرٍّ أو رابط تُطلق `click`
 * موثوقًا يحمل الإذن نفسه، فلوحة المفاتيح لا تُحرم.
 */
const GESTURES = ["pointerdown", "click"] as const;

/**
 * مهلة لمسة الإذن (مللي ثانية): نقرةٌ تفتح لوحة سَدِيد أو تنقل إلى صفحةٍ أخرى كانت تُسمِع دفقةً ثم
 * تسكت (أمسكته المراجعة) — فيُمهَل رفع الكتم حتى يستقرّ أثر النقرة. والإذن باقٍ بعدها: Chromium يحفظ
 * التفعيل العابر 5 ث، وWebKit يمرّر لمسة المستخدم إلى المؤقّتات حتى ثانية.
 */
export const GESTURE_GRACE_MS = 250;

export type FilmSound = {
  /** يبدأ الفيلم بصوت إن أمكن، وإلا مكتومًا بانتظار لمسة الإذن. مرّةً عند التركيب. */
  readonly begin: () => void;
  /** يعيد حساب الكتم بعد تبدّل التفضيل أو أحد أسباب الإسكات. */
  readonly sync: () => void;
  /** رفعُ الكتم الآن من داخل لمسة الزائر (زرّ الصوت أو الإعادة). */
  readonly kick: () => void;
  readonly release: () => void;
};

const isBlocked = (err: unknown) => err instanceof DOMException && err.name === "NotAllowedError";

/** هل الصوت مسموعٌ فعلًا؟ — مرفوع الكتم والفيلم يجري. تُحدَّث به حالة الزرّ من أحداث الفيلم نفسه. */
const isSounding = (video: HTMLVideoElement) => !video.muted && !video.paused && !video.ended;

/**
 * صوت الفيلم من مسارٍ في حاويته نفسها: لا ملفٌّ يُزامَن، فلا قفزٌ ولا انقطاع — والتحكّم كلّه في
 * `video.muted`. **يُسمع الصوت ⇔** تفضيل الزائر `wanted()` **و** الصفّ في الإطار **و**
 * لا ما يُسكت من خارج الفيلم (`filmAudioHeld`: لوحة سَدِيد، «إيقاف الحركة»، تبويبٌ مخفيّ، سَدِيد
 * ينطق أو يُصغي) **و** أُذن للصفحة (`unlocked`)؛ وإلا مكتوم. **والإسكات كتمٌ لا إيقاف**: لا `pause()`
 * لأجل الصوت أبدًا، فالفيلم يمضي بصورته ويعود صوته بزوال السبب.
 *
 * **البدء** (`begin`): بعد سؤال التفضيل يُرفع الكتم ويُشغَّل الفيلم؛ نجح ⇒ أُذن للصفحة. رُفض
 * (`NotAllowedError` — سياسة التشغيل التلقائي) ⇒ يبدأ مكتومًا ويُسلَّح مستمع لمسة الإذن: أوّل نقرةٍ في
 * الصفحة — لا التمرير ولا المفاتيح، وليست على أزرار الصفّ نفسه فلها قرارها — تفتح الصوت بعد
 * `GESTURE_GRACE_MS` دون أن يتوقف الفيلم، **ويقفز زمنه إلى 0 إن توفّرت شروط `restartBefore`** (انظر خيارها).
 * فإن رُفض التشغيل المكتوم أيضًا استُدعي `onBlocked`.
 *
 * **ولا يُفكّ كتمُ فيلمٍ جارٍ قبل الإذن**: Chromium يوقف الفيلم الذي رُفع كتمه بلا تفعيل — فالقاعدة
 * مكتوبة في الشرط نفسه (`unlocked`) لا في ترتيب الاستدعاء.
 */
export function bindFilmSound(
  video: HTMLVideoElement,
  opts: {
    readonly wanted: () => boolean;
    readonly offscreen: () => boolean;
    readonly onBlocked?: () => void;
    /**
     * فيلمٌ بدأ مكتومًا (منع المتصفّح الصوت التلقائي) يُعاد من أوّله عند أوّل نقرةٍ صالحة ما دام زمنه دون
     * هذه الثانية — بأمر المالك ٢٠٢٦/١٠/٢٤ «يُعاد من أوله عند أول نقرة» ليسمعه الزائر كاملًا بصوته.
     * زرّ الصوت لا يعيد (قرارُ زائرٍ يريد الصوت فحسب)، ولا ما بعد هذه الثانية (الجوهرة تُعاد بزرّها).
     */
    readonly restartBefore?: number;
  },
): FilmSound {
  let unlocked = false;
  let armed = false;
  // محاولة الصوت الأولى جارية: ما يصل في أثنائها من أحداث لا يكتم الفيلم قبل أن يُعرف الجواب.
  let probing = false;
  // رفضٌ يصل بعد الفكّ لا يعلّق مستمعين على صفحةٍ بلا فيلم.
  let released = false;
  let grace = 0;
  // بدأ الفيلم صامتًا بانتظار الإذن: أوّل نقرةٍ صالحة تعيده من أوّله بصوته (`restartBefore`).
  let silentStart = false;
  const audible = () => unlocked && opts.wanted() && !opts.offscreen() && !filmAudioHeld();
  const sync = () => {
    if (released) return;
    if (probing) {
      // A pending play promise must never defer a new mute or external hold.
      if (!opts.wanted() || opts.offscreen() || filmAudioHeld()) video.muted = true;
      return;
    }
    const mute = !audible();
    if (video.muted !== mute) video.muted = mute;
  };
  const unlock = () => {
    unlocked = true;
    disarm();
    sync();
  };
  const onGesture = (e: Event) => {
    if (e.target instanceof Element && e.target.closest(".nx-home-brand button")) return;
    // اللمس يبدأ تمريرًا أو نقرة: يُنتظر نقره (`click`) — و`click` نفسه يحمل `pointerType` في
    // Chromium، فالتصفية على الضغطة وحدها.
    if (e.type === "pointerdown" && (e as Event & { pointerType?: string }).pointerType === "touch")
      return;
    if (grace) return;
    // تُمهَل اللمسة حتى يستقرّ أثرها: لوحة سَدِيد فُتحت (`filmAudioHeld`) أو انتقلت الصفحة (`released`)
    // ⇒ لا دفقة.
    grace = window.setTimeout(() => {
      grace = 0;
      if (released) return;
      const t = video.currentTime;
      // يُعاد فقط إن كان الصوت سيُسمع فعلًا بعد النقرة: لا مع تفضيل «مكتوم»، ولا والصفّ خارج
      // الإطار، ولا ولوحة سَدِيد مفتوحة (نقرةٌ فتحتها).
      const willSound = opts.wanted() && !opts.offscreen() && !filmAudioHeld();
      if (
        silentStart &&
        willSound &&
        opts.restartBefore !== undefined &&
        !video.ended &&
        t > 0 &&
        t < opts.restartBefore
      )
        video.currentTime = 0;
      silentStart = false;
      unlock();
    }, GESTURE_GRACE_MS);
  };
  function arm() {
    if (armed || released || unlocked) return;
    armed = true;
    silentStart = true;
    for (const type of GESTURES) document.addEventListener(type, onGesture, true);
  }
  function disarm() {
    if (!armed) return;
    armed = false;
    for (const type of GESTURES) document.removeEventListener(type, onGesture, true);
  }
  const startMuted = () => {
    probing = false;
    video.muted = true;
    arm();
    const played = video.play() as Promise<void> | undefined;
    played?.catch((err: unknown) => {
      if (!released && isBlocked(err)) opts.onBlocked?.();
    });
  };
  const begin = () => {
    if (released) return;
    // سؤال التفضيل قبل كل رفعٍ للكتم؛ وما يُسكت الآن (لوحة، تبويب مخفيّ، سَدِيد ينطق، خارج الإطار)
    // لا يُجرَّب فيه صوتٌ — يبدأ مكتومًا ويفتحه الإذن حين يزول.
    if (!opts.wanted() || opts.offscreen() || filmAudioHeld()) {
      startMuted();
      return;
    }
    probing = true;
    video.muted = false;
    const played = video.play() as Promise<void> | undefined;
    if (!played) {
      probing = false;
      sync();
      return;
    }
    played.then(
      () => {
        probing = false;
        if (released) return;
        // A probe muted while pending does not prove permission for audible playback.
        unlocked = unlocked || !video.muted;
        if (!unlocked) arm();
        sync();
      },
      (err: unknown) => {
        if (released) return;
        // لمسةٌ سبقت الجواب (زرّ الصوت) أذنت للصفحة: لا كتم.
        if (unlocked) {
          probing = false;
          sync();
          return;
        }
        if (isBlocked(err)) {
          startMuted();
          return;
        }
        // مقاطعةٌ (إيقافٌ تحت لوحة سَدِيد مثلًا) ليست رفضًا: يبقى مكتومًا بانتظار الإذن.
        probing = false;
        arm();
        sync();
      },
    );
  };
  const follow = ["play", "playing", "pause", "seeked", "ended"] as const;
  for (const type of follow) video.addEventListener(type, sync);
  const stopHold = watchFilmAudioHold(sync);
  return {
    begin,
    sync,
    kick: () => {
      if (released) return;
      if (grace) {
        window.clearTimeout(grace);
        grace = 0;
      }
      probing = false;
      unlock();
    },
    release: () => {
      released = true;
      for (const type of follow) video.removeEventListener(type, sync);
      stopHold();
      disarm();
      if (grace) window.clearTimeout(grace);
      video.muted = true;
    },
  };
}

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

/**
 * هل رُسمت اللوحة؟ — الصورة مكتملة عند التركيب (`complete`، ومنها ما اكتمل قبل الترطيب)، أو بحدثها
 * `load`/`error`. الفيلم يُطلب بعدها مباشرةً: لا قبلها فينافس الصورة الكبرى (LCP — Lighthouse
 * ٢٠٢٦/١٠/١٨: طُلب قبل رسم البانر)، ولا بعد `load` الصفحة كلّها وخمولها فيتأخّر ثوانيَ عن الدخول.
 * وتعذّر الصورة لا يحجب الفيلم — هو فوقها.
 */
function usePosterReady(ref: RefObject<HTMLImageElement | null>): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    if (img.complete) {
      setReady(true);
      return;
    }
    const done = () => setReady(true);
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    return () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
    };
  }, [ref]);
  return ready;
}

/**
 * مفتاح «إيقاف الحركة» — تفضيلٌ لهذا المتصفّح وحده، والتخزين المحجوب لا يكسر شيئًا. الاسم
 * نفسه منذ كان يوقف الماء وحده: من أوقفه قبلُ يبقى موقوفًا (الشريط والتوهّج معه الآن).
 */
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

/**
 * إيقاف الحركة كلّها بيد المستخدم (WCAG 2.2.2 «Pause, Stop, Hide»): شريطٌ يجري بلا نهاية،
 * وفيلم اللوحة وموسيقاه، والجوهرة بعده، وتوهّجٌ ينجرف خلف إطارها، وفيلم الخلفية عبر الواجهة
 * أعلاه — ومفتاح النظام `data-nx-motion` بلا كاتبٍ في الواجهة اليوم. يُقرأ بعد التركيب فلا يختلف
 * HTML الخادم، و`known` يقول متى قُرئ: قبله لا حركة تبدأ، فمن أوقفها لا يرى منها إطارًا.
 */
function usePausedPreference(): [boolean, (next: boolean) => void, boolean] {
  const [paused, setPaused] = useState(false);
  const [known, setKnown] = useState(false);
  useEffect(() => {
    try {
      setPaused(localStorage.getItem(PAUSE_KEY) === "paused");
    } catch {
      /* التخزين محجوب — تبقى الحركة */
    }
    setKnown(true);
  }, []);
  // الحال إلى الواجهة المجمَّدة: عند استعادة المحفوظ ثم عند كل تبدّل.
  useEffect(() => {
    if (known) announcePause(paused);
  }, [known, paused]);
  const update = (next: boolean) => {
    setPaused(next);
    try {
      if (next) localStorage.setItem(PAUSE_KEY, "paused");
      else localStorage.removeItem(PAUSE_KEY);
    } catch {
      /* التخزين محجوب — يسري الاختيار في هذه الزيارة وحدها */
    }
  };
  return [paused, update, known];
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

function BrandFilm({
  artRef,
  play,
  ar,
}: {
  artRef: RefObject<HTMLDivElement | null>;
  play: boolean;
  ar: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [ended, setEnded] = useState(false);
  const [ready, setReady] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  // الصوت مسموعٌ الآن: يُشتقّ من الفيلم نفسه لا من حالٍ موازية.
  const [audible, setAudible] = useState(false);
  // طلب الزائر الإعادة: زرّها يبقى هو نفسه حتى أوّل إطار، فلا يسقط التركيز إلى `body`.
  const [replayed, setReplayed] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const sound = useRef<FilmSound | null>(null);
  const wanted = useRef(true);
  const offscreen = useRef(false);
  // الجوهرة: انتهى الفيلم، أو تعذّر بعد أن سُمح به. وتبقى بعد زواله بالإيقاف — فلا يُعاد وحده.
  const jewel = ended || failed;
  const jewelRef = useRef(jewel);
  const live = play && !failed && src !== null;

  useEffect(() => {
    jewelRef.current = jewel;
  }, [jewel]);

  useEffect(() => {
    wanted.current = musicWanted();
  }, []);

  // الحلقة بحاجة اللوحة المرسومة عند التركيب: عرضها × كثافة الشاشة (`pickFilm`).
  useEffect(() => {
    const width = artRef.current?.getBoundingClientRect().width ?? window.innerWidth;
    setSrc(pickFilm(width, window.devicePixelRatio).src);
  }, [artRef]);

  // الفيلم يظهر حين يُعرض إطاره فعلًا — لا يُعوَّل على شفافية ما قبل الإطار
  // الأوّل في كل محرّك (قِيست في Chromium وحده). ويسقط الإطار بزوال الفيلم لأيّ سببٍ —
  // إيقافٌ أو تعذّر — فيزول معه فصله: فيلمٌ تعذّر في منتصف القصّة كان يُبقي النصّ خافتًا
  // فوق لوحةٍ بلا نصّها، فيغيب الاسم كلّه (أمسكه عقد الصفّ ٢٠٢٦/١٠/١٨).
  useEffect(() => {
    if (!play || failed) {
      setReady(false);
      setReplayed(false);
    }
  }, [play, failed]);

  // النصّ يتبع الفيلم: فصلٌ على حاوية اللوحة من زمن الإطار المعروض (لكل إطارٍ حيث يُدعم،
  // وإلا `timeupdate` بأربع مرّات في الثانية — والانتقال في CSS أطول منها). كتابةٌ في DOM لا
  // حالةٌ في React: لا إعادة رسمٍ ثلاثين مرّة في الثانية. ويقف بالجوهرة، ويزول بزوال الفيلم.
  useEffect(() => {
    const video = ref.current as
      | (HTMLVideoElement & {
          requestVideoFrameCallback?: (cb: () => void) => number;
          cancelVideoFrameCallback?: (handle: number) => void;
        })
      | null;
    const art = artRef.current;
    if (!ready || jewel || !video || !art) return;
    const apply = () => {
      const act = filmActAt(video.currentTime);
      if (art.dataset.filmAct !== act) art.dataset.filmAct = act;
    };
    let handle = 0;
    let alive = true;
    if (video.requestVideoFrameCallback) {
      const tick = () => {
        if (!alive) return;
        apply();
        handle = video.requestVideoFrameCallback!(tick);
      };
      handle = video.requestVideoFrameCallback(tick);
    } else {
      video.addEventListener("timeupdate", apply);
    }
    apply();
    return () => {
      alive = false;
      if (handle) video.cancelVideoFrameCallback?.(handle);
      video.removeEventListener("timeupdate", apply);
      if (art.dataset.filmAct !== "jewel") delete art.dataset.filmAct;
    };
  }, [ready, jewel, artRef]);

  // الفصل الرابع «الجوهرة»: من نهاية الفيلم لا من زمنه، ويبقى ما بقيت.
  useEffect(() => {
    const art = artRef.current;
    if (!jewel || !art) return;
    art.dataset.filmAct = "jewel";
    return () => {
      if (art.dataset.filmAct === "jewel") delete art.dataset.filmAct;
    };
  }, [jewel, artRef]);

  useEffect(() => {
    const video = ref.current;
    if (!live || !video) return;
    const release = holdFilmUnderPanel(video);
    // خارج الإطار لا فكّ ترميز: يقف على إطاره ويستأنف حين يعود — ما لم ينتهِ.
    let watcher: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      watcher = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          offscreen.current = !entry.isIntersecting;
          sound.current?.sync();
          if (!entry.isIntersecting) {
            video.pause();
            return;
          }
          // مرّةً لا حلقة: العودة إلى الإطار لا تشغّل فيلمًا انتهى أو ينتظر الإعادة.
          if (jewelRef.current || video.ended) return;
          const resumed = video.play() as Promise<void> | undefined;
          // منعُ التشغيل (وضع توفير الطاقة في iOS) يُسقط الفيلم إلى الجوهرة فوق الصورة —
          // لا إطارًا متجمّدًا بزرّ تشغيل فوق اللوحة. والمقاطعة بالإيقاف عابرة.
          resumed?.catch((err: unknown) => {
            if (err instanceof DOMException && err.name === "NotAllowedError") setFailed(true);
          });
        },
        { threshold: 0.05 },
      );
      watcher.observe(video);
    }
    return () => {
      release();
      watcher?.disconnect();
    };
  }, [live]);

  // الصوت مربوطٌ بالفيلم ما دام مركَّبًا، ويُكتم بزواله. والبدء كلّه من هنا (لا `autoPlay`): بصوتٍ إن
  // أذن المتصفّح، وإلا مكتومًا بانتظار لمسة. والعائد بعد النهاية لا يبدأ وحده — الإعادة بيد الزائر.
  useEffect(() => {
    const video = ref.current;
    if (!live || !video) return;
    const bound = bindFilmSound(video, {
      wanted: () => wanted.current,
      offscreen: () => offscreen.current,
      // منعُ التشغيل حتى مكتومًا (توفير الطاقة في iOS): الجوهرة فوق الصورة لا إطارٌ متجمّد.
      onBlocked: () => setFailed(true),
      restartBefore: FILM_TEXT.seconds,
    });
    sound.current = bound;
    if (!jewelRef.current) bound.begin();
    return () => {
      bound.release();
      sound.current = null;
      setAudible(false);
    };
  }, [live]);

  if (!play || failed || !src) return null;

  const labels = ar ? SOUND_LABELS.ar : SOUND_LABELS.en;

  // التبديل يقرّر بما يراه الزائر: صامتٌ الآن (كتمه أو منعه المتصفّح) ⇐ رفعُ الكتم من داخل نقرته.
  const toggle = () => {
    const on = !audible;
    wanted.current = on;
    saveMusicWanted(on);
    if (on) sound.current?.kick();
    else sound.current?.sync();
  };

  // الإعادة بيد الزائر: الفيلم من أوّله بصوته، من داخل نقرته (فيأذن المتصفّح بالصوت).
  const replay = () => {
    const video = ref.current;
    if (!video) return;
    wanted.current = true;
    saveMusicWanted(true);
    setReplayed(true);
    setEnded(false);
    video.currentTime = 0;
    const replayed = video.play() as Promise<void> | undefined;
    replayed?.catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "NotAllowedError") setFailed(true);
    });
    sound.current?.kick();
  };

  // مصدران للحلقة نفسها: H.264 أوّلًا (فكّ عتادي في كل متصفّح تجاري)، ثم
  // VP9/WebM لبناءات Chromium بلا ترميزات احتكارية. **خطأ `<source>` واحد
  // يصعد في شجرة React إلى `onError` العنصر** (قِيس: كان يُسقط الفيلم قبل أن
  // يُجرَّب المصدر الثاني)، فلا يُعدّ فشلًا إلا ما استهدف العنصر نفسه أو جاء
  // بعد استنفاد المصادر (`NETWORK_NO_SOURCE`) — وعندها تبقى الصورة وحدها.
  // **وبلا `poster`:** الصورة تحته هي الملصق؛ سمة `poster` نزّلت نسخة 1600 فوق
  // اختيار `srcset`. وحذفُها لا يُخرج الفيلم من LCP: في Lighthouse الجوال كان
  // الفيلم عنصر LCP في جولتين من ثلاث (٢٠٢٦/١٠/١٨ — مسجَّلٌ لا مُعالَج). والفيلم
  // قبل إطاره الأوّل شفّاف فلا وميض (قِيس في Chromium). **وبلا `loop`:** مرّةً ثم الجوهرة،
  // والعائد بعد النهاية بلا تشغيلٍ ولا تحميل حتى يطلب الزائر الإعادة.
  // **وبلا `autoPlay` ولا `muted` كسمتين:** البدء كلّه من `bindFilmSound.begin` بعد سؤال التفضيل —
  // يحاول بصوت، ويعود مكتومًا إن رفض المتصفّح (السمة `muted` كانت تجعل البدء صامتًا دائمًا).
  return (
    <>
      <video
        ref={ref}
        className="nx-brand-film"
        playsInline
        preload={jewel ? "none" : "auto"}
        aria-hidden
        tabIndex={-1}
        disablePictureInPicture
        data-ready={ready || undefined}
        onPlaying={(e) => {
          setReady(true);
          setAudible(isSounding(e.currentTarget));
        }}
        onPause={(e) => setAudible(isSounding(e.currentTarget))}
        onVolumeChange={(e) => setAudible(isSounding(e.currentTarget))}
        onEnded={(e) => {
          setEnded(true);
          setAudible(isSounding(e.currentTarget));
        }}
        onError={(e) => {
          const video = e.currentTarget;
          if (e.target === video || video.networkState === video.NETWORK_NO_SOURCE) setFailed(true);
        }}
      >
        <source src={brandFilmSource(src)} type="video/mp4" />
        <source src={brandFilmSource(src.replace(/\.mp4$/, ".webm"))} type="video/webm" />
      </video>
      {/* زرّ الصوت في زاوية اللوحة السفلى اليمنى — بعيدًا عن الاسم والسطر والرمز على كل عرض
          (`home-brand.css` ⑥). يظهر مع أوّل إطار. **والإعادة تُبقيه
          نفسه:** العائد بعد إيقاف الحركة بلا إطارٍ (`preload="none"`)، فكان زرّ الإعادة المركَّز
          يزول بالنقر ويسقط التركيز إلى `body` حتى يُجلب الفيلم (WCAG 2.4.3، أمسكته المراجعة). */}
      {(ready || jewel || replayed) && (
        <button
          type="button"
          className="nx-brand-sound nx-focus-ring"
          aria-pressed={jewel ? undefined : audible}
          aria-label={jewel ? labels.replay : labels.play}
          title={jewel ? labels.replay : labels.play}
          onClick={jewel ? replay : toggle}
        >
          {jewel ? (
            <RotateCcw aria-hidden size={18} />
          ) : audible ? (
            <Volume2 aria-hidden size={18} />
          ) : (
            <VolumeX aria-hidden size={18} />
          )}
        </button>
      )}
    </>
  );
}

function BrandPlate({ ar, allowed, paused }: { ar: boolean; allowed: boolean; paused: boolean }) {
  const plate = HOME_BRAND.banner;
  const ref = useRef<HTMLElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const posterReady = usePosterReady(posterRef);
  // الفيلم حين تُرسم اللوحة («وبمجرد فتح الموقع والدخول عليه») — خلف البوابات وزرّ الإيقاف.
  const play = allowed && !paused && posterReady;
  const widths = Object.keys(plate.posters)
    .map(Number)
    .sort((a, b) => a - b);
  const largest = plate.posters[widths[widths.length - 1]];
  const srcSet = widths.map((w) => `${plate.posters[w]} ${w}w`).join(", ");

  // البريق يتبع مؤشّر الفأرة وحده: متغيّران على الحاوية، والرسم في CSS (وهو خلف
  // بوابة الحركة هناك) — اللمس والقلم لا يحملان بريقًا فلا يُحسب لهما شيء.
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    // المسرح: التوهّج المحيط خلف الإطار (طبقةٌ سفلى في سياق تكديسٍ معزول) — ظلٌّ
    // يذوب حول اللوحة لا عليها، ولا يبلغ الشريط وصفّ المؤشرات إلا أثرًا (نحو 3%)،
    // والمؤشرات بعده في DOM مرسومةٌ فوقه.
    <div className="nx-brand-stage">
      <span aria-hidden className="nx-brand-halo" />
      <figure ref={ref} dir="ltr" data-kind="banner" className="nx-brand" onPointerMove={onMove}>
        <div ref={artRef} className="nx-brand-art">
          <img
            ref={posterRef}
            src={largest}
            srcSet={srcSet}
            sizes={plate.sizes}
            width={BRAND_RATIO.width}
            height={BRAND_RATIO.height}
            alt=""
            decoding="async"
            fetchPriority="high"
            className="nx-brand-poster"
          />
          <BrandFilm artRef={artRef} play={play} ar={ar} />
          {/* الجوهرة على الرمز بعد الفيلم: هالةٌ تتنفّس، وذراعا توهّجٍ لولبيّ يدوران متعاكسين،
              ولمعانٌ يصعد من الأسفل إلى الأعلى مقصوصًا على شكل الرمز، وثلاث نجماتٍ تومض تباعًا.
              زخرفةٌ في CSS وحده تظهر في فصلها (`home-brand.css` ⑦). */}
          <span aria-hidden className="nx-brand-jewel">
            <span className="nx-jewel-halo" />
            <span className="nx-jewel-spiral" />
            <span className="nx-jewel-spiral" data-rev="" />
            <span className="nx-jewel-shine">
              <span />
            </span>
            <span className="nx-jewel-glint" data-g="1" />
            <span className="nx-jewel-glint" data-g="2" />
            <span className="nx-jewel-glint" data-g="3" />
          </span>
          <span aria-hidden className="nx-brand-glare" />
          {/* الاسم والسطر نصٌّ حقيقي فوق اللوحة والفيلم — بترتيب اللوحة «SADEED | سديد» في
              اللغتين، والسطر بلغة الواجهة. */}
          <div className="nx-brand-copy">
            <p className="nx-brand-title" dir="ltr">
              <span lang="en">{plate.title.en}</span>
              <span aria-hidden className="nx-brand-divider" />
              <span lang="ar" dir="rtl">
                {plate.title.ar}
              </span>
            </p>
            <p className="nx-brand-tagline" dir={ar ? "rtl" : "ltr"} lang={ar ? "ar" : "en"}>
              {ar ? plate.tagline.ar : plate.tagline.en}
            </p>
          </div>
        </div>
      </figure>
    </div>
  );
}

export function HomeBrandRow() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const allowed = useFilmAllowed();
  const [paused, setPaused, known] = usePausedPreference();
  const ref = useRef<HTMLElement>(null);
  const offscreen = useOffscreen(ref);
  return (
    // الترتيب `ltr` كصفوف الرئيسية (D5)، والشريط يعلن لغته بنفسه. الشريط أوّلًا في
    // DOM كما على الشاشة — ثم اللوحة بعرض العمود.
    <section
      ref={ref}
      aria-label={ar ? "هوية سَدِيد" : "SADEED brand"}
      dir="ltr"
      className="nx-home-brand"
      data-run={known || undefined}
      data-paused={paused || undefined}
      data-offscreen={offscreen || undefined}
    >
      <HomeTicker paused={paused} offscreen={offscreen} ready={known} onPausedChange={setPaused} />
      <BrandPlate ar={ar} allowed={allowed} paused={paused} />
    </section>
  );
}
