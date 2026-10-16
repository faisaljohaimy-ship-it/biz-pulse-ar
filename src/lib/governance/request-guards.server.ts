/**
 * حارسا الطلب في الذاكرة — لكل معزول (isolate) — لمسار `/api/chat` (VIBE 5.1).
 *
 * 1. **منع التكرار**: الطلب نفسه (الهوية + المحادثة + نصّ السؤال) وهو ما زال قيد
 *    المعالجة لا يُرسَل إلى النموذج مرّةً ثانية. يحمي من النقر المزدوج ومن
 *    عاصفة إعادة المحاولة حين يبطؤ الردّ.
 * 2. **سقف التزامن**: عددٌ أقصى من نداءات النموذج الجارية معًا في المعزول؛
 *    ما فوقه يُجاب فورًا بـ«مشغول» و`Retry-After` قصير بدل أن يتكدّس على
 *    المزوّد ويُطيل انتظار الجميع.
 *
 * الحالة: بصمات (hash) وطوابع زمنية وعدّاد — لا نصّ ولا هوية خامًا. وكلّ
 * مدخلٍ له عمرٌ أقصى يشفي أيّ تسرّبٍ من استثناءٍ لم يُحرَّر بعده.
 */

export const REQUEST_INFLIGHT_TTL_MS = 20_000;
export const MODEL_SLOT_TTL_MS = 90_000;
export const CHAT_MAX_INFLIGHT_DEFAULT = 8;
const INFLIGHT_MAX_KEYS = 5_000;

/** FNV-1a 32-bit — بصمةٌ قصيرة ومستقرّة، لا تشفيرية ولا يلزمها أن تكون. */
export function fingerprint(...parts: Array<string | null | undefined>): string {
  let hash = 0x811c9dc5;
  const text = parts.map((p) => p ?? "").join("\u0000");
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

const inflightRequests = new Map<string, number>();

function purgeStaleRequests(now: number): void {
  if (inflightRequests.size <= INFLIGHT_MAX_KEYS) return;
  for (const [key, startedAt] of inflightRequests) {
    if (now - startedAt >= REQUEST_INFLIGHT_TTL_MS) inflightRequests.delete(key);
  }
  while (inflightRequests.size > INFLIGHT_MAX_KEYS) {
    const oldest = inflightRequests.keys().next().value;
    if (oldest === undefined) break;
    inflightRequests.delete(oldest);
  }
}

/**
 * يحجز بصمة الطلب. يعيد دالّة التحرير، أو `null` إن كان الطلب نفسه جاريًا
 * (أحدث من `REQUEST_INFLIGHT_TTL_MS`).
 */
export function acquireRequest(key: string, now = Date.now()): (() => void) | null {
  const startedAt = inflightRequests.get(key);
  if (startedAt !== undefined && now - startedAt < REQUEST_INFLIGHT_TTL_MS) return null;
  inflightRequests.set(key, now);
  purgeStaleRequests(now);
  return () => {
    if (inflightRequests.get(key) === now) inflightRequests.delete(key);
  };
}

const modelSlots = new Map<symbol, number>();

export function maxInflightModelCalls(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = Number.parseInt((env.SADEED_CHAT_MAX_INFLIGHT ?? "").trim(), 10);
  if (!Number.isFinite(raw)) return CHAT_MAX_INFLIGHT_DEFAULT;
  return Math.min(64, Math.max(1, raw));
}

export function inflightModelCalls(now = Date.now()): number {
  let live = 0;
  for (const [token, startedAt] of modelSlots) {
    if (now - startedAt >= MODEL_SLOT_TTL_MS) modelSlots.delete(token);
    else live += 1;
  }
  return live;
}

/** يحجز خانة نداء نموذج. `null` حين يبلغ المعزول سقفه. */
export function acquireModelSlot(
  now = Date.now(),
  env: Record<string, string | undefined> = process.env,
): (() => void) | null {
  if (inflightModelCalls(now) >= maxInflightModelCalls(env)) return null;
  const token = Symbol("model-slot");
  modelSlots.set(token, now);
  return () => {
    modelSlots.delete(token);
  };
}

/** للاختبارات وحدها. */
export function resetRequestGuardsForTests(): void {
  inflightRequests.clear();
  modelSlots.clear();
}
