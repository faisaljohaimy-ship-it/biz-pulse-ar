/**
 * عقد بديل الدخول في `/fnn` — البريد وكلمة المرور تحت زرّ Google (لقطة المالك ٢٠٢٦/١٠/٣٠).
 *
 * قِيس ٢٠٢٦/١٠/٢٩ على الإنتاج: `GET /api/fnn/auth-health` ⇐ `{"checked":true,"googleEnabled":false}`،
 * فكانت `/fnn` تعرض «دخول Google غير مهيّأ» ولا طريق غيره. فيها الآن رابطٌ إلى صفحة `/auth` نفسها
 * (البريد وكلمة المرور) ثم عودة إلى `/fnn`؛ والصلاحية يحكم فيها الخادم بعد العودة.
 *
 * ما يكسره التعديل ولا يراه tsc: حذف الرابط (يعود المالك عالقًا بلا طريق)، أو توجيهه إلى غير `/auth`،
 * أو `redirect` غير `FNN_PATH` (يُلقيه بعد الدخول في مكانٍ آخر)، أو `mode` غير `signin` (يعرض له شاشة العرض
 * التنفيذي أو التسجيل بدل نموذج الدخول)، أو سقوط `min-h-11!` (دون الحدّ الدستوري 44px).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SRC = readFileSync("src/components/finn/FnnWorkspace.tsx", "utf8");

/** يزيل تعليقات JSX والكتل والأسطر فلا يُحتسب رابطٌ معلَّق. */
const strip = (code: string) =>
  code
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** مقطع بطاقة الدخول (لا المستخدم): من وسمها إلى فرع «مقفلة». */
function entrySection(code: string): string {
  const at = code.indexOf('<section className="fnn-entry"');
  const end = code.indexOf(") : locked ?", at);
  return at === -1 || end === -1 ? "" : code.slice(at, end);
}

/** فجوات بديل البريد في بطاقة الدخول — مصفوفة فارغة حين يسلم. */
function emailFallbackGaps(code: string): string[] {
  const out: string[] = [];
  const section = entrySection(strip(code));
  if (!section) return ["بطاقة الدخول غائبة"];
  const link = /<Link\b[^>]*to="\/auth"[\s\S]*?<\/Link>/.exec(section)?.[0];
  if (!link) return ["لا رابط إلى /auth في بطاقة الدخول"];
  if (!/search=\{\{\s*mode:\s*"signin"\s*,\s*redirect:\s*FNN_PATH\s*\}\}/.test(link))
    out.push("search ليس { mode: 'signin', redirect: FNN_PATH }");
  if (!/min-h-11!/.test(link)) out.push("بلا min-h-11!");
  if (!link.includes("الدخول بالبريد وكلمة المرور")) out.push("نصّ عربي غائب");
  if (!link.includes("Sign in with email and password")) out.push("نصّ إنجليزي غائب");
  if (section.indexOf(link) < section.indexOf("<GoogleSignIn"))
    out.push("الرابط قبل زرّ Google — Google يبقى الأوّل");
  return out;
}

describe("/fnn — بديل الدخول بالبريد وكلمة المرور (لقطة المالك ٢٠٢٦/١٠/٣٠)", () => {
  it("بطاقة الدخول تحمل رابطًا سليمًا إلى /auth بعد زرّ Google", () => {
    expect(emailFallbackGaps(SRC)).toEqual([]);
    expect(SRC).toMatch(
      /import \{[^}]*\bFNN_PATH\b[^}]*\} from "@\/lib\/finn-agent\/native-google"/,
    );
  });

  it("والكاشف يحمرّ على المزروع (المادة ٣٠)", () => {
    const link = /<Link\b[^>]*to="\/auth"[\s\S]*?<\/Link>/.exec(SRC)?.[0] ?? "";
    expect(link, "الرابط غائب عن المصدر").not.toBe("");
    // حُذف الرابط.
    expect(emailFallbackGaps(SRC.replace(link, ""))).toEqual(["لا رابط إلى /auth في بطاقة الدخول"]);
    // توجيهٌ إلى غير /auth.
    expect(emailFallbackGaps(SRC.replace('to="/auth"', 'to="/"'))).toEqual([
      "لا رابط إلى /auth في بطاقة الدخول",
    ]);
    // redirect غير FNN_PATH، وmode غير signin.
    expect(
      emailFallbackGaps(SRC.replace("redirect: FNN_PATH", 'redirect: "https://evil.com"')),
    ).toEqual(["search ليس { mode: 'signin', redirect: FNN_PATH }"]);
    expect(emailFallbackGaps(SRC.replace('mode: "signin"', 'mode: "signup"'))).toEqual([
      "search ليس { mode: 'signin', redirect: FNN_PATH }",
    ]);
    // سقوط min-h-11!.
    expect(emailFallbackGaps(SRC.replace("w-full min-h-11!", "w-full"))).toEqual(["بلا min-h-11!"]);
    // نصّ ثنائي اللغة ناقص.
    expect(emailFallbackGaps(SRC.replace("Sign in with email and password", "Email"))).toEqual([
      "نصّ إنجليزي غائب",
    ]);
    // رابطٌ معلَّق لا يُحتسب.
    expect(emailFallbackGaps(SRC.replace(link, `{/* ${link} */}`))).toEqual([
      "لا رابط إلى /auth في بطاقة الدخول",
    ]);
  });
});
