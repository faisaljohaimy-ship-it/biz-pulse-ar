/**
 * أفق المدينة والنخلة — رسمان ظلّيان لبطاقة تذييل الشريط الجانبي «معاً نحو
 * بيئة آمنة» كما في مخطّط المالك (قرار ٢٠٢٦/١٠/١٤، §2.1 في
 * `docs/design/10-home-command-center-prompt.md`).
 *
 * - **الأفق:** أبراجٌ عالية عند الغسق تتكاثف يسار البطاقة وتنحدر يمينها كما
 *   في الصورة، بطبقتين: بعيدةٌ شفيفة (ضباب الأفق) وقريبةٌ معتمة. الإطار
 *   194×22 = عرض البطاقة في المخطّط وارتفاع شريط الأبراج فيه، فيُرسم 1:1.
 * - **النخلة:** نخلةٌ مفردة بسعفٍ متدلٍّ — **لا شعار وطني ولا سيفان**
 *   (استعمال الشعار الوطني مقيّد نظامًا؛ انحرافٌ مقصود أُبلغ به المالك).
 *   الإطار 104×136 ⇐ 26×34 بكسل في المخطّط.
 *
 * **اللون من السياق** (المواد ٣٢–٣٤): الرسمان `currentColor` فقط، ولا
 * `fill="white"`؛ والطبقة البعيدة شفافيةٌ لا لون (`nx-skyline-haze`، تُعدَّل
 * من CSS إن لزم). زخرفيّان (`aria-hidden`) ما لم يُعطَ `title`.
 */
import { cn } from "@/lib/utils";

export const SKYLINE_VIEWBOX = "0 0 194 22";

/** الطبقة البعيدة — أبراجٌ خلفية تظهر بين القريبة (تُرسم بشفافية). */
export const SKYLINE_FAR_PATH =
  "M2 22V6H7V22ZM8 22V4H13V22ZM17 22V5.5H23V22ZM27 22V4.5H33V22ZM40 22V4H46V22ZM50 22V7H56V22Z" +
  "M60 22V8H67V22ZM70 22V7.5H77V22ZM80 22V10H87V22ZM88 22V12.5H96V22ZM96 22V15H104V22ZM104 22V17.5H112V22Z";

/** الطبقة القريبة — الأبراج المعتمة وقاعدتها المتّصلة. */
export const SKYLINE_NEAR_PATH =
  "M0 22V8H5V22ZM5 22V7H6.6V5H9.9V7H11.5V22ZM11.5 22V9H15V22ZM15 22V7L20.5 9.5V22Z" +
  "M21 22V4.5H23.2V0H24.2V4.5H26.5V22ZM26.5 22V8H31V22Z" +
  "M31 22V3Q31 2 32 2H33.9V4.5Q35.5 6 37.1 4.5V2H39Q40 2 40 3V22ZM40 22V8A2 2 0 0 1 44 8V22Z" +
  "M44 22V5H46.2V3H50.8V5H53V22ZM53 22V10H58V22ZM58 22V14.5L64.5 12V22Z" +
  "M65 22V11.5H67.8V9.5H73.2V11.5H76V22ZM76 22V13H79.5V22ZM79.5 22V14.5L86 12V22Z" +
  "M86 22V15.5H96V22ZM96 22V17H104V22ZM104 22V18.5H110V22ZM110 22V20H113V22ZM0 22V16H92V22Z";

export const PALM_VIEWBOX = "0 0 104 136";
const PALM_W = 104;
const PALM_H = 136;

/** الجذع، ثم قبّة التاج، ثم ثلاث عشرة سعفة متناظرة حول x = 52. */
export const PALM_PATH =
  "M47 22L57 22L57.2 131.5Q57.2 134 59.8 134L44.2 134Q46.8 134 46.8 131.5Z" +
  "M31 17.5a21 12.5 0 1 1 42 0a21 12.5 0 1 1 -42 0Z" +
  "M46.5 23.5Q41.8 13.2 48 3Q52 -2.2 56 3Q62.2 13.2 57.5 23.5Z" +
  "M45.3 28.9Q35.3 20.8 28.9 8.8Q28.4 6 31.1 6.2Q47.8 7.1 52.7 20.7Z" +
  "M51.3 20.7Q56.2 7.1 72.9 6.2Q75.6 6 75.1 8.8Q68.7 20.8 58.7 28.9Z" +
  "M46.8 31.9Q33 25.2 18.6 21.2Q16.9 19 19.4 17.8Q36.9 9.2 49.4 21.2Z" +
  "M54.6 21.2Q67.1 9.2 84.6 17.8Q87.1 19 85.4 21.2Q71 25.2 57.2 31.9Z" +
  "M48.1 33.1Q27.2 23.8 6.5 30.2Q4.3 28.5 6.5 26.8Q26.8 8.3 47.9 22.1Z" +
  "M56.1 22.1Q77.2 8.3 97.5 26.8Q99.7 28.5 97.5 30.2Q76.8 23.8 55.9 33.1Z" +
  "M50.6 34.2Q21.8 32.5 2.2 51.6Q-0.5 50.9 0.8 48.4Q16.7 21.1 46.1 24.1Z" +
  "M57.9 24.1Q87.3 21.1 103.2 48.4Q104.5 50.9 101.8 51.6Q82.2 32.5 53.4 34.2Z" +
  "M53.1 34.2Q28.8 44.9 15.7 66.7Q12.9 67.1 13.3 64.3Q19.2 35.5 45.3 26.5Z" +
  "M58.7 26.5Q84.8 35.5 90.7 64.3Q91.1 67.1 88.3 66.7Q75.2 44.9 50.9 34.2Z" +
  "M55.5 33.4Q41.6 53.4 33.1 75.7Q30.6 77 29.9 74.3Q29.3 48 45.4 29Z" +
  "M58.6 29Q74.7 48 74.1 74.3Q73.4 77 70.9 75.7Q62.4 53.4 48.5 33.4Z";

function a11y(title?: string) {
  return {
    role: title ? "img" : undefined,
    "aria-hidden": title ? undefined : true,
    "aria-label": title,
    focusable: "false" as const,
  };
}

export interface SkylineSilhouetteProps {
  className?: string;
  /** العرض والارتفاع المرسومان (الافتراضي مقاس المخطّط 194×22)؛ CSS يتقدّم عليهما. */
  width?: number | string;
  height?: number | string;
  /** الافتراضي يلصق الأفق بأسفل اليسار ويملأ العرض مهما تغيّرت نسبة البطاقة. */
  preserveAspectRatio?: string;
  /** شفافية طبقة الضباب البعيدة. */
  hazeOpacity?: number;
  title?: string;
}

export function SkylineSilhouette({
  className,
  width = 194,
  height = 22,
  preserveAspectRatio = "xMinYMax slice",
  hazeOpacity = 0.45,
  title,
}: SkylineSilhouetteProps) {
  return (
    <svg
      viewBox={SKYLINE_VIEWBOX}
      width={width}
      height={height}
      preserveAspectRatio={preserveAspectRatio}
      className={cn("nx-skyline shrink-0", className)}
      {...a11y(title)}
    >
      {title ? <title>{title}</title> : null}
      <path
        className="nx-skyline-haze"
        d={SKYLINE_FAR_PATH}
        fill="currentColor"
        fillOpacity={hazeOpacity}
      />
      <path className="nx-skyline-near" d={SKYLINE_NEAR_PATH} fill="currentColor" />
    </svg>
  );
}

export interface PalmSilhouetteProps {
  /** الارتفاع المرسوم بالبكسل؛ العرض يتبع نسبة النخلة. الافتراضي 34 كما في المخطّط. */
  size?: number;
  className?: string;
  title?: string;
}

export function PalmSilhouette({ size = 34, className, title }: PalmSilhouetteProps) {
  const width = Math.round((size * PALM_W * 100) / PALM_H) / 100;
  return (
    <svg
      viewBox={PALM_VIEWBOX}
      width={width}
      height={size}
      className={cn("nx-palm shrink-0", className)}
      {...a11y(title)}
    >
      {title ? <title>{title}</title> : null}
      <path d={PALM_PATH} fill="currentColor" />
    </svg>
  );
}
