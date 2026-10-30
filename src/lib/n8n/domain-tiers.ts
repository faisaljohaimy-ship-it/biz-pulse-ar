/**
 * مرشّح العناوين وجدول مراتب المصادر — ملكُ الكود لا ملكُ n8n.
 *
 * ## الثقة لا تأتي من الخارج
 *
 * n8n ينقل نتائج بحثٍ جاءت من الويب؛ فحقلا `domain` و`tier` اللذان قد يرسلهما **لا يُقرآن
 * أبدًا**. يُعاد حسابهما هنا من العنوان نفسه بعد مرشّحه: اسم المضيف من `URL` المحلَّل، والمرتبة
 * من الجدول أدناه. فنتيجةٌ تدّعي «رسمي» وعنوانها موقع مجهول تخرج «غير معروف».
 *
 * ## المرشّح (يُسقط ولا يُصلح)
 *
 * يُسقط كل عنوانٍ: ليس `https://` صريحًا · فيه فراغٌ أو محرف تحكّم أو شرطة مائلة عكسية أو علامة
 * اقتباس (المحلِّل يبتلع الأسطر والفراغات بصمت فيُظهر عنوانًا غير المكتوب) · فيه اسم مستخدم أو
 * كلمة مرور · مضيفه رقم IP (أي صيغة: المحلِّل يطوي الصيغ العشرية والسداسية إلى الرباعية
 * المنقّطة قبل الفحص) · أو اسم داخلي (`localhost` · بلا نقطة · لاحقة `.local`/`.internal`) ·
 * منفذٌ غير الافتراضي · أو أطول من `MAX_URL_CHARS`. ويُسقَط **العنوان المبتور ولا يُقصّ**:
 * عنوانٌ مقصوص عنوانٌ آخر.
 *
 * التطبيق لا يجلب هذه العناوين أبدًا (n8n وحده يلمس الويب)، فالمرشّح لا يحمي من SSRF بل يحمي
 * القارئ: لا رابط داخليّ ولا رابط بهوية مضمّنة يصل شاشةً أو ردًّا.
 *
 * ## الجدول
 *
 * حكمٌ تحريري يملكه الكود ويراجعه المالك، لا حقيقةٌ مثبتة. «رسمي» = جهةٌ تتحدّث عن نفسها
 * (حكومة · هيئة معايير · وثائق المنتج من صانعه)، «مرجع» = مرجعٌ مصانٌ عامّ، «مجتمع» = محتوى
 * مستخدمين. وكل ذلك **لا يجعل الرقم القادم من الويب موثّقًا** (المادة ٢٧): المرتبة وصف المصدر
 * لا شهادة بالمحتوى.
 */

export const SOURCE_TIERS = ["official", "reference", "community", "unknown"] as const;
export type SourceTier = (typeof SOURCE_TIERS)[number];

/** أقصى طول لعنوان نتيجة (العقد: `url` ≤ 300). */
export const MAX_URL_CHARS = 300;

/** لاحقة اسم المضيف ← مرتبته. المطابقة على حدّ التسمية (النقطة) والأطول لاحقةً يفوز. */
const TIER_TABLE: ReadonlyArray<readonly [suffix: string, tier: Exclude<SourceTier, "unknown">]> = [
  // رسمي — حكومات وجهات معايير
  ["gov.sa", "official"],
  ["edu.sa", "official"],
  ["gov", "official"],
  ["gov.uk", "official"],
  ["europa.eu", "official"],
  ["who.int", "official"],
  ["ilo.org", "official"],
  ["un.org", "official"],
  ["iso.org", "official"],
  ["nist.gov", "official"],
  ["cisa.gov", "official"],
  ["osha.gov", "official"],
  ["cve.org", "official"],
  // رسمي — وثائق المنتج من صانعه
  ["docs.n8n.io", "official"],
  ["supabase.com", "official"],
  ["vercel.com", "official"],
  ["nodejs.org", "official"],
  ["react.dev", "official"],
  ["typescriptlang.org", "official"],
  ["vitest.dev", "official"],
  ["zod.dev", "official"],
  ["tanstack.com", "official"],
  ["postgresql.org", "official"],
  ["docs.github.com", "official"],
  ["ai.google.dev", "official"],
  ["developers.google.com", "official"],
  ["cloud.google.com", "official"],
  ["learn.microsoft.com", "official"],
  ["elevenlabs.io", "official"],
  // مرجع
  ["wikipedia.org", "reference"],
  ["developer.mozilla.org", "reference"],
  ["owasp.org", "reference"],
  ["npmjs.com", "reference"],
  ["w3.org", "reference"],
  ["ietf.org", "reference"],
  ["rfc-editor.org", "reference"],
  // مجتمع
  ["github.com", "community"],
  ["stackoverflow.com", "community"],
  ["stackexchange.com", "community"],
  ["reddit.com", "community"],
  ["medium.com", "community"],
  ["dev.to", "community"],
  ["quora.com", "community"],
  ["x.com", "community"],
  ["twitter.com", "community"],
  ["youtube.com", "community"],
  ["linkedin.com", "community"],
  ["facebook.com", "community"],
];

/** الأطول لاحقةً أولًا: `docs.github.com` رسميّ بينما `github.com` مجتمع. */
const TABLE_BY_SPECIFICITY = [...TIER_TABLE].sort((a, b) => b[0].length - a[0].length);

/** مراتب المصدر من اسم المضيف وحده (حروف صغيرة، بلا `www.`). */
export function tierOfHost(host: string): SourceTier {
  const h = host.toLowerCase();
  for (const [suffix, tier] of TABLE_BY_SPECIFICITY) {
    if (h === suffix || h.endsWith(`.${suffix}`)) return tier;
  }
  return "unknown";
}

/**
 * وضع التنظيم (`regulatory`، المادة ٩: المصادر غير الرسمية للوائح محظورة): لا يُقبل إلا مضيفٌ تحت
 * `gov.sa` (جهات حكومية سعودية). وهذا أضيق من مرتبة «رسمي» العامة عمدًا: وثائق صانعي المنتجات
 * (`supabase.com`) و`nist.gov` و`who.int` مراتبها «رسمي» وليست مصدر لائحة سعودية. يطابق الحكمُ
 * ما يطبّقه مسار n8n على نقله (`regulatoryHostAllowed` في n8n/code/merge-rank.js)، والتطبيق يعيده من
 * جدوله ولا يكتفي بإسقاط n8n وحده (يحرسه `n8n/tests/p1-p2-loopback.test.ts`).
 */
export function isRegulatoryOfficialHost(host: string): boolean {
  return host.toLowerCase().endsWith(".gov.sa");
}

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const LABEL = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/;
/** نطاقاتٌ عليا لا تدلّ على موقعٍ عامّ. */
const NON_PUBLIC_TLDS: ReadonlySet<string> = new Set([
  "localhost",
  "local",
  "internal",
  "localdomain",
  "lan",
  "home",
  "corp",
  "intranet",
  "onion",
]);

/**
 * هل هو اسم مضيفٍ عامّ؟ نعم فقط إن كان: بلا IP بأي صيغة، بنقطة واحدة على الأقل، تسمياته
 * حروفًا وأرقامًا وشرطات (أو punycode)، ونطاقه الأعلى حروفٌ وليس من النطاقات غير العامة.
 */
export function isPublicHostname(host: string): boolean {
  const h = host.toLowerCase();
  if (h.length === 0 || h.length > 253) return false;
  if (h.includes(":") || h.startsWith("[")) return false; // IPv6
  if (IPV4.test(h)) return false;
  const labels = h.split(".");
  if (labels.length < 2) return false;
  if (!labels.every((l) => LABEL.test(l))) return false;
  const tld = labels[labels.length - 1];
  if (/^\d+$/.test(tld)) return false;
  return !NON_PUBLIC_TLDS.has(tld);
}

/** فراغٌ أو تحكّمٌ أو اقتباسٌ أو شرطة مائلة عكسية أو قوسا زاوية — محارف يبتلعها المحلِّل أو تكسر الإحالة. */
// eslint-disable-next-line no-control-regex -- الغرض رفض محارف التحكّم صراحةً
const FORBIDDEN_RAW = /[\s\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\u2060\ufeff\\"'`<>]/u;

export interface SafeUrl {
  /** العنوان بصيغته المعيارية بلا شظية `#…`. */
  readonly href: string;
  /** اسم المضيف بحروف صغيرة بلا `www.` — يُحسب هنا لا يُقرأ من n8n. */
  readonly domain: string;
  readonly tier: SourceTier;
}

/** يعيد العنوان المعياري ومضيفه ومرتبته، أو `null` (يُسقط ولا يُصلح). */
export function filterUrl(raw: unknown): SafeUrl | null {
  if (typeof raw !== "string") return null;
  if (raw.length === 0 || raw.length > MAX_URL_CHARS) return null;
  if (!/^https:\/\//i.test(raw)) return null;
  if (FORBIDDEN_RAW.test(raw)) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.username !== "" || u.password !== "") return null;
  if (u.port !== "") return null; // 443 يُطوى إلى فارغ؛ أي منفذٍ آخر يُسقط
  if (!isPublicHostname(u.hostname)) return null;
  u.hash = "";
  const href = u.href;
  if (href.length > MAX_URL_CHARS) return null;
  const domain = u.hostname.toLowerCase().replace(/^www\./, "");
  return { href, domain, tier: tierOfHost(domain) };
}
