import { describe, expect, it, vi } from "vitest";
import {
  GOOGLE_PROBE_PATH,
  googleNoticeMessage,
  googleOAuthOptions,
  probeGoogleProvider,
  safeAuthTarget,
} from "./native-google";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("probeGoogleProvider", () => {
  it("enabled فقط عند 200 وchecked وgoogleEnabled كلاهما true", async () => {
    const f = vi.fn(async () => json({ checked: true, googleEnabled: true }));
    expect(await probeGoogleProvider(f)).toBe("enabled");
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(GOOGLE_PROBE_PATH);
    expect(init.cache).toBe("no-store");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("disabled حين فُحص ولم يُفعَّل (false أو غائب أو ليس true)", async () => {
    for (const body of [
      { checked: true, googleEnabled: false },
      { checked: true },
      { checked: true, googleEnabled: "true" },
      { checked: true, googleEnabled: 1 },
    ]) {
      expect(await probeGoogleProvider(async () => json(body)), JSON.stringify(body)).toBe(
        "disabled",
      );
    }
  });

  it("checked غير true ⇒ unknown ولو قال googleEnabled: true", async () => {
    for (const body of [
      { checked: false, googleEnabled: true },
      { checked: false, googleEnabled: false },
      { googleEnabled: true },
      { checked: "true", googleEnabled: true },
    ]) {
      expect(await probeGoogleProvider(async () => json(body)), JSON.stringify(body)).toBe(
        "unknown",
      );
    }
  });

  it("غير 200 ⇒ unknown حتى لو الجسم يقول enabled", async () => {
    for (const status of [201, 204, 301, 404, 500, 503]) {
      const f = async () => json({ checked: true, googleEnabled: true }, status);
      expect(await probeGoogleProvider(f), String(status)).toBe("unknown");
    }
  });

  it("جسمٌ مشوَّه أو ليس كائنًا ⇒ unknown", async () => {
    expect(await probeGoogleProvider(async () => new Response("not json{"))).toBe("unknown");
    expect(await probeGoogleProvider(async () => json(null))).toBe("unknown");
    expect(await probeGoogleProvider(async () => json("true"))).toBe("unknown");
    expect(await probeGoogleProvider(async () => json([true]))).toBe("unknown");
  });

  it("انقطاع الشبكة ⇒ unknown دون رمي", async () => {
    const f = async () => {
      throw new TypeError("Failed to fetch");
    };
    expect(await probeGoogleProvider(f)).toBe("unknown");
  });

  it("المهلة ⇒ unknown وتُلغى الإشارة، ولو تجاهل fetch الإلغاء", async () => {
    let signal: AbortSignal | undefined;
    const hang = (_: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    };
    expect(await probeGoogleProvider(hang, { timeoutMs: 20 })).toBe("unknown");
    expect(signal?.aborted).toBe(true);
  });

  it("جسمٌ معلَّق بعد وصول الترويسة يُحتسب في المهلة أيضًا", async () => {
    const slowBody = async () =>
      ({ status: 200, json: () => new Promise(() => {}) }) as unknown as Response;
    expect(await probeGoogleProvider(slowBody, { timeoutMs: 20 })).toBe("unknown");
  });

  it("إلغاء fetch (AbortError) ⇒ unknown", async () => {
    const f = async () => {
      throw new DOMException("aborted", "AbortError");
    };
    expect(await probeGoogleProvider(f)).toBe("unknown");
  });
});

describe("safeAuthTarget — مسارٌ من الأصل نفسه فقط", () => {
  it("يقبل المسارات المحلية كما هي", () => {
    for (const ok of ["/", "/fnn", "/sec/incidents?x=1#a", "/a/b%20c"]) {
      expect(safeAuthTarget(ok), ok).toBe(ok);
    }
  });

  it("ينتهك المزروع فيسقط إلى / (المادة ٣٠)", () => {
    const planted = [
      "//evil.com",
      "//evil.com/x",
      "///evil.com",
      "https://evil.com",
      "http://evil.com/fnn",
      "javascript:alert(1)",
      "data:text/html,x",
      "/\\evil.com",
      "\\\\evil.com",
      "/\\/evil.com",
      "/a\\b",
      "/\t/evil.com",
      "/\n/evil.com",
      "/\r/evil.com",
      "/\u0000x",
      "/\u007fx",
      " /fnn",
      "fnn",
      "evil.com",
      "",
    ];
    for (const raw of planted) expect(safeAuthTarget(raw), JSON.stringify(raw)).toBe("/");
  });

  it("غير النصّ ⇒ /", () => {
    for (const raw of [undefined, null, 42, {}, ["/x"]]) expect(safeAuthTarget(raw)).toBe("/");
  });
});

describe("googleOAuthOptions", () => {
  it("الشكل المطلوب: google + redirectTo من الأصل + select_account، بلا skipBrowserRedirect", () => {
    const o = googleOAuthOptions("https://neexios.com", "/fnn");
    expect(o).toEqual({
      provider: "google",
      options: {
        redirectTo: "https://neexios.com/fnn",
        queryParams: { prompt: "select_account" },
      },
    });
    expect("skipBrowserRedirect" in o.options).toBe(false);
  });

  it("الوجهة الخبيثة تسقط إلى جذر الأصل نفسه", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:1", ""]) {
      expect(googleOAuthOptions("https://neexios.com", bad).options.redirectTo, bad).toBe(
        "https://neexios.com/",
      );
    }
    expect(googleOAuthOptions("https://neexios.com", undefined).options.redirectTo).toBe(
      "https://neexios.com/",
    );
  });

  it("http مسموح على localhost و127.0.0.1 فقط", () => {
    expect(googleOAuthOptions("http://localhost:4210", "/fnn").options.redirectTo).toBe(
      "http://localhost:4210/fnn",
    );
    expect(googleOAuthOptions("http://127.0.0.1:4210", "/fnn").options.redirectTo).toBe(
      "http://127.0.0.1:4210/fnn",
    );
  });

  it("أصلٌ غير آمن يرمي (المادة ٣٠)", () => {
    for (const origin of [
      "http://neexios.com",
      "http://evil.com",
      "http://localhost.evil.com",
      "ftp://neexios.com",
      "https://user:pw@neexios.com",
      "http://user@localhost:3000",
      "javascript:alert(1)",
      "not a url",
      "",
    ]) {
      expect(() => googleOAuthOptions(origin, "/fnn"), origin).toThrow();
    }
  });
});

describe("googleNoticeMessage — بلا عبارات مصادقة تقنية", () => {
  it("النصّان بالعربية والإنجليزية كما اعتُمدا", () => {
    expect(googleNoticeMessage("disabled", true)).toBe(
      "دخول Google غير مفعّل في النظام بعد. استخدم البريد وكلمة المرور أدناه.",
    );
    expect(googleNoticeMessage("disabled", false)).toBe(
      "Google sign-in is not enabled yet. Use email and password below.",
    );
    expect(googleNoticeMessage("unknown", true)).toBe(
      "تعذّر التحقق من دخول Google الآن. استخدم البريد وكلمة المرور.",
    );
    expect(googleNoticeMessage("unknown", false)).toBe(
      "Google sign-in could not be verified right now. Use email and password.",
    );
  });

  it("لا يطابق /authenticat|unauthor|token/i", () => {
    for (const kind of ["disabled", "unknown"] as const)
      for (const ar of [true, false])
        expect(googleNoticeMessage(kind, ar)).not.toMatch(/authenticat|unauthor|token/i);
  });
});
