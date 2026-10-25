/**
 * «شريط الحالة» — ثوابت العرض للشريط المتحرك فوق البانر. كان شريط «مزايا سَدِيد» (سطور دعاية بلا
 * أرقام، أمر المالك ٢٠٢٦/١٠/١٨ R3)؛ وصار منذ أمر المالك ٢٠٢٦/١٠/٢٤ يعكس أربعة بنودٍ حيّة: الحالة
 * الأمنية والصيانة والبلاغات والمشاريع. **القواعد والأرقام في `home-ticker-status.ts`** (وحدةٌ
 * خالصة)، وهنا ما يخصّ العرض وحده: السرعة، وأسماء البنود، ورموز الحالة المتحرّكة.
 *
 * ## الرموز المتحرّكة
 *
 * لكل رمزٍ ملفّان في `public/media/ticker/`: ‏`<name>.webp` حلقةٌ متحرّكة (64×64، ~2 ث، شفّافة)
 * و`<name>.svg` نسخةٌ ساكنة (مصدر الرسم في `remotion/ticker/`). الواجهة ترسم الاثنين وتختار الـCSS
 * بينهما: المتحرّك داخل بوّابة الحركة (`prefers-reduced-motion: no-preference` والمفتاح والوضع الآمن
 * وغير الموقوف)، والساكن في كل ما عداها — فلا حلقة JS ولا قفزة تخطيط. وعقد الشريط يتحقّق أن كل
 * مدخلٍ هنا له ملفّاه على القرص.
 */
import { screenNameAr, screenNameEn } from "@/lib/nav/screen-names";
import type {
  Bilingual,
  TickerKind,
  TickerTone,
  TrendDir,
  TrendPolarity,
} from "@/components/home/home-ticker-status";

/**
 * سرعة الشريط — بكسلًا في الثانية، **ثابتةٌ مهما طال المحتوى ولا تتبدّل أثناء الدورة**: المدّة تُحسب من
 * عرض النسخة المقيس (`tickerLoop` في `HomeTicker.tsx`)، وتغيّرها (وصول الخطّ · تحديث القراءات) لا يمسّ
 * موضع المسار (`retimeLoop`). 44 (كانت 40، أمر ٢٠٢٦/١٠/٢٥ «سينمائي ومريح»): كلمةٌ عربية بخطّ 15px
 * نحو 38px، فهي أكثر من كلمةٍ في الثانية بقليل — دون سرعة القراءة، وحركةٌ «مستمرّة» تُرى بلا تعب.
 * و`--nx-loop-ticker` (24px/ث) لسجلّ الأحداث: على عمودٍ 1408px يستغرق عبوره ~59 ث،
 * فيُقرأ شبه ساكن في شريطٍ إعلاني.
 */
export const TICKER_PX_PER_S = 44;

/** حدّا السرعة المقروءة اللذان يحرسهما العقد (بكسل/ث). */
export const TICKER_SPEED_RANGE = { min: 40, max: 60 } as const;

/** أسماء بنود الشريط. الصيانة والبلاغات من `screen-names.ts` (المرجع الوحيد لاسم الشاشة). */
export const TICKER_LABELS: Readonly<Record<TickerKind, Bilingual>> = {
  posture: { ar: "الحالة الأمنية", en: "Security posture" },
  maintenance: { ar: screenNameAr("/sec/maintenance"), en: screenNameEn("/sec/maintenance") },
  incidents: { ar: screenNameAr("/sec/incidents"), en: screenNameEn("/sec/incidents") },
  projects: { ar: "المشاريع", en: "Projects" },
};

/** أسماء الرموز — تطابق ملفّات `public/media/ticker/` حرفيًّا. */
export const TICKER_GLYPH_NAMES = [
  "state-danger",
  "state-warning",
  "state-ok",
  "state-info",
  "trend-up",
  "trend-down",
  "trend-flat",
  // لون السهم يتبع **الدلالة** لا الاتجاه (حارس ٢٠٢٦/١٠/٢٤): ارتفاع البلاغات سهمٌ لأعلى أحمر، وهبوطها سهمٌ
  // لأسفل أخضر — فالأخضر يعني «سليم» في كل الشريط ولا يعاكس كلمة «سلبي» بجواره.
  "trend-up-bad",
  "trend-down-good",
] as const;
export type TickerGlyphName = (typeof TICKER_GLYPH_NAMES)[number];

/** مقاس الرمز الأصلي — يُكتب `width`/`height` على الصورة فلا يتبدّل التخطيط عند وصولها. */
export const TICKER_GLYPH_SIZE = 64;

export type TickerGlyph = {
  /** الحلقة المتحرّكة. */
  readonly anim: string;
  /** النسخة الساكنة — لمن طلب السكون وللإيقاف. */
  readonly still: string;
};

const GLYPH_DIR = "/media/ticker";

export const TICKER_GLYPHS: Readonly<Record<TickerGlyphName, TickerGlyph>> = Object.fromEntries(
  TICKER_GLYPH_NAMES.map((name) => [
    name,
    { anim: `${GLYPH_DIR}/${name}.webp`, still: `${GLYPH_DIR}/${name}.svg` },
  ]),
) as Record<TickerGlyphName, TickerGlyph>;

/** الشكل يحمل المعنى مع الكلمة: خطر ⇐ مثمّن · تحذير ⇐ مثلث · سليم ⇐ دائرة · معلومة ⇐ معيّن محايد. */
export const GLYPH_FOR_TONE: Readonly<Record<TickerTone, TickerGlyphName>> = {
  danger: "state-danger",
  warning: "state-warning",
  ok: "state-ok",
  info: "state-info",
};

/** السهم الأساس لكل اتجاه (الإيجابي لونًا) — والدلالة تختار نسختها في `glyphForTrend`. */
export const GLYPH_FOR_TREND: Readonly<Record<TrendDir, TickerGlyphName>> = {
  up: "trend-up",
  down: "trend-down",
  flat: "trend-flat",
};

/**
 * رمز الاتجاه من **الاتجاه والدلالة معًا**: إيجابي ⇐ أخضر (↑ `trend-up` · ↓ `trend-down-good`)، سلبي ⇐ أحمر
 * (↑ `trend-up-bad` · ↓ `trend-down`)، وغير ذلك (محايد/لم يُقَس) ⇐ السهم المحايد `trend-flat` — لا لون
 * إيجابيٌّ ولا سلبيٌّ بلا قياسٍ يسنده. والمعنى لا يحمله اللون وحده: الشكل والكلمة (إيجابي/سلبي) معه.
 */
export function glyphForTrend(dir: TrendDir, polarity: TrendPolarity): TickerGlyphName {
  if (dir === "flat" || (polarity !== "positive" && polarity !== "negative")) return "trend-flat";
  if (polarity === "positive") return dir === "up" ? "trend-up" : "trend-down-good";
  return dir === "up" ? "trend-up-bad" : "trend-down";
}
