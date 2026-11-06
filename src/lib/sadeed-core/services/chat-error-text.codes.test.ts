import { describe, expect, it } from "vitest";
import {
  CHAT_CONNECTION_ERROR_AR,
  CHAT_DUPLICATE_AR,
  CHAT_SERVER_BUSY_AR,
  CHAT_TIMEOUT_AR,
  CHAT_TIMEOUT_CODE,
  chatErrorText,
  isChatTimeout,
} from "./chat-error-text";

const HAS_ARABIC = /[؀-ۿ]/;

describe("رموز البوّابة الجديدة (VIBE 5.1) تصل جملًا عربية", () => {
  it("`code` معروف يُقدَّم على نصّ `error`", () => {
    expect(chatErrorText(JSON.stringify({ ok: false, error: "x", code: "busy" }))).toBe(
      CHAT_SERVER_BUSY_AR,
    );
    expect(
      chatErrorText(JSON.stringify({ ok: false, error: "x", code: "duplicate_request" })),
    ).toBe(CHAT_DUPLICATE_AR);
  });

  it("`message_ar` من الخادم يسبق `code`", () => {
    expect(
      chatErrorText(
        JSON.stringify({ error: "daily_identity_cap", code: "busy", message_ar: "نصّ الخادم." }),
      ),
    ).toBe("نصّ الخادم.");
  });

  it("رمزٌ مجهول في `code` لا يُعرض؛ يُحكَم بنصّ `error` ثم بالمحايد", () => {
    expect(chatErrorText(JSON.stringify({ error: "جملة عربية.", code: "weird_code" }))).toBe(
      "جملة عربية.",
    );
    expect(chatErrorText(JSON.stringify({ error: "weird_code", code: "weird_code" }))).toBe(
      CHAT_CONNECTION_ERROR_AR,
    );
  });

  it.each(["toString", "constructor", "__proto__", "hasOwnProperty", "valueOf"])(
    "inherited Object.prototype name %s cannot become a non-string chat error",
    (code) => {
      expect(chatErrorText(code)).toBe(CHAT_CONNECTION_ERROR_AR);
      expect(chatErrorText(JSON.stringify({ code }))).toBe(CHAT_CONNECTION_ERROR_AR);
      expect(chatErrorText(JSON.stringify({ error: code }))).toBe(CHAT_CONNECTION_ERROR_AR);
    },
  );

  it("سقوف اليوم بلا message_ar ⇐ جملةٌ عربية لا رمز", () => {
    for (const code of ["daily_global_cap", "daily_identity_cap"]) {
      const shown = chatErrorText(JSON.stringify({ error: code }));
      expect(HAS_ARABIC.test(shown), code).toBe(true);
      expect(shown).not.toContain(code);
    }
  });
});

describe("مهلة العميل (F1، ٢٠٢٦/١١/٠٣) تصل جملةً عربية صادقة", () => {
  it("رمز المهلة ⇐ «استغرق الرد أطول من المعتاد» لا الرسالة المحايدة ولا الرمز", () => {
    const shown = chatErrorText(CHAT_TIMEOUT_CODE);
    expect(shown).toBe(CHAT_TIMEOUT_AR);
    expect(shown).not.toBe(CHAT_CONNECTION_ERROR_AR);
    expect(shown).toContain("أطول من المعتاد");
    expect(shown).not.toContain(CHAT_TIMEOUT_CODE);
    expect(HAS_ARABIC.test(shown)).toBe(true);
    // وبصيغة JSON من الخادم كذلك (code/error) — لا يتبدّل المعنى.
    expect(chatErrorText(JSON.stringify({ error: CHAT_TIMEOUT_CODE }))).toBe(CHAT_TIMEOUT_AR);
    expect(chatErrorText(JSON.stringify({ code: CHAT_TIMEOUT_CODE }))).toBe(CHAT_TIMEOUT_AR);
  });

  it("isChatTimeout يميّز المهلة وحدها عن بقية الأخطاء (لا إعادة تلقائية لها)", () => {
    expect(isChatTimeout(new DOMException(CHAT_TIMEOUT_CODE, "TimeoutError"))).toBe(true);
    expect(isChatTimeout({ message: CHAT_TIMEOUT_CODE })).toBe(true);
    for (const other of [
      undefined,
      null,
      new Error("Failed to fetch"),
      new Error(JSON.stringify({ error: "busy" })),
      new DOMException("The operation was aborted.", "AbortError"),
      { message: "" },
    ]) {
      expect(isChatTimeout(other as Error | undefined), String(other)).toBe(false);
    }
  });
});
