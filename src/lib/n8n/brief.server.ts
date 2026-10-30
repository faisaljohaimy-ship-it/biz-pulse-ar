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
 * روابط (`http(s)://` · `www.` · نطاقٌ بمسار) · بريد · معرّفات UUID وسلاسل سداسية طويلة (≥ 16، أدناه) ·
 * أرقام من خمس خانات فأكثر (بالشرط أعلاه) · أشكال الأسرار. وما يبقى بعد ذلك **كلماتٌ مفردة** قد تحمل اسمًا أو موضعًا؛ لا يوجد كاشف
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
/**
 * معرّف UUID كاملٌ وسلسلةٌ سداسية طويلة (≥ 16: SHA · هاش · معرّف بلا شرطات). مقطِّع الاسترجاع يفتّتها كلماتٍ
 * مفردة تبقى كلٌّ منها دون عتبة الأرقام الطويلة والأسرار فتمرّ: قِيس عند الدمج (٢٠٢٦/١٠/٣٠) أن
 * `123e4567-e89b-42d3-…` يخرج «123e4567» و«e89b» و«42d3»، وأن SHA كاملة تترك شظيةً سداسية. فمعرّفٌ ملصوقٌ في
 * سؤال (مستخدم · مؤسسة · سجلّ · commit) كان يغادر شظايا إلى n8n ثم إلى مزوّدي البحث. تُنزع هنا كاملةً قبل
 * التقطيع، للسطحين.
 *
 * **بلا حدّ كلمة `\b` (مراجعة الإصلاح ٢٠٢٦/١٠/٣٠):** الشرطة السفلية حرفُ كلمةٍ في `\b`، فكان `id_123e4567-…`
 * و`uid123e4567-…` و`123e4567_e89b_…` تمرّ وتخرج شظاياها (قِيس). فالفاصل بين مقاطع UUID شرطةٌ أو شرطة سفلية،
 * ولا شرط على ما قبله ولا ما بعده.
 */
const UUID_LIKE = /[0-9a-f]{8}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{12}/gi;
const LONG_HEX = /[0-9a-f]{16,}/gi;
/**
 * معرّفٌ سداسي من 8 أحرفٍ فأكثر يخلط رقمًا وحرفًا (a–f): نصف UUID الأخير (12) · SHA مختصرة بتسعة فأكثر · هاش.
 * يُسقط **الكلمة اللاتينية الرقمية كلّها** لا الجزء السداسي منها: بقاء شظيةٍ (`id` · `g7h8…`) كان يخرجها كلمةً.
 * وما كان أحرفًا وحدها (`facade` · `deadbeef`) أو أرقامًا وحدها فليس منه (الأرقام الطويلة لها حجبها). والسبعة
 * (اختصار git الافتراضي) تبقى كلمةً: دونها تصير `dec2025` و`feb2026` معرّفاتٍ، **وهذا حدٌّ قائم لا ثغرة مُغلقة**.
 */
const ASCII_WORD = /[A-Za-z0-9]+/g;
const HEX_RUN = /[0-9a-f]{8,}/gi;
function dropHexIdWords(text: string): string {
  return text.replace(ASCII_WORD, (word) => {
    for (const run of word.match(HEX_RUN) ?? []) {
      if (/\d/.test(run) && /[a-f]/i.test(run)) return " ";
    }
    return word;
  });
}
/**
 * رقمٌ وظيفي أو رقم موظف بعد عبارته (`الرقم الوظيفي 4567` · `employee id E4567`): الرقم بأقل من خمس خانات لا
 * يلتقطه حجب الأرقام الطويلة، وهو من أكثر ما يلصقه المستخدم. يُنزع العبارة مع قيمتها، بالسياق وحده (لا يُحجب
 * رقمٌ قصير بلا عبارة: «ISO 9001» و«2026» أرقام عامة).
 */
const EMPLOYEE_NUMBER =
  /(?:الرقم\s+الوظيفي|رقمي\s+الوظيفي|رقم\s+(?:الموظف|وظيفي|الموظفين)|employee\s+(?:id|no\.?|number)|emp\.?\s*(?:id|no\.?|#)|badge\s+(?:id|no\.?|number))\s*[:#=]?\s*\p{L}{0,5}[-_ ]?\d{2,}/giu;
/**
 * أسرارٌ بالسياق: `Bearer …` و`token=…` و`password: …`. أشكال الأسرار المعروفة (`maskSecrets`) تحتاج رقمًا أو
 * بادئةً معروفة، فسرٌّ من أحرفٍ وحدها (`Bearer abc…xyz`) كان يمرّ (قِيس). القيمة بعد العلامة تُنزع كلّها.
 */
const CONTEXT_SECRET =
  /\b(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]{12,}|\b(?:token|api[_-]?key|apikey|secret|passw(?:or)?d|pwd|authorization)\s*[:=]\s*(?:(?:bearer|basic)\s+)?\S+/gi;
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

/**
 * ≥ 20 حرفًا تخلط حروفًا وأرقامًا، أو ≥ 24 حرفًا لاتينيًّا وحدها: شكل مفتاحٍ أو رمزٍ لا كلمة (أطول كلمةٍ
 * إنجليزية شائعة دون 24).
 */
const SECRET_LOOKING = /^(?:(?=.*\d)(?=.*[a-z]).{20,}|[a-z]{24,})$/i;

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
  const withoutHexRuns = canonical(question)
    .replace(URL_LIKE, " ")
    .replace(EMAIL_LIKE, " ")
    .replace(UUID_LIKE, " ")
    .replace(LONG_HEX, " ");
  const plain = dropHexIdWords(withoutHexRuns)
    .replace(EMPLOYEE_NUMBER, " ")
    .replace(CONTEXT_SECRET, " ");
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

const ARABIC_INDIC = /[٠-٩]/g;
const PERSIAN_INDIC = /[۰-۹]/g;

/**
 * توحيد القراءة العربية: NFKC · نزع أحرف التنسيق والتشكيل والتطويل · طيّ الهمزات والألف المقصورة والتاء المربوطة
 * (إلى هاء) والأرقام الهندية والفارسية · أحرف صغيرة. مصدرٌ واحد لمصنِّف الحاجة (`web-need.server.ts`) ولمختار الوضع
 * أدناه، **كي لا يرى أحدهما ما لا يراه الآخر** (مراجعة الإصلاح ٢٠٢٦/١٠/٣٠): المصنِّف كان يطوي النصّ ويقبل
 * «حمايه البيانات الشخصيه» سؤالًا عن نظامٍ، والمختار يقرأ الكتابة الحرفية فيراه `general` ويفتح بحثًا في الويب
 * العام (المادة ٩).
 */
export function foldForMatch(text: string): string {
  return text
    .slice(0, BRIEF_INPUT_MAX_CHARS)
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(PERSIAN_INDIC, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toLowerCase();
}

/**
 * الأطر الحاكمة في المادة ٩ من الدستور بأسمائها (PDPL · ZATCA · NCA) وجهة PDPL المنظِّمة (سدايا) ونظام
 * العمل، **والكود والمواصفات السعودية الحكومية** (كود البناء السعودي SBC · هيئة المواصفات SASO · المواصفة القياسية
 * السعودية). سؤالٌ يذكر أحدها يبحث في وضع `regulatory` (مضيفٌ تحت gov.sa وحده): المصادر غير الرسمية للوائح
 * محظورة. الخطأ هنا بالزيادة آمن (نتائج أقل)، وبالنقص ثغرة: فالقائمة واسعة عمدًا.
 *
 * **تُقرأ على النصّ الموحَّد `foldForMatch` لا الحرفي** (مراجعة الإصلاح ٢٠٢٦/١٠/٣٠): فالقوائم هنا بحروفٍ موحَّدة
 * (بلا همزة ولا تاء مربوطة ولا تشكيل) وتُقرأ أسماءٌ إنجليزية لكل إطار («Saudi personal data protection law» ·
 * «National Cybersecurity Authority» · «Zakat, Tax and Customs» · e-invoicing …). كان المختار يعرف الاسم العربي
 * بكتابته الأولى والاختصار اللاتيني وحدهما فيفوته «حمايه البيانات الشخصيه» و«ZATCA e-invoicing» بغير اختصارها، وسؤالٌ
 * يقبله المصنِّف خبرًا أو تنبيهًا يخرج منه `general` فيصل إلى ويكيبيديا وBrave وOpenAlex.
 *
 * **لا يشمل:** معايير دولية (ISO · NFPA · IEC · OSHA · NIST): تبقى `general` بقرارٍ مقصود، فليست نصًّا نظاميًّا
 * سعوديًّا. ولا الدفاع المدني ولا جهاتٌ حكومية أخرى لم تُسمَّ في المادة ٩ (حدٌّ قائم يُذكر في الدليل).
 */
const REGULATORY_FRAME_LATIN = new RegExp(
  [
    "\\b(?:pdpl|zatca|nca|sdaia|ecc-?\\d|ccc-?\\d|dcc-?\\d|saudi\\s+labou?r\\s+law|labou?r\\s+law)\\b",
    "\\bpersonal\\s+data\\s+protection\\s+(?:law|act|regulations?|system)\\b",
    "\\bnational\\s+cyber\\s*security\\s+authority\\b",
    "\\b(?:essential|cloud|critical\\s+systems?)\\s+cyber\\s*security\\s+controls\\b",
    "\\bzakat,?\\s+tax\\s+(?:and\\s+)?customs\\b",
    "\\be-?invoic(?:e|es|ing)\\b",
    "\\bfatoora\\b",
    "\\bsaudi\\s+data\\s+(?:and|&)\\s+(?:ai|artificial\\s+intelligence)\\s+authority\\b",
    "\\bsaudi\\s+building\\s+code\\b",
    "\\bsbc[-\\s]?\\d{3}\\b",
    "\\bsaso\\b",
    "\\bsaudi\\s+standards?,?\\s+metrology\\b",
  ].join("|"),
  "i",
);
const REGULATORY_FRAME_ARABIC = new RegExp(
  [
    "حمايه\\s+البيانات\\s+الشخصيه",
    "هيئه\\s+الزكاه",
    "الزكاه\\s+والضريبه\\s+والجمارك",
    "زاتكا",
    "الفوتره\\s+الالكترونيه",
    "الفاتوره\\s+الالكترونيه",
    "الامن\\s+السيبراني",
    "الهيئه\\s+الوطنيه\\s+للامن",
    "الضوابط\\s+الاساسيه\\s+للامن",
    "سدايا",
    "الهيئه\\s+السعوديه\\s+للبيانات",
    "نظام\\s+العمل",
    "لائحه\\s+نظام\\s+العمل",
    // الكود والمواصفات السعودية الحكومية (نصٌّ إلزاميّ): بالنصّ الموحَّد.
    "(?:ال)?كود\\s+(?:ال)?بناء\\s+(?:ال)?سعودي",
    "(?:ال)?كود\\s+(?:ال)?سعودي",
    "(?:ال)?(?:مواصفه|مواصفات)\\s+(?:ال)?قياسيه\\s+(?:ال)?سعوديه",
    "الهيئه\\s+السعوديه\\s+للمواصفات",
    "ساسو",
    // اسم الهيئة العليا للأمن الصناعي بلا همزة (الحرفي منه في `isHcisReferenceQuery`).
    "الهيئه\\s+العليا\\s+للامن\\s+الصناعي",
  ].join("|"),
);

/**
 * وضع بحث سَدِيد: أسئلة الإطار التنظيمي `regulatory` وغيرها `general`. الإطار = مرجع HCIS (الهيئة العليا للأمن
 * الصناعي ورموز SEC/SAF) **أو** أحد الأطر الحاكمة في المادة ٩. يُفحص النصّ الخام والموحَّد (`canonical`) والمطوي
 * (`foldForMatch`) معًا.
 */
export function sadeedModeFor(question: string): "general" | "regulatory" {
  if (typeof question !== "string") return "general";
  const unified = canonical(question);
  const folded = foldForMatch(question);
  const hcis = (t: string): boolean => isHcisReferenceQuery(t);
  const frame = (t: string): boolean =>
    REGULATORY_FRAME_LATIN.test(t) || REGULATORY_FRAME_ARABIC.test(t);
  return hcis(question.slice(0, BRIEF_INPUT_MAX_CHARS)) || hcis(unified) || frame(folded)
    ? "regulatory"
    : "general";
}
