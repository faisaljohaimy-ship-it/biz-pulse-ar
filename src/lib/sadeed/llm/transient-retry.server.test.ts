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
