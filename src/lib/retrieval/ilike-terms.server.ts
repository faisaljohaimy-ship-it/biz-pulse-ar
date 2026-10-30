/**
 * كلمات المحتوى من السؤال — اشتقاق واحد لمن يحتاج كلماتٍ لا جملة.
 *
 * كانت هذه الدالة داخل `src/lib/sadeed/rag/lexical-arms.server.ts` (الأذرع المعجمية
 * فوق القاعدة). نُقلت هنا **بنصّها** حين احتاجها مستهلكٌ ثانٍ لا يجوز أن يمتدّ
 * إلى القاعدة: بناء موجز البحث الخارجي (`src/lib/n8n/brief.server.ts`). الذراع
 * القاعدية تعيد تصديرها من مكانها القديم، فلا يتغيّر استيراد أحد، ولا نسخة ثانية
 * من المقطِّع (المقطِّع واحد: `tokenize` في `bm25.server.ts`).
 *
 * وحدةٌ في نواة الاسترجاع: خادمٌ فقط، بلا مزوّد ولا شبكة ولا قاعدة (حارس
 * `retrieval.architecture.contract.test.ts` ②).
 */
import { tokenize } from "./bm25.server";
import { normalizeArLight } from "./normalize-ar.server";

export const ILIKE_MAX_TERMS = 6;
const ILIKE_MIN_WORD_LENGTH = 3;

const ARTICLE_PREFIXES = [
  "وبال",
  "فبال",
  "وكال",
  "فكال",
  "ولل",
  "فلل",
  "وال",
  "بال",
  "فال",
  "كال",
  "ال",
  "لل",
];
const WORD_RUN = /[\p{L}\p{N}]+/gu;
// الأرقام الهندية ٠–٩ والفارسية ۰–۹ ⇐ ASCII في كلمات الجلب (الطيّ الخفيف لا يمسّها).
const NON_ASCII_DIGIT = /[٠-٩۰-۹]/g;
export const foldDigits = (w: string) =>
  w.replace(NON_ASCII_DIGIT, (d) => {
    const cp = d.codePointAt(0)!;
    return String.fromCharCode((cp >= 0x06f0 ? cp - 0x06f0 : cp - 0x0660) + 0x30);
  });

/**
 * كلمات المحتوى من السؤال لصياغة `ilike`: الطيّ الخفيف (لا طيّ حروف — كما
 * كُتبت في القاعدة) مع طيّ الأرقام إلى ASCII، بلا كلمات وصل (يحكم بها
 * `tokenize`)، بلا أداة التعريف، بطول ≥ `ILIKE_MIN_WORD_LENGTH`، الأطول أولًا،
 * بلا تكرار، حتى `ILIKE_MAX_TERMS`. حروفٌ وأرقام فقط — فلا فاصلة ولا قوس يكسر
 * سلسلة `.or()`.
 */
export function ilikeTerms(query: string): string[] {
  const words = normalizeArLight(query).match(WORD_RUN) ?? [];
  const out = new Set<string>();
  for (const raw of words) {
    if (tokenize(raw).length === 0) continue; // كلمة وصل أو أقصر من مقطع
    let w = foldDigits(raw);
    const p = ARTICLE_PREFIXES.find((x) => w.startsWith(x) && w.length - x.length >= 3);
    if (p) w = w.slice(p.length);
    if (w.length >= ILIKE_MIN_WORD_LENGTH) out.add(w);
  }
  return Array.from(out)
    .sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, ILIKE_MAX_TERMS);
}
