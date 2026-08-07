/**
 * رسالة الخطأ المعروضة — حارس البند الثالث من «الطريقة المحفوظة».
 *
 * ## ما وقع
 *
 * `requireSupabaseAuth` يرمي حرفيًّا
 * `"Unauthorized: No authorization header provided"`، وحدود الخطأ الثلاثة
 * كانت تطبع `error.message` كما هو — أحدها في `<pre dir="ltr">` وآخر
 * بعنوان إنجليزيّ `Boardroom error:` وبلا زر إعادة محاولة. فزائرٌ يفتح
 * شاشةً قراءتها خلف مصادقة يرى الجملة الإنجليزية على واجهةٍ عربية.
 *
 * ## لماذا حارسان: على الدالّة وعلى مواضع الاستدعاء
 *
 * دالّةٌ صحيحة لا يستدعيها أحد لا تحرس شيئًا — وهذا بعينه ما وقع: القاعدة
 * كانت مكتوبةً في `CLAUDE.md` منذ البداية وثلاثة حدود تخالفها. فيُفحص
 * السلوك **و** أن الحدود تمرّ به.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  GENERIC_ERROR_AR,
  SESSION_ERROR_AR,
  isSessionError,
  userFacingError,
} from "./user-facing-error";

describe("لا تصل عبارة مصادقة إلى الشاشة", () => {
  const LEAKY = [
    "Unauthorized: No authorization header provided",
    "JWT expired",
    "invalid token",
    "Authentication required",
    "permission denied for table sec_sites",
    "Forbidden",
    "Invalid API key",
    "غير مصرّح لك بالوصول",
  ];

  it.each(LEAKY)("«%s» لا تُعرض حرفيًّا", (raw) => {
    const shown = userFacingError(new Error(raw));
    expect(shown).toBe(SESSION_ERROR_AR);
    expect(shown).not.toContain(raw);
    // ولا شظيّة منها: الفحص على النتيجة لا على النيّة.
    expect(shown).not.toMatch(/authenticat|unauthor|token|jwt|bearer|forbidden/i);
  });

  it("وما ليس مصادقةً يُبدَّل أيضًا — لا نصّ مصدرٍ يبلغ الشاشة", () => {
    // القاعدة ليست «أخفِ المصادقة» بل «لا تعرض نصّ الخطأ الخام»: رسائل
    // القاعدة تحمل أسماء جداول وأعمدة، وهي بنيةٌ لا يقرؤها مديرٌ تنفيذي.
    expect(userFacingError(new Error("relation sec_gates does not exist"))).toBe(GENERIC_ERROR_AR);
    expect(userFacingError(new TypeError("x is not a function"))).toBe(GENERIC_ERROR_AR);
  });

  it("لا ينهار على ما ليس خطأً", () => {
    // ما يُرمى في جافاسكربت ليس `Error` بالضرورة.
    for (const odd of [undefined, null, "", 0, {}, { message: 42 }, [], "unauthorized"]) {
      const shown = userFacingError(odd);
      expect([GENERIC_ERROR_AR, SESSION_ERROR_AR]).toContain(shown);
    }
    expect(userFacingError("unauthorized")).toBe(SESSION_ERROR_AR);
  });

  it("الرسالتان عربيّتان وفيهما ما يفعله المستخدم تاليًا", () => {
    for (const msg of [GENERIC_ERROR_AR, SESSION_ERROR_AR]) {
      expect(msg).toMatch(/[؀-ۿ]/);
      expect(msg).not.toMatch(/[A-Za-z]{3}/);
      expect(msg).toMatch(/حاول|أعد|سجّل/);
    }
  });

  it("`isSessionError` تفرّق فعلًا — وإلّا فهي `true` دائمة", () => {
    expect(isSessionError(new Error("JWT expired"))).toBe(true);
    expect(isSessionError(new Error("network unreachable"))).toBe(false);
  });
});

describe("الحدود تمرّ بالمرشِّح فعلًا", () => {
  const BOUNDARIES = [
    "src/components/route-boundaries.tsx",
    "src/components/RouteErrorBoundary.tsx",
  ];

  it.each(BOUNDARIES)("%s — يستدعي المرشِّح", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src).toContain("userFacingError");
  });

  it.each(BOUNDARIES)("%s — لا يطبع `error.message` خامًا", (file) => {
    // هذا هو الفحص الذي كان سيمسك العطل: الاستدعاء وحده لا يكفي إن بقي
    // إلى جانبه طبعٌ خام في فرعٍ آخر.
    const code = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/^[ \t]*\/\/.*$/gm, "");
    const raw = code.match(/\{\s*error\??\.\s*message[^}]*\}/g) ?? [];
    expect(raw, `طبعٌ خام: ${raw.join(" | ")}`).toEqual([]);
  });

  it("`boardroom` يستعمل الحدّ المشترك لا نصًّا إنجليزيًّا", () => {
    // كان: `Boardroom error: {error.message}` — بالإنجليزية وبلا إعادة محاولة.
    // والتعليقات تُنزع أوّلًا: التعليق الذي **يقتبس** ما نُقض كان يُسقط
    // هذا الفحص، فيقرأ الحارس شرحَ العطل ويحسبه العطل.
    const code = readFileSync("src/routes/_authenticated/boardroom.tsx", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^[ \t]*\/\/.*$/gm, "");
    expect(code).not.toContain("Boardroom error");
    expect(code).toMatch(/errorComponent:\s*RouteError/);
  });
});
