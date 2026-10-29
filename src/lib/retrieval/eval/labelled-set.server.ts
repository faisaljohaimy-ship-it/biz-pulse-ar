/**
 * المجموعة الموسومة للذراع غير المتّصلة — سبعة أسئلة من كاتب الاختبار.
 *
 * ## ما هي وما ليست
 *
 * أسئلةٌ كتبها كاتب هذا الملف، لكل سؤال جوابٌ واحد يُشار إليه بملف:سطر —
 * والاختبار يفتح السطر ويتحقّق أنه يحمل المعرّف المتوقَّع، فالمرجع مقيس لا
 * مكتوب. هي **بذرة المجموعة المقيسة** ودخانٌ للذراع المعجمية الذاكرية:
 *
 * - ليست مرساة: لا تدخل `GOLDEN_ANCHORS` (تلك أسماء صفوف حرفية بلا تأليف).
 * - ليست «استدعاء@5 على متن موثّق»: المتن هنا مرجع عام مضمّن وأسماء HCIS
 *   بلا نصّ نطاقها، والأسئلة من كاتب واحد لا من مستخدمين.
 * - لا تُستعمل لرفع `rag_enabled` (المادة ٢٧ والبوابة في `CLAUDE.md`): تلك
 *   تحتاج ≥30 سؤالًا على متن موثّق — وهذه سبعة على متن غير موثّق.
 *
 * ## ما تُثبته الأسئلة وما لا تُثبته
 *
 * الخمسة الأولى تشترك مع **عنوان** جوابها في مقطع واحد على الأقل، فهي تشهد
 * للتطبيع والتقطيع والترتيب لا لفهرسة المحتوى (قِيس: فهرسٌ من العناوين وحدها
 * يجيبها كلّها). لذلك يحمل السؤالان السادس والسابع `evidenceAr`: عبارةٌ من
 * **متن** الجواب لا من أي عنوان، ولا يشترك السؤال مع أي عنوان في مقطع —
 * يثبته الاختبار على الفهرس، فهما ما يميّز فهرس المحتوى عن فهرس العناوين.
 *
 * رقمها يُطبع دائمًا مع `offlineLimitsAr` ولا يُقال عاريًا.
 */

export interface LabelledQuestion {
  id: string;
  questionAr: string;
  /** معرّف المدخل المتوقَّع في الفهرس (رمز HCIS أو `source` مدخل البذرة). */
  expectId: string;
  expectSource: "hcis" | "seed";
  /** `path:line` — السطر يحمل `expectId` حرفيًّا؛ يُفتح في الاختبار. */
  answerRef: string;
  /**
   * عبارة من متن الجواب تحمل الإجابة — حاضرة في `text` المدخل المتوقَّع، غائبة
   * عن كل عنوان. تُكتب للأسئلة التي لا تشترك مع أي عنوان في مقطع، فتميّز
   * فهرس المحتوى عن فهرس العناوين (يفحصه `seed-corpus.test.ts`).
   */
  evidenceAr?: string;
}

export const LABELLED_QUESTIONS: readonly LabelledQuestion[] = [
  {
    id: "q1-fences",
    questionAr: "ما متطلبات الأسوار الأمنية حول المنشأة؟",
    expectId: "SEC-02",
    expectSource: "hcis",
    answerRef: "src/lib/rag/evaluation.ts:59",
  },
  {
    id: "q2-stage-60",
    questionAr: "ماذا يُراجَع في مرحلة التصميم التفصيلي 60%؟",
    expectId: "STAGE-04",
    expectSource: "hcis",
    answerRef: "src/lib/rag/evaluation.ts:84",
  },
  {
    id: "q3-petrochemicals",
    questionAr: "هل البتروكيماويات قطاع خاضع لتنظيم الهيئة؟",
    expectId: "SECTOR-03",
    expectSource: "hcis",
    answerRef: "src/lib/rag/evaluation.ts:92",
  },
  {
    id: "q4-incident-analysis",
    questionAr: "ما خطوات تحليل الحوادث والتحقيق فيها؟",
    expectId: "platform-reference/incident-analysis-ar",
    expectSource: "seed",
    answerRef: "src/lib/sadeed/seed-corpus.data.ts:33",
  },
  {
    id: "q5-permit-isolation",
    questionAr: "كيف نتحقق من العزل ومصادر الطاقة قبل إصدار تصريح العمل؟",
    expectId: "platform-reference/permit-isolation-ar",
    expectSource: "seed",
    answerRef: "src/lib/sadeed/seed-corpus.data.ts:39",
  },
  // سؤالان من المحتوى وحده — لا مقطع مشترك مع أي عنوان في الفهرس.
  {
    id: "q6-corrective-action",
    questionAr: "ما الذي يلزم للإجراء التصحيحي بعد الحادث: مالك وموعد؟",
    expectId: "platform-reference/incident-analysis-ar",
    expectSource: "seed",
    answerRef: "src/lib/sadeed/seed-corpus.data.ts:33",
    evidenceAr: "تعيين إجراء تصحيحي بمالك وموعد وطريقة تحقق",
  },
  {
    id: "q7-concurrent-work",
    questionAr: "كيف يُعامَل التداخل مع الأعمال المتزامنة في التصريح؟",
    expectId: "platform-reference/permit-isolation-ar",
    expectSource: "seed",
    answerRef: "src/lib/sadeed/seed-corpus.data.ts:39",
    evidenceAr: "التداخل مع الأعمال المتزامنة",
  },
];

/** نصّ الحدود الملزِم — يُطبع مع كل رقم تخرجه الذراع غير المتّصلة. */
export function offlineLimitsAr(n: number): string {
  return `مجموعة موسومة ${n} سؤالًا من كاتب الاختبار؛ ليست استدعاء@5 على متن موثّق؛ لا تُستعمل لرفع rag_enabled`;
}
