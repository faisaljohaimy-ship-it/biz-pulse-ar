/**
 * عميل «إرفاق ملف وتحميله إلى مكتبة المعرفة» — الفحص في العميل · طلب multipart · تصنيف الردود · العرض.
 *
 * الشبكة (`authenticatedFetch`) مُحاكاة كلّها: لا طلب حقيقي. ما يُفحص هنا هو **الحدود**:
 *  - الفحص يتمّ بالاسم والحجم وحدهما (لا قراءة محتوى) ولا يردّد اسم الملف في رسالته؛
 *  - الجسم multipart بحقول العقد وبترتيبها (الحقول قبل الملف)، وإعادة الإرسال تحمل **الملف نفسه** والرمز؛
 *  - لا استثناءٌ يخرج، ولا نصٌّ إنجليزيٌّ للمصادقة يبلغ الشاشة، ولا نصٌّ من الخادم لا يمرّ فحص الشكل؛
 *  - كل ما يأتي من الملف (اسم · ورقة · ترويسة) يُنظَّف من محارف التحكّم وقلب الاتجاه ويُقتطع؛
 *  - لا شيء يُسجَّل في الكونسول أبدًا.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const net = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/auth-fetch", () => ({
  authenticatedFetch: (...args: unknown[]) => net.fetch(...args),
}));

import {
  arCount,
  describeDone,
  describePii,
  describeRetryAfter,
  describeSheet,
  describeTotals,
  displaySafe,
  FINN_IMPORT_CLIENT_TIMEOUT_MS,
  FINN_IMPORT_COPY,
  fileExtension,
  finnImportRecovery,
  formatCount,
  interruptedFailure,
  postFinnImport,
  validateFinnImportFile,
  type FinnImportClientCode,
} from "./client";
import {
  FINN_IMPORT_ACCEPT,
  FINN_IMPORT_ENDPOINT,
  FINN_IMPORT_EXTENSIONS,
  FINN_IMPORT_LIMITS,
  type FinnImportPreview,
} from "./contract";

const PREVIEW: FinnImportPreview = {
  ok: true,
  kind: "preview",
  file: { name: "report.xlsx", kind: "xlsx", bytes: 1234 },
  sheets: [{ name: "الأوامر", rows: 3, cols: 2, headers: ["الاسم", "المبلغ"] }],
  totals: { rows_total: 3, rows_total_exact: true, rows_loaded: 3, parts: 1, truncated: false },
  pii: { id_numbers: 0, phones: 0, emails: 0, masked: true },
  warnings: [],
  token: "fixture.preview.token",
  expires_at: "2026-10-31T12:00:00.000Z",
};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
const csv = (name = "data.csv", body = "a,b\n1,2\n") =>
  new File([body], name, { type: "text/csv" });
const fmt = (n: number) => n.toLocaleString("ar-SA");
/** هل في النصّ محرفُ تحكّم أو قلب اتجاه أو عرضٍ صفريّ؟ (بالرقم لا بنمطٍ يحوي المحارف نفسها.) */
const hasHiddenChars = (text: string): boolean =>
  Array.from(text).some((ch) => {
    const c = ch.codePointAt(0) ?? 0;
    return (
      c < 32 ||
      (c >= 0x200b && c <= 0x200f) ||
      (c >= 0x202a && c <= 0x202e) ||
      (c >= 0x2060 && c <= 0x2069)
    );
  });

let logged: string[] = [];
beforeEach(() => {
  net.fetch.mockReset();
  logged = [];
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logged.push(`${level}:${args.map(String).join(" ")}`);
    });
  }
});
afterEach(() => {
  // لا شيء يُسجَّل في أي مسار: لا اسم ملف ولا خلية ولا رمز ولا نصّ خطأ.
  expect(logged).toEqual([]);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("الفحص في العميل — بالاسم والحجم وحدهما", () => {
  it.each(FINN_IMPORT_EXTENSIONS)("الامتداد .%s مقبول (بأي حالة أحرف)", (ext) => {
    expect(validateFinnImportFile({ name: `data.${ext}`, size: 10 })).toEqual({ ok: true });
    expect(validateFinnImportFile({ name: `DATA.${ext.toUpperCase()}`, size: 10 })).toEqual({
      ok: true,
    });
  });

  it("attribute accept = قائمة العقد حرفيًّا", () => {
    expect(FINN_IMPORT_ACCEPT).toBe(FINN_IMPORT_EXTENSIONS.map((e) => `.${e}`).join(","));
    expect(FINN_IMPORT_ACCEPT).not.toMatch(/xls[mb]?(,|$)/);
  });

  it.each(["xls", "xlsm", "xlsb"])("الصيغة القديمة .%s مرفوضة برسالة تدلّ على xlsx وcsv", (ext) => {
    const check = validateFinnImportFile({ name: `old.${ext}`, size: 10 });
    expect(check).toMatchObject({ ok: false, error: "unsupported_type" });
    expect(check.ok ? "" : check.message_ar).toBe(FINN_IMPORT_COPY.legacyExcel);
    expect(FINN_IMPORT_COPY.legacyExcel).toMatch(/xlsx/);
    expect(FINN_IMPORT_COPY.legacyExcel).toMatch(/csv/);
  });

  it.each(["virus.exe", "noextension", "trailingdot.", "archive.zip", "doc.pdf", "macro.xlsm"])(
    "نوعٌ غير مقبول %s",
    (name) => {
      const check = validateFinnImportFile({ name, size: 10 });
      expect(check).toMatchObject({ ok: false, error: "unsupported_type" });
      // الرسالة عربية ولا تردّد اسم الملف.
      expect(check.ok ? "" : check.message_ar).toMatch(/\p{Script=Arabic}/u);
      expect(check.ok ? "" : check.message_ar).not.toContain(name);
    },
  );

  it("الفراغ مرفوض، والحدّ الأقصى تمامًا مقبول وما فوقه مرفوض", () => {
    expect(validateFinnImportFile({ name: "e.csv", size: 0 })).toMatchObject({
      ok: false,
      error: "empty",
    });
    expect(validateFinnImportFile({ name: "e.csv", size: Number.NaN })).toMatchObject({
      ok: false,
      error: "empty",
    });
    expect(
      validateFinnImportFile({ name: "a.csv", size: FINN_IMPORT_LIMITS.maxFileBytes }),
    ).toEqual({ ok: true });
    const big = validateFinnImportFile({
      name: "a.csv",
      size: FINN_IMPORT_LIMITS.maxFileBytes + 1,
    });
    expect(big).toMatchObject({ ok: false, error: "too_large" });
    expect(big.ok ? "" : big.message_ar).toContain(fmt(4));
  });

  it("النوع يسبق الفراغ والحجم (ملف .exe فارغ ⇒ نوعٌ غير مقبول)", () => {
    expect(validateFinnImportFile({ name: "x.exe", size: 0 })).toMatchObject({
      error: "unsupported_type",
    });
    expect(validateFinnImportFile({ name: "x.exe", size: 10 ** 9 })).toMatchObject({
      error: "unsupported_type",
    });
  });

  it("fileExtension: آخر نقطة فقط، بحروف صغيرة", () => {
    expect(fileExtension("a.b.CSV")).toBe("csv");
    expect(fileExtension("nodot")).toBe("");
  });
});

describe("طلب multipart", () => {
  it("المعاينة: الحقول action ثم file، وبلا token، على نقطة العقد، بلا Content-Type يدوي", async () => {
    net.fetch.mockResolvedValue(json(PREVIEW));
    const file = csv("a.csv", "x,y\n1,2\n");
    const out = await postFinnImport({ file, action: "preview", token: "must-not-be-sent" });
    expect(out).toMatchObject({ ok: true, kind: "preview", token: PREVIEW.token });
    const [url, init] = net.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(FINN_IMPORT_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect(init.headers).toBeUndefined(); // الحدّ multipart يضعه المتصفح
    const form = init.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect([...form.keys()]).toEqual(["action", "file"]);
    expect(form.get("action")).toBe("preview");
    expect(form.get("token")).toBeNull();
    const sent = form.get("file") as File;
    expect(sent.name).toBe("a.csv");
    expect(await sent.text()).toBe("x,y\n1,2\n");
  });

  it("التنفيذ: الحقول action ثم token ثم file — والملف هو نفسه الذي اختاره المالك", async () => {
    net.fetch.mockResolvedValue(
      json({ ok: true, kind: "done", documents: 2, status: "queued", message_ar: "x" }),
    );
    const file = csv("same.csv", "same bytes");
    const out = await postFinnImport({ file, action: "execute", token: "tok-1" });
    expect(out).toEqual({ ok: true, kind: "done", documents: 2, deduped: 0 });
    const form = (net.fetch.mock.calls[0] as [string, RequestInit])[1].body as FormData;
    expect([...form.keys()]).toEqual(["action", "token", "file"]);
    expect(form.get("action")).toBe("execute");
    expect(form.get("token")).toBe("tok-1");
    expect(await (form.get("file") as File).text()).toBe("same bytes");
  });

  it("نتيجة التنفيذ لا تحمل نصّ الخادم (يُركَّب النصّ في الواجهة فلا يدّعي جاهزية)", async () => {
    net.fetch.mockResolvedValue(
      json({ ok: true, kind: "done", documents: 1, status: "queued", message_ar: "جاهزة تمامًا" }),
    );
    const out = await postFinnImport({ file: csv(), action: "execute", token: "t" });
    expect(out).toEqual({ ok: true, kind: "done", documents: 1, deduped: 0 });
  });

  it("تنفيذٌ يعود بصفر وثائق أو بلا documents ⇒ ردٌّ غير مفهوم لا نجاح", async () => {
    for (const documents of [0, -3, "5", null, undefined]) {
      net.fetch.mockResolvedValueOnce(
        json({ ok: true, kind: "done", documents, status: "queued" }),
      );
      expect(await postFinnImport({ file: csv(), action: "execute", token: "t" })).toMatchObject({
        ok: false,
        error: "bad_response",
      });
    }
  });

  it("معاينةٌ تعود لطلب تنفيذ (أو العكس) ⇒ ردٌّ غير مفهوم", async () => {
    net.fetch.mockResolvedValueOnce(json(PREVIEW));
    expect(await postFinnImport({ file: csv(), action: "execute", token: "t" })).toMatchObject({
      ok: false,
      error: "bad_response",
    });
    net.fetch.mockResolvedValueOnce(
      json({ ok: true, kind: "done", documents: 1, status: "queued" }),
    );
    expect(await postFinnImport({ file: csv(), action: "preview" })).toMatchObject({
      ok: false,
      error: "bad_response",
    });
  });
});

describe("تنظيف المعاينة وتحديدها", () => {
  const preview = async (patch: Record<string, unknown>) => {
    net.fetch.mockResolvedValueOnce(json({ ...PREVIEW, ...patch }));
    return postFinnImport({ file: csv(), action: "preview" });
  };

  it("الترويسات مقتطعة بعددها وطولها، والأوراق بسقفها، وكل نصٍّ منظَّف", async () => {
    const headers = Array.from({ length: 30 }, (_, i) => `h${i}`.padEnd(80, "x"));
    const out = await preview({
      sheets: Array.from({ length: 25 }, () => ({ name: "S", rows: 1, cols: 1, headers })),
    });
    expect(out.ok).toBe(true);
    // لا تخطٍّ صامت: نتيجةٌ بغير شكل المعاينة تُفشل الاختبار بدل أن تُسقط تأكيداته.
    if (!out.ok || out.kind !== "preview") throw new Error("المعاينة المتوقَّعة لم تصل");
    expect(out.sheets).toHaveLength(FINN_IMPORT_LIMITS.maxSheets);
    const shown = out.sheets[0].headers;
    expect(shown).toHaveLength(FINN_IMPORT_LIMITS.previewHeaders);
    for (const h of shown) expect(Array.from(h).length).toBeLessThanOrEqual(40);
    expect(shown[0].endsWith("…")).toBe(true);
  });

  it("محارف قلب الاتجاه والتحكّم تُنزع من اسم الورقة والترويسة (لا انتحال بصري)", async () => {
    const rlo = String.fromCodePoint(0x202e);
    const out = await preview({
      sheets: [
        {
          name: `a${rlo}b${String.fromCodePoint(0)}\n`,
          rows: 1,
          cols: 1,
          headers: [`x${rlo}y${String.fromCodePoint(0x200f)}\ttab`],
        },
      ],
    });
    if (!out.ok || out.kind !== "preview") throw new Error("preview expected");
    const text = JSON.stringify(out.sheets);
    expect(hasHiddenChars(text)).toBe(false);
    expect(out.sheets[0].headers[0]).toBe("xy tab");
  });

  it("ترويسةٌ اسمها __proto__ أو <img onerror> تبقى نصًّا في مصفوفة، لا مفتاح كائن", async () => {
    const out = await preview({
      sheets: [
        {
          name: "__proto__",
          rows: 1,
          cols: 2,
          headers: ["__proto__", '<img src=x onerror="alert(1)">'],
        },
      ],
    });
    if (!out.ok || out.kind !== "preview") throw new Error("preview expected");
    expect(out.sheets[0].headers).toEqual(["__proto__", '<img src=x onerror="alert(1)">']);
    expect(Object.getPrototypeOf(out.sheets[0])).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("التحذيرات غير العربية أو الحاملة لعبارة رمز تُسقَط وتُسقَّف بثمانية", async () => {
    const out = await preview({
      warnings: [
        "تحذير عربي سليم",
        "english only with token",
        ...Array.from({ length: 20 }, (_, i) => `تحذير رقم ${i}`),
      ],
    });
    if (!out.ok || out.kind !== "preview") throw new Error("preview expected");
    expect(out.warnings).toHaveLength(8);
    expect(out.warnings[0]).toBe("تحذير عربي سليم");
    expect(out.warnings.join(" ")).not.toMatch(/token/i);
  });

  it("حقلٌ عددي مفقود أو غير عددي من الخادم لا يكسر العرض (يظهر صفرًا لا استثناءً)", () => {
    const garbage = { rows: undefined, cols: "9" } as unknown as { rows: number; cols: number };
    expect(describeSheet(garbage)).toBe(`الصفوف ${fmt(0)}، الأعمدة ${fmt(9)}`);
    expect(() =>
      describeTotals({ rows_total: Number.NaN, rows_loaded: undefined, parts: null } as never),
    ).not.toThrow();
    expect(() => describePii({ id_numbers: undefined, masked: true } as never)).not.toThrow();
  });

  it("pii.masked ≠ true ⇒ لا تُعرض المعاينة (لا ندّعي حجبًا لم يعلنه الخادم)", async () => {
    const out = await preview({ pii: { id_numbers: 1, phones: 0, emails: 0, masked: false } });
    expect(out).toMatchObject({ ok: false, error: "bad_response" });
    const missing = await preview({ pii: { id_numbers: 1, phones: 0, emails: 0 } });
    expect(missing).toMatchObject({ ok: false, error: "bad_response" });
  });

  it("معاينةٌ بلا رمز أو بلا أوراق أو بلا مجاميع ⇒ ردٌّ غير مفهوم", async () => {
    for (const patch of [{ token: "" }, { token: 5 }, { sheets: "x" }, { totals: null }]) {
      expect(await preview(patch)).toMatchObject({ ok: false, error: "bad_response" });
    }
  });
});

describe("تصنيف الفشل — جُمل عربية ثابتة، ولا نصّ مصادقة يبلغ الشاشة", () => {
  const fail = async (response: Response | Error) => {
    if (response instanceof Error) net.fetch.mockRejectedValueOnce(response);
    else net.fetch.mockResolvedValueOnce(response);
    return postFinnImport({ file: csv(), action: "preview" });
  };
  const arabic = /\p{Script=Arabic}/u;
  const authWords = /authenticat|unauthor|token|jwt|bearer|api[\s_-]?key/i;

  it("رمز الخادم المعروف + نصّه العربي السليم يُعرضان كما هما", async () => {
    const out = await fail(
      json({ ok: false, error: "unsafe", message_ar: "رُفض الملف: يحوي ماكرو." }, 422),
    );
    expect(out).toEqual({ ok: false, error: "unsafe", message_ar: "رُفض الملف: يحوي ماكرو." });
  });

  it("نصّ الخادم الإنجليزي أو الحامل لعبارة مصادقة/رمز أو الطويل ⇒ جملة العميل الثابتة", async () => {
    for (const message_ar of [
      "Unauthorized",
      "رمز token غير صالح",
      "jwt expired — انتهت",
      // إنجليزيٌّ بريء بلا أي عبارة محظورة: ما يردّه عن الشاشة شرط «عربية» وحده (C-usable-arabic).
      "Service temporarily unavailable, please retry soon.",
      `${"ط".repeat(301)}`,
      "",
      42,
      null,
    ]) {
      const out = await fail(json({ ok: false, error: "unavailable", message_ar }, 503));
      expect(out).toMatchObject({ ok: false, error: "unavailable" });
      if (out.ok) throw new Error("failure expected");
      expect(out.message_ar).toMatch(arabic);
      expect(out.message_ar).not.toMatch(authWords);
      expect(out.message_ar).toContain("غير متاحة");
    }
  });

  it.each([
    [401, "forbidden"],
    [403, "forbidden"],
    [404, "forbidden"],
    [413, "too_large"],
    [429, "rate_limited"],
    [400, "invalid_request"],
    [500, "unavailable"],
    [502, "unavailable"],
    [504, "unavailable"],
    [418, "bad_response"],
  ] as const)("HTTP %i بلا JSON ⇒ %s", async (status, code) => {
    const out = await fail(new Response("<html>Bad gateway</html>", { status }));
    expect(out).toMatchObject({ ok: false, error: code });
    if (out.ok) throw new Error("failure expected");
    expect(out.message_ar).toMatch(arabic);
    expect(out.message_ar).not.toMatch(/html|gateway/i);
  });

  it("رمزٌ غير معروف من الخادم (أو اسم خاصية موروثة) يُحكم بحالة HTTP لا بالاسم", async () => {
    for (const error of ["__proto__", "constructor", "toString", "nope", 7, null]) {
      const out = await fail(json({ ok: false, error, message_ar: "x" }, 503));
      expect(out).toMatchObject({ ok: false, error: "unavailable" });
    }
  });

  it("Retry-After: من الجسم أو من الترويسة، مسقوفٌ بساعة، والصفر/السالب لا يظهر", async () => {
    const body = await fail(
      json({ ok: false, error: "rate_limited", message_ar: "كثير", retry_after_s: 42 }, 429),
    );
    expect(body).toMatchObject({ ok: false, error: "rate_limited", retry_after_s: 42 });
    const header = await fail(
      json({ ok: false, error: "rate_limited", message_ar: "كثير" }, 429, { "retry-after": "17" }),
    );
    expect(header).toMatchObject({ retry_after_s: 17 });
    const huge = await fail(
      json({ ok: false, error: "rate_limited", message_ar: "كثير", retry_after_s: 10 ** 7 }, 429),
    );
    expect(huge).toMatchObject({ retry_after_s: 3600 });
    for (const retry_after_s of [0, -4, "x"]) {
      const none = await fail(
        json({ ok: false, error: "rate_limited", message_ar: "كثير", retry_after_s }, 429),
      );
      expect(none).not.toHaveProperty("retry_after_s");
    }
  });

  it("استثناء الشبكة (ومنه نصّ الجلسة الإنجليزي) لا يبلغ الشاشة", async () => {
    for (const err of [
      new Error("Authentication session unavailable."),
      new TypeError("Failed to fetch"),
      new Error("jwt expired"),
    ]) {
      const out = await fail(err);
      expect(out).toMatchObject({ ok: false, error: "network" });
      if (out.ok) throw new Error("failure expected");
      expect(out.message_ar).toMatch(arabic);
      expect(out.message_ar).not.toMatch(authWords);
      expect(out.message_ar).not.toMatch(/fetch|session/i);
    }
  });

  it("فشلٌ في التنفيذ بعد وصول الطلب يقول صراحةً إن التحميل قد يكون اكتمل", async () => {
    net.fetch.mockRejectedValueOnce(new Error("socket hang up"));
    const out = await postFinnImport({ file: csv(), action: "execute", token: "t" });
    expect(out).toMatchObject({ ok: false, error: "network" });
    if (out.ok) throw new Error("failure expected");
    expect(out.message_ar).toContain("قد يكون التحميل اكتمل");
    expect(interruptedFailure("execute").message_ar).toContain("قد يكون التحميل اكتمل");
    // أمّا المعاينة فلا تكتب شيئًا فلا تحذير.
    expect(interruptedFailure("preview").message_ar).not.toContain("اكتمل");
  });

  it("جسمٌ غير JSON بحالة 200 ⇒ ردٌّ غير مفهوم", async () => {
    expect(await fail(new Response("OK", { status: 200 }))).toMatchObject({
      ok: false,
      error: "bad_response",
    });
    expect(await fail(json({ ok: true }, 200))).toMatchObject({
      ok: false,
      error: "bad_response",
    });
    expect(await fail(json([1, 2, 3], 200))).toMatchObject({ ok: false, error: "bad_response" });
  });
});

describe("الإلغاء والمهلة", () => {
  /** fetch مُحاكى يعلق حتى يُقطع، فيرمي AbortError كما يفعل المتصفح. */
  const hang = () =>
    net.fetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("The request was aborted.", "AbortError")),
          );
        }),
    );

  it("إلغاء المالك يقطع الطلب ويعيد aborted (لا استثناء)", async () => {
    hang();
    const controller = new AbortController();
    const pending = postFinnImport({ file: csv(), action: "preview", signal: controller.signal });
    controller.abort();
    expect(await pending).toMatchObject({ ok: false, error: "aborted" });
    const sent = (net.fetch.mock.calls[0] as [string, RequestInit])[1].signal as AbortSignal;
    expect(sent.aborted).toBe(true);
  });

  it("إشارةٌ ملغاة قبل البدء ⇒ aborted بلا أي طلب شبكة", async () => {
    hang();
    const controller = new AbortController();
    controller.abort();
    expect(
      await postFinnImport({ file: csv(), action: "preview", signal: controller.signal }),
    ).toMatchObject({ ok: false, error: "aborted" });
    expect(net.fetch).not.toHaveBeenCalled();
  });

  it("المهلة: بعد انقضائها يُقطع الطلب ويُعلَن timeout (وفي التنفيذ يُحذَّر)", async () => {
    vi.useFakeTimers();
    hang();
    const preview = postFinnImport({ file: csv(), action: "preview", timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1001);
    expect(await preview).toMatchObject({ ok: false, error: "timeout" });
    const exec = postFinnImport({ file: csv(), action: "execute", token: "t", timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1001);
    const out = await exec;
    expect(out).toMatchObject({ ok: false, error: "timeout" });
    if (out.ok) throw new Error("failure expected");
    expect(out.message_ar).toContain("قد يكون التحميل اكتمل");
  });

  it("الإنهاء ينظّف المؤقّت ومستمع الإلغاء: لا مؤقّت معلّق بعد نجاحٍ ولا فشل، ويُنزع المستمع من إشارة المالك", async () => {
    vi.useFakeTimers();
    for (const settle of [
      () => net.fetch.mockResolvedValueOnce(json(PREVIEW)),
      () => net.fetch.mockResolvedValueOnce(json({ ok: false, error: "unavailable" }, 503)),
      () => net.fetch.mockRejectedValueOnce(new Error("انقطع")),
    ]) {
      const controller = new AbortController();
      const add = vi.spyOn(controller.signal, "addEventListener");
      const remove = vi.spyOn(controller.signal, "removeEventListener");
      settle();
      await postFinnImport({ file: csv(), action: "preview", signal: controller.signal });
      expect(vi.getTimerCount()).toBe(0);
      expect(add).toHaveBeenCalledTimes(1);
      expect(add.mock.calls[0][0]).toBe("abort");
      expect(remove).toHaveBeenCalledWith("abort", add.mock.calls[0][1]);
    }
  });

  it("المهلة الافتراضية محدودة (لا انتظار أبدي)", () => {
    expect(FINN_IMPORT_CLIENT_TIMEOUT_MS).toBeGreaterThan(30_000);
    expect(FINN_IMPORT_CLIENT_TIMEOUT_MS).toBeLessThanOrEqual(120_000);
  });

  it("ردٌّ وصل ثم قُطع أثناء قراءة الجسم ⇒ aborted لا bad_response", async () => {
    const controller = new AbortController();
    net.fetch.mockImplementation(async () => {
      const res = json(PREVIEW);
      const original = res.json.bind(res);
      res.json = async () => {
        controller.abort();
        return original();
      };
      return res;
    });
    expect(
      await postFinnImport({ file: csv(), action: "preview", signal: controller.signal }),
    ).toMatchObject({ ok: false, error: "aborted" });
  });
});

describe("التعافي من الفشل", () => {
  type Kind = "retry" | "refresh" | "none";
  // [الرمز، المعاينة، التنفيذ]. الخادم يستهلك الرمز قبل الكتابة، فبعد فشلٍ متأخر في التنفيذ تردّ إعادةُ
  // الرمز نفسه 409 «نُفِّذ من قبل» كذبًا ⇒ التعافي معاينةٌ جديدة. وحدّ المعدّل يُفحص قبل الاستهلاك ⇒ إعادة.
  const table: Array<[FinnImportClientCode, Kind, Kind]> = [
    ["unavailable", "retry", "refresh"],
    ["network", "retry", "refresh"],
    ["timeout", "retry", "refresh"],
    ["aborted", "none", "refresh"],
    ["rate_limited", "retry", "retry"],
    ["token_invalid", "refresh", "refresh"],
    ["token_expired", "refresh", "refresh"],
    ["file_changed", "refresh", "refresh"],
    ["already_used", "none", "none"], // لا نكرّر تحميلًا ربما تمّ
    ["unsafe", "none", "none"],
    ["malformed", "none", "none"],
    ["unsupported_type", "none", "none"],
    ["too_large", "none", "none"],
    ["empty", "none", "none"],
    ["disabled", "none", "none"],
    ["confirmation_unavailable", "none", "none"],
    ["forbidden", "none", "none"],
    ["bad_response", "none", "none"],
    ["invalid_request", "none", "none"],
  ];
  it.each(table)("%s ⇒ معاينة:%s · تنفيذ:%s", (code, preview, execute) => {
    expect(finnImportRecovery(code, "preview")).toBe(preview);
    expect(finnImportRecovery(code, "execute")).toBe(execute);
  });

  it("فشل التنفيذ المتأخر (عطل · شبكة · مهلة · إيقاف انتظار) لا يعرض إعادة الرمز المحروق أبدًا", () => {
    for (const code of ["unavailable", "network", "timeout", "aborted"] as const) {
      expect(finnImportRecovery(code, "execute"), code).not.toBe("retry");
    }
  });

  it("نصّ الفشل المتأخر في التنفيذ يقول إن بعضًا قد يكون حُمِّل (لا «لم يُحمَّل شيء»)", async () => {
    net.fetch.mockResolvedValueOnce(json({}, 503));
    const out = await postFinnImport({ file: csv(), action: "execute", token: "t" });
    expect(out).toMatchObject({ ok: false, error: "unavailable" });
    if (out.ok) throw new Error("failure expected");
    expect(out.message_ar).toMatch(/قد يكون التحميل اكتمل/);
    expect(out.message_ar).not.toMatch(/لم يُحمَّل شيء/);
  });
});

describe("العرض النقيّ", () => {
  it("displaySafe: نصٌّ غير نصّي ⇒ فارغ، والمسافات تُطوى، والاقتطاع بالحرف لا بزوج بديل", () => {
    expect(displaySafe(undefined, 10)).toBe("");
    expect(displaySafe(42, 10)).toBe("");
    expect(displaySafe("  a \n\t b  ", 10)).toBe("a b");
    const out = displaySafe("😀".repeat(30), 10);
    expect(Array.from(out)).toHaveLength(10);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
    expect(displaySafe("abc", 3)).toBe("abc");
  });

  it("arCount: المفرد والمثنّى والجمع والتمييز", () => {
    const forms = ["واحد", "اثنان", "جمع", "تمييز"] as const;
    expect(arCount(1, forms)).toBe("واحد");
    expect(arCount(2, forms)).toBe("اثنان");
    expect(arCount(3, forms)).toBe(`${fmt(3)} جمع`);
    expect(arCount(10, forms)).toBe(`${fmt(10)} جمع`);
    expect(arCount(11, forms)).toBe(`${fmt(11)} تمييز`);
    expect(arCount(100, forms)).toBe(`${fmt(100)} تمييز`);
    expect(arCount(103, forms)).toBe(`${fmt(103)} جمع`);
    expect(arCount(0, forms)).toBe(`${fmt(0)} تمييز`);
  });

  it("«سيُحمَّل N من M صفًّا في K وثيقة»", () => {
    const text = describeTotals({
      rows_total: 1500,
      rows_total_exact: true,
      rows_loaded: 1500,
      parts: 1,
      truncated: false,
    });
    expect(text).toBe(`سيُحمَّل ${formatCount(1500)} من ${formatCount(1500)} صفًّا في وثيقة واحدة`);
    expect(
      describeTotals({
        rows_total: 50_000,
        rows_total_exact: true,
        rows_loaded: 20_000,
        parts: 3,
        truncated: true,
      }),
    ).toBe(`سيُحمَّل ${fmt(20_000)} من ${fmt(50_000)} صفًّا في ${fmt(3)} وثائق`);
  });

  it("الصدق العددي (المادة ٢٧): الإجمالي التقديري «نحو»، وغياب العلامة مجهولٌ لا دقيق", () => {
    const base = { rows_total: 183_456, rows_loaded: 60_000, parts: 3, truncated: true };
    const exact = describeTotals({ ...base, rows_total_exact: true });
    expect(exact).not.toContain("نحو");
    expect(describeTotals({ ...base, rows_total_exact: false })).toBe(
      `سيُحمَّل ${fmt(60_000)} من نحو ${fmt(183_456)} صفًّا في ${fmt(3)} وثائق`,
    );
    // حقلٌ غائب (خادمٌ أقدم أو ردٌّ مشوَّه) لا يُقرأ دقيقًا.
    const missing = describeTotals(base as unknown as Parameters<typeof describeTotals>[0]);
    expect(missing).toContain("من نحو ");
  });

  it("سطر الورقة: صفوف وأعمدة بالعدّ العربي، وبفاصلةٍ عربية لا «·» الشبيهة بالصفر", () => {
    expect(describeSheet({ rows: 120, cols: 5 })).toBe(`الصفوف ${fmt(120)}، الأعمدة ${fmt(5)}`);
    expect(describeSheet({ rows: 1, cols: 1 })).toBe(`الصفوف ${fmt(1)}، الأعمدة ${fmt(1)}`);
    expect(describeSheet({ rows: 70, cols: 2 })).not.toContain("·");
  });

  it("سطر الأنماط الشخصية: ما رُصد وأنه يُحجب، أو لا شيء رُصد وأن الحجب قائم", () => {
    const found = describePii({ id_numbers: 3, phones: 1, emails: 12, masked: true });
    expect(found).toContain(fmt(3));
    expect(found).toContain(`جوال ${fmt(1)}`);
    expect(found).toContain(`بريد ${fmt(12)}`);
    expect(found).toContain(`هوية أو إقامة ${fmt(3)}`);
    expect(found).not.toContain("·");
    // لا ادّعاء شمولٍ مطلق: «بالصيغ المعروفة» قيدٌ حاضر، ولا «وكلّها تُحجب».
    expect(found).toContain("بالصيغ المعروفة");
    expect(found).not.toContain("وكلّها");
    const none = describePii({ id_numbers: 0, phones: 0, emails: 0, masked: true });
    expect(none).toContain("لم يُرصد");
    expect(none).toContain("بالصيغ المعروفة");
    // «لم يُرصد» ليس برهان غياب: لا عبارة تدّعي أن الملف خالٍ أو أن ما يظهر محجوب.
    expect(none).not.toContain("يُحجب قبل الحفظ");
    // وتنبيه النطاق صادقٌ: الأسماء والعناوين لا تُحجب، وقد يفلت رقمٌ بصيغةٍ غير معروفة.
    expect(FINN_IMPORT_COPY.maskScope).toMatch(/الأسماء والعناوين لا تُحجب/);
    expect(FINN_IMPORT_COPY.maskScope).toMatch(/بصيغةٍ غير معروفة/);
  });

  it("رسالة التمام: «قيد الفهرسة (قد تستغرق دقائق)» ولا تدّعي جاهزية ولا فهرسةً منتهية", () => {
    for (const n of [1, 2, 3, 11]) {
      const text = describeDone(n);
      expect(text).toContain("قيد الفهرسة (قد تستغرق دقائق)");
      expect(text).toMatch(/^تم تحميل /);
      expect(text).not.toMatch(/جاهز|اكتملت الفهرسة|مفهرس|أُدرج في البحث/);
    }
    expect(describeDone(1)).toContain("وثيقة واحدة");
    expect(describeDone(2)).toContain("وثيقتين");
    expect(describeDone(3)).toContain("وثائق");
  });

  it("رسالة التمام تذكر ما لم يُكرَّر لوجوده سابقًا (المعاينة وعدت بثلاث والمُدرَج وثيقتان)", () => {
    expect(describeDone(2)).not.toContain("سابقًا");
    expect(describeDone(2, 0)).not.toContain("سابقًا");
    const text = describeDone(2, 1);
    expect(text).toContain("وثيقتين");
    expect(text).toContain(`الموجود سابقًا ولم يُكرَّر: ${fmt(1)}`);
  });

  it("الانتظار بعد الاختناق: ثوانٍ ثم دقائق — بالإفراد والتثنية والجمع العربي", () => {
    expect(describeRetryAfter(1)).toBe("حاول بعد ثانية واحدة.");
    expect(describeRetryAfter(2)).toBe("حاول بعد ثانيتين.");
    expect(describeRetryAfter(5)).toBe(`حاول بعد ${fmt(5)} ثوانٍ.`);
    expect(describeRetryAfter(30)).toBe(`حاول بعد ${fmt(30)} ثانية.`);
    expect(describeRetryAfter(60)).toBe("حاول بعد دقيقة واحدة.");
    expect(describeRetryAfter(61)).toBe("حاول بعد دقيقتين.");
    expect(describeRetryAfter(90)).toBe("حاول بعد دقيقتين.");
    expect(describeRetryAfter(180)).toBe(`حاول بعد ${fmt(3)} دقائق.`);
    // القيمتان اللتان يُصدرهما الحدّ فعلًا: ٦٠ و٦٠٠ ثانية.
    expect(describeRetryAfter(600)).toBe(`حاول بعد ${fmt(10)} دقائق.`);
    expect(describeRetryAfter(3600)).toBe(`حاول بعد ${fmt(60)} دقيقة.`);
    // لا «١ ثانية» ولا «٢ دقيقة» ولا «١٠ دقيقة» أبدًا (خطأ الاتفاق العددي المرصود).
    expect(describeRetryAfter(1)).not.toContain(`${fmt(1)} ثانية`);
    expect(describeRetryAfter(90)).not.toContain(`${fmt(2)} دقيقة`);
    expect(describeRetryAfter(600)).not.toContain(`${fmt(10)} دقيقة`);
  });

  it("نصوص الواجهة تقول الحقيقة: لا يُرسَل الملف للمحادثة ولا النموذج عند التحميل، وقد تُستخدم مقاطعه بعد الفهرسة", () => {
    expect(FINN_IMPORT_COPY.scope).toMatch(/مكتبة المعرفة فقط/);
    expect(FINN_IMPORT_COPY.scope).toMatch(
      /لا يُرسَل محتوى الملف إلى المحادثة ولا إلى النموذج عند التحميل/,
    );
    // ادّعاءٌ مطلق لا يسنده قياس (المادة ٢٧): ذراع الاسترجاع تقرأ مقاطع المستند بعد الفهرسة فتدخل سياق النموذج.
    expect(FINN_IMPORT_COPY.scope).toMatch(/بعد اكتمال الفهرسة قد تُستخدم مقاطع منه سياقًا/);
    expect(FINN_IMPORT_COPY.scope).not.toMatch(/ولا إلى النموذج\.$/);
    expect(FINN_IMPORT_COPY.emptyHint).toMatch(/لا يُرسَل محتواه إلى محادثة فِن/);
    expect(FINN_IMPORT_COPY.emptyHint).toMatch(/بعد الفهرسة قد يستعين به/);
    expect(FINN_IMPORT_COPY.emptyHint).not.toMatch(/فِن لا يرى محتواه/);
    // وإيقاف الانتظار لا يوهم بأنه يُلغي الكتابة.
    expect(FINN_IMPORT_COPY.cancelLoad).toBe("إيقاف الانتظار");
  });
});
