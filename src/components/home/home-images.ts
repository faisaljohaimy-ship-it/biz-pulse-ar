/**
 * بيان صور الصفحة الرئيسية — المصدر الوحيد لأي `<img>` فيها (قرار N3،
 * ٢٠٢٦/١٠/١٤: «صور توضيحية موسومة (موصى به)»).
 *
 * - **صور توضيحية لا بثّ.** كل صورة هنا توضيحٌ بأسلوب المخطّط، لا لقطة من
 *   كاميرا ولا من بلاغ حقيقي؛ فنصّها البديل يحمل «صورة توضيحية»، وصور الكاميرات
 *   والمخاطر والحوادث تحمل الوسم كاملًا «صورة توضيحية — لا بثّ مرتبط». وبطاقة
 *   الكاميرات تُبقي الوسم ظاهرًا (`ILLUSTRATIVE_LABEL`).
 * - **الأبعاد صريحة** (لا إزاحة تخطيط): الملفات قصّات بمقياس 2× من مخطّط المالك
 *   (`docs/design/reference/home-command-center-mockup-2026-10-13.jpg`)، فالعرض
 *   والارتفاع هنا = أبعاد الملف ÷ 2 — أي مقاسها المرسوم في المخطّط 1536×1024.
 * - **صور مؤقّتة.** إلى أن تُتاح نسخ 2K المولَّدة تبقى هذه القصّات؛ وتُستبدل
 *   ملفًّا بملف بالاسم نفسه دون مساس بهذا البيان سوى الأبعاد إن تغيّرت النسبة.
 * - **الوزن:** مجموع `public/home/*` لا يتجاوز `HOME_IMAGES_MAX_BYTES`.
 * - `loading`: الشخصية في صفّ البطل فتُحمَّل فورًا؛ والباقي تحت الطيّ فكسولة.
 */
import { SADEED_PORTRAIT_SIZE, SADEED_PORTRAIT_SRC } from "@/lib/sadeed/portrait";

/** الوسم الظاهر على بطاقات الكاميرات، والمضمَّن في النصّ البديل لكل صورة لقطة. */
export const ILLUSTRATIVE_LABEL = "صورة توضيحية — لا بثّ مرتبط";

/** سقف الوزن الكلّي لصور الرئيسية (N3: ≤ 400 KB). */
export const HOME_IMAGES_MAX_BYTES = 400 * 1024;

export interface HomeImage {
  /**
   * مسارٌ تحت `public/home/` — لا مصدر صور آخر في الرئيسية، **إلا الشخصية**: صورة
   * سَدِيد نفسها التي يرسمها الشات بوت (أمر المالك ٢٠٢٦/١٠/١٨) — انظر مدخلها.
   */
  src: `/home/${string}.webp` | typeof SADEED_PORTRAIT_SRC;
  /** العرض المرسوم بالبكسل (أبعاد الملف ÷ 2). */
  width: number;
  /** الارتفاع المرسوم بالبكسل (أبعاد الملف ÷ 2). */
  height: number;
  /** نصٌّ بديل عربي يحمل «صورة توضيحية». */
  alt: string;
  /** فوق الطيّ ⇐ `eager`؛ تحته ⇐ `lazy`. */
  loading: "eager" | "lazy";
}

const shot = (subject: string) => `${subject} (${ILLUSTRATIVE_LABEL})`;

export const HOME_IMAGES = {
  // ── الشخصية: صورة الشات بوت نفسها ────────────────────────────────────
  // أمر المالك ٢٠٢٦/١٠/١٨: «قم بتعديل الصوره لسديد بنفس الصورة الموجودة فالشات بوت».
  // فالمصدر ثابتٌ واحد (`SADEED_PORTRAIT_SRC`) هو الملف الذي يرسمه الشات بوت بعينه —
  // لا قصّة مشتقّة ولا إعادة ترميز — فيشارك الطلبَ والذاكرة مع اللوحة والعلامة المائية.
  // ولذلك يخالف هذا المدخل وحده قاعدتين أعلاه، عن قصد:
  //   • البعدان **أبعاد الملف الحقيقية** لا «المرسومة ÷ 2»: البطاقة نافذةٌ (147×200،
  //     و118×161 في البطاقة الضيّقة) تؤطّر الخوذة والوجه والكتفين بـCSS وحده
  //     (`--sdc-frame-*` في `styles/home/home-sadeed.css`)، والصورة تتبع نسبتها
  //     الأصلية فلا مطّ ولا تشويه؛
  //   • الملف خارج `public/home/`، فلا يدخل مجموع `HOME_IMAGES_MAX_BYTES` الذي يمشي
  //     ذلك المجلّد. ووزنه على `/` (قِيس ٢٠٢٦/١٠/١٨): على سطح المكتب تُنزله العلامة
  //     المائية أصلًا فلا تضيف البطاقة بايتًا؛ وعلى اللمس العلامة مخفيّة فالبطاقة هي
  //     ما يُنزله (~145 KB).
  // وتبقى `eager`: البطاقة فوق الطيّ على سطح المكتب.
  persona: {
    src: SADEED_PORTRAIT_SRC,
    width: SADEED_PORTRAIT_SIZE.width,
    height: SADEED_PORTRAIT_SIZE.height,
    alt: "صورة توضيحية لشخصية سَدِيد بخوذة الأمن الصناعي",
    loading: "eager",
  },

  // ── فِن: رجل أمن مختلف عن سَدِيد (أمر المالك ٢٠٢٦/١٠/٢٣) ──────────────
  // حليق بلا لحية، بزيٍّ أسود وأصفر وخوذةٍ بيضاء (سَدِيد: كحليّ ولحية)، وصورةٌ مولَّدةٌ
  // بالذكاء الاصطناعي أرسلها المالك لا شخصٌ حقيقي — فالنصّ البديل «صورة توضيحية».
  // الملف قصّةٌ 288×360 (4:5) من الصورة الأصلية على الوجه والكتفين. يرسمه `HomeFinnCard` للمالك وحده؛ وملفه يدخل مجموع الوزن
  // (`HOME_IMAGES_MAX_BYTES`) لأنه تحت `public/home/`. فوق الطيّ على المكتب لكن
  // البطاقة شرطيّة (مالك) فلا تُنزَّل الصورة لغيره: `lazy`.
  finn: {
    src: "/home/finn-portrait.webp",
    width: 144,
    height: 180,
    alt: "صورة توضيحية لشخصية فِن، رجل أمن بزيٍّ أسود وأصفر وخوذة بيضاء",
    loading: "lazy",
  },

  // ── كاميرات مباشرة ─────────────────────────────────────────────
  "cam-gate-1": {
    src: "/home/cam-gate-1.webp",
    width: 121,
    height: 59,
    alt: shot("كاميرا بوابة 1"),
    loading: "lazy",
  },
  "cam-equipment-yard": {
    src: "/home/cam-equipment-yard.webp",
    width: 121,
    height: 59,
    alt: shot("كاميرا ساحة المعدات"),
    loading: "lazy",
  },
  "cam-main-warehouse": {
    src: "/home/cam-main-warehouse.webp",
    width: 121,
    height: 67,
    alt: shot("كاميرا المستودع الرئيسي"),
    loading: "lazy",
  },
  "cam-outer-perimeter": {
    src: "/home/cam-outer-perimeter.webp",
    width: 121,
    height: 67,
    alt: shot("كاميرا المحيط الخارجي"),
    loading: "lazy",
  },

  // ── أبرز المخاطر ───────────────────────────────────────────────
  "risk-unauthorized-entry": {
    src: "/home/risk-unauthorized-entry.webp",
    width: 51,
    height: 37,
    alt: shot("محاولة دخول غير مصرّح بها"),
    loading: "lazy",
  },
  "risk-suspicious-activity": {
    src: "/home/risk-suspicious-activity.webp",
    width: 51,
    height: 31,
    alt: shot("نشاط مشبوه بالقرب من الأصول"),
    loading: "lazy",
  },
  "risk-camera-fault": {
    src: "/home/risk-camera-fault.webp",
    width: 51,
    height: 31,
    alt: shot("تعطّل كاميرا مراقبة"),
    loading: "lazy",
  },
  "risk-contractor-permit": {
    src: "/home/risk-contractor-permit.webp",
    width: 51,
    height: 28,
    alt: shot("انتهاء تصريح مقاول"),
    loading: "lazy",
  },

  // ── الحوادث النشطة ─────────────────────────────────────────────
  "incident-gate-3": {
    src: "/home/incident-gate-3.webp",
    width: 41,
    height: 37,
    alt: shot("دخول غير مصرّح — بوابة 3"),
    loading: "lazy",
  },
  "incident-suspicious-vehicle": {
    src: "/home/incident-suspicious-vehicle.webp",
    width: 41,
    height: 39,
    alt: shot("مركبة مشبوهة"),
    loading: "lazy",
  },
  "incident-security-report": {
    src: "/home/incident-security-report.webp",
    width: 41,
    height: 40,
    alt: shot("بلاغ أمني"),
    loading: "lazy",
  },
  "incident-sabotage": {
    src: "/home/incident-sabotage.webp",
    width: 41,
    height: 41,
    alt: shot("اشتباه عملية تخريب"),
    loading: "lazy",
  },
} as const satisfies Record<string, HomeImage>;

export type HomeImageKey = keyof typeof HOME_IMAGES;
