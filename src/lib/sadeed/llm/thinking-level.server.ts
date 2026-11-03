/**
 * مستوى تفكير Gemini لدور الدردشة (٢٠٢٦/١١/٠٣).
 *
 * ## لماذا
 *
 * لا شيء في الكود يضبط `thinkingConfig` (بحثٌ في `src/`: صفر نتائج)، فيعمل
 * `gemini-3.6-flash` بمستواه الافتراضي — وهو غير موثَّق لنا ولا مقيس — ويدفع كل دور
 * رموز تفكيرٍ مجهولة المقدار قبل أول رمز وقبل كل خطوة أدوات (مرحلة النموذج هي الجزء
 * الأكبر من زمن الخادم بحسب الاستطلاع الأوّلي). الأثر على الزمن والجودة **غير مقيس بعد**: تقيسه أداة
 * `chat-timing.server.ts` (`usage.reasoningTokens` و`steps[].ms`) من سجلّ الإنتاج.
 *
 * ## القواعد
 *
 * - **Gemini وحده.** المحوّل الاختياري (OpenAI) والاحتياطي (بوّابة Lovable) لا يتلقّيان
 *   خيارًا من هذا الباب أبدًا — لا استبدال صامت لسلوك مورّد.
 * - الافتراض `low` للنص والصوت، و`medium` للعميق (`replyMode: "deep"`).
 * - `SADEED_THINKING_LEVEL` ∈ {minimal, low, medium, high, default} يتجاوز الافتراضين
 *   **ويُقرأ عند كل طلب** (تعديل المتغيّر بلا نشر). `default` = لا خيار = السلوك القديم.
 *   وقيمةٌ غير معروفة تُعامَل كغائبة (فيعود الافتراض)، لا كتعطيل ولا كتخمين.
 * - **سقوط مرّةً واحدة:** إن رفض المزوّد الخيار نفسه (400 / INVALID_ARGUMENT ويذكر
 *   thinking) أُعيد الدور بلا خيار مرّةً، وعُطّلت الميزة في هذا المعزول عشر دقائق — كي لا
 *   يدفع كل سؤالٍ بعده إعادةً. ولا يسقط على غير ذلك (429 · 5xx · 401 · 404 · مهلة · إلغاء)،
 *   ولا بعد أن أنهت خطوةٌ أدواتها (إعادة الدور تُكرّر أثرها).
 */

export type ThinkingLevel = "minimal" | "low" | "medium" | "high";

const LEVELS: ReadonlySet<string> = new Set<ThinkingLevel>(["minimal", "low", "medium", "high"]);

/** مدّة تعطيل الميزة في المعزول بعد رفض المزوّد لها. */
export const THINKING_SUSPEND_MS = 10 * 60 * 1000;

/** وسم فئة Gemini في خطة المحرّك (`SadeedLlmVendor`) — الوحيد الذي يتلقّى الخيار. */
export const THINKING_VENDOR = "google-gemini";

type EnvLike = Record<string, string | undefined>;

let suspendedUntil = 0;

/** الميزة معطّلة في هذا المعزول بعد رفضٍ حديث؟ */
export function thinkingSuspended(now: number = Date.now()): boolean {
  return now < suspendedUntil;
}

/** يعطّل الميزة في هذا المعزول `ms` من الآن. */
export function suspendThinking(now: number = Date.now(), ms: number = THINKING_SUSPEND_MS): void {
  suspendedUntil = now + ms;
}

export function resetThinkingStateForTests(): void {
  suspendedUntil = 0;
}

/**
 * المستوى المطلوب لدورٍ مزوّده `vendor`، أو `null` = لا خيار. تقرأ البيئة والتعطيل
 * عند كل نداء، فلا تخزّن شيئًا.
 */
export function resolveThinkingLevel(
  vendor: string,
  replyMode: string,
  env: EnvLike = process.env,
  now: number = Date.now(),
): ThinkingLevel | null {
  if (vendor !== THINKING_VENDOR) return null;
  if (thinkingSuspended(now)) return null;
  const override = env.SADEED_THINKING_LEVEL?.trim().toLowerCase() ?? "";
  if (override === "default") return null;
  if (LEVELS.has(override)) return override as ThinkingLevel;
  return replyMode === "deep" ? "medium" : "low";
}

/** `providerOptions` لـ`generateText`: التفكير بمستوى، وبلا إظهار الأفكار في الناتج. */
export function googleThinkingOptions(level: ThinkingLevel) {
  return { google: { thinkingConfig: { thinkingLevel: level, includeThoughts: false } } };
}

function statusOf(error: unknown, text: string): number {
  if (error && typeof error === "object" && "statusCode" in error) {
    const n = Number((error as { statusCode?: unknown }).statusCode);
    if (Number.isFinite(n)) return n;
  }
  return Number(text.match(/\b([45]\d\d)\b/)?.[1]);
}

/**
 * هل رفض المزوّد **خيار التفكير نفسه**؟ شرطان معًا: 400 (أو INVALID_ARGUMENT حين لا
 * رمز) **و**ذكر `thinking` في الرسالة أو جسم الخطأ. رمزٌ آخر معلوم (429 حصّة · 5xx
 * ازدحام · 401/403/404) ليس رفضًا للخيار ولو ذكر نصُّه «thinking» (مثل حصّة رموز التفكير).
 */
export function isThinkingOptionRejection(error: unknown): boolean {
  const name = String((error as { name?: unknown } | null)?.name ?? "");
  if (name === "AbortError" || name === "TimeoutError") return false;
  const message = error instanceof Error ? error.message : String(error);
  const body = (error as { responseBody?: unknown } | null)?.responseBody;
  const text = `${message} ${typeof body === "string" ? body.slice(0, 2_000) : ""}`.toLowerCase();
  if (!text.includes("thinking")) return false;
  const status = statusOf(error, text);
  if (Number.isFinite(status)) return status === 400;
  return /invalid[_ ]argument/.test(text);
}
