import { describe, expect, it } from "vitest";
import { CHAT_BUSY_AR, CHAT_CONNECTION_ERROR_AR, chatErrorText } from "./chat-error-text";

const HAS_ARABIC = /[؀-ۿ]/;
const ASCII_CODE = /^[a-z0-9_]+$/;

describe("نصّ خطأ الدردشة — عربيٌّ دائمًا ولا رمز تقنيّ", () => {
  it("لقطة المالك ٢٠٢٦/١٠/١٦: `rate_limit_unavailable` لا يصل الشاشة", () => {
    const shown = chatErrorText(
      JSON.stringify({ error: "rate_limit_unavailable", retry_after_seconds: 60 }),
    );
    expect(shown).not.toContain("rate_limit");
    expect(HAS_ARABIC.test(shown)).toBe(true);
  });

  it("الجملة الإنجليزية من الخادم لا تُعرض", () => {
    const shown = chatErrorText(
      JSON.stringify({
        ok: false,
        error: "SADEED is temporarily rate limited. Please retry shortly.",
      }),
    );
    expect(shown).toBe(CHAT_CONNECTION_ERROR_AR);
  });

  it("`message_ar` من الخادم يُقدَّم على الرمز", () => {
    const shown = chatErrorText(
      JSON.stringify({ error: "daily_identity_cap", message_ar: "تجاوزت حصّتك اليومية." }),
    );
    expect(shown).toBe("تجاوزت حصّتك اليومية.");
  });

  it("رمز الازدحام المعروف ⇐ جملته العربية", () => {
    expect(chatErrorText(JSON.stringify({ error: "rate_limited" }))).toBe(CHAT_BUSY_AR);
    expect(chatErrorText("rate_limited")).toBe(CHAT_BUSY_AR);
  });

  it("العربية من الخادم تمرّ، وعبارات المصادقة لا تمرّ ولو كانت مختلطة", () => {
    expect(chatErrorText(JSON.stringify({ error: "انتهت مهلة الردّ." }))).toBe("انتهت مهلة الردّ.");
    expect(chatErrorText(JSON.stringify({ error: "token غير صالح" }))).toBe(
      CHAT_CONNECTION_ERROR_AR,
    );
  });

  it("الفراغ والمجهول والرموز كلّها ⇐ رسالة محايدة — ولا رمز ASCII يخرج أبدًا", () => {
    for (const raw of [
      "",
      undefined,
      null,
      "{}",
      JSON.stringify({ error: "quota_unavailable" }),
      JSON.stringify({ error: "some_new_code" }),
      "Failed to fetch",
      "internal_error",
    ]) {
      const shown = chatErrorText(raw as string);
      expect(HAS_ARABIC.test(shown), String(raw)).toBe(true);
      expect(ASCII_CODE.test(shown), String(raw)).toBe(false);
    }
  });

  it("الانتهاك المزروع (المادة ٣٠): السلوك القديم كان يمرّر الرمز كما هو", () => {
    // نسخةٌ حرفيّة من منطق الفقاعة قبل الإصلاح.
    const old = (raw: string) => {
      const parsed = JSON.parse(raw) as { error?: string };
      if (parsed?.error && !/authenticat|unauthor|token/i.test(parsed.error)) return parsed.error;
      return CHAT_CONNECTION_ERROR_AR;
    };
    const payload = JSON.stringify({ error: "rate_limit_unavailable" });
    expect(old(payload)).toBe("rate_limit_unavailable");
    expect(chatErrorText(payload)).not.toBe(old(payload));
  });
});
