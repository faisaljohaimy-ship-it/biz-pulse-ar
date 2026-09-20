/**
 * دورات سجلّ الدخول — نصف سنةٍ تتجدّد **من نفسها** لا بمهمّةٍ مجدولة.
 *
 * ## «تتجدّد تلقائيًّا» — بالاشتقاق لا بالجدولة
 *
 * أمر المالك: قائمةٌ ثابتة تُجدَّد كل ستة أشهر تلقائيًّا. ولها تنفيذان:
 *
 * ① **مهمّة مجدولة** تُغلق دورةً وتفتح أخرى. وهي أسوأ الاثنين هنا: تحتاج
 *    بنيةً تشغيلية، وتتعطّل صامتةً، وإن لم تعمل ليلةَ الانتقال بقي السجلّ
 *    في دورةٍ منتهية بلا أن ينتبه أحد — أي **تجديدٌ موعودٌ لا واقع**.
 *
 * ② **الاشتقاق من التاريخ** — وهو المعتمد هنا: الدورة دالّةٌ في اللحظة
 *    الحاضرة، فتنتقل بنفسها عند منتصف ليل أوّل يوليو/يناير بلا أن يعمل
 *    شيء. لا جدولة تتعطّل، ولا حالة تُخزَّن فتفسد، ولا فرق بين خادمٍ
 *    نائم وآخر عامل. والتجديد هنا **لا يمكن أن يفشل** لأنه ليس حدثًا.
 *
 * ## ولماذا أنصاف السنة التقويمية لا «ستة أشهر من أول تشغيل»
 *
 * دورةٌ تبدأ من تاريخ التشغيل تجعل الحدود مختلفةً لكل بيئةٍ ولكل نسخة،
 * فلا يتطابق تقريران ولا يُراجَع سجلٌّ مع آخر. والتقويمية مشتركة بين كل
 * من ينظر: «النصف الأول ٢٠٢٦» يعني الشيء نفسه للجميع وإلى الأبد.
 *
 * ## والحدود بتوقيت الرياض لا UTC
 *
 * النظام موحَّد على `Asia/Riyadh` (الساعة العلوية تنصّ عليه). ولو حُسبت
 * الحدود بـUTC لوقع **دخولٌ بين ٠٠:٠٠ و٠٣:٠٠ بتوقيت الرياض في أوّل يوم
 * من الدورة** في الدورة السابقة — ثلاث ساعاتٍ تُنسب إلى نصفٍ خطأ مرّتين
 * في السنة. والرياض UTC+3 ثابتًا بلا توقيت صيفي، فالحدّ يُكتب `+03:00`
 * مباشرةً بلا حسابٍ للإزاحة.
 */

/** الإزاحة الثابتة للرياض — لا توقيت صيفي في السعودية. */
const RIYADH_OFFSET = "+03:00";

/** مفتاح دورة: `2026-H1` أو `2026-H2`. */
export type PeriodKey = `${number}-H${1 | 2}`;

export interface AccessPeriod {
  readonly key: string;
  /** بداية الدورة شاملة — ISO بلحظة UTC. */
  readonly startIso: string;
  /** نهاية الدورة **غير شاملة** — ISO بلحظة UTC. */
  readonly endIso: string;
  /** «النصف الأول ٢٠٢٦ (يناير — يونيو)» */
  readonly labelAr: string;
  readonly year: number;
  readonly half: 1 | 2;
}

function halfOfMonth(month0: number): 1 | 2 {
  return month0 < 6 ? 1 : 2;
}

/**
 * تقويم الرياض للحظةٍ ما — السنة والشهر كما يراهما من في الرياض.
 *
 * `Intl` هو المرجع لا حسابٌ يدويّ: طرحُ ثلاث ساعاتٍ بالأرقام يخطئ عند
 * حدود الشهر والسنة، وهذا بالضبط موضع الحدّ الذي نحسبه.
 */
function riyadhParts(at: Date): { year: number; month0: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
  });
  const [y, m] = fmt.format(at).split("-");
  return { year: Number(y), month0: Number(m) - 1 };
}

/** الدورة التي تقع فيها اللحظة المعطاة. */
export function periodOf(at: Date): AccessPeriod {
  const { year, month0 } = riyadhParts(at);
  return buildPeriod(year, halfOfMonth(month0));
}

/** الدورة الجارية الآن. */
export function currentPeriod(now: Date = new Date()): AccessPeriod {
  return periodOf(now);
}

export function buildPeriod(year: number, half: 1 | 2): AccessPeriod {
  const startMonth = half === 1 ? "01" : "07";
  const start = new Date(`${year}-${startMonth}-01T00:00:00${RIYADH_OFFSET}`);
  // النهاية غير شاملة = بداية الدورة التالية. وبذلك لا تسقط لحظةٌ بين
  // دورتين ولا تُحسب مرّتين — وهو ما يقع حين تُكتب النهاية «آخر ثانية».
  const end =
    half === 1
      ? new Date(`${year}-07-01T00:00:00${RIYADH_OFFSET}`)
      : new Date(`${year + 1}-01-01T00:00:00${RIYADH_OFFSET}`);
  return {
    key: `${year}-H${half}`,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    labelAr:
      half === 1 ? `النصف الأول ${year} (يناير — يونيو)` : `النصف الثاني ${year} (يوليو — ديسمبر)`,
    year,
    half,
  };
}

/** يقرأ مفتاحًا نصيًّا، أو `null` إن لم يكن مفتاح دورة صالحًا. */
export function parsePeriodKey(key: string): AccessPeriod | null {
  const m = /^(\d{4})-H([12])$/.exec(key.trim());
  if (!m) return null;
  return buildPeriod(Number(m[1]), Number(m[2]) as 1 | 2);
}

/** الدورة السابقة لدورةٍ ما. */
export function previousPeriod(p: AccessPeriod): AccessPeriod {
  return p.half === 2 ? buildPeriod(p.year, 1) : buildPeriod(p.year - 1, 2);
}

/**
 * الدورات الأحدث نزولًا — الجارية أوّلًا.
 *
 * تُستعمل لقائمة الاختيار: «ثابتة» تعني أن الدورة المنتهية لا تتغيّر،
 * لا أن ما قبلها يُمحى. وسجلُّ دخولٍ يُمحى نصفُه كل ستة أشهر ليس سجلًّا.
 */
export function recentPeriods(count: number, now: Date = new Date()): AccessPeriod[] {
  const out: AccessPeriod[] = [];
  let p = currentPeriod(now);
  for (let i = 0; i < Math.max(1, count); i++) {
    out.push(p);
    p = previousPeriod(p);
  }
  return out;
}

/** هل انتهت الدورة؟ (‏الجارية لم تنتهِ بعد) */
export function isClosed(p: AccessPeriod, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(p.endIso).getTime();
}
