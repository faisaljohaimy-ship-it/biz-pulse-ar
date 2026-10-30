/**
 * موجز البحث الخارجي — كلماتٌ ورموز تنظيمية، **لا الجملة أبدًا**.
 *
 * ما يغادر النظام إلى n8n (ثم إلى مزوّدي بحث الويب) هو هذا الموجز وحده:
 * حتى 6 كلمات (كلٌّ ≤ 40 حرفًا) وحتى 4 رموز (كلٌّ ≤ 24) ولغة. لا نصّ السؤال ولا ترتيب كلماته.
 * وموجزٌ فارغ ⇒ `null` ⇒ **لا نداء** (لا يُبحث عن لا شيء).
 *
 * ## إعادة استعمال لا إعادة كتابة
 *
 * - الكلمات: `ilikeTerms` من نواة الاسترجاع — المقطِّع نفسه (`tokenize`) وطيّ الحروف والأرقام وإسقاط
 *   كلمات الوصل وأداة التعريف. لا مقطِّع ثانٍ هنا؛ فقط تصفيةٌ لاحقة (كلمات إنجليزية شائعة لا تحويها
 *   قائمة الوصل، وشظايا تشبه الأسرار).
 * - الرموز: `isHcisReferenceQuery` من `hcis-reference.ts` تقرّر ذكر الإطار، ونمط `SEC|SAF-nn` هنا
 *   هو نمطها نفسه بالتقاط الرقم (يثبّت التطابقَ اختبار).
 * - الحجب: `redactPiiForStorage` (الهاتف بصيغه والهوية والبريد، وطيّ الأرقام الهندية) و`maskSecrets`
 *   (أشكال الأسرار المعروفة) — نفس أدوات النسخة المخزَّنة من السؤال.
 *
 * ## التوحيد قبل أي حجب (مراجعة P1، ٢٠٢٦/١٠/٣٠)
 *
 * حجبُ الأرقام الطويلة كان يقرأ النصّ كما كُتب، فيفوته رقمٌ كُتب بما لا يشبه الأرقام الصريحة:
 * علامة اتجاه (LRM/RLM) أو حرف عرض صفري بين الخانات — وهي شائعة في النصّ العربي المنسوخ —
 * أو أرقامٌ رياضية غليظة أو محاطة بدائرة أو مرفوعة. وكان يمرّ منه رقم الهوية والجوال والرقم
 * الوظيفي **كاملًا** كلمةً في الموجز. فيُوحَّد النصّ أولًا: NFKC (يطوي الأرقام الغليظة والمحاطة
 * والمرفوعة والعريضة إلى ASCII) · نزع أحرف التنسيق `\p{Cf}` · نزع علامات الدمج الملتصقة برقم ·
 * طيّ الأرقام الهندية والفارسية. ثم يُحجب كل رقمٍ من خمس خانات فأكثر (أي رقمٍ في يونيكود `\p{N}`)
 * تفصل خاناتِه **فواصلُ حتى ثلاثة** من الفراغ والترقيم والرموز (`/` · `,` · `،` · `_` · `:` ·
 * `.` · `-` …) — فصل الهوية بمقاطع يمرّ بغير الفراغ والنقطة والشرطة.
 *
 * ## رموز التوجيهات تُلتقط قبل حجب الأرقام
 *
 * `SAF-03 2025` و`SEC-12-2024` كانا يفقدان الرمز: الحجب يأكل رقم الرمز مع السنة المجاورة
 * (`03 2025` خمس خانات). فالرمز يُلتقط من النصّ الموحَّد ويُزال منه **قبل** حجب الأرقام.
 *
 * ## سطح FNN: معرّفات المطوّر تبقى (للمالك وحده)
 *
 * `buildBrief(q, { surface: "fnn" })` يحتفظ بمعرّفَين عامّين لا يدلّان على شخص: معرّف الثغرة
 * `CVE-YYYY-NNNN` (رمزٌ في الموجز) والإصدار الثلاثي الصارم `major.minor.patch` (كلمة في الموجز،
 * حتى اثنين). الإصدار الصارم: كل خانة 1–3 أرقام بلا صفر بادئ، فلا يطابق `055.123.4567` ولا
 * `1012.345.678` ولا تاريخًا ولا عنوان IP. وما عداهما يُحجب كما في سَدِيد. والافتراضي (بلا
 * خيار) هو الصارم: سَدِيد لا يحتفظ إلا برموز التوجيهات.
 *
 * ## ما يُحذف قبل الاستخراج
 *
 * روابط (`http(s)://` · `www.` · نطاقٌ بمسار) · بريد · أرقام من خمس خانات فأكثر (بالشرط أعلاه) ·
 * أشكال الأسرار. وما يبقى بعد ذلك **كلماتٌ مفردة** قد تحمل اسمًا أو موضعًا؛ لا يوجد كاشف
 * أسماء. فهذا الحجب يقلّل ولا يعدم، ويُذكر ذلك في الحدود (المعروض للمالك: ما يُرسل إلى بحث
 * الويب كلماتٌ من سؤالك).
 */
import { maskSecrets } from "@/lib/finn-agent/secret-shapes";
import { foldDigits, ILIKE_MAX_TERMS, ilikeTerms } from "@/lib/retrieval/ilike-terms.server";
import { isHcisReferenceQuery } from "@/lib/sadeed/hcis-reference";
import { redactPiiForStorage } from "@/lib/sadeed/rag/sanitize.server";
import {
  BRIEF_CODE_CHARS,
  BRIEF_MAX_CODES,
  BRIEF_MAX_TERMS,
  BRIEF_TERM_CHARS,
  type Brief,
} from "./schema";

/** أقصى ما يُقرأ من السؤال — الباقي يُهمل قبل أي معالجة. */
export const BRIEF_INPUT_MAX_CHARS = 1_000;

const URL_LIKE = /\b(?:https?:\/\/|www\.)\S+|\b[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+\/\S*/giu;
const EMAIL_LIKE = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu;
/** علامات الحجب التي تضعها الأدوات القائمة — تُزال كي لا تصير «كلماتٍ». */
const MASK_MARKERS = /\[[^\]\n]{1,24}محذوف[ةه]?\]|\[محجوب\]/g;
/** أحرف التنسيق (اتجاه · عرض صفري · واصل · شرطة لينة): تُنزع قبل أي مطابقة. */
const FORMAT = /\p{Cf}/gu;
/** علامة دمج ملتصقة برقم (`1` + U+0301) — كانت تفصل خانتين عن بعضهما. */
const MARKS_AFTER_DIGIT = /(\p{N})\p{M}+/gu;
/** الفاصل بين خانتين من رقم واحد: حتى ثلاثة من الفراغ والترقيم والرموز والتطويل. */
const DIGIT_GAP = "[\\s\\p{P}\\p{S}\\u0640]{0,3}";
/** خمس خانات فأكثر (أي رقمٍ في يونيكود `\p{N}`)، تفصلها فواصل. بعد طيّ الأرقام وبعد التقاط الرموز. */
const LONG_DIGITS = new RegExp(`\\p{N}(?:${DIGIT_GAP}\\p{N}){4,}`, "gu");
/** نمط رمز التوجيه نفسه في `isHcisReferenceQuery` مع التقاط الرقم. */
const DIRECTIVE_CODE = /\b(SEC|SAF)-?(\d{1,3})\b/gi;
const HCIS_WORD = /\bhcis\b/gi;
const HCIS_NAME_AR = /الهيئ[ةه]\s+العليا\s+للأمن\s+الصناعي/g;
/** معرّف ثغرة عام. */
const CVE_ID = /\bCVE-\d{4}-\d{4,7}\b/gi;
/**
 * إصدار ثلاثي صارم: كل خانة 1–3 أرقام بلا صفر بادئ، لا يسبقه حرفٌ أو نقطة ولا يليه حرفٌ أو
 * «.رقم». فلا يطابق جوالًا (`055.123.4567`) ولا هويةً (`1012.345.678`) ولا تاريخًا ولا IP.
 */
const SEMVER =
  /(?<![\w.])v?((?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2}))(?!\w|\.\d)/g;
/** أقصى عدد إصدارات تدخل الموجز (تتقدّم على بقية الكلمات). */
const MAX_VERSIONS = 2;

/** كلماتٌ إنجليزية شائعة لا تحويها قائمة الوصل العربية في المقطِّع. */
const EN_STOP: ReadonlySet<string> = new Set([
  "about",
  "also",
  "could",
  "does",
  "explain",
  "from",
  "give",
  "have",
  "into",
  "latest",
  "need",
  "please",
  "should",
  "show",
  "tell",
  "that",
  "their",
  "there",
  "this",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "why",
  "will",
  "with",
  "would",
  "your",
]);

/** ≥ 20 حرفًا تخلط حروفًا وأرقامًا: شكل مفتاحٍ أو رمزٍ لا كلمة. */
const SECRET_LOOKING = /^(?=.*\d)(?=.*[a-z]).{20,}$/i;

/** سطح الطلب: سَدِيد (افتراضي، صارم) أو FNN (للمالك: يحتفظ بمعرّف الثغرة والإصدار). */
type BriefSurface = "sadeed" | "fnn";
interface BriefOptions {
  readonly surface?: BriefSurface;
}

/** قصّ ثم توحيد: NFKC · نزع التنسيق والعلامات الملتصقة بالأرقام · طيّ الأرقام الهندية. */
function canonical(question: string): string {
  const unified = question
    .slice(0, BRIEF_INPUT_MAX_CHARS)
    .normalize("NFKC")
    .replace(FORMAT, "")
    .replace(MARKS_AFTER_DIGIT, "$1");
  return foldDigits(unified).slice(0, BRIEF_INPUT_MAX_CHARS);
}

/** معرّفات المطوّر التي تبقى في سطح FNN: تُقتطع من النصّ قبل حجب الأرقام. */
function takeDevHandles(text: string): { text: string; cves: string[]; versions: string[] } {
  const cves = Array.from(new Set(Array.from(text.matchAll(CVE_ID), (m) => m[0].toUpperCase())));
  const versions = Array.from(new Set(Array.from(text.matchAll(SEMVER), (m) => m[1])));
  return { text: text.replace(CVE_ID, " ").replace(SEMVER, " "), cves, versions };
}

/**
 * الحجب بعد أن اقتُطعت الرموز والمعرّفات: الأرقام الطويلة **أولًا** ثم الأدوات القائمة. الحجب
 * الجزئي (هاتفٌ داخل رقمٍ أطول) كان يترك صدر الرقم كلمةً سليمة.
 */
function scrub(text: string): string {
  return maskSecrets(redactPiiForStorage(text.replace(LONG_DIGITS, " "))).replace(
    MASK_MARKERS,
    " ",
  );
}

function directiveCodes(text: string): string[] {
  const codes: string[] = [];
  if (isHcisReferenceQuery(text)) codes.push("HCIS");
  for (const m of text.matchAll(DIRECTIVE_CODE)) {
    const code = `${m[1].toUpperCase()}-${m[2].padStart(2, "0")}`;
    if (code.length <= BRIEF_CODE_CHARS && !codes.includes(code)) codes.push(code);
  }
  return codes.slice(0, BRIEF_MAX_CODES);
}

function languageOf(text: string): "ar" | "en" {
  const ar = text.match(/[؀-ۿ]/g)?.length ?? 0;
  const en = text.match(/[A-Za-z]/g)?.length ?? 0;
  return en > ar ? "en" : "ar";
}

/** الكلمات والرموز من سؤال المستخدم، أو `null` إن لم يبقَ ما يُبحث عنه. */
export function buildBrief(question: string, opts: BriefOptions = {}): Brief | null {
  if (typeof question !== "string") return null;
  const plain = canonical(question).replace(URL_LIKE, " ").replace(EMAIL_LIKE, " ");
  const dev =
    opts.surface === "fnn"
      ? takeDevHandles(plain)
      : { text: plain, cves: [] as string[], versions: [] as string[] };
  // الرموز تُلتقط من النصّ الموحَّد **قبل** حجب الأرقام: `SAF-03 2025` خمس خانات بفاصل.
  const codes = [...directiveCodes(dev.text), ...dev.cves].slice(0, BRIEF_MAX_CODES);
  const rest = scrub(
    dev.text.replace(DIRECTIVE_CODE, " ").replace(HCIS_WORD, " ").replace(HCIS_NAME_AR, " "),
  );
  const terms = [
    ...dev.versions.slice(0, MAX_VERSIONS),
    ...ilikeTerms(rest).filter(
      (t) => t.length <= BRIEF_TERM_CHARS && !EN_STOP.has(t) && !SECRET_LOOKING.test(t),
    ),
  ].slice(0, Math.min(BRIEF_MAX_TERMS, ILIKE_MAX_TERMS));
  if (terms.length === 0 && codes.length === 0) return null;
  return { terms, codes, lang: languageOf(rest) };
}

/**
 * الأطر الحاكمة في المادة ٩ من الدستور بأسمائها (PDPL · ZATCA · NCA) وجهة PDPL المنظِّمة (سدايا) ونظام
 * العمل. سؤالٌ يذكر أحدها يبحث في وضع `regulatory` (مضيفٌ تحت gov.sa وحده): المصادر غير الرسمية للوائح
 * محظورة. الخطأ هنا بالزيادة آمن (نتائج أقل)، وبالنقص ثغرة: فالقائمة واسعة عمدًا. النصّ يُوحَّد أولًا
 * (NFKC · نزع التنسيق) فلا يُخفي المحرف الخفي الاسم. الأسماء اللاتينية بحدّ كلمة؛ والعربية بجذرها.
 */
const REGULATORY_FRAME_LATIN =
  /\b(?:pdpl|zatca|nca|sdaia|ecc-?\d|ccc-?\d|dcc-?\d|saudi\s+labou?r\s+law|labou?r\s+law)\b/i;
const REGULATORY_FRAME_ARABIC =
  /حماية\s+البيانات\s+الشخصية|هيئة\s+الزكاة|الزكاة\s+والضريبة\s+والجمارك|زاتكا|الفوترة\s+الإلكترونية|الفاتورة\s+الإلكترونية|الأمن\s+السيبراني|الهيئة\s+الوطنية\s+للأمن|الضوابط\s+الأساسية\s+للأمن|سدايا|الهيئة\s+السعودية\s+للبيانات|نظام\s+العمل|لائحة\s+نظام\s+العمل/;

/**
 * وضع بحث سَدِيد: أسئلة الإطار التنظيمي `regulatory` وغيرها `general`. الإطار = مرجع HCIS (الهيئة العليا للأمن
 * الصناعي ورموز SEC/SAF) **أو** أحد الأطر الحاكمة في المادة ٩. يُفحص النصّ الخام والموحَّد معًا.
 */
export function sadeedModeFor(question: string): "general" | "regulatory" {
  if (typeof question !== "string") return "general";
  const unified = canonical(question);
  const frame = (t: string): boolean =>
    isHcisReferenceQuery(t) || REGULATORY_FRAME_LATIN.test(t) || REGULATORY_FRAME_ARABIC.test(t);
  return frame(question.slice(0, BRIEF_INPUT_MAX_CHARS)) || frame(unified)
    ? "regulatory"
    : "general";
}
