import { describe, expect, it } from "vitest";
import {
  CHAT_CONNECTION_ERROR_AR,
  CHAT_DUPLICATE_AR,
  CHAT_SERVER_BUSY_AR,
  chatErrorText,
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

  it("سقوف اليوم بلا message_ar ⇐ جملةٌ عربية لا رمز", () => {
    for (const code of ["daily_global_cap", "daily_identity_cap"]) {
      const shown = chatErrorText(JSON.stringify({ error: code }));
      expect(HAS_ARABIC.test(shown), code).toBe(true);
      expect(shown).not.toContain(code);
    }
  });
});
