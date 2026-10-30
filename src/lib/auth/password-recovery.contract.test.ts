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
const CONTEXT = readFileSync("src/lib/auth-context.tsx", "utf8");

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
  if (!/if \(busy \|\| recoveryCooling\) return;/.test(code)) out.push("لا فاصل بين طلبَي رابط");
  if (!/window\.setTimeout\(\(\) => setRecoveryCooling\(false\), RECOVERY_COOLDOWN_MS\)/.test(code))
    out.push("الفاصل لا يُرفع بمؤقّت (يبقى الزرّ مقفلًا بعد الدقيقة)");
  if (!/recoveryLandingPending\(\) \|\|\s*\(typeof window/.test(code))
    out.push("الحالة الأولى لا تقرأ الرابط الملتقَط عند التحميل");
  if (!/initialMode !== undefined \|\|\s*recoveryLandingPending\(\) \|\|/.test(code))
    out.push("العائد من الاستعادة يهبط على العرض التنفيذي بدل نموذج كلمة المرور");
  if (!/clearRecoveryLanding\(\);\s*setRecovery\(null\);\s*goNext\(\);/.test(code))
    out.push("الرابط الملتقَط لا يُصفَّر بعد حفظ كلمة المرور");
  if (!/onBack=\{\(\) => \{\s*clearRecoveryLanding\(\);\s*setRecovery\(null\);/.test(code))
    out.push("الرابط الملتقَط لا يُصفَّر عند الرجوع إلى الدخول");
  // بوابات اللوحة: بلا جلسة استعادة لا نموذج كلمة مرور، وأثناء التحقق دوّار لا نموذج ولا «منتهٍ».
  const panel = code.slice(code.indexOf("function RecoveryPanel"));
  if (!/if \(authLoading\) \{/.test(panel)) out.push("اللوحة لا تنتظر التحقق من الجلسة");
  if (!/if \(!signedIn\) \{[\s\S]*?recoveryMessage\("link_expired", isAr\)/.test(panel))
    out.push("اللوحة تعرض نموذج كلمة المرور بلا جلسة استعادة");
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

/** فجوات الالتقاط المبكر في مزوّد الجلسة (الجذر). */
function contextGaps(source: string): string[] {
  const code = strip(source);
  const out: string[] = [];
  const provider = code.indexOf("export function AuthProvider");
  const head = provider < 0 ? code : code.slice(0, provider);
  if (
    !/let recoveryLanding = typeof window !== "undefined" && isRecoveryUrl\(window\.location\.href\);/.test(
      head,
    )
  )
    out.push("الرابط لا يُلتقط على مستوى الوحدة قبل أي أثر");
  if (!/from "@\/lib\/auth\/recovery-url"/.test(head))
    out.push("الجذر لا يستورد المساعد الخفيف (يجرّ نماذج التسجيل إلى الحزمة الأولى)");
  if (
    !/event === "PASSWORD_RECOVERY" && window\.location\.pathname !== "\/auth"\) \{\s*window\.location\.replace\("\/auth\?mode=reset"\);/.test(
      code,
    )
  )
    out.push("PASSWORD_RECOVERY خارج /auth لا يُنقَل إلى نموذج كلمة المرور الجديدة");
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
    // الفاصل بلا مؤقّت، وبوابات اللوحة، والتصفير بعد الحفظ.
    expect(
      plant("window.setTimeout(() => setRecoveryCooling(false), RECOVERY_COOLDOWN_MS)", "0"),
    ).toEqual(["الفاصل لا يُرفع بمؤقّت (يبقى الزرّ مقفلًا بعد الدقيقة)"]);
    expect(plant("if (!signedIn) {", "if (false) {")).toEqual([
      "اللوحة تعرض نموذج كلمة المرور بلا جلسة استعادة",
    ]);
    expect(plant("if (authLoading) {", "if (false) {")).toEqual([
      "اللوحة لا تنتظر التحقق من الجلسة",
    ]);
    expect(plant("recoveryLandingPending() ||\n    (typeof window", "(typeof window")).toEqual([
      "الحالة الأولى لا تقرأ الرابط الملتقَط عند التحميل",
    ]);
    expect(
      plant(
        "initialMode !== undefined ||\n        recoveryLandingPending() ||",
        "initialMode !== undefined ||",
      ),
    ).toEqual(["العائد من الاستعادة يهبط على العرض التنفيذي بدل نموذج كلمة المرور"]);
    expect(
      plant(
        "clearRecoveryLanding();\n      setRecovery(null);\n      goNext();",
        "setRecovery(null);\n      goNext();",
      ),
    ).toEqual(["الرابط الملتقَط لا يُصفَّر بعد حفظ كلمة المرور"]);
    expect(
      plant(
        "onBack={() => {\n                clearRecoveryLanding();\n                setRecovery(null);",
        "onBack={() => {\n                setRecovery(null);",
      ),
    ).toEqual(["الرابط الملتقَط لا يُصفَّر عند الرجوع إلى الدخول"]);
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

describe("الجذر: التقاط رابط الاستعادة قبل أن يستهلكه العميل", () => {
  it("المزوّد يلتقط الرابط عند التحميل ويُنقل خارج /auth إلى النموذج", () => {
    expect(contextGaps(CONTEXT)).toEqual([]);
  });

  it("ويحمرّ على المزروع (المادة ٣٠)", () => {
    const plant = (from: string, to: string) => {
      const planted = CONTEXT.replace(from, to);
      expect(planted, from).not.toBe(CONTEXT);
      return contextGaps(planted);
    };
    expect(plant('window.location.pathname !== "/auth"', "false")).toEqual([
      "PASSWORD_RECOVERY خارج /auth لا يُنقَل إلى نموذج كلمة المرور الجديدة",
    ]);
    expect(
      plant('window.location.replace("/auth?mode=reset");', 'window.location.replace("/");'),
    ).toEqual(["PASSWORD_RECOVERY خارج /auth لا يُنقَل إلى نموذج كلمة المرور الجديدة"]);
    expect(
      plant(
        'let recoveryLanding = typeof window !== "undefined" && isRecoveryUrl(window.location.href);',
        "let recoveryLanding = false;",
      ),
    ).toEqual(["الرابط لا يُلتقط على مستوى الوحدة قبل أي أثر"]);
    expect(plant("@/lib/auth/recovery-url", "@/lib/auth/password-recovery")).toEqual([
      "الجذر لا يستورد المساعد الخفيف (يجرّ نماذج التسجيل إلى الحزمة الأولى)",
    ]);
  });
});
