/**
 * «دخول الموظفين» (أمر المالك ٢٠٢٦/١٠/١٨) — مدخلٌ إلى الدخول القائم لا دخولٌ جديد.
 *
 * ما يُحرس: الرابط يقود إلى `/auth` نفسها بـ`mode=signin` و`redirect` إلى الصفحة الحالية؛ لا
 * يصنع جلسةً ولا يمنح صلاحية (لا Supabase ولا رقم وظيفي في الترويسة)؛ يظهر للزائر وحده؛
 * هيئته بالمقاس لا وجوده؛ وأخطاء الدخول تُقال بلغة الواجهة دون نصّ الخادم.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { signinErrorMessage } from "@/lib/access/signup";

const HEADER = readFileSync("src/components/nav/SystemHeader.tsx", "utf8");
const AUTH = readFileSync("src/routes/auth.tsx", "utf8");
const CSS = readFileSync("src/styles/home/home-chrome.css", "utf8");

const loginFn = (src: string) => {
  const at = src.indexOf("function EmployeeLogin(");
  return at < 0 ? "" : src.slice(at, src.indexOf("\n}\n", at));
};
/** كل `toast.error(...)` في معالجَي الدخول يمرّ بالمحوِّل أو بنصّ الحالة الثابت — لا نصّ خادم خام. */
const rawToasts = (src: string) => {
  const from = src.indexOf("async function handleGoogle");
  const to = src.indexOf("if (!accepted)", from);
  return [...src.slice(from, to).matchAll(/toast\.error\(([^;]*)\);/g)]
    .map((m) => m[1])
    .filter((arg) => !/^(signinErrorMessage|googleNoticeMessage)\(/.test(arg.trim()));
};

describe("«دخول الموظفين» — مدخلٌ إلى الدخول القائم", () => {
  it("يقود إلى /auth بـmode=signin والعودة إلى الصفحة الحالية", () => {
    const fn = loginFn(HEADER);
    expect(fn).toContain('to="/auth"');
    expect(fn).toContain('search={{ mode: "signin", redirect: back }}');
    expect(fn).toContain('ar ? "دخول الموظفين" : "Employee sign-in"');
    expect(fn).toMatch(/<IdCard aria-hidden/);
  });

  it("للزائر وحده، ولا وميض أثناء التحقّق من الجلسة", () => {
    expect(loginFn(HEADER)).toContain("if (loading || user) return null;");
  });

  it("لا يصنع جلسةً ولا يمنح صلاحية: لا Supabase ولا رقم وظيفي في الترويسة", () => {
    // الكود لا الشرح: تعليق الدالّة يذكر Supabase ليقول إن الدخول هناك لا هنا.
    const code = HEADER.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/supabase|\.auth\.|signInWith|staff[_-]?number|STAFF_NUMBER_KEY/i);
  });

  it("في الترويسة وفي الدرج، والدرج يُغلق عند النقر", () => {
    expect(HEADER).toContain("<EmployeeLogin ar={ar} />");
    expect(HEADER).toContain(
      '<EmployeeLogin ar={ar} variant="drawer" onNavigate={() => setOpen(false)} />',
    );
  });

  it("الهيئة بالمقاس: باسمها من 1024، قرصٌ 44 دونها، وتحت 640 في الدرج وحده", () => {
    const tier = (q: string) => {
      const at = CSS.indexOf(`@media (${q}) {\n  .nx-hdr .nx-hdr-login`);
      expect(at, q).toBeGreaterThan(-1);
      return CSS.slice(at, CSS.indexOf("\n}\n", at));
    };
    expect(tier("max-width: 1023.98px")).toContain("inline-size: 44px;");
    expect(tier("max-width: 1023.98px")).toContain("clip-path: inset(50%);");
    expect(tier("max-width: 639.98px")).toContain("display: none;");
    expect(CSS).toMatch(
      /@media \(min-width: 640px\) \{\s*\.nx-hdr-login--drawer \{\s*display: none;/,
    );
    // هدف اللمس في كل هيئة.
    expect(CSS).toMatch(/\.nx-hdr-login \{[^}]*min-block-size: 44px;/);
  });

  it("/auth تقبل mode=signin وتتخطّى بها العرض التنفيذي كما تفعل signup", () => {
    expect(AUTH).toContain('search.mode === "signin"');
    expect(AUTH).toContain('? ("signin" as const)');
    expect(AUTH).toContain("initialMode !== undefined || hasExecutiveAcceptance(");
  });

  it("أخطاء الدخول بلغة الواجهة بلا نصّ الخادم — وتسقط على المزروع (المادة ٣٠)", () => {
    expect(rawToasts(AUTH)).toEqual([]);
    const planted = AUTH.replace(
      'toast.error(signinErrorMessage(error.message ?? "", isAr));',
      "toast.error(error.message);",
    );
    expect(planted).not.toBe(AUTH);
    expect(rawToasts(planted)).toEqual(["error.message"]);
    // نصّ حالة «غير معروف» ثابتٌ من المحوِّل، لا سلسلة حرّة تُكتب في الصفحة.
    const plantedFree = AUTH.replace(
      'toast.error(googleNoticeMessage("unknown", isAr));',
      'toast.error("boom");',
    );
    expect(plantedFree).not.toBe(AUTH);
    expect(rawToasts(plantedFree)).toEqual(['"boom"']);
  });
});

describe("signinErrorMessage — رسالةٌ محايدة لا تكشف شيئًا", () => {
  const RAW = [
    "Invalid login credentials",
    "Email not confirmed",
    "For security purposes, you can only request this after 30 seconds (rate limit)",
    "TypeError: Failed to fetch",
    "Request timed out",
    "AuthRetryableFetchError: 504 Gateway Timeout",
    "JWT token expired",
    "something unexpected",
  ];

  it("لا تعيد نصّ الخادم ولا عبارات مصادقة تقنية، باللغتين", () => {
    for (const raw of RAW) {
      for (const ar of [true, false]) {
        const msg = signinErrorMessage(raw, ar);
        expect(msg, raw).not.toContain(raw);
        expect(msg, raw).not.toMatch(/authenticat|unauthor|token|jwt|supabase/i);
      }
    }
  });

  it("الاعتماد الخاطئ لا يكشف أيّ الحقلين خطأ", () => {
    expect(signinErrorMessage("Invalid login credentials")).toBe(
      "البريد أو كلمة المرور غير صحيحة.",
    );
  });

  it("انقطاع خدمة الدخول يُقال انقطاعًا لا «كلمة مرور خاطئة»", () => {
    for (const raw of [
      "TypeError: Failed to fetch",
      "AuthRetryableFetchError: 504 Gateway Timeout",
    ])
      expect(signinErrorMessage(raw)).toBe(
        "تعذّر الوصول إلى خدمة الدخول الآن — أعد المحاولة بعد قليل.",
      );
  });
});

describe("زرّ Google في /auth — لا وسيط Lovable ولا طريق ميّت (٢٠٢٦/١٠/٣٠)", () => {
  /** المخالفات: استيراد من الوسيط · مسار `/~oauth` · نداء `lovable.auth`. */
  const brokerViolations = (src: string) =>
    [
      /from\s+["']@\/integrations\/lovable/.test(src) && "import",
      /\/~oauth/.test(src) && "oauth-path",
      /lovable\.auth/.test(src) && "lovable.auth",
    ].filter(Boolean);

  it("الصفحة لا تستورد من @/integrations/lovable ولا تذكر /~oauth ولا lovable.auth", () => {
    expect(brokerViolations(AUTH)).toEqual([]);
  });

  it("الحارس يسقط على كل مخالفةٍ مزروعة (المادة ٣٠)", () => {
    expect(
      brokerViolations(`import { lovable } from "@/integrations/lovable/index";\n${AUTH}`),
    ).toEqual(["import"]);
    expect(brokerViolations(`${AUTH}\nfetch("/~oauth/initiate");`)).toEqual(["oauth-path"]);
    expect(brokerViolations(`${AUTH}\nawait lovable.auth.signInWithOAuth("google");`)).toEqual([
      "lovable.auth",
    ]);
  });

  it("Google الأصلي: صفحة الدخول تستخدم المساعد الخالص وsupabase.auth.signInWithOAuth بلا تخطّي التوجيه", () => {
    expect(AUTH).toContain('from "@/lib/auth/native-google"');
    expect(AUTH).toContain("supabase.auth.signInWithOAuth(");
    expect(AUTH).toContain('googleOAuthOptions(window.location.origin, redirectTo ?? "/")');
    expect(AUTH).not.toContain("skipBrowserRedirect");
  });
});
