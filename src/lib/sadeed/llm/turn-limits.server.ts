/**
 * سقف خطوات الأدوات لدور الدردشة (٢٠٢٦/١١/٠٣).
 *
 * ## لماذا
 *
 * كل خطوة أدوات جولة نموذجٍ كاملة متسلسلة (التعليمات ≈45 ألف حرف + مخططات 33 أداة ≈34
 * ألف حرف تُعاد في كل خطوة) ثم استعلام قاعدة بلا مهلة خاصة. السقف القديم 8 لكل الأوضاع
 * يتيح لسؤالٍ عاديّ ثمانيَ جولات. المقيس: مرحلة النموذج 85–87% من زمن الخادم، لكن عدد
 * الخطوات الفعلي **غير مقيس بعد** (يقيسه `steps[]` في سطر `[api/chat] timing`).
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
export const MAX_STEPS_TEXT_MIN = 2;
export const MAX_STEPS_TEXT_MAX = 8;

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
