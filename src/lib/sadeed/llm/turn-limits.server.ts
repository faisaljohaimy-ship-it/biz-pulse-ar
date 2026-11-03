/**
 * سقف خطوات الأدوات لدور الدردشة (٢٠٢٦/١١/٠٣).
 *
 * ## لماذا
 *
 * كل خطوة أدوات جولة نموذجٍ كاملة متسلسلة (التعليمات الثابتة ومخططات الأدوات تُعاد في كل
 * خطوة) ثم استعلام قاعدة بلا مهلة خاصة. السقف القديم 8 لكل الأوضاع يتيح لسؤالٍ عاديّ ثمانيَ
 * جولات، وعدد الخطوات الفعلي في الإنتاج **غير مقيس بعد** (يقيسه `steps[]` في سطر
 * `[api/chat] timing`) — فلا يُنسب لهذا السقف تحسّنٌ لم يُقس.
 *
 * ## القواعد
 *
 * - النص والصوت: **4**. العميق (`deep`): **8** كما كان.
 * - `SADEED_MAX_STEPS_TEXT` (عددٌ صحيح 2..8) يتجاوز سقف النص والصوت **وحدهما**، ويُقرأ عند كل
 *   طلب؛ ما خرج عن النطاق أو لم يكن عددًا صحيحًا خالصًا يُهمَل (يعود 4) — لا يُقصّ إلى الحدّ.
 * - المحوّل الاختياري (OpenAI) سقفه 2 في `chat.ts` ولا يمرّ من هنا.
 */

export const MAX_STEPS_TEXT_DEFAULT = 4;
export const MAX_STEPS_DEEP = 8;
const MAX_STEPS_TEXT_MIN = 2;
const MAX_STEPS_TEXT_MAX = 8;

type EnvLike = Record<string, string | undefined>;

/** سقف الخطوات لهذا الدور (غير المحوّل الاختياري). */
export function maxStepsFor(replyMode: string, env: EnvLike = process.env): number {
  if (replyMode === "deep") return MAX_STEPS_DEEP;
  const raw = env.SADEED_MAX_STEPS_TEXT?.trim() ?? "";
  if (/^\d{1,2}$/.test(raw)) {
    const n = Number(raw);
    if (n >= MAX_STEPS_TEXT_MIN && n <= MAX_STEPS_TEXT_MAX) return n;
  }
  return MAX_STEPS_TEXT_DEFAULT;
}

/**
 * `prepareStep` لـ`generateText`: عند **آخر خطوةٍ** يسمح بها السقف تُمنع الأدوات
 * (`toolChoice: "none"`) فيكتب النموذج جوابه من نتائج الخطوات السابقة.
 *
 * ## لماذا (نتيجة مباشرة لخفض السقف من 8 إلى 4)
 *
 * `stepCountIs(n)` يوقف التوليد بعد الخطوة n **أيًّا كان ما أنتجته**. فإن كانت الخطوة الأخيرة
 * نداءَ أدوات فنصّ الدور فارغ: أُنفقت الأدوات واستعلاماتها ولم يصل المستخدم جوابٌ — وكلما خفّ
 * السقف زاد احتمال ذلك. هذا يضمن أن آخر خطوة مسموحة تُنتج نصًّا، ولا يغيّر شيئًا في دورٍ
 * انتهى قبل السقف.
 *
 * `stepNumber` يبدأ من الصفر، فآخر خطوة مسموحة رقمها `maxSteps - 1`.
 */
export function lastStepAnswers(maxSteps: number) {
  return ({ stepNumber }: { stepNumber: number }) =>
    stepNumber >= maxSteps - 1 ? { toolChoice: "none" as const } : undefined;
}
