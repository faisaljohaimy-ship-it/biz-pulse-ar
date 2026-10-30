/**
 * عقد استعادة كلمة المرور في `/auth` (لقطات المالك ٢٠٢٦/١٠/٣٠).
 *
 * قِيس من سجلّ خدمة الهوية: ثلاث محاولات دخول ردّتها `invalid_credentials` والحساب موجودٌ ومؤكَّد
 * وله كلمة مرور — ولم يكن في الواجهة أي مخرج. ما يكسره تعديلٌ ولا يراه tsc:
 *  - حذف رابط «نسيت كلمة المرور؟» (يعود صاحب الحساب عالقًا).
 *  - إرسال الاستعادة بوجهةٍ غير المساعد الخالص (أصلٌ غير آمن).
 *  - أن يسبق التوجيه إلى الرئيسية نموذجَ كلمة المرور الجديدة (جلسة الاستعادة من الرابط تُدخله
 *    فيُرمى خارج الصفحة قبل أن يختار كلمةً يعرفها).
 *  - أن يُعرض نصُّ الخادم الخام، أو أن تُكشف حالة الحساب في رسالة الإرسال.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const AUTH = readFileSync("src/routes/auth.tsx", "utf8");

/** يزيل التعليقات فلا يُحتسب ما عُطِّل. */
const strip = (code: string) =>
  code
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** فجوات الاستعادة في الصفحة — مصفوفة فارغة حين تسلم. */
function recoveryGaps(source: string): string[] {
  const code = strip(source);
  const out: string[] = [];
  if (!/from "@\/lib\/auth\/password-recovery"/.test(code)) out.push("لا استيراد للمساعد الخالص");
  if (!/نسيت كلمة المرور؟/.test(code) || !/onClick=\{openRecovery\}/.test(code))
    out.push("رابط «نسيت كلمة المرور؟» غائب أو لا يفتح الاستعادة");
  if (
    !/supabase\.auth\.resetPasswordForEmail\(\s*target,\s*\{\s*redirectTo:\s*recoveryRedirectTo\(window\.location\.origin\)/.test(
      code,
    )
  )
    out.push("طلب الاستعادة لا يمرّ بـrecoveryRedirectTo(window.location.origin)");
  if (!/supabase\.auth\.updateUser\(\{\s*password:\s*newPassword\s*\}\)/.test(code))
    out.push("حفظ كلمة المرور الجديدة لا يستخدم updateUser({ password })");
  if (!/if \(!authLoading && user && recovery !== "set"\) goNext\(\);/.test(code))
    out.push("التوجيه إلى الرئيسية لا يتوقّف أثناء نموذج كلمة المرور الجديدة");
  if (!/event === "PASSWORD_RECOVERY"/.test(code)) out.push("حدث PASSWORD_RECOVERY غير معالَج");
  if (!/isRecoveryUrl\(window\.location\.href\)/.test(code))
    out.push("الحالة الأولى لا تُقرأ من رابط العودة");
  if (!/search\.mode === "reset"/.test(code)) out.push("mode=reset غير مقبول في البحث");
  if (!/Date\.now\(\) < recoveryCooldownUntil/.test(code)) out.push("لا فاصل بين طلبَي رابط");
  // الأخطاء: كل toast.error في معالجَي الاستعادة يمرّ بـrecoveryMessage.
  const from = code.indexOf("async function handleRecoveryRequest");
  const to = code.indexOf("if (!accepted)", from);
  const handlers = from < 0 || to < 0 ? "" : code.slice(from, to);
  if (!handlers) out.push("معالجا الاستعادة غائبان");
  for (const m of handlers.matchAll(/toast\.error\(([^;]*)\);/g)) {
    if (!/^recoveryMessage\(/.test(m[1].trim())) out.push(`toast.error خام: ${m[1].trim()}`);
  }
  // رسالة الإرسال لا تتفرّع على وجود الحساب.
  if (/data\.user|identities|user_not_found|not found/i.test(handlers))
    out.push("معالج الاستعادة يتفرّع على وجود الحساب");
  return out;
}

describe("/auth: استعادة كلمة المرور", () => {
  it("الصفحة تحمل المسار كاملًا", () => {
    expect(recoveryGaps(AUTH)).toEqual([]);
  });

  it("والكاشف يحمرّ على كل مخالفةٍ مزروعة (المادة ٣٠)", () => {
    const plant = (from: string | RegExp, to: string) => {
      const planted = AUTH.replace(from, to);
      expect(planted, String(from)).not.toBe(AUTH);
      return recoveryGaps(planted);
    };
    // حذف الرابط.
    expect(plant("onClick={openRecovery}", "onClick={() => {}}")).toEqual([
      "رابط «نسيت كلمة المرور؟» غائب أو لا يفتح الاستعادة",
    ]);
    // وجهة غير المساعد الخالص.
    expect(
      plant(
        "redirectTo: recoveryRedirectTo(window.location.origin)",
        'redirectTo: "https://evil.example"',
      ),
    ).toEqual(["طلب الاستعادة لا يمرّ بـrecoveryRedirectTo(window.location.origin)"]);
    // التوجيه يسبق نموذج كلمة المرور.
    expect(plant('user && recovery !== "set") goNext();', "user) goNext();")).toEqual([
      "التوجيه إلى الرئيسية لا يتوقّف أثناء نموذج كلمة المرور الجديدة",
    ]);
    // الحدث غير معالَج.
    expect(plant('event === "PASSWORD_RECOVERY"', 'event === "SIGNED_IN"')).toEqual([
      "حدث PASSWORD_RECOVERY غير معالَج",
    ]);
    // الحالة لا تُقرأ من الرابط.
    expect(plant("isRecoveryUrl(window.location.href)", "false")).toEqual([
      "الحالة الأولى لا تُقرأ من رابط العودة",
    ]);
    // نصّ خادم خام.
    const raw = plant(
      /toast\.error\(\s*recoveryMessage\(\s*recoveryErrorKind\(\s*error instanceof Error \? error\.message : String\(error\),?\s*\),\s*isAr,?\s*\),?\s*\);/,
      "toast.error(error instanceof Error ? error.message : String(error));",
    );
    expect(raw.length).toBeGreaterThan(0);
    expect(raw[0]).toMatch(/^toast\.error خام: /);
    // حفظ كلمة المرور بغير updateUser.
    expect(plant("updateUser({ password: newPassword })", "updateUser({ data: {} })")).toEqual([
      "حفظ كلمة المرور الجديدة لا يستخدم updateUser({ password })",
    ]);
  });

  it("رابطٌ معلَّق لا يُحتسب", () => {
    const commented = AUTH.replace(
      "onClick={openRecovery}",
      "onClick={() => {}} /* onClick={openRecovery} */",
    );
    expect(recoveryGaps(commented)).toContain("رابط «نسيت كلمة المرور؟» غائب أو لا يفتح الاستعادة");
  });
});
