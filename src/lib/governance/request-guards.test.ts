import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MODEL_SLOT_TTL_MS,
  REQUEST_INFLIGHT_TTL_MS,
  acquireModelSlot,
  acquireRequest,
  fingerprint,
  inflightModelCalls,
  maxInflightModelCalls,
  resetRequestGuardsForTests,
} from "./request-guards.server";

beforeEach(() => resetRequestGuardsForTests());
afterEach(() => resetRequestGuardsForTests());

describe("البصمة", () => {
  it("مستقرّة للمدخل نفسه ومختلفة لأيّ اختلاف", () => {
    const a = fingerprint("ip:1", "t1", "ما الحالة؟");
    expect(a).toBe(fingerprint("ip:1", "t1", "ما الحالة؟"));
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    expect(fingerprint("ip:2", "t1", "ما الحالة؟")).not.toBe(a);
    expect(fingerprint("ip:1", "t2", "ما الحالة؟")).not.toBe(a);
    expect(fingerprint("ip:1", "t1", "ما الحالة")).not.toBe(a);
    expect(fingerprint("ip:1", null, "")).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("منع التكرار", () => {
  it("الطلب نفسه وهو جارٍ يُرفض، وبعد التحرير يمرّ", () => {
    const release = acquireRequest("k", 1_000);
    expect(release).not.toBeNull();
    expect(acquireRequest("k", 1_500)).toBeNull();
    expect(acquireRequest("other", 1_500)).not.toBeNull();
    release!();
    expect(acquireRequest("k", 1_600)).not.toBeNull();
  });

  it("المدخل الذي لم يُحرَّر يشفى بعد عمره الأقصى", () => {
    expect(acquireRequest("k", 0)).not.toBeNull();
    expect(acquireRequest("k", REQUEST_INFLIGHT_TTL_MS - 1)).toBeNull();
    expect(acquireRequest("k", REQUEST_INFLIGHT_TTL_MS)).not.toBeNull();
  });

  it("لا يطرد بصمات طلبات حيّة عند رشّ 5000 مفتاح مختلف", () => {
    const release = acquireRequest("first", 1_000);
    expect(release).not.toBeNull();
    for (let i = 0; i < 4_999; i += 1) {
      expect(acquireRequest(`spray-${i}`, 1_000)).not.toBeNull();
    }
    // Capacity must fail closed; the original in-flight request still deduplicates.
    expect(acquireRequest("new", 1_000)).toBeNull();
    expect(acquireRequest("first", 1_000)).toBeNull();
    release!();
    expect(acquireRequest("new", 1_000)).not.toBeNull();
  });

  it("يستردّ الخانات بعد انقضاء TTL دون حذف طلب حيّ", () => {
    for (let i = 0; i < 5_000; i += 1) {
      expect(acquireRequest(`k-${i}`, 1_000)).not.toBeNull();
    }
    expect(acquireRequest("fresh", 1_000 + REQUEST_INFLIGHT_TTL_MS - 1)).toBeNull();
    expect(acquireRequest("fresh", 1_000 + REQUEST_INFLIGHT_TTL_MS)).not.toBeNull();
    expect(acquireRequest("k-0", 1_000 + REQUEST_INFLIGHT_TTL_MS)).not.toBeNull();
  });

  it("يستردّ الحجوزات المنتهية بعد رجوع ساعة النظام دون إسقاط الحجز الحيّ", () => {
    // The first request was reserved before a backward wall-clock adjustment.
    const release = acquireRequest("first", 100_000);
    expect(release).not.toBeNull();
    for (let i = 0; i < 4_999; i += 1) {
      expect(acquireRequest(`later-${i}`, 50_000)).not.toBeNull();
    }
    // The later 4,999 reservations have expired, although the first has not.
    expect(acquireRequest("fresh", 75_000)).not.toBeNull();
    expect(acquireRequest("first", 75_000)).toBeNull();
    release!();
  });

  it("يستردّ منع التكرار بعد TTL من رجوع الساعة ولا يحرّر الحجز البديل", () => {
    const original = acquireRequest("clock-rewind", 100_000);
    expect(original).not.toBeNull();
    expect(acquireRequest("clock-rewind", 50_000)).toBeNull();
    expect(acquireRequest("clock-rewind", 50_000 + REQUEST_INFLIGHT_TTL_MS - 1)).toBeNull();

    const replacement = acquireRequest("clock-rewind", 50_000 + REQUEST_INFLIGHT_TTL_MS);
    expect(replacement).not.toBeNull();
    original!();
    expect(acquireRequest("clock-rewind", 50_000 + REQUEST_INFLIGHT_TTL_MS + 1)).toBeNull();
    replacement!();
    expect(acquireRequest("clock-rewind", 50_000 + REQUEST_INFLIGHT_TTL_MS + 2)).not.toBeNull();
  });

  it("يستردّ السعة بعد TTL من رجوع الساعة دون طرد أي حجز حيّ", () => {
    for (let i = 0; i < 5_000; i += 1) {
      expect(acquireRequest(`rollback-${i}`, 100_000)).not.toBeNull();
    }
    expect(acquireRequest("fresh", 50_000)).toBeNull();
    expect(acquireRequest("fresh", 50_000 + REQUEST_INFLIGHT_TTL_MS - 1)).toBeNull();
    expect(acquireRequest("fresh", 50_000 + REQUEST_INFLIGHT_TTL_MS)).not.toBeNull();
  });

  it("التحرير لا يمسح حجزًا أحدث بالمفتاح نفسه", () => {
    const stale = acquireRequest("k", 0)!;
    const fresh = acquireRequest("k", REQUEST_INFLIGHT_TTL_MS)!;
    stale();
    expect(acquireRequest("k", REQUEST_INFLIGHT_TTL_MS + 10)).toBeNull();
    fresh();
    expect(acquireRequest("k", REQUEST_INFLIGHT_TTL_MS + 20)).not.toBeNull();
  });
});

describe("سقف التزامن", () => {
  it("السقف من البيئة محصور [1، 64] والافتراض 8", () => {
    expect(maxInflightModelCalls({})).toBe(8);
    expect(maxInflightModelCalls({ SADEED_CHAT_MAX_INFLIGHT: "3" })).toBe(3);
    expect(maxInflightModelCalls({ SADEED_CHAT_MAX_INFLIGHT: "0" })).toBe(1);
    expect(maxInflightModelCalls({ SADEED_CHAT_MAX_INFLIGHT: "500" })).toBe(64);
    expect(maxInflightModelCalls({ SADEED_CHAT_MAX_INFLIGHT: "abc" })).toBe(8);
    expect(maxInflightModelCalls({ SADEED_CHAT_MAX_INFLIGHT: "2e2" })).toBe(8);
    expect(maxInflightModelCalls({ SADEED_CHAT_MAX_INFLIGHT: "3junk" })).toBe(8);
    expect(maxInflightModelCalls({ SADEED_CHAT_MAX_INFLIGHT: "8.9" })).toBe(8);
    expect(maxInflightModelCalls({ SADEED_CHAT_MAX_INFLIGHT: "-2" })).toBe(8);
    expect(maxInflightModelCalls({ SADEED_CHAT_MAX_INFLIGHT: " 3 " })).toBe(3);
  });

  it("فوق السقف ⇐ لا خانة؛ والتحرير يعيدها", () => {
    const env = { SADEED_CHAT_MAX_INFLIGHT: "2" };
    const a = acquireModelSlot(0, env);
    const b = acquireModelSlot(0, env);
    expect(a && b).toBeTruthy();
    expect(inflightModelCalls(0)).toBe(2);
    expect(acquireModelSlot(0, env)).toBeNull();
    a!();
    expect(acquireModelSlot(0, env)).not.toBeNull();
  });

  it("خانةٌ لم تُحرَّر تشفى بعد عمرها الأقصى", () => {
    const env = { SADEED_CHAT_MAX_INFLIGHT: "1" };
    expect(acquireModelSlot(0, env)).not.toBeNull();
    expect(acquireModelSlot(MODEL_SLOT_TTL_MS - 1, env)).toBeNull();
    expect(acquireModelSlot(MODEL_SLOT_TTL_MS, env)).not.toBeNull();
  });

  it("يحافظ على السقف ثم يستردّ خانة النموذج بعد رجوع ساعة الخادم", () => {
    const env = { SADEED_CHAT_MAX_INFLIGHT: "1" };
    const original = acquireModelSlot(100_000, env);
    expect(original).not.toBeNull();

    // The clock steps back while the original model request is still active.
    expect(inflightModelCalls(50_000)).toBe(1);
    expect(acquireModelSlot(50_000, env)).toBeNull();
    expect(inflightModelCalls(50_000 + MODEL_SLOT_TTL_MS - 1)).toBe(1);

    // A forgotten slot expires after the full TTL measured from the rollback.
    const replacement = acquireModelSlot(50_000 + MODEL_SLOT_TTL_MS, env);
    expect(replacement).not.toBeNull();
    original!();
    // A delayed release for the old slot must not delete the new reservation.
    expect(inflightModelCalls(50_000 + MODEL_SLOT_TTL_MS)).toBe(1);
    replacement!();
  });
});
