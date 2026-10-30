/**
 * تطبيع نتائج البحث بعد المخطط — هنا يُعاد بناء كل ما يصل المستهلك.
 *
 * المبدأ: **n8n ينقل ولا يُوثَق**. فلا يُنسخ حقلٌ من الغلاف إلى النتيجة دون مروره بالكود:
 *
 * - `url`: مرشّح العناوين (`filterUrl`) يُسقط النتيجة كلّها إن لم يصحّ. و`domain` و`tier` يُحسبان
 *   من العنوان المعياري بجدول الكود، لا من أي حقلٍ يدّعيه الغلاف (ولا يقبل المخطط أصلًا حقلًا زائدًا).
 * - `title` و`snippet`: يمرّان بالمعقِّمات القائمة (`safeExcerpt` ⇐ حذف PII وتحييد أوامر الحقن
 *   وعلامات الاستشهاد المزوّرة) بعد نزع محارف التحكّم والتنسيق الخفية، وتحييد قوسَي الزاوية (كي
 *   لا يغلق النصُّ وسمًا أحاط به المستهلك كتلته)، وتحييد الروابط داخل النصّ نفسه على وجهين:
 *   (أ) نصّ الرابط الصريح `http(s)://` و`www.` يصير `[رابط]`؛ (ب) **صياغة الماركداون التي تصنع
 *   رابطًا أو صورةً** (`[نص](هدف)` · `![بديل](هدف)` · `[نص][مرجع]` · `[مرجع]: هدف`) تُعطَّل
 *   بتحويل القوسين المربّعين الواردين من الخارج إلى العريضين `［ ］` — فهدفٌ بلا مخطط
 *   (`//مضيف/…` أو مسارٌ نسبي) كان يمرّ من (أ) ويصير في عارضٍ لا يعيد كتابة الروابط والصور
 *   (نافذة سَدِيد: `react-markdown` + `remark-gfm` بلا تجاوز للمكوّنات) رابطًا قابلًا للنقر وصورةً
 *   تُحمَّل وحدها (إشارة تتبّع بلا نقر). وهذا يغني عن معالجة وسم `[WEB:` على حدة: لا قوسٌ مربّع من الخارج يبلغ
 *   المخرج، فلا يُنشئ نصٌّ بعيد وسم استشهادٍ. وما يبقى من أقواس مربّعة في المخرج هو علاماتنا
 *   وحدها (`[رابط]` و`[[…]]` من المعقِّم)، ويُفصل عنها قوسٌ يليها مباشرةً `(` بفراغ كي لا
 *   يصير `[[…]](//مضيف)` رابطًا. ونصٌّ مجرّد بلا صياغة (`//مضيف/مسار`، `مضيف.com/مسار`) ليس
 *   رابطًا في CommonMark/GFM فلا يُمسّ.
 * - `provider`: معرّفٌ قصير بحروفٍ آمنة؛ لا نصّ حرّ.
 * - `publishedAt`: يُقبل شكل `YYYY-MM-DD…` وتاريخٌ ليس في المستقبل، وإلا `null`.
 *
 * وبعد التطبيع ما يصل المستهلك **بياناتٌ غير موثّقة**: أرقام الويب وتواريخه لا تُعرض كأنها من منظومة
 * المنتج (المادة ٢٧). وسمُ ذلك على المستهلك (`untrusted` في نتيجة العميل).
 */
import { safeExcerpt } from "@/lib/sadeed/rag/sanitize.server";
import { filterUrl, type SourceTier } from "./domain-tiers";
import { RESULT_SNIPPET_CHARS, RESULT_TITLE_CHARS, type RawResearchResult } from "./schema";

export interface WebResult {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
  readonly publishedAt: string | null;
  readonly provider: string;
  readonly domain: string;
  readonly tier: SourceTier;
}

// eslint-disable-next-line no-control-regex -- الغرض نزع محارف التحكّم صراحةً
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g;
const FORMAT = /\p{Cf}/gu;
const INLINE_URL = /\b(?:https?:\/\/|www\.)\S+/gi;
/** قوسٌ مربّع (علامتنا) يليه مباشرةً قوس دائري: يصير هدف رابط في ماركداون. */
const BRACKET_THEN_PAREN = /\](?=\()/g;

/** نصٌّ بعيد ⇒ نصٌّ آمن للعرض والإدراج في كتلة: مسطَّح، بلا حقن، بلا روابط، مقصوص. */
export function sanitizeWebText(input: string, maxChars: number): string {
  const flat = input
    .replace(CONTROL, " ")
    .replace(FORMAT, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/</g, "‹")
    .replace(/>/g, "›")
    // قبل علاماتنا `[رابط]` ومعقِّم الحقن: كل قوسٍ مربّع هنا وارد من الخارج.
    .replace(/\[/g, "［")
    .replace(/\]/g, "］")
    .replace(INLINE_URL, "[رابط]");
  const clean = safeExcerpt(flat, maxChars).replace(BRACKET_THEN_PAREN, "] ");
  return clean.length > maxChars ? clean.slice(0, maxChars) : clean;
}

function providerId(raw: string): string {
  const id = raw.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 40);
  return id.length > 0 ? id : "unknown";
}

const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;
const ONE_DAY_MS = 86_400_000;

/** ISO معياري أو `null`. تاريخٌ بعد الغد يُعدّ مختلَقًا فيُسقط. */
export function normalizePublishedAt(raw: string | null, nowMs: number): string | null {
  if (raw === null || !ISO_DATE_PREFIX.test(raw)) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms) || ms > nowMs + ONE_DAY_MS) return null;
  return new Date(ms).toISOString();
}

/** يطبّع حتى `max` نتيجة صالحة، بترتيب n8n، بلا تكرار عنوان. */
export function normalizeResearchResults(
  raw: readonly RawResearchResult[],
  max: number,
  nowMs: number,
): WebResult[] {
  const seen = new Set<string>();
  const out: WebResult[] = [];
  for (const r of raw) {
    const u = filterUrl(r.url);
    if (!u || seen.has(u.href)) continue;
    seen.add(u.href);
    out.push({
      title: sanitizeWebText(r.title, RESULT_TITLE_CHARS) || u.domain,
      url: u.href,
      snippet: sanitizeWebText(r.snippet, RESULT_SNIPPET_CHARS),
      publishedAt: normalizePublishedAt(r.publishedAt, nowMs),
      provider: providerId(r.provider),
      domain: u.domain,
      tier: u.tier,
    });
    if (out.length >= max) break;
  }
  return out;
}
