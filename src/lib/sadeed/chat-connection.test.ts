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

  it("treats explicit key_present=false as authoritative even with a selected provider label", () => {
    expect(
      connectionFromHealth({
        ok: true,
        key_present: false,
        provider: "google-gemini",
        gate: "verified",
      }),
    ).toBe("local");
    expect(
      connectionFromHealth({
        ok: true,
        key_present: false,
        provider: "google-gemini",
        gate: "closed",
      }),
    ).toBe("local");
  });

  it("does not interpret whitespace-only legacy provider labels as a configured model", () => {
    expect(connectionFromHealth({ ok: true, provider: "  " })).toBe("local");
    expect(connectionFromHealth({ ok: true, provider: "google-gemini" })).toBe("ready");
    expect(connectionFromHealth({ ok: true, key_present: true, provider: null })).toBe("ready");
  });

  it("خادمٌ أقدم بلا حقل البوّابة يُقرأ كما كان", () => {
    expect(connectionFromHealth({ ok: true, key_present: true })).toBe("ready");
  });

  it("rejects unrecognized or malformed gate values rather than falsely showing connected", () => {
    for (const gate of ["maintenance", "blocked", null, false, 0]) {
      expect(
        () => connectionFromHealth({ ok: true, key_present: true, gate }),
        String(gate),
      ).toThrow("chat health: unknown gate");
    }
    // Missing gate from older servers is still valid for compatibility.
    expect(connectionFromHealth({ ok: true, key_present: true })).toBe("ready");
    // No configured provider remains local, regardless of the gate field.
    expect(connectionFromHealth({ ok: true, key_present: false, gate: "blocked" })).toBe("local");
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
