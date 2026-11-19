import { describe, expect, it } from "vitest";
import {
  TRANSIENT_BACKOFF_BASE_MS,
  TRANSIENT_JITTER_MS,
  TRANSIENT_MIN_REMAINING_MS,
  TRANSIENT_RETRY_MAX,
  abortableDelay,
  hasTimeForRetry,
  isTransientOverload,
  transientBackoffMs,
} from "./transient-retry.server";

const err = (message: string, statusCode?: number) =>
  Object.assign(new Error(message), statusCode === undefined ? {} : { statusCode });

describe("isTransientOverload — الازدحام العابر يُعاد، والحصّة والرفض والإلغاء لا", () => {
  it("نصّ الإنتاج المقيس «high demand» ⇐ يُعاد", () => {
    expect(
      isTransientOverload(
        err(
          "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
        ),
      ),
    ).toBe(true);
  });

  it("503/502/504/500 بالحالة المهيكلة أو بنصّ الرسالة ⇐ يُعاد", () => {
    for (const s of [500, 502, 503, 504]) {
      expect(isTransientOverload(err("upstream failed", s)), String(s)).toBe(true);
      expect(isTransientOverload(err(`HTTP ${s} from upstream`)), String(s)).toBe(true);
    }
    expect(isTransientOverload(err("The model is overloaded. Please try again later."))).toBe(true);
    expect(isTransientOverload(err("Service Unavailable"))).toBe(true);
  });

  it("الحصّة لا تُعاد أبدًا: 429 وquota وrate limit وRESOURCE_EXHAUSTED — ولو حملت نصًّا يشبه الازدحام", () => {
    expect(isTransientOverload(err("429 Too Many Requests", 429))).toBe(false);
    expect(
      isTransientOverload(
        err("Quota exceeded for metric generate_content_free_tier_requests, limit: 20"),
      ),
    ).toBe(false);
    expect(isTransientOverload(err("RESOURCE_EXHAUSTED: try again later"))).toBe(false);
    expect(isTransientOverload(err("rate limit reached, service unavailable"))).toBe(false);
    // ٥٠٣ في وسط نصّ حصّة تبقى حصّةً.
    expect(isTransientOverload(err("503 quota exhausted for this key"))).toBe(false);
  });

  it("الرفض لا يُعاد ولو حمل «unavailable»: 400/401/402/403/404", () => {
    for (const s of [400, 401, 402, 403, 404]) {
      expect(isTransientOverload(err("model unavailable for this key", s)), String(s)).toBe(false);
    }
    expect(isTransientOverload(err("403 Forbidden — service unavailable in region"))).toBe(false);
    // Provider SDKs can attach absent/placeholder statusCode fields. A coerced
    // 0 must not override the explicit 403 in the message and trigger a retry.
    for (const invalid of [null, "", false, 0, Number.NaN, 503.5]) {
      const rejected = Object.assign(err("403 Forbidden — service unavailable"), {
        statusCode: invalid,
      });
      expect(isTransientOverload(rejected), String(invalid)).toBe(false);
    }
  });

  it("يحترم status القياسي في أخطاء مزوّدي AI: لا إعادة للحصّة أو الرفض حتى مع نص ازدحام", () => {
    for (const status of [400, 401, 402, 403, 404, 429]) {
      const sdkError = Object.assign(err("Service unavailable"), { status });
      expect(isTransientOverload(sdkError), String(status)).toBe(false);
    }
    // A structured 429 wins even if incidental response text mentions a 503.
    const quotaWithServerError = Object.assign(err("503 service unavailable"), { status: 429 });
    expect(isTransientOverload(quotaWithServerError)).toBe(false);
    // An invalid legacy field must not hide a valid status from the provider SDK.
    const quotaWithInvalidLegacyStatus = Object.assign(err("service unavailable"), {
      statusCode: null,
      status: 429,
    });
    expect(isTransientOverload(quotaWithInvalidLegacyStatus)).toBe(false);
    for (const status of [500, 502, 503, 504]) {
      const sdkError = Object.assign(err("upstream failed"), { status });
      expect(isTransientOverload(sdkError), String(status)).toBe(true);
    }
    const stringStatus = Object.assign(err("service unavailable"), { status: "403" });
    expect(isTransientOverload(stringStatus)).toBe(false);
  });

  it("does not retry conflicting SDK status fields when either reports a client/quota rejection", () => {
    // Some SDK wrappers expose both statusCode and status. The older first-field
    // return silently retried 503/429, even though the second field was a real
    // quota rejection. A denial must win regardless of field order.
    for (const rejection of [400, 401, 402, 403, 404, 429]) {
      const legacyServerError = Object.assign(err("upstream failed"), {
        statusCode: 503,
        status: rejection,
      });
      expect(isTransientOverload(legacyServerError), `503 / ${rejection}`).toBe(false);
      const modernServerError = Object.assign(err("upstream failed"), {
        statusCode: rejection,
        status: 503,
      });
      expect(isTransientOverload(modernServerError), `${rejection} / 503`).toBe(false);
    }
    expect(
      isTransientOverload(
        Object.assign(err("upstream failed"), { statusCode: 503, status: "429" }),
      ),
    ).toBe(false);
    // A second genuine server error remains eligible for bounded retry.
    expect(
      isTransientOverload(Object.assign(err("upstream failed"), { statusCode: 503, status: 504 })),
    ).toBe(true);
  });

  it("الإلغاء والمهلة لا يُعادان", () => {
    expect(isTransientOverload(new DOMException("timed out", "TimeoutError"))).toBe(false);
    expect(isTransientOverload(new DOMException("aborted", "AbortError"))).toBe(false);
  });

  it("خطأٌ مجهول بلا حالة ولا كلمات الازدحام لا يُعاد", () => {
    expect(isTransientOverload(err("something odd happened"))).toBe(false);
    expect(isTransientOverload("plain string")).toBe(false);
    expect(isTransientOverload(null)).toBe(false);
  });
});

describe("التراجع والمهلة والسقف", () => {
  it("إعادةٌ واحدة فقط، والتراجع أُسّيّ بتشويش محصور", () => {
    expect(TRANSIENT_RETRY_MAX).toBe(1);
    expect(transientBackoffMs(0, 0)).toBe(TRANSIENT_BACKOFF_BASE_MS);
    expect(transientBackoffMs(1, 0)).toBe(TRANSIENT_BACKOFF_BASE_MS * 2);
    expect(transientBackoffMs(0, 1)).toBe(TRANSIENT_BACKOFF_BASE_MS + TRANSIENT_JITTER_MS);
    // عشوائيةٌ خارج [0،1] تُحصر.
    expect(transientBackoffMs(0, 5)).toBe(TRANSIENT_BACKOFF_BASE_MS + TRANSIENT_JITTER_MS);
    expect(transientBackoffMs(0, -3)).toBe(TRANSIENT_BACKOFF_BASE_MS);
  });

  it("لا إعادة إن لم يبقَ هامشٌ لنداءٍ ثانٍ داخل سقف الدور", () => {
    const deadline = 45_000;
    expect(hasTimeForRetry(deadline, 5_000, 1_500)).toBe(true);
    expect(hasTimeForRetry(deadline, 40_000, 1_500)).toBe(false);
    // الحدّ بالضبط: يبقى TRANSIENT_MIN_REMAINING_MS بعد الانتظار.
    const elapsed = deadline - 1_500 - TRANSIENT_MIN_REMAINING_MS;
    expect(hasTimeForRetry(deadline, elapsed, 1_500)).toBe(true);
    expect(hasTimeForRetry(deadline, elapsed + 1, 1_500)).toBe(false);
  });

  it("الانتظار يُقطع بالإلغاء فلا يعلّق الطلب", async () => {
    const ctl = new AbortController();
    const waiting = abortableDelay(60_000, ctl.signal);
    ctl.abort(new DOMException("client left", "AbortError"));
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
    // إشارةٌ ملغاة سلفًا ترفض فورًا.
    await expect(abortableDelay(10, ctl.signal)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("وينتهي في وقته حين لا إلغاء", async () => {
    const ctl = new AbortController();
    const t0 = Date.now();
    await abortableDelay(30, ctl.signal);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(25);
  });
});
