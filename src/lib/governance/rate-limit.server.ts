/**
 * حدّ المعدّل من جهة الخادم — فوق الدالة `public.check_rate_limit` (نافذة منزلقة).
 *
 * ## ما قِيس ٢٠٢٦/١٠/١٦ (VIBE 5.1)
 *
 * قاعدة الإنتاج لم تردّ حتى على `select now()` (‏504 من نافذة Lovable مرارًا).
 * فكل نداءٍ هنا كان ينتظر بلا حدّ، ثم يفشل مغلقًا ⇐ ‏503 `rate_limit_unavailable`
 * لكل سؤالٍ لسَدِيد — والمهلة التي أُضيفت (1.5 ث) جعلت كل طلبٍ يدفع 1.5 ث **مرّتين
 * أو ثلاثًا** (المعدّل ثم الحصّة العامة ثم حصّة الهوية) قبل أن يعرف ما يعرفه الطلب
 * السابق: أن المخزن معطّل.
 *
 * ## ما يفعله هذا الملف الآن
 *
 * 1. **مهلة افتراضية** لكل نداء (‏2 ث) — لا نداءَ بلا حدّ ولو نسي المستدعي.
 * 2. **قاطع دارة** لمخزن المعدّل: خمسة فشلٍ متتالية خلال 60 ث (دستور الهندسة §3)
 *    تفتحه 30 ث، فتعود النداءات «غير متاح» **فورًا** بلا انتظار؛ وبعد المهلة يمرّ
 *    **فحصٌ واحد** (نصف مفتوح)، فإن نجح أُغلق القاطع وعاد التحقّق الحقيقي، وإن
 *    فشل أُعيد فتحه.
 * 3. **حصّةٌ محدودة في الذاكرة** يلجأ إليها المستدعي حين يكون المخزن غير متاح
 *    (`degradedAllowance`): نصف السقف الأصلي، لكل معزول (isolate) على حدة.
 *    ليست بديلًا عن المخزن — هي **حدٌّ** يمنع أن يصير السطح بلا حدّ أثناء
 *    العطل، لا تحقّقًا من حصّةٍ يومية. القرار باستعمالها للمستدعي (الدردشة
 *    تستعملها؛ الصوت لا — راجع `gateDegradedMode`).
 *
 * الحالة كلّها على مستوى الوحدة: أعدادٌ وطوابع زمنية ومفاتيح دلاء — لا نصّ
 * محادثة ولا هوية مستخدم تتجاوز مفتاح الدلو الذي يمرّره المستدعي أصلًا.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RateLimitOptions = {
  /**
   * مهلةٌ قصوى لنداء القاعدة بالمللي ثانية. تجاوزها = «غير متاح» (يفشل مغلقًا
   * كالخطأ تمامًا). الافتراض `RATE_LIMIT_DEFAULT_DEADLINE_MS`؛ لا سبيل لتعطيلها.
   */
  deadlineMs?: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  /** المخزن لم يُجب (مهلة/خطأ/قاطع مفتوح). القرار مغلق؛ والمستدعي يقرّر التدهور. */
  unavailable?: boolean;
};

export const RATE_LIMIT_DEFAULT_DEADLINE_MS = 2_000;

/**
 * خمسة فشلٍ متتالية خلال 60 ث تفتح القاطع — نصّ دستور الهندسة §3
 * (`docs/SADEED_ENGINEERING_CONSTITUTION.md`: «5 consecutive failures … within 60s»).
 * فشلٌ أقدم من النافذة لا يُحتسب في السلسلة: عطلان عارضان في ساعتين ليسا نمطًا.
 */
export const BREAKER_FAILURE_THRESHOLD = 5;
export const BREAKER_FAILURE_WINDOW_MS = 60_000;
/** مدّة الفتح قبل فحصٍ واحد نصف مفتوح. */
export const BREAKER_OPEN_MS = 30_000;

export type BreakerSnapshot = {
  state: "closed" | "open" | "half-open";
  consecutiveFailures: number;
  openedAt: number | null;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
};

const breaker = {
  consecutiveFailures: 0,
  openedAt: null as number | null,
  probing: false,
  lastFailureAt: null as number | null,
  lastSuccessAt: null as number | null,
};

function breakerIsOpen(now: number): boolean {
  return breaker.openedAt !== null && now - breaker.openedAt < BREAKER_OPEN_MS;
}

/** هل نتخطّى نداء المخزن الآن؟ (مفتوح، أو نصف مفتوح وفحصٌ آخر جارٍ). */
function breakerShouldSkip(now: number): boolean {
  if (breaker.openedAt === null) return false;
  if (breakerIsOpen(now)) return true;
  // انقضت مدّة الفتح: فحصٌ واحد يمرّ، والباقون ينتظرون نتيجته.
  if (breaker.probing) return true;
  breaker.probing = true;
  return false;
}

function noteFailure(now: number, reason: string, detail: Record<string, unknown>): void {
  if (breaker.lastFailureAt !== null && now - breaker.lastFailureAt > BREAKER_FAILURE_WINDOW_MS) {
    // انقطعت السلسلة: الفشل السابق أقدم من نافذة الستّين ثانية.
    breaker.consecutiveFailures = 0;
  }
  breaker.consecutiveFailures += 1;
  breaker.lastFailureAt = now;
  breaker.probing = false;
  const wasOpen = breaker.openedAt !== null;
  if (breaker.consecutiveFailures >= BREAKER_FAILURE_THRESHOLD) {
    breaker.openedAt = now;
    console.error("[rate-limit] storage breaker open", {
      event: wasOpen ? "rate_limit.breaker.reopened" : "rate_limit.breaker.opened",
      reason,
      consecutiveFailures: breaker.consecutiveFailures,
      openMs: BREAKER_OPEN_MS,
      ...detail,
    });
  } else {
    console.error("[rate-limit] check failed", {
      event: "rate_limit.check_failed",
      reason,
      ...detail,
    });
  }
}

function noteSuccess(now: number): void {
  const recovered = breaker.openedAt !== null || breaker.consecutiveFailures > 0;
  breaker.consecutiveFailures = 0;
  breaker.openedAt = null;
  breaker.probing = false;
  breaker.lastSuccessAt = now;
  if (recovered) {
    console.warn("[rate-limit] storage recovered", { event: "rate_limit.breaker.closed" });
  }
}

/** لقطةٌ للصحّة والمراقبة — أعدادٌ وطوابع لا غير. */
export function rateLimitStorageState(now = Date.now()): BreakerSnapshot {
  const state: BreakerSnapshot["state"] =
    breaker.openedAt === null ? "closed" : breakerIsOpen(now) ? "open" : "half-open";
  return {
    state,
    consecutiveFailures: breaker.consecutiveFailures,
    openedAt: breaker.openedAt,
    lastFailureAt: breaker.lastFailureAt,
    lastSuccessAt: breaker.lastSuccessAt,
  };
}

const DEADLINE = Symbol("rate-limit-deadline");

export async function enforceRateLimit(
  bucketKey: string,
  maxRequests = 30,
  windowSeconds = 60,
  options: RateLimitOptions = {},
): Promise<RateLimitDecision> {
  const deadlineMs = options.deadlineMs ?? RATE_LIMIT_DEFAULT_DEADLINE_MS;
  const startedAt = Date.now();
  if (breakerShouldSkip(startedAt)) {
    // لا انتظار: المخزن معروفٌ أنه معطّل حتى موعد الفحص التالي.
    return { allowed: false, unavailable: true };
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Defer property access too: a lazy client can throw before returning a promise.
  const call = Promise.resolve()
    .then(() =>
      supabaseAdmin.rpc("check_rate_limit", {
        _bucket_key: bucketKey,
        _max_requests: maxRequests,
        _window_seconds: windowSeconds,
      }),
    )
    .catch((thrown: unknown) => ({
      data: null,
      error: { message: thrown instanceof Error ? thrown.message : String(thrown) },
    }));
  const outcome = await Promise.race([
    call,
    new Promise<typeof DEADLINE>((resolve) => {
      timer = setTimeout(() => resolve(DEADLINE), deadlineMs);
    }),
  ]).finally(() => clearTimeout(timer));
  const now = Date.now();
  if (outcome === DEADLINE) {
    noteFailure(now, "timeout", { bucketKey, deadlineMs });
    return { allowed: false, unavailable: true };
  }
  const { data, error } = outcome;
  if (error) {
    // Production quota gates must fail closed. Token/AI endpoints cannot become
    // unlimited if the rate-limit backing function is unavailable.
    noteFailure(now, "error", { bucketKey, error: error.message, latencyMs: now - startedAt });
    return { allowed: false, unavailable: true };
  }
  noteSuccess(now);
  return { allowed: Boolean(data) };
}

// ── الحصّة المحدودة في الذاكرة (أثناء العطل فقط) ─────────────────────────────

/** نصف السقف الأصلي: أضيق مما يمنحه المخزن، أوسع من صفر. */
export const DEGRADED_FRACTION = 0.5;
/** سقف مفاتيح الدلاء في الذاكرة — رشّ المفاتيح لا يُفرغ ذاكرة المعزول. */
export const DEGRADED_MAX_KEYS = 2_000;

type DegradedBucket = { windowStart: number; count: number };
const degradedBuckets = new Map<string, DegradedBucket>();

export type DegradedAllowance = {
  allowed: boolean;
  cap: number;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * يعدّ الطلب على دلوٍ في الذاكرة بنصف السقف الأصلي. لكل معزولٍ عدّاده —
 * فالحدّ الفعليّ عبر المعزولات = السقف × عددها؛ وهذا مقبولٌ كحدٍّ أثناء العطل،
 * لا كتحقّقٍ من حصّة. لا يُستدعى إلا حين يعيد `enforceRateLimit` «غير متاح».
 */
export function degradedAllowance(
  bucketKey: string,
  maxRequests: number,
  windowSeconds: number,
  now = Date.now(),
): DegradedAllowance {
  const cap = Math.max(1, Math.floor(maxRequests * DEGRADED_FRACTION));
  const windowMs = Math.max(1, windowSeconds) * 1000;
  let bucket = degradedBuckets.get(bucketKey);
  if (!bucket || now - bucket.windowStart >= windowMs) bucket = { windowStart: now, count: 0 };
  bucket.count += 1;
  // ترتيب «الأقدم استعمالًا أوّلًا»: الحذف ثم الإدراج يضع المفتاح في الذيل.
  degradedBuckets.delete(bucketKey);
  degradedBuckets.set(bucketKey, bucket);
  while (degradedBuckets.size > DEGRADED_MAX_KEYS) {
    const oldest = degradedBuckets.keys().next().value;
    if (oldest === undefined) break;
    degradedBuckets.delete(oldest);
  }
  return {
    allowed: bucket.count <= cap,
    cap,
    remaining: Math.max(0, cap - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.windowStart + windowMs - now) / 1000)),
  };
}

export type GateDegradedMode = "bounded" | "closed";

/**
 * سياسة الدردشة حين يتعذّر المخزن: `closed` (الافتراض) = ردٌّ محليّ صادق بلا
 * نموذج — صفر إنفاق بلا حصّة متحقَّقة؛ `bounded` = تمرّ بحدود الذاكرة (نصف
 * السقوف لكل معزول) ويصل النموذج. متغيّر بيئة لا نشر.
 *
 * الافتراض `closed` بقرار الحارس (نقض 91e2544): تمرير الإنفاق بلا تحقّق قرارُ
 * فوترة للمالك (المادة ٨)، فلا يُتّخذ افتراضًا؛ إقراره = `SADEED_GATE_DEGRADED_MODE=bounded`
 * في بيئة الخادم، بلا نشر. التجاوب الفوري متحقّق في الحالتين (القاطع يجعل
 * «غير متاح» فوريًّا)؛ الفرق هو هل يصل النموذج أم لا.
 */
export function gateDegradedMode(
  env: Record<string, string | undefined> = process.env,
): GateDegradedMode {
  return (env.SADEED_GATE_DEGRADED_MODE ?? "").trim().toLowerCase() === "bounded"
    ? "bounded"
    : "closed";
}

/** للاختبارات وحدها: يعيد القاطع والدلاء إلى الصفر. */
export function resetRateLimitStateForTests(): void {
  breaker.consecutiveFailures = 0;
  breaker.openedAt = null;
  breaker.probing = false;
  breaker.lastFailureAt = null;
  breaker.lastSuccessAt = null;
  degradedBuckets.clear();
}

export function rateLimitUnavailableResponse() {
  return new Response(
    JSON.stringify({ error: "rate_limit_unavailable", retry_after_seconds: 60 }),
    {
      status: 503,
      headers: { "Content-Type": "application/json", "Retry-After": "60" },
    },
  );
}

export function rateLimitResponse() {
  return new Response(JSON.stringify({ error: "rate_limited", retry_after_seconds: 60 }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": "60" },
  });
}

export function clientBucketKey(request: Request, scope: string): string {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return `${scope}:${ip}`;
}
