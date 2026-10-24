/**
 * إعادة المحاولة المحدودة لازدحام المزوّد العابر (أمر المالك ٢٠٢٦/١٠/٢٤ «bounded retries with exponential
 * backoff for retryable errors»؛ المقيس: سجلّ الإنتاج يحمل «This model is currently experiencing high demand»
 * مرّتين في يومين، فيعود الزائر بسطر «تعذّر إكمال الرد» وهو عطلٌ يزول بعد ثوانٍ).
 *
 * **ما يُعاد وما لا يُعاد** — فالحدّ هو الدليل:
 *   • يُعاد: ازدحامٌ أو انقطاعٌ عابر (`502/503/504` أو «high demand» أو «overloaded» أو «unavailable» …).
 *   • لا يُعاد أبدًا: الحصّة (`quota` · `429` · `resource_exhausted` · «rate limit») — يحمل `Retry-After` بالساعات
 *     (الدرس في `chat.ts`: بقي الدردشة «تفكّر» للأبد)، ولا رفضٌ (`400/401/402/403/404`) — لا ينفعه تكرار، ولا
 *     إلغاءٌ ولا مهلة.
 * ويبقى القرار الأخير للمستدعي: لا إعادة بعد أن أنهى النموذج خطوةً (أدواتٌ نُفِّذت)، ولا مع احتياطيٍّ مأذون (هو
 * الإعادة)، ولا والوقت لا يكفي.
 */

/** عدد الإعادات القصوى للدور الواحد — واحدة: المحاولة الثانية لا تُكرَّر مهما فشلت. */
export const TRANSIENT_RETRY_MAX = 1;

/** التراجع الأساسيّ (مللي ثانية): `BASE × 2^محاولة` ثم تشويش — الإعادة الأولى 1.5 ث. */
export const TRANSIENT_BACKOFF_BASE_MS = 1_500;

/** أقصى تشويش يُضاف (مللي ثانية) — كي لا تتزامن إعادات الزوّار على المزوّد المزدحم. */
export const TRANSIENT_JITTER_MS = 400;

/** الهامش الأدنى المتبقّي من سقف الدور بعد الانتظار ليكفي نداءً ثانيًا (مللي ثانية). */
export const TRANSIENT_MIN_REMAINING_MS = 12_000;

function statusOf(error: unknown, text: string): number {
  if (error && typeof error === "object" && "statusCode" in error) {
    const n = Number((error as { statusCode?: unknown }).statusCode);
    if (Number.isFinite(n)) return n;
  }
  return Number(text.match(/\b([45]\d\d)\b/)?.[1]);
}

/** Read only response headers; never inspect or log request bodies or credentials. */
function responseHeader(error: unknown, name: string): string | undefined {
  if (!error || typeof error !== "object" || !("responseHeaders" in error)) return undefined;
  const headers = (error as { responseHeaders?: unknown }).responseHeaders;
  if (headers instanceof Headers) return headers.get(name) ?? undefined;
  if (!headers || typeof headers !== "object") return undefined;
  const value = Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];
  return typeof value === "string" ? value : undefined;
}

/**
 * Keep the existing 1.5–1.9 second retry bounded. If Retry-After asks for longer,
 * do not retry this turn: neither ignore the provider's delay nor extend the deadline.
 * HTTP-date and delay-seconds are defined by RFC 9110 section 10.2.3.
 */
function allowsShortRetry(error: unknown): boolean {
  const value = responseHeader(error, "retry-after")?.trim();
  if (!value) return true;
  if (/^\d+$/.test(value)) return Number(value) * 1_000 <= TRANSIENT_BACKOFF_BASE_MS;
  // Do not let Date.parse interpret malformed numeric delays as calendar dates.
  if (!/[a-z]/i.test(value)) return false;
  const until = Date.parse(value);
  if (!Number.isFinite(until)) return false;
  const serverDate = Date.parse(responseHeader(error, "date") ?? "");
  // A local clock ahead of the provider must not turn a future delay into an expired one.
  const now = Date.now();
  const reference = Number.isFinite(serverDate) ? Math.min(now, serverDate) : now;
  return until - reference <= TRANSIENT_BACKOFF_BASE_MS;
}

/** هل الخطأ ازدحامٌ/انقطاعٌ عابر يستحق إعادة واحدة؟ — لا الحصّة ولا الرفض ولا الإلغاء. */
export function isTransientOverload(error: unknown): boolean {
  const name = String((error as { name?: unknown } | null)?.name ?? "");
  if (name === "AbortError" || name === "TimeoutError") return false;
  const text = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const status = statusOf(error, text);
  // الرفض لا يُعاد ولو حمل نصّه «unavailable»؛ والحصّة لا تُعاد ولو حملت 503 في وسط نصّها.
  if (status >= 400 && status < 500) return false;
  if (/quota|rate.?limit|resource_exhausted|too many requests/.test(text)) return false;
  if (!allowsShortRetry(error)) return false;
  if ([500, 502, 503, 504].includes(status)) return true;
  return /high demand|experiencing (?:high )?demand|overloaded|temporarily (?:busy|unavailable)|service unavailable|unavailable|try again later/.test(
    text,
  );
}

/** التراجع قبل الإعادة رقم `attempt` (0 للأولى): أُسّيّ بتشويش. */
export function transientBackoffMs(attempt: number, random: number = Math.random()): number {
  const base = TRANSIENT_BACKOFF_BASE_MS * 2 ** Math.max(0, attempt);
  return base + Math.floor(Math.min(1, Math.max(0, random)) * TRANSIENT_JITTER_MS);
}

/**
 * هل يكفي ما تبقّى من سقف الدور للانتظار ثم نداءٍ ثانٍ؟ `elapsedMs` منذ بدء الدور، و`deadlineMs` سقفه.
 * بلا ذلك تُستنفد المهلة داخل الإعادة فيرى الزائر «استغرق وقتًا طويلًا» بدل الخطأ الأصلي.
 */
export function hasTimeForRetry(deadlineMs: number, elapsedMs: number, backoffMs: number): boolean {
  return deadlineMs - elapsedMs - backoffMs >= TRANSIENT_MIN_REMAINING_MS;
}

/** انتظارٌ يُقطع بإشارة الدور (إلغاء الزائر أو المهلة) فلا يعلّق الطلب. */
export function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
