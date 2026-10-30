/**
 * وسم التشابه الصادق (O7 د، المادة ٢٧) — مصدرٌ واحد لكل سطحٍ يطبع نسبةً.
 *
 * ## العطل الذي يمنعه
 *
 * بعد الخطوة ٢ صار التشابه فارغًا بالتصميم حين تخدم الذراع المعجمية وحدها
 * (`similarity: null` في `RagCitation`، و`0` في `RagHit` الذي لم يُقَس له
 * شيء). ثلاثة أسطح كانت تضرب الرقم في مئة وتطبعه بلا حارس كافٍ:
 * `sadeed-documents.tsx` و`sec.knowledge.tsx` ونصّ وكيل المعرفة في
 * `orchestrator/agents.ts`. `Math.round(null * 100)` يعطي `0` فيظهر «تطابق 0%»،
 * و`undefined * 100` يعطي `NaN` فيظهر «تطابق NaN%» — رقمان لم يقسهما أحد.
 *
 * ## القاعدة
 *
 * النسبة تُطبع **لكوساين محسوب وحده**: رقم منتهٍ يُقرَّب إلى 1% فأكثر. الصفر
 * في هذا المستودع علامة «لم يُقَس» (`retrieve.server.ts`: `similarity: 0` للمعجمي)
 * لا قياسٌ صفريّ، فلا يُطبع. وما عدا ذلك وسمٌ محايد: «مطابقة نصّية» للذراع
 * المعجمية (ولو حملت رقمًا — درجة BM25 ليست تشابهًا دلاليًّا)، و«تطابق لم يُقَس»
 * لغيرها. بلا `.server` عمدًا: تستورده الواجهة والخادم معًا، وهو دوال نقيّة.
 */

import { UNMEASURED_AR } from "@/lib/reports/report-document.types";

/** وسم الذراع المعجمية — لا نسبة معه أبدًا. */
export const LEXICAL_MATCH_LABEL_AR = "مطابقة نصّية" as const;

/** حين لا كوساين محسوبًا ولا ذراع معجمية: المادة ٢٧ — النصّ الموحَّد «لم يُقَس» نفسه. */
export const SIMILARITY_UNMEASURED_AR = `تطابق ${UNMEASURED_AR}`;

/**
 * النسبة المئوية الصحيحة (1–100) لكوساين محسوب، وإلا `null`.
 * `null` · `undefined` · `NaN` · `±Infinity` · سالب · صفر · ما يُقرَّب إلى أقل من
 * 1% · نصٌّ غير رقمي ⇒ `null`. الرقم النصّي («0.82» من PostgREST) يُقبل.
 */
export function computedSimilarityPercent(value: unknown): number | null {
  const n =
    typeof value === "number" ? value : typeof value === "string" && value.trim() ? +value : NaN;
  if (!Number.isFinite(n)) return null;
  const percent = Math.round(n * 100);
  if (percent < 1) return null;
  return Math.min(percent, 100);
}

/**
 * كوساين ضربة `retrieveWithEvidenceGate` إن حُسب، وإلا `null` (مراجعة O7، المادة ٢٧).
 *
 * `RagHit.similarity` رقم **البوّابة** لا كوساين: لضربةٍ `dense_score = 0` (نصّية/ثلاثية
 * فقط) يُشتقّ من `min(1, rrf_score * 30)`، وهو ترتيبٌ مدموج مضروب في ثابت — يمرّ حدّ
 * الانتهاء وحدّ 1% فيُطبع «تطابق 98%» لما لم يحسب أحدٌ له كوساينًا. الكوساين المحسوب
 * الوحيد هو `dense_score` لضربةٍ ليست معجمية؛ وما عداه `null` ⇒ يطبعه
 * `similarityLabelAr` «تطابق لم يُقَس». رقم البوّابة نفسه لم يُمسّ.
 */
export function hybridHitCosine(hit: { arm: string; dense_score?: unknown }): number | null {
  if (hit.arm === "lexical") return null;
  return computedSimilarityPercent(hit.dense_score) === null ? null : Number(hit.dense_score);
}

/**
 * السطر الذي يُعرض بدل `تطابق ${Math.round(x * 100)}%`:
 * - ذراع معجمية ⇒ «مطابقة نصّية» دائمًا، ولو وصل رقمٌ معها.
 * - كوساين محسوب ⇒ «تطابق NN%».
 * - غير ذلك ⇒ «تطابق لم يُقَس» — لا `0%` ولا `NaN%` ولا `null%`.
 */
export function similarityLabelAr(value: unknown, opts: { lexical?: boolean } = {}): string {
  if (opts.lexical) return LEXICAL_MATCH_LABEL_AR;
  const percent = computedSimilarityPercent(value);
  return percent === null ? SIMILARITY_UNMEASURED_AR : `تطابق ${percent}%`;
}
