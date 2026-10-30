/**
 * مصنِّف «هل يحتاج السؤال معلومةً خارجيةً حاليةً؟»، حتميٌّ، بلا نموذج ولا شبكة ولا قاعدة.
 *
 * يقرّر وحده هل يستحقّ السؤال نداءً إلى ذراع الويب (n8n)؛ فلا يُنفق زمنًا (حتى 1.8 ث) ولا يُرسل شيئًا
 * على سؤالٍ تجيبه المعرفة الداخلية. الخطأ هنا **بالنقص** أرخص من الخطأ بالزيادة: فوات بحثٍ يعيد الإجابة
 * الحالية بعينها، أمّا بحثٌ زائد فتأخير ومادةُ ويبٍ لا حاجة لها.
 *
 * ## القاعدة
 *
 * «حداثة» وحدها لا تكفي: «ما آخر بلاغ؟» و«أحدث تصريح» و«الوضع الحالي للدوريات» أسئلة تشغيلية داخلية.
 * فلا بدّ من **موضوعٍ خارجي** يقترن بها (أو يكفي بنفسه حيث لا يملكه الفهرس الداخلي):
 *
 * | الصنف | الشرط |
 * | --- | --- |
 * | `regulatory` (إطار خارجي: PDPL · ZATCA · NCA · سدايا · نظام العمل · الكود والمواصفات السعودية SBC/SASO …) | الإطار + (تغيّر أو حالي أو طلب نصّ/عقوبة/متطلبات) |
 * | `regulatory` (مرجع HCIS: SEC/SAF) | الرمز + **تغيّرٌ صريح** وحده (نطاق التوجيه يجيبه الفهرس الداخلي) |
 * | `standard` (ISO · IEC · NFPA · OSHA · NIST …) | المعيار + (تغيّر أو حالي أو متطلبات/إصدار)، «ما هو ISO 27001» تعريفٌ لا يُبحث له |
 * | `news` | أخبار/news، والنطاق الصناعي-الأمني مضمونٌ قبل هذا المصنِّف (المادة ٢٢ §١) |
 * | `advisory` | معرّف CVE، أو «ثغرة/vulnerability» مع تغيّر |
 *
 * ## ما لا يفعله
 *
 * لا يقرّر النطاق (`isInScope` قبله)، ولا يبني موجز البحث (`buildBrief`)، ولا يختار الوضع
 * (`sadeedModeFor`)؛ يقول «نعم/لا» وصنفًا فقط. وكل ما يقرؤه نصٌّ يُوحَّد أولًا (NFKC · نزع التنسيق
 * والتشكيل والتطويل · توحيد الهمزات والألف المقصورة والتاء المربوطة والأرقام الهندية) فلا يُخفي محرفٌ خفي كلمةً.
 *
 * يُوسَم `.server.ts` لأنه يستورد `sadeedModeFor` من موجز n8n الخادمي.
 */
import { foldForMatch, sadeedModeFor } from "@/lib/n8n/brief.server";
import { isHcisReferenceQuery } from "@/lib/sadeed/hcis-reference";

export type WebNeedKind = "regulatory" | "standard" | "news" | "advisory";
export interface WebNeed {
  readonly need: boolean;
  readonly kind: WebNeedKind | null;
}

const NO: WebNeed = { need: false, kind: null };

/** دون هذا لا سؤال يستحقّ بحثًا. */
const MIN_CHARS = 8;

/**
 * توحيد القراءة: كل ما يلي يعمل على نصٍّ بلا تشكيل ولا همزات ولا أرقام هندية. **الدالة نفسها** التي يقرأ بها
 * مختار الوضع (`sadeedModeFor` في `brief.server.ts`) أطرَه التنظيمية، فلا يقبل المصنِّف كتابةً لا يعرفها المختار.
 */
export const foldForNeed = foldForMatch;

/** كلمة عربية بين غير الحروف، بسابقةٍ واحدة (و/ف/ب/ل/ك) وأداة التعريف، `\b` لاتينية لا تعمل بين حرفين عربيين. */
const ar = (alternatives: string): RegExp =>
  new RegExp(`(?<![ء-ي])[وفبلك]?(?:ال)?(?:${alternatives})(?![ء-ي])`);
const en = (alternatives: string): RegExp => new RegExp(`\\b(?:${alternatives})\\b`);

// ── التغيّر والحداثة ─────────────────────────────────────────────────────────

/** تغيّرٌ صريح: ما صدر/عُدّل/استُحدث. سنةٌ حالية أو قادمة (2025 فما فوق) تُعدّ منه. */
const CHANGE_AR = ar(
  [
    "احدث",
    "مستجدات",
    "تحديث",
    "تحديثات",
    "تعديل",
    "تعديلات",
    "صدر",
    "صدرت",
    "اصدرت",
    "عدلت",
    "عدل",
    "الغي",
    "الغيت",
    "الغاء",
    "تغيرت",
    "مؤخرا",
    "حديثا",
    "جديده",
    "جديد",
    "اخر\\s+(?:تحديث|تحديثات|تعديل|تعديلات|اصدار|نسخه|تغييرات|مستجدات|ما\\s+صدر)",
    "(?:اصدار|نسخه)\\s+(?:جديد|جديده|حديثه|حديث)",
  ].join("|"),
);
const CHANGE_EN = en(
  [
    "latest",
    "newest",
    "most recent",
    "recent(?:ly)?",
    "updates?",
    "updated",
    "amend(?:ed|ment|ments)?",
    "revis(?:ed|ion|ions)",
    "supersed(?:ed|es)",
    "repeal(?:ed)?",
    "replaced",
    "new (?:version|edition|release|rules?|regulations?|requirements?)",
    "changes? (?:to|in)",
    "what(?:'s| is) new",
  ].join("|"),
);
/** سنةٌ حالية أو قادمة (2025–2039): الطلبُ عن «لعام 2026» طلبٌ لما هو سارٍ الآن. */
const RECENT_YEAR = /(?<!\d)20(?:2[5-9]|3\d)(?!\d)/;

/** حالٌ سارٍ: «ما الساري الآن». أضعف من التغيّر، ويكفي للإطار الخارجي والمعيار لا لمرجع HCIS. */
const CURRENT_AR = ar("حاليا|حاليه|الحالي|الحاليه|الان|ساري|ساريه|معمول|نافذ|نافذه|المعمول\\s+به");
const CURRENT_EN = en("current(?:ly)?|in force|effective|up[- ]to[- ]date|as of");

/** طلبُ نصٍّ أو التزامٍ أو جزاء: يستحقّ مصدرًا للإطار والمعيار الخارجيَّين. */
const REQUIREMENT_AR = ar(
  "متطلبات|متطلب|اشتراطات|شروط|بنود|بند|عقوبات|عقوبه|غرامات|غرامه|مخالفات|مخالفه|لائحه|لوائح|ماده|مواد|ضوابط|التزامات|التزام|امتثال|نص",
);
const REQUIREMENT_EN = en(
  "requirements?|penalt(?:y|ies)|fines?|clauses?|articles?|obligations?|controls?|compliance|provisions?|scope|text of|differences? between",
);

// ── المواضيع الخارجية ────────────────────────────────────────────────────────

/** معرّف معيار: ISO/IEC برقم، أو جهة معايير معروفة بذاتها. */
const STANDARD_LATIN =
  /\b(?:(?:iso|iec|nfpa|ansi|ieee|asis|bs|en|api)\s?[-/]?\s?\d{2,6}(?:[-:]\d{1,4})*|osha|nist|nfpa|cenelec|asme)\b/i;
/** معيارٌ بالعربية مقرونٌ بجهةٍ أو نطاقٍ خارجي، «معايير» وحدها كلمةٌ داخلية شائعة فلا تكفي. */
const STANDARD_ARABIC = ar(
  [
    "(?:المعيار|معيار|المعايير|معايير)\\s+(?:الدولي|الدوليه|العالمي|العالميه|السعودي|السعوديه|الاوروبي|الاوروبيه)",
    "(?:المواصفه|مواصفه|المواصفات|مواصفات)\\s+(?:القياسيه|الدوليه|السعوديه)",
    "(?:الكود|كود)\\s+(?:السعودي|الدولي|البناء|الحريق)",
    "(?:المنظمه\\s+الدوليه\\s+للمعايير|الهيئه\\s+السعوديه\\s+للمواصفات)",
  ].join("|"),
);

const CVE_ID = /\bcve-\d{4}-\d{4,7}\b/i;
const VULNERABILITY = new RegExp(
  `${ar("ثغره|ثغرات").source}|${en("vulnerabilit(?:y|ies)|security advisory|zero[- ]day").source}`,
  "i",
);

const NEWS = new RegExp(
  `${ar("اخبار|خبر|ما\\s+الذي\\s+حدث|ماذا\\s+حدث|اخر\\s+المستجدات").source}|${en("news|headlines?|what happened").source}`,
  "i",
);

const hasChange = (t: string): boolean =>
  CHANGE_AR.test(t) || CHANGE_EN.test(t) || RECENT_YEAR.test(t);
const hasCurrent = (t: string): boolean => CURRENT_AR.test(t) || CURRENT_EN.test(t);
const hasRequirement = (t: string): boolean => REQUIREMENT_AR.test(t) || REQUIREMENT_EN.test(t);

/**
 * هل يحتاج السؤال ذراع الويب؟، مرتَّبة الشروط من الأخصّ إلى الأعمّ، والأول الذي يتحقّق يحسم.
 * يُستدعى على **نصّ المستخدم المكتوب وحده** (بعد نزع كتل المرفقات) لا على كامل الرسالة.
 */
export function classifyWebNeed(question: string): WebNeed {
  if (typeof question !== "string") return NO;
  const t = foldForNeed(question).trim();
  if (t.length < MIN_CHARS) return NO;

  // ١. ثغرة معلنة: معرّف CVE، أو لفظ الثغرة مع تغيّر.
  if (CVE_ID.test(t) || (VULNERABILITY.test(t) && hasChange(t))) {
    return { need: true, kind: "advisory" };
  }

  // ٢. أخبار (النطاق مضمونٌ قبلها: «news» كلمةٌ خارج النطاق ما لم يقترن بكلمةٍ صناعية-أمنية).
  if (NEWS.test(t)) return { need: true, kind: "news" };

  // ٣. إطارٌ تنظيمي خارجي (ليس مرجع HCIS): الفهرس الداخلي لا يملكه.
  const regulatoryFrame = sadeedModeFor(question) === "regulatory";
  const hcis = isHcisReferenceQuery(t) || isHcisReferenceQuery(question);
  if (regulatoryFrame && !hcis) {
    return hasChange(t) || hasCurrent(t) || hasRequirement(t)
      ? { need: true, kind: "regulatory" }
      : NO;
  }

  // ٤. مرجع HCIS (SEC/SAF): نطاق التوجيه يجيبه الفهرس الداخلي؛ لا يُبحث إلا عن **تغيّرٍ صريح**.
  if (regulatoryFrame && hcis) {
    return hasChange(t) ? { need: true, kind: "regulatory" } : NO;
  }

  // ٥. معيار: التعريف المجرّد لا يستحقّ بحثًا.
  if (STANDARD_LATIN.test(t) || STANDARD_ARABIC.test(t)) {
    return hasChange(t) || hasCurrent(t) || hasRequirement(t)
      ? { need: true, kind: "standard" }
      : NO;
  }

  return NO;
}
