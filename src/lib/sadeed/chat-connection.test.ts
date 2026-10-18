/**
 * شارة سَدِيد لا تقول «متصل» والبوّابة مغلقة (DEF-11، ٢٠٢٦/١٠/١٨).
 */
import { describe, expect, it } from "vitest";
import { connectionFromHealth } from "./chat-connection";

describe("connectionFromHealth — الشارة تقرأ البوّابة لا المفتاح وحده", () => {
  it("مفتاحٌ والبوّابة مغلقة ⇐ «ردود فورية فقط» لا «متصل»", () => {
    expect(connectionFromHealth({ ok: true, key_present: true, gate: "closed" })).toBe("limited");
    expect(connectionFromHealth({ ok: true, provider: "google-gemini", gate: "closed" })).toBe(
      "limited",
    );
  });

  it("البوّابة سليمة أو بحدود الذاكرة ⇐ «متصل» — النموذج يُستدعى فعلًا", () => {
    expect(connectionFromHealth({ ok: true, key_present: true, gate: "verified" })).toBe("ready");
    expect(connectionFromHealth({ ok: true, provider: "google-gemini", gate: "degraded" })).toBe(
      "ready",
    );
  });

  it("خادمٌ أقدم بلا حقل البوّابة يُقرأ كما كان", () => {
    expect(connectionFromHealth({ ok: true, key_present: true })).toBe("ready");
  });

  it("لا مزوّد ⇐ ردود محلية فقط، أيًّا كانت البوّابة", () => {
    expect(connectionFromHealth({ ok: true, key_present: false, gate: "closed" })).toBe("local");
    expect(connectionFromHealth({ ok: true, key_present: false, provider: null })).toBe("local");
  });

  it("جسمٌ مشوَّه أو ok غير صادق يرمي — فتقول الشارة «تعذّر التحقق» لا حالًا مختلَقة", () => {
    expect(() => connectionFromHealth(null)).toThrow();
    expect(() => connectionFromHealth("ok")).toThrow();
    expect(() => connectionFromHealth({ ok: false, key_present: true })).toThrow();
  });
});
