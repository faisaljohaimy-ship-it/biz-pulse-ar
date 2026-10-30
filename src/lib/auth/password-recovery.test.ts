import { describe, expect, it } from "vitest";
import {
  RECOVERY_COOLDOWN_MS,
  RECOVERY_RETURN_PATH,
  isEmailShape,
  isRecoveryUrl,
  newPasswordError,
  recoveryErrorKind,
  recoveryMessage,
  recoveryRedirectTo,
  type RecoveryNotice,
} from "./password-recovery";

const KINDS: RecoveryNotice[] = [
  "sent",
  "email_invalid",
  "short",
  "mismatch",
  "updated",
  "link_expired",
  "rate",
  "network",
  "weak",
  "same",
  "expired",
  "other",
];

describe("recoveryRedirectTo", () => {
  it("يبني الوجهة على الأصل نفسه (https أو localhost فقط)", () => {
    expect(recoveryRedirectTo("https://neexios.com")).toBe("https://neexios.com/auth?mode=reset");
    expect(recoveryRedirectTo("https://www.neexios.com")).toBe(
      "https://www.neexios.com/auth?mode=reset",
    );
    expect(recoveryRedirectTo("http://localhost:4251")).toBe(
      "http://localhost:4251/auth?mode=reset",
    );
    expect(recoveryRedirectTo("http://127.0.0.1:3000")).toBe(
      "http://127.0.0.1:3000/auth?mode=reset",
    );
    expect(RECOVERY_RETURN_PATH).toBe("/auth?mode=reset");
  });

  it("يرفض الأصل غير الآمن: http خارج المحلي، وبيانات اعتماد مضمَّنة، وبروتوكولات أخرى", () => {
    for (const origin of [
      "http://neexios.com",
      "https://user:pw@neexios.com",
      "https://user@neexios.com",
      "javascript:alert(1)",
      "ftp://neexios.com",
      "data:text/html,x",
    ]) {
      expect(() => recoveryRedirectTo(origin), origin).toThrow();
    }
  });

  it("الوجهة لا تتأثر بما بعد الأصل ولو مُرِّر مسارٌ في الأصل", () => {
    expect(recoveryRedirectTo("https://neexios.com/other?x=1#frag")).toBe(
      "https://neexios.com/auth?mode=reset",
    );
  });
});

describe("isRecoveryUrl", () => {
  it("يتعرّف على العودة من رسالة الاستعادة بالصيغتين", () => {
    expect(isRecoveryUrl("https://neexios.com/auth?mode=reset")).toBe(true);
    expect(
      isRecoveryUrl("https://neexios.com/auth#access_token=a&refresh_token=b&type=recovery"),
    ).toBe(true);
    expect(isRecoveryUrl("https://neexios.com/#type=recovery&access_token=a")).toBe(true);
  });

  it("ولا يلتبس بغيره", () => {
    for (const href of [
      "https://neexios.com/auth",
      "https://neexios.com/auth?mode=signin",
      "https://neexios.com/auth?mode=signup",
      "https://neexios.com/auth#type=signup",
      "https://neexios.com/auth#type=magiclink",
      "not a url at all %%%",
      "",
    ]) {
      expect(isRecoveryUrl(href), href).toBe(false);
    }
  });
});

describe("newPasswordError", () => {
  it("قاعدة التسجيل نفسها: ٨ أحرف على الأقل وتطابق التأكيد", () => {
    expect(newPasswordError("1234567", "1234567")).toBe("short");
    expect(newPasswordError("", "")).toBe("short");
    expect(newPasswordError("12345678", "12345679")).toBe("mismatch");
    expect(newPasswordError("12345678", "12345678")).toBeNull();
    expect(newPasswordError("كلمة-مرور-قوية", "كلمة-مرور-قوية")).toBeNull();
  });
});

describe("isEmailShape", () => {
  it("يقبل الصيغة المعقولة ويرفض الفراغ والناقص", () => {
    expect(isEmailShape("faisaljohaimy@gmail.com")).toBe(true);
    expect(isEmailShape("  a@b.co  ")).toBe(true);
    for (const v of ["", "a", "a@", "@b.co", "a@b", "a b@c.de", "a@@b.co"]) {
      expect(isEmailShape(v), v).toBe(false);
    }
  });
});

describe("recoveryErrorKind", () => {
  it("يصنّف رسائل الخدمة الخام إلى أصنافٍ ثابتة", () => {
    expect(recoveryErrorKind("email rate limit exceeded")).toBe("rate");
    expect(
      recoveryErrorKind("For security purposes, you can only request this after 59 seconds"),
    ).toBe("rate");
    expect(recoveryErrorKind("New password should be different from the old password.")).toBe(
      "same",
    );
    expect(recoveryErrorKind("Password should be at least 8 characters")).toBe("weak");
    expect(recoveryErrorKind("weak_password")).toBe("weak");
    expect(recoveryErrorKind("Auth session missing!")).toBe("expired");
    expect(recoveryErrorKind("invalid JWT: token is expired")).toBe("expired");
    expect(recoveryErrorKind("TypeError: Failed to fetch")).toBe("network");
    expect(recoveryErrorKind("503 Service Unavailable")).toBe("network");
    expect(recoveryErrorKind("something unexpected")).toBe("other");
    expect(recoveryErrorKind("")).toBe("other");
  });
});

describe("recoveryMessage", () => {
  it("لكل صنفٍ نصٌّ بالعربية والإنجليزية، غير فارغ", () => {
    for (const kind of KINDS) {
      expect(recoveryMessage(kind, true).length, `ar ${kind}`).toBeGreaterThan(8);
      expect(recoveryMessage(kind, false).length, `en ${kind}`).toBeGreaterThan(8);
    }
  });

  it("بلا عبارات مصادقة تقنية، ولا شرطة طويلة، ولا نصّ خادم", () => {
    for (const kind of KINDS) {
      for (const ar of [true, false]) {
        const text = recoveryMessage(kind, ar);
        expect(text, `${kind}/${ar}`).not.toMatch(
          /authenticat|unauthor|token|jwt|supabase|gotrue/i,
        );
        expect(text, `${kind}/${ar}`).not.toMatch(/[—–]/);
      }
    }
  });

  it("رسالة «sent» محايدة: لا تؤكّد وجود الحساب ولا تنفيه", () => {
    const ar = recoveryMessage("sent", true);
    const en = recoveryMessage("sent", false);
    expect(ar).toContain("إن كان");
    expect(en).toMatch(/^If /);
    expect(ar).not.toMatch(/غير مسجَّل|لا يوجد|لم نجد/);
    expect(en).not.toMatch(/not registered|no account|not found/i);
  });

  it("الحدّ الأدنى في الرسالة هو حدّ القاعدة (٨)", () => {
    expect(recoveryMessage("short", true)).toContain("8");
    expect(recoveryMessage("short", false)).toContain("8");
  });

  it("فاصل الإرسال دقيقة (حدّ الخدمة لكل بريد)", () => {
    expect(RECOVERY_COOLDOWN_MS).toBe(60_000);
  });
});
