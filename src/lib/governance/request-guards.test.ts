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
});
