/**
 * إسناد المخاطر المتوقَّعة — **الرقم الذي يكتبه النموذج يُفحَص، لا يُوثَق به.**
 *
 * ## العلّة المقيسة
 *
 * مسار Gemini في `predictive.functions` كان يأخذ `why_ar` حرفيًّا:
 * `why_ar: String(r.why_ar ?? "")`. والموجِّه يقول
 * «Do not add facts beyond the signal» — **وهو رجاءٌ لا قيد**. فجملةٌ
 * يخترع فيها النموذج «٣٤ مقاولًا» أو «٤٣°» تصل الشاشة التنفيذية الأمنية
 * في خانة «السبب»، لا يفرّقها قارئٌ عن المسار الحتميّ المبنيّ من عدّات
 * مرصودة. والرقم المخترَع في سياقٍ أمنيّ يُتصرَّف به.
 *
 * ## القيد
 *
 * **كل رقمٍ في نصّ النموذج يجب أن يكون في الإشارة التي وُلِّد منها.**
 * الصياغة التنفيذية من النموذج — مسموحة ومطلوبة؛ أمّا الوقائع العددية
 * فمن القياس وحده. وما يخالف يسقط إلى البطاقة الحتميّة لذلك الموقع:
 * لا حذفَ للبند ولا عرضَ لرقمٍ بلا أصل.
 *
 * والتحيّز مقصود نحو الرفض: بطاقةٌ حتميّة صحيحة أفضل من صياغةٍ أجمل
 * تحمل رقمًا لا أصل له.
 *
 * ## ولماذا لا تُعرض «ثقة ٨٧٪»
 *
 * كانت تُعرض، وكان مصدرها على مسار النموذج **رقمًا يقوله النموذج عن
 * نفسه**، وعلى مسار المحاكاة ثابتًا مكتوبًا (`0.87`). وكلاهما يُرسم
 * كأنّه قياس. والنسبة المئوية توحي بدقّةٍ لا مصدر لها (المادة ٢٧).
 * فحلّت محلّها العدّات المرصودة نفسها — وهي أنفع وأصدق: «٤ بلاغات ·
 * حرج ١ · آخر ٢٤س: ٢».
 */
import type { Confidence, Evidence } from "@/lib/evidence/evidence";

/** الإشارة المقيسة التي يقوم عليها بندُ خطرٍ واحد. */
export interface RiskSignal {
  readonly siteId: string;
  /** بلاغات آخر سبعة أيام. */
  readonly total7d: number;
  /** الحرج منها. */
  readonly critical7d: number;
  /** ما وقع في آخر أربعٍ وعشرين ساعة. */
  readonly last24h: number;
  /** درجة الشذوذ عن معدّل المواقع. */
  readonly z: number;
}

/** نافذتا القياس — ثابتتان تظهران في النصّ بحقّ لا اختراعًا. */
const WINDOW_CONSTANTS = [7, 24] as const;

/**
 * الأرقام المسموح ظهورها في نصٍّ مبنيٍّ على هذه الإشارة.
 *
 * العدّات المرصودة، ونافذتا القياس (٧ أيام · ٢٤ ساعة)، والأفق الزمني،
 * ودرجة الشذوذ كما تُعرض في الإشارة (منزلتان).
 */
export function allowedNumbersOf(s: RiskSignal, horizonHours: number): ReadonlySet<number> {
  return new Set<number>([
    s.total7d,
    s.critical7d,
    s.last24h,
    ...WINDOW_CONSTANTS,
    horizonHours,
    Number(s.z.toFixed(2)),
    Math.round(s.z),
  ]);
}

const ARABIC_INDIC = /[٠-٩۰-۹]/g;

/** يوحّد الأرقام العربية-الهندية إلى اللاتينية قبل الاستخراج. */
function normalizeDigits(text: string): string {
  return text.replace(ARABIC_INDIC, (d) => {
    const c = d.charCodeAt(0);
    const base = c >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(c - base);
  });
}

/** كل رقمٍ مكتوب في النصّ — صحيحًا كان أو عشريًّا. */
export function numbersIn(text: string): readonly number[] {
  const out: number[] = [];
  for (const m of normalizeDigits(text).matchAll(/\d+(?:[.,]\d+)?/g)) {
    const n = Number(m[0].replace(",", "."));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

export interface NarrationVerdict {
  readonly accepted: boolean;
  /** الأرقام التي لا أصل لها في الإشارة — سببُ الرفض حين يقع. */
  readonly ungrounded: readonly number[];
}

/**
 * هل يجوز عرض نصّ النموذج؟
 *
 * يُرفض النصّ الحامل رقمًا ليس في الإشارة. ويُرفض الفارغ: بندُ خطرٍ بلا
 * سببٍ مكتوب أسوأ من بطاقةٍ حتميّة تقول العدّات صراحةً.
 */
export function judgeNarration(
  texts: readonly string[],
  signal: RiskSignal,
  horizonHours: number,
): NarrationVerdict {
  if (texts.some((t) => t.trim().length === 0)) return { accepted: false, ungrounded: [] };
  const allowed = allowedNumbersOf(signal, horizonHours);
  const ungrounded = texts
    .flatMap((t) => numbersIn(t))
    .filter((n) => !allowed.has(n))
    // العدد قد يُكتب مقرَّبًا («٢٫٣» عن z=2.34) — تُقبل المطابقة بمنزلتين.
    .filter((n) => !allowed.has(Number(n.toFixed(2))));
  return { accepted: ungrounded.length === 0, ungrounded };
}

/**
 * مفتاح مطابقةٍ موحَّد لاسم موقع.
 *
 * النموذج يعيد الاسم كما أُعطي له، وقد يزيد فراغًا أو يغيّر حالة حرف.
 * فالمطابقة على صورةٍ موحَّدة لا على النصّ الخام.
 */
export function siteKey(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * هل يذكر النصّ موقعًا **غير** موقعه؟
 *
 * حارسٌ ثانٍ فوق المطابقة بالهويّة: قد يُصيب النموذج في حقل `site` ويخطئ
 * في المتن، فيُنسب كلامٌ عن موقعٍ إلى عدّات موقعٍ آخر. والاسم في المتن
 * هو ما يقرؤه المسؤول، لا الحقل.
 */
export function namesOtherSite(
  texts: readonly string[],
  ownNames: readonly string[],
  otherNames: readonly string[],
): boolean {
  const hay = texts.join(" ").toLowerCase();
  const own = new Set(ownNames.map((n) => siteKey(n)).filter((n) => n.length > 0));
  return otherNames
    .map((n) => siteKey(n))
    .filter((n) => n.length > 0 && !own.has(n))
    .some((n) => hay.includes(n));
}

/**
 * دليلُ بندِ خطرٍ مبنيٍّ على بلاغات موقع.
 *
 * `observedAt` لحظةُ القراءة فعلًا — الاستعلام وقع الآن، وهذا رصدٌ لا
 * تاريخٌ مكتوب (FR-19 §3).
 */
export function incidentEvidence(signal: RiskSignal, observedAt: string): Evidence {
  return {
    kind: "db.query",
    source: "sec_incidents",
    entity: { kind: "site", id: signal.siteId },
    observedAt,
    value: signal.total7d,
    limitation:
      signal.total7d < 5 ? "عيّنة صغيرة — درجة الشذوذ غير مستقرّة على هذا الحجم" : undefined,
  };
}

/**
 * درجة اليقين لبندٍ مبنيٍّ على هذه الإشارة.
 *
 * `measured` **لا تُمنح هنا بحال**: العدّات مقيسة، أمّا كونُها «خطرًا
 * متوقَّعًا» فاستنتاجٌ من درجة شذوذٍ على عيّنة أسبوع. فالمشتقّ عن عيّنةٍ
 * كافية `derived`، وما دونها `estimated` — والعيّنة الصغيرة لا تُرفَّع
 * بصياغةٍ واثقة.
 */
export function confidenceOf(signal: RiskSignal): Confidence {
  return signal.total7d >= 5 ? "derived" : "estimated";
}
