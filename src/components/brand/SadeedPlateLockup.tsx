/**
 * لوحة الهوية في زاوية الشريط — «SADEED · Industrial Security AI OS».
 *
 * أمر المالك ٢٠٢٦/١٠/١٨ (R4) بنصّه: «انقل المستطيل الصغير الذي يحتوي على
 * العبارة (منظومة القرار والانجاز الذكي) فالزاوية التي تعلو النافذة الجانبية
 * وامحو العبارة واستبدلها ب Industrial Security AI OS». فاللوحة لوحةُ المالك
 * نفسها، مُحيت عبارتها ورُسم السطر الجديد بقلم «SADEED» وحبره (التفصيل في
 * خطّة عدسة الهوية)، وقُطعت محكَمةَ الإطار (2086×593) لتسكن رأس الشريط في كل
 * صفحة. ومعها الرمز السداسي (R5: «اجعل علامة سديد الموجودة بالمرفق هي العلامة
 * الخارجية لرابط النظام والتطبيق») لما يصغر عن اللوحة.
 *
 * ## رابطٌ واحد باسمٍ مكتوب
 *
 * اللوحة رابط الرئيسية كعُرف الشعارات: `<Link>` واحد يلفّ `<img alt="">`
 * واحدة. **والاسم على الرابط لا على الصورة** — درس `HomeBrandRow`: حاويةٌ
 * داخل الرابط قطعت أخذ الاسم من النصّ البديل فقاس Chromium اسمًا فارغًا
 * (WCAG 2.4.4 · 4.1.2). والاسم يحوي نصّ اللوحة المرئي (2.5.3)، ومصدره
 * `PRODUCT_BRAND` و`PLATE_TAGLINE` — لا نصّ يُعاد كتابته.
 *
 * ## وهجٌ حول اللوحة لا على صورتها (أمر المالك ٢٠٢٦/١٠/١٨)
 *
 * «Implement a refined, continuously luminous treatment for the official SADEED logo …
 * Preserve the original artwork». فالصورة كما هي بلا فلتر ولا قلب في الداكن، والوهج
 * طبقتان حولها في `brand-plate.css`: هالةٌ زرقاء/سماوية تتنفّس ببطء، ومسحة ضوءٍ عابرة
 * نادرة داخل زوايا اللوحة (`.nx-plate-sheen`). تتحرّك الشفافية والإزاحة وحدهما (تركيبٌ لا
 * رسم)، وخلف تقليل الحركة ومفتاح السكون معًا — والبديل هالةٌ ساكنة. وهذا الأمر ينسخ في الشعار
 * وحده حظر «اللمعة الدائمة» (M1–M5)؛ والرئيسية باقية عليه. لا `<video>`: فيلم الماء السابق
 * مصيَّرٌ فوق اللوحة القديمة بعبارتها الممحوّة. النصّ المخبوز في الصورة شعارٌ مستثنى من
 * أرضية 12px (WCAG 1.4.5)، وكلماته في اسم الرابط.
 */
import { Link } from "@tanstack/react-router";
import { PRODUCT_BRAND, brandName } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import "@/styles/brand-plate.css";

export type SadeedPlateVariant = "sidebar" | "header" | "drawer";

/** السطر المرسوم على اللوحة بعد محو العبارة — مصدر اسم الرابط الوحيد. */
export const PLATE_TAGLINE = "Industrial Security AI OS";

/** القطع محكَم الإطار: بلا خلفية الاستوديو ولا انعكاس الأرضية (3.5177). */
export const PLATE = { width: 2086, height: 593 } as const;

/** الدرجات المنشورة — عرض كل ملف (ترويسة WebP) هو الرقم في اسمه. */
export const PLATE_SRC = {
  208: "/brand/sadeed-plate-208.webp",
  256: "/brand/sadeed-plate-256.webp",
  416: "/brand/sadeed-plate-416.webp",
  512: "/brand/sadeed-plate-512.webp",
  624: "/brand/sadeed-plate-624.webp",
  768: "/brand/sadeed-plate-768.webp",
} as const;

/**
 * سقف العرض المرسوم لكل نوع (px) — مرآة `--nx-plate-w` في brand-plate.css،
 * ومنه `sizes`: الشريط 208 (عرضه ناقص الحاشيتين) · الترويسة 176 (خانة
 * 768–1023 حين يختفي الشريط) · الدرج 256 (لوح `w-72`).
 */
export const PLATE_WIDTH: Readonly<Record<SadeedPlateVariant, number>> = {
  sidebar: 208,
  header: 176,
  drawer: 256,
};

/** الرمز السداسي وحده (مقطوعٌ من لوحة البانر) للمواضع الصغيرة. */
export const EMBLEM_SRC = {
  48: "/brand/sadeed-emblem-48.webp",
  96: "/brand/sadeed-emblem-96.webp",
  144: "/brand/sadeed-emblem-144.webp",
} as const;

const toSrcSet = (sources: Readonly<Record<number, string>>) =>
  Object.entries(sources)
    .map(([w, src]) => `${src} ${w}w`)
    .join(", ");

const PLATE_SRCSET = toSrcSet(PLATE_SRC);
const EMBLEM_SRCSET = toSrcSet(EMBLEM_SRC);

/** اسم رابط اللوحة: اسم المنتج + سطر اللوحة + الوجهة. */
export function plateLinkLabel(ar: boolean): string {
  return ar
    ? `${PRODUCT_BRAND.ar.name} ${PRODUCT_BRAND.en.name} — ${PLATE_TAGLINE} — الرئيسية`
    : `${PRODUCT_BRAND.en.name} — ${PLATE_TAGLINE} — Home`;
}

export function SadeedPlateLockup({
  variant = "sidebar",
  className,
}: {
  variant?: SadeedPlateVariant;
  className?: string;
}) {
  const { locale } = useI18n();
  return (
    <Link
      to="/"
      // `aria-current="page"` يكتبه الموجِّه نفسه على "/" وحدها — خادمًا وعميلًا
      // معًا فلا اختلاف ترطيب، ولا يتبدّل بمعاملات البحث.
      activeOptions={{ exact: true, includeSearch: false }}
      data-variant={variant}
      aria-label={plateLinkLabel(locale === "ar")}
      className={cn("nx-plate-link nx-focus-ring", className)}
    >
      <img
        src={PLATE_SRC[416]}
        srcSet={PLATE_SRCSET}
        sizes={`${PLATE_WIDTH[variant]}px`}
        width={PLATE.width}
        height={PLATE.height}
        alt=""
        loading="eager"
        decoding="async"
        className="nx-plate-img"
      />
      <span aria-hidden className="nx-plate-sheen" />
    </Link>
  );
}

/**
 * الرمز السداسي «S» — لبلاطة `/auth` وترويسة القمرة. زخرفيٌّ حين يجاوره الاسم
 * نصًّا (فلا يُقرأ الاسم مرّتين)، وإلا حمل اسم المنتج بلغة الواجهة. مقاسه من
 * `className` (‏`size-9`…)، وسمتا العرض والارتفاع أرضيّةٌ 40px تغلبها أي أداة.
 */
export function SadeedEmblem({
  decorative = false,
  className,
}: {
  decorative?: boolean;
  className?: string;
}) {
  const { locale } = useI18n();
  return (
    <img
      src={EMBLEM_SRC[96]}
      srcSet={EMBLEM_SRCSET}
      sizes="40px"
      width={40}
      height={40}
      alt={decorative ? "" : brandName(locale === "ar")}
      aria-hidden={decorative || undefined}
      loading="eager"
      decoding="async"
      className={cn("nx-emblem", className)}
    />
  );
}
