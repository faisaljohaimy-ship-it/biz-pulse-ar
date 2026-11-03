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
 *   ويُقرأ عند كل طلب من `process.env` — لكنّ **وصول تغيير المتغيّر إلى النشر القائم ليس
 *   فوريًّا**: على Vercel يلزمه إعادة نشر ليراه (تغيير المتغيّر لا يمسّ نشرًا يعمل)، فمسار
 *   التراجع `SADEED_THINKING_LEVEL=default` = تغيير المتغيّر ثم إعادة نشر. `default` = لا
 *   خيار = السلوك القديم. وقيمةٌ غير معروفة تُعامَل كغائبة (فيعود الافتراض)، لا كتعطيل
 *   ولا كتخمين.
 * - **سقوط مرّةً واحدة:** إن رفض المزوّد الخيار نفسه (400 / INVALID_ARGUMENT مع ذكر حقل
 *   التفكير بعينه: thinkingLevel · thinkingConfig · thinking_budget…) أُعيد الدور بلا خيار
 *   مرّةً، وعُطّلت الميزة في هذا المعزول عشر دقائق — كي لا يدفع كل سؤالٍ بعده إعادةً. ولا
 *   يسقط على غير ذلك (429 · 5xx · 401 · 404 · مهلة · إلغاء، ولا 400 يمرّ ذكر «thinking»
 *   فيه عرضًا). وبعد أن أنهت خطوةٌ أدواتها لا يُعاد الدور (إعادته تُكرّر أثرها)، لكنّ الرفض
 *   يُعطّل الميزة للأدوار التالية فيشفى ما بعدها دون انتظار إعادة نشر.
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

/** رموز HTTP المعروفة التي تُقبل قراءتها من نصٍّ حرّ (لا أي عدد من ثلاث خانات: «512» رمزٌ مختلَق). */
const HTTP_STATUS_IN_TEXT = /\b(400|401|402|403|404|405|408|409|413|415|422|429|499|50[0-4]|529)\b/;

function statusOf(error: unknown, text: string): number {
  if (error && typeof error === "object" && "statusCode" in error) {
    const n = Number((error as { statusCode?: unknown }).statusCode);
    if (Number.isFinite(n)) return n;
  }
  return Number(text.match(HTTP_STATUS_IN_TEXT)?.[1]);
}

/**
 * ذكر **حقل التفكير نفسه** (لا الكلمة وحدها): thinkingLevel · thinking_level · thinkingConfig ·
 * thinking_config · thinking_budget · thinkingBudget — وصيغتها المفصولة بمسافة («thinking level»).
 * 400 يذكر «thinking» عرضًا («input + thinking tokens exceed context window») ليس رفضًا للخيار.
 */
const THINKING_FIELD = /thinking[ _]?(?:level|config|budget)/;

/** عمق تتبّع `cause` و`lastError` (RetryError يلفّ الخطأ الحقيقي). */
const MAX_CAUSE_DEPTH = 3;

function rejectsThinkingOption(error: unknown, depth: number): boolean {
  if (error === null || error === undefined || depth > MAX_CAUSE_DEPTH) return false;
  const name = String((error as { name?: unknown } | null)?.name ?? "");
  if (name === "AbortError" || name === "TimeoutError") return false;
  const message = error instanceof Error ? error.message : String(error);
  const body = (error as { responseBody?: unknown } | null)?.responseBody;
  const text = `${message} ${typeof body === "string" ? body.slice(0, 2_000) : ""}`.toLowerCase();
  if (THINKING_FIELD.test(text)) {
    const status = statusOf(error, text);
    if (Number.isFinite(status) ? status === 400 : /invalid[_ ]argument/.test(text)) return true;
  }
  if (typeof error !== "object") return false;
  const wrapped = error as { cause?: unknown; lastError?: unknown };
  return (
    rejectsThinkingOption(wrapped.cause, depth + 1) ||
    rejectsThinkingOption(wrapped.lastError, depth + 1)
  );
}

/**
 * هل رفض المزوّد **خيار التفكير نفسه**؟ شرطان معًا: 400 (أو INVALID_ARGUMENT حين لا رمز)
 * **و**ذكر حقل التفكير بعينه في الرسالة أو جسم الخطأ. رمزٌ آخر معلوم (429 حصّة · 5xx ازدحام ·
 * 401/403/404) ليس رفضًا للخيار ولو ذكر نصُّه حقل التفكير. ويُفحص `cause` و`lastError`
 * (`RetryError` من ai SDK يلفّ الخطأ الحقيقي ولا يحمل `statusCode` بنفسه).
 */
export function isThinkingOptionRejection(error: unknown): boolean {
  return rejectsThinkingOption(error, 0);
}
