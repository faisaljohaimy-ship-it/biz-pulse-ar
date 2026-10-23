/**
 * سلسلة محرّكات فِن — GPT أوّلًا، ثم الاحتياطي **معلَنًا لا صامتًا**.
 *
 * وحدةٌ خالصة (لا بيئة ولا SDK ولا شبكة): تتلقّى «محاولات» جاهزة من
 * `engine.server.ts` وتشغّلها بالترتيب. هكذا يُختبر السقوط كلّه بمحاكاةٍ لا
 * تلمس مزوّدًا حقيقيًّا.
 *
 * ## قواعد السقوط
 *
 * 1. **المحرّك الذي يردّ هو المعلَن.** لا يُعرف قبل أول نصٍّ مَن سيجيب، فالدالة
 *    تنتظر **أوّل مخرجٍ** من أول محرّكٍ سليم ثم تعيد `engine` و`fallback` — والمستدعي
 *    يكتب بهما ترويسات الاستجابة قبل أن يبدأ الجسم. فالترويسة تصف ما جرى لا ما نُوي.
 * 2. **لا خلط في رسالةٍ واحدة.** السقوط ممكنٌ **قبل** أول نصٍّ وحده. وبعد أن بدأ
 *    محرّكٌ بالكتابة، فشلُه يُنهي الرد بخطأٍ معلَن — لا يُكمله محرّكٌ آخر بأسلوبٍ
 *    مختلف ومن سياقٍ لا يعرفه.
 * 3. **سبب السقوط رمزٌ عامّ** (`FinnFallbackReason`)، لا نصّ خطأ المزوّد ولا جسم
 *    ردّه ولا رمز مفتاحه — لا في الاستجابة ولا في السجلّ (`log` يتلقّى
 *    `{ engine, code, status }` فقط).
 * 4. **بعض الأعطال لا تُسقط**: `400/413/422` (الطلب نفسه معطوب) ستفشل عند أيّ
 *    محرّك، فالسقوط عليها إنفاقٌ بلا رجاء. أمّا `401/402/403` (المفتاح/الفوترة)
 *    و`404` (النموذج) و`429` و`5xx` والمهلة وانقطاع الشبكة فتُسقط — والمالك يُخبَر.
 *    **لكن الـ400 دليلٌ على عطب الطلب ما دام أول محرّكٍ جُرِّب هو من ردّ به** (W5 #4):
 *    الجسم نفسه يذهب لكل محرّك. فإن فشل محرّكٌ سابق بعطلٍ آخر (429 · 5xx · مهلة) ثم ردّ
 *    لاحقٌ بـ400 فالـ400 لم يثبت أنه عطب الطلب بل عطبُ ذلك المحرّك (مفتاح Google
 *    المرفوض ومنطقته غير المدعومة يردّان 400)، فيُجرَّب التالي. وكذلك 400 يحمل رمزًا
 *    آليًّا معروفًا لمفتاحٍ أو منطقة (`API_KEY_INVALID` · `FAILED_PRECONDITION`) يُصنَّف
 *    عطبَ محرّكٍ لا عطبَ طلب ويُسقط حتى لو كان الأول.
 * 5. **المهلة مهلتان**: أول **نصٍّ** لكل محرّك (يُسقط)، وسقفٌ كلّي للاستجابة (يقطع).
 *    أجزاء `progress` (بدء النصّ/الاستدلال) **لا تُفكّ بها مهلة أول نصّ** (W5 #5): محرّكٌ
 *    يرسل بدايةً ثم يصمت يُسقَط عند مهلته كمحرّكٍ صامتٍ تمامًا، لا بعد السقف الكلّي.
 * 6. **ردٌّ انقطع بعد بدء النصّ لا يُعلَن مكتملًا** (W5 #3): `finish` بسببٍ غير
 *    `stop`/`tool-calls`/`length` (`other` · `unknown` · `error` · `content-filter`)
 *    خطأٌ معلَن لا `done`.
 */
import type { FinnFallbackReason } from "./status";
import type { FinnStreamEvent } from "./stream-protocol";

export type FinnEngine = "openai" | "gemini";

/** ما يُنتجه محرّكٌ بعد تطبيعه من أجزاء الـSDK. */
export type FinnPart =
  | { readonly type: "progress" }
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "error"; readonly error: unknown }
  | { readonly type: "abort" }
  | {
      readonly type: "finish";
      readonly truncated: boolean;
      /** سبب الإنهاء كما أعلنه الـSDK. غيابه (محاكاة قديمة) يُعامَل مكتملًا. */
      readonly finishReason?: string;
    };

/** أسباب إنهاءٍ تعني أن الرد اكتمل (و`length` مقطوعٌ بالحدّ وله علامته). */
const COMPLETE_FINISH_REASONS: ReadonlySet<string> = new Set(["stop", "tool-calls"]);

/** `finish` بسببٍ ليس اكتمالًا ولا قطعًا بالحدّ ⇒ انقطع الرد (مزوّدٌ أغلق البثّ أو مرشِّح محتوى). */
function finishIsInterruption(part: { truncated: boolean; finishReason?: string }): boolean {
  if (part.truncated || part.finishReason === undefined) return false;
  return part.finishReason !== "length" && !COMPLETE_FINISH_REASONS.has(part.finishReason);
}

export interface FinnAttempt {
  readonly engine: FinnEngine;
  /** سببُ تعذّر المحاولة قبل أن تبدأ (غير مهيّأة) — تُتخطّى ويُسجَّل السبب. */
  readonly skip?: FinnFallbackReason;
  open(signal: AbortSignal): AsyncIterable<FinnPart>;
  /** يُستدعى بعد فشل المحاولة قبل أي نصّ — مثلًا لتبريد مفتاحٍ مخنوق. */
  onFailure?(error: unknown): void;
}

export type FinnFailureCode = FinnFallbackReason | "bad_request";

export type FinnClassification = {
  readonly code: FinnFailureCode;
  /** هل يُجرَّب المحرّك التالي؟ */
  readonly fallback: boolean;
  /** رمز HTTP إن وُجد — للسجلّ فقط. */
  readonly status: number | null;
};

function statusOf(error: unknown): number | null {
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    if (seen.has(current)) break;
    seen.add(current);
    const e = current as Record<string, unknown>;
    for (const key of ["statusCode", "status"]) {
      const value = e[key];
      if (typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599) {
        return value;
      }
    }
    // `RetryError` يحمل آخر خطأ في `lastError`، وخطأ الشبكة قد يحمل `cause`.
    current = e.lastError ?? e.cause;
  }
  return null;
}

const MACHINE_CODE = /^[A-Za-z0-9_.-]{1,64}$/;

/**
 * الرموز **الآلية** من جسم خطأ المزوّد المُحلَّل (`data.error`: `code` · `type` · `status` ·
 * `details[].reason`) — حقولٌ مصنَّفة يضعها المزوّد لتُقرأ آليًّا، لا نصًّا بشريًّا. تُقارَن
 * بثوابتَ مكتوبة وحدها ولا تُعاد ولا تُسجَّل. (`message` و`responseBody` لا يُقرآن أبدًا.)
 */
function providerCodes(error: unknown): ReadonlySet<string> {
  const out = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && MACHINE_CODE.test(value)) out.add(value);
  };
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    if (seen.has(current)) break;
    seen.add(current);
    const e = current as Record<string, unknown>;
    const body = e.data && typeof e.data === "object" ? (e.data as Record<string, unknown>) : null;
    const inner = body?.error && typeof body.error === "object" ? body.error : null;
    if (inner) {
      const f = inner as Record<string, unknown>;
      add(f.code);
      add(f.type);
      add(f.status);
      if (Array.isArray(f.details)) {
        for (const d of f.details.slice(0, 8)) {
          if (d && typeof d === "object") add((d as Record<string, unknown>).reason);
        }
      }
    }
    current = e.lastError ?? e.cause;
  }
  return out;
}

/**
 * يصنّف فشل محرّكٍ برمزٍ عامّ — **لا يقرأ `message` ولا `responseBody`** عمدًا؛
 * الرمز الآلي المصنَّف من `providerCodes` وحده يُستعمل لتمييز ما يشترك في رمز HTTP.
 */
export function classifyEngineError(error: unknown): FinnClassification {
  const status = statusOf(error);
  if (status === 429) {
    // OpenAI يعلن نفاد الرصيد بـ429 + `insufficient_quota` (لا 402): ليس حدّ معدّل (W5 #6).
    if (providerCodes(error).has("insufficient_quota")) {
      return { code: "billing", fallback: true, status };
    }
    return { code: "rate_limited", fallback: true, status };
  }
  if (status === 400) {
    // Google يردّ المفتاح المرفوض والمنطقة غير المدعومة بـ400: عطبُ محرّكٍ لا عطبُ طلب (W5 #4).
    const codes = providerCodes(error);
    if (codes.has("API_KEY_INVALID")) return { code: "auth_failed", fallback: true, status };
    if (codes.has("FAILED_PRECONDITION")) {
      return { code: "model_unavailable", fallback: true, status };
    }
  }
  if (status === 401 || status === 403) return { code: "auth_failed", fallback: true, status };
  if (status === 402) return { code: "billing", fallback: true, status };
  if (status === 404) return { code: "model_unavailable", fallback: true, status };
  if (status === 400 || status === 413 || status === 422) {
    return { code: "bad_request", fallback: false, status };
  }
  if (status === 408) return { code: "timeout", fallback: true, status };
  // 5xx، أو لا رمز (انقطاع شبكة · استيراد وحدة فشل · شكل خطأ مجهول): عطلٌ مؤقت.
  return { code: "upstream_error", fallback: true, status };
}

export type FinnOpenFailure = "timeout" | "engine_error" | "bad_request" | "aborted" | "no_engine";

export type FinnOpenResult =
  | {
      readonly ok: true;
      /** المحرّك الذي أجاب فعلًا. */
      readonly engine: FinnEngine;
      /** لماذا لم يجب GPT — `null` إن أجاب هو. */
      readonly fallback: FinnFallbackReason | null;
      readonly events: AsyncGenerator<FinnStreamEvent, void, void>;
    }
  | { readonly ok: false; readonly code: FinnOpenFailure };

export type FinnOpenOptions = {
  /** إلغاء العميل (انقطاع الاتصال). */
  readonly signal: AbortSignal;
  readonly firstTokenDeadlineMs: number;
  readonly totalDeadlineMs: number;
  /** سجلٌّ آمن: رموزٌ فقط. */
  readonly log?: (info: {
    engine: FinnEngine;
    code: FinnFailureCode;
    status: number | null;
  }) => void;
};

const ABORTED = Symbol("finn-aborted");

type Step = IteratorResult<FinnPart, unknown> | typeof ABORTED;

/** ينتظر الجزء التالي أو الإلغاء — أيّهما أسبق — فلا يعلق على بثٍّ لا يستجيب للإلغاء. */
function nextOrAbort(
  iterator: AsyncIterator<FinnPart>,
  aborted: Promise<typeof ABORTED>,
): Promise<Step> {
  const pending = iterator.next();
  // الخاسر في السباق قد يُرفض لاحقًا — لا نريد رفضًا غير معالَج.
  pending.catch(() => undefined);
  return Promise.race([pending, aborted]);
}

function stopIterator(iterator: AsyncIterator<FinnPart>): void {
  try {
    const closing = iterator.return?.();
    if (closing) closing.catch(() => undefined);
  } catch {
    /* أفضل جهد. */
  }
}

/**
 * يفتح ردّ فِن: يجرّب المحاولات بالترتيب حتى يبدأ أحدها بالنصّ، ويعيد حدثًا
 * مولَّدًا يكمل من حيث توقّف. يعيد `ok: false` برمزٍ عامّ إن لم يُنتج أيٌّ منها شيئًا.
 */
export async function openFinnReply(
  attempts: readonly FinnAttempt[],
  options: FinnOpenOptions,
): Promise<FinnOpenResult> {
  const total = new AbortController();
  const totalTimer = setTimeout(() => total.abort(), options.totalDeadlineMs);
  let handedOver = false;
  let fallback: FinnFallbackReason | null = null;
  let ran = 0;
  const failures: FinnFailureCode[] = [];
  let sawTimeout = false;

  try {
    for (const attempt of attempts) {
      if (attempt.skip) {
        if (attempt.engine === "openai" && fallback === null) fallback = attempt.skip;
        continue;
      }
      if (options.signal.aborted) return { ok: false, code: "aborted" };
      if (total.signal.aborted) {
        sawTimeout = true;
        break;
      }
      ran += 1;

      const controller = new AbortController();
      let firstTokenExpired = false;
      const forwardAbort = () => controller.abort();
      options.signal.addEventListener("abort", forwardAbort, { once: true });
      total.signal.addEventListener("abort", forwardAbort, { once: true });
      const firstTokenTimer = setTimeout(() => {
        firstTokenExpired = true;
        controller.abort();
      }, options.firstTokenDeadlineMs);
      const aborted = new Promise<typeof ABORTED>((resolve) => {
        controller.signal.addEventListener("abort", () => resolve(ABORTED), { once: true });
      });
      const release = () => {
        clearTimeout(firstTokenTimer);
        options.signal.removeEventListener("abort", forwardAbort);
        total.signal.removeEventListener("abort", forwardAbort);
      };

      let iterator: AsyncIterator<FinnPart>;
      let failure: FinnClassification | null = null;
      let firstText: string | null = null;
      let failedError: unknown = undefined;

      try {
        iterator = attempt.open(controller.signal)[Symbol.asyncIterator]();
      } catch (error) {
        release();
        failure = classifyEngineError(error);
        failedError = error;
        iterator = (async function* () {})()[Symbol.asyncIterator]();
      }

      while (!failure && firstText === null) {
        let step: Step;
        try {
          step = await nextOrAbort(iterator, aborted);
        } catch (error) {
          failure = classifyEngineError(error);
          failedError = error;
          break;
        }
        if (step === ABORTED) {
          if (options.signal.aborted) {
            release();
            stopIterator(iterator);
            return { ok: false, code: "aborted" };
          }
          const byTotal = total.signal.aborted && !firstTokenExpired;
          failure = { code: "timeout", fallback: !byTotal, status: null };
          if (byTotal) sawTimeout = true;
          break;
        }
        if (step.done) {
          // انتهى بلا أيّ نصّ: ردٌّ فارغ عطلٌ لا إجابة.
          failure = { code: "upstream_error", fallback: true, status: null };
          break;
        }
        const part = step.value;
        if (part.type === "progress") {
          // لا تُفكّ مهلة أول نصّ بجزءٍ غير نصّي (W5 #5): بدء الاستدلال/النصّ يصل قبل أي
          // نصّ، ومحرّكٌ يرسله ثم يصمت يجب أن يسقط عند مهلته لا عند السقف الكلّي.
          continue;
        }
        if (part.type === "text") {
          if (part.text === "") continue;
          clearTimeout(firstTokenTimer);
          firstText = part.text;
          break;
        }
        if (part.type === "error") {
          failure = classifyEngineError(part.error);
          failedError = part.error;
          break;
        }
        if (part.type === "abort") {
          if (options.signal.aborted) {
            release();
            stopIterator(iterator);
            return { ok: false, code: "aborted" };
          }
          failure = {
            code: "timeout",
            fallback: !total.signal.aborted,
            status: null,
          };
          if (total.signal.aborted) sawTimeout = true;
          break;
        }
        // finish بلا نصّ
        failure = { code: "upstream_error", fallback: true, status: null };
        break;
      }

      if (failure) {
        controller.abort();
        release();
        stopIterator(iterator);
        options.log?.({ engine: attempt.engine, code: failure.code, status: failure.status });
        try {
          attempt.onFailure?.(failedError);
        } catch {
          /* التبريد أفضل جهد. */
        }
        // 400 من محرّكٍ لاحق (بعد أن فشل سابقٌ بعطلٍ آخر) لم يثبت أنه عطبُ الطلب (W5 #4).
        const laterBadRequest = failure.code === "bad_request" && failures.length > 0;
        if (laterBadRequest) failure = { ...failure, fallback: true };
        failures.push(failure.code);
        if (failure.code === "timeout") sawTimeout = true;
        if (!failure.fallback) {
          // الطلب نفسه معطوب (لا يُجدي معه محرّكٌ ثانٍ)، أو انتهى السقف الكلّي.
          return {
            ok: false,
            code:
              failure.code === "bad_request"
                ? "bad_request"
                : failure.code === "timeout"
                  ? "timeout"
                  : "engine_error",
          };
        }
        if (attempt.engine === "openai" && fallback === null) {
          fallback = failure.code === "bad_request" ? "upstream_error" : failure.code;
        }
        continue;
      }

      // ── نجح: محرّكٌ بدأ بالنصّ. ما بعده بثٌّ من المحرّك نفسه حتى النهاية. ──
      handedOver = true;
      const first = firstText ?? "";
      const events = (async function* (): AsyncGenerator<FinnStreamEvent, void, void> {
        try {
          yield { type: "delta", text: first };
          for (;;) {
            let step: Step;
            try {
              step = await nextOrAbort(iterator, aborted);
            } catch {
              yield { type: "error", code: "engine_error" };
              return;
            }
            if (step === ABORTED) {
              // العميل غادر ⇒ لا مستمع. السقف الكلّي ⇒ مهلة معلَنة.
              if (!options.signal.aborted) yield { type: "error", code: "timeout" };
              return;
            }
            if (step.done) {
              yield { type: "done", truncated: false };
              return;
            }
            const part = step.value;
            if (part.type === "text") {
              if (part.text !== "") yield { type: "delta", text: part.text };
              continue;
            }
            if (part.type === "error") {
              yield { type: "error", code: "engine_error" };
              return;
            }
            if (part.type === "abort") {
              if (!options.signal.aborted) yield { type: "error", code: "timeout" };
              return;
            }
            if (part.type === "finish") {
              // انقطاعٌ بعد بدء النصّ لا يُعلَن مكتملًا (W5 #3).
              if (finishIsInterruption(part)) {
                yield { type: "error", code: "engine_error" };
                return;
              }
              yield { type: "done", truncated: part.truncated };
              return;
            }
          }
        } finally {
          clearTimeout(totalTimer);
          controller.abort();
          release();
          stopIterator(iterator);
        }
      })();

      return { ok: true, engine: attempt.engine, fallback, events };
    }

    if (ran === 0) return { ok: false, code: "no_engine" };
    if (sawTimeout && failures.every((code) => code === "timeout")) {
      return { ok: false, code: "timeout" };
    }
    return { ok: false, code: "engine_error" };
  } finally {
    if (!handedOver) clearTimeout(totalTimer);
  }
}
