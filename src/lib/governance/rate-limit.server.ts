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
import { trustedClientIp } from "@/lib/sadeed/public-incident-client-ip.server";

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
  // Incremented for every observed failure so stale success cannot reset recovery state.
  failureGeneration: 0,
  openedAt: null as number | null,
  probing: false,
  lastFailureAt: null as number | null,
  lastSuccessAt: null as number | null,
};

function breakerIsOpen(now: number): boolean {
  // A backward wall-clock adjustment must not extend a 30s open window indefinitely.
  // Permit the ordinary single half-open probe; failures still fail closed.
  if (breaker.openedAt === null) return false;
  const elapsed = now - breaker.openedAt;
  return elapsed >= 0 && elapsed < BREAKER_OPEN_MS;
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

/** Never write quota bucket keys (IP/user identity) or backend error payloads to logs. */
function noteFailure(now: number, reason: string, detail: Record<string, unknown>): void {
  if (breaker.lastFailureAt !== null && now - breaker.lastFailureAt > BREAKER_FAILURE_WINDOW_MS) {
    // انقطعت السلسلة: الفشل السابق أقدم من نافذة الستّين ثانية.
    breaker.consecutiveFailures = 0;
  }
  breaker.consecutiveFailures += 1;
  breaker.failureGeneration += 1;
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

function noteSuccess(now: number, startedFailureGeneration: number): void {
  // A check started before a newer failure cannot demonstrate recovery or
  // close a breaker opened by that later failure.
  if (breaker.failureGeneration !== startedFailureGeneration) return;
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
  const startedFailureGeneration = breaker.failureGeneration;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // The lazy admin-client getter can throw synchronously if no server
  // credentials exist. Convert that to a rejected probe (fail closed), never
  // an uncaught 500 from a read-only health endpoint.
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
    noteFailure(now, "timeout", { deadlineMs, latencyMs: now - startedAt });
    return { allowed: false, unavailable: true };
  }
  // Treat malformed RPC envelopes as unavailable, not as an uncaught 500.
  // A successful check_rate_limit RPC has a strict boolean data contract.
  if (!outcome || typeof outcome !== "object" || !("data" in outcome)) {
    noteFailure(now, "invalid_response", { latencyMs: now - startedAt });
    return { allowed: false, unavailable: true };
  }
  const { data, error } = outcome;
  if (error) {
    // Production quota gates must fail closed. Token/AI endpoints cannot become
    // unlimited if the rate-limit backing function is unavailable.
    noteFailure(now, "error", { latencyMs: now - startedAt });
    return { allowed: false, unavailable: true };
  }
  // Boolean("false") and Boolean({}) both evaluate to true. Never grant an AI
  // quota slot when the database returned a non-boolean payload.
  if (typeof data !== "boolean") {
    noteFailure(now, "invalid_response", { latencyMs: now - startedAt });
    return { allowed: false, unavailable: true };
  }
  noteSuccess(now, startedFailureGeneration);
  return { allowed: data };
}

// ── الحصّة المحدودة في الذاكرة (أثناء العطل فقط) ─────────────────────────────

/** نصف السقف الأصلي: أضيق مما يمنحه المخزن، أوسع من صفر. */
export const DEGRADED_FRACTION = 0.5;
/** Bounded active-key capacity: 2,500 chat identities + global daily bucket + headroom. */
export const DEGRADED_MAX_KEYS = 3_000;

type DegradedBucket = { windowStart: number; count: number; windowMs: number; cap: number };
const degradedBuckets = new Map<string, DegradedBucket>();

export type DegradedAllowance = {
  allowed: boolean;
  cap: number;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Fail closed for a new bucket when all slots are in active quota windows.
 * An attacker must not reset an exhausted bucket by spraying different keys.
 * Reclaim only expired windows, including non-leading entries with shorter TTLs.
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
  if (bucket && now - bucket.windowStart >= bucket.windowMs) {
    degradedBuckets.delete(bucketKey);
    bucket = undefined;
  }

  if (!bucket) {
    if (degradedBuckets.size >= DEGRADED_MAX_KEYS) {
      for (const [key, entry] of degradedBuckets) {
        if (now - entry.windowStart >= entry.windowMs) degradedBuckets.delete(key);
      }
    }
    if (degradedBuckets.size >= DEGRADED_MAX_KEYS) {
      let nextSlotMs = Number.POSITIVE_INFINITY;
      for (const entry of degradedBuckets.values()) {
        nextSlotMs = Math.min(nextSlotMs, entry.windowStart + entry.windowMs - now);
      }
      return {
        allowed: false,
        cap,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil(nextSlotMs / 1000)),
      };
    }
    bucket = { windowStart: now, count: 0, windowMs, cap };
    degradedBuckets.set(bucketKey, bucket);
  } else {
    // An active quota key may be reused with different arguments. Never allow a
    // shorter requested window or a higher requested cap to reset/relax it.
    // Only the more restrictive parameters can apply until the old window ends.
    bucket.windowMs = Math.max(bucket.windowMs, windowMs);
    bucket.cap = Math.min(bucket.cap, cap);
  }

  bucket.count += 1;
  return {
    allowed: bucket.count <= bucket.cap,
    cap: bucket.cap,
    remaining: Math.max(0, bucket.cap - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.windowStart + bucket.windowMs - now) / 1000)),
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
  breaker.failureGeneration = 0;
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
  // Vercel does not authenticate a client-supplied CF-Connecting-IP header.
  // Use the same platform-owned source IP as the hardened public incident sink.
  return `${scope}:${trustedClientIp(request)}`;
}
