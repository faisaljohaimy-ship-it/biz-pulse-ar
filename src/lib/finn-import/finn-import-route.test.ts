// @vitest-environment node
/**
 * POST /api/finn/import — السلوك الكامل عبر المعالج الحقيقي ومصفوفة الاستجابة.
 *
 * ما يُحاكى: المصادقة وحدّ المعدّل وعميل الخدمة (مطالبة الرمز) والإدخال. ما لا يُحاكى: بوّابة المالك
 * والقارئ الآمن وبانِي الوثائق والرمز الموقَّع (HMAC حقيقي) والمعالج نفسه. **لا ملف حقيقي ولا مفتاح
 * ولا نداء شبكة**؛ كل ملف يُبنى وقت التشغيل، والقيم المزروعة (`PLANTED`) يجب ألّا تظهر في استجابة
 * ولا في سجلّ. براهين التحمير (التضعيف العمدي) في `finn-import-route.mutation.test.ts`.
 *
 * الأصفار ذات معنى (المادة ٣٠): المجموعة الأخيرة تُثبت أن المسار السليم يعدّ حدًّا ومطالبةً وإدخالًا
 * مرّةً واحدة بالضبط.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FINN_IMPORT_LIMITS } from "./contract";
import { asSpecs, makeXlsx, rewriteXlsx } from "./fixtures.test-support";
import {
  FINN_IMPORT_LATE_FAILURE_AR,
  FINN_IMPORT_LEGACY_EXCEL_MESSAGE_AR,
  FINN_IMPORT_MESSAGES_AR,
} from "./messages.server";
import { fileSha256Hex } from "./import-token.server";
import {
  OTHER,
  OWNER,
  PLANTED,
  buildRequest,
  captureLogs,
  jsonOf,
  jwtFor,
  xlsxBytes,
} from "./import-route.test-support";
import {
  call,
  loadHandlers,
  previewToken,
  resetSim,
  signFor,
  sim,
  spend,
  stubApprovalSecret,
} from "./import-route.harness.test-support";
import {
  FINN_DENY_FLOOR_MS,
  finnNotFoundResponse,
  setFinnDenyClockForTests,
} from "@/lib/finn-agent/owner-gate.server";

vi.mock("@/lib/governance/rate-limit.server", async (importOriginal) =>
  (await import("./import-route.harness.test-support")).rateLimitModule(
    importOriginal as () => Promise<Record<string, unknown>>,
  ),
);
vi.mock("@/lib/hook-auth.server", async () =>
  (await import("./import-route.harness.test-support")).hookAuthModule(),
);
vi.mock("@/integrations/supabase/client.server", async () =>
  (await import("./import-route.harness.test-support")).clientServerModule(),
);
vi.mock("@/lib/finn-import/ingest.server", async () =>
  (await import("./import-route.harness.test-support")).ingestModule(),
);

const denyClock = { t: 0, slept: [] as number[] };
const LIMITS = FINN_IMPORT_LIMITS;

beforeEach(() => {
  resetSim();
  denyClock.t = 0;
  denyClock.slept = [];
  setFinnDenyClockForTests({
    now: () => denyClock.t,
    sleep: async (ms) => {
      denyClock.slept.push(ms);
      denyClock.t += ms;
    },
  });
  vi.stubEnv("FINN_OWNER_USER_IDS", OWNER);
  vi.stubEnv("SADEED_AI_DISABLED", "");
  stubApprovalSecret(vi);
  // أي نداء شبكة من المسار خطأ: المعاينة والتنفيذ لا يستدعيان fetch (الإدخال محاكى).
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      sim.fetchCalls++;
      throw new Error("لا شبكة في هذا الاختبار");
    }),
  );
});
afterEach(() => {
  setFinnDenyClockForTests(null);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const FIXED_ERROR_VALUES = Object.values(FINN_IMPORT_MESSAGES_AR);

/** كل نصّ مزروع لا يظهر في هذا النصّ. */
function expectNoPlanted(text: string, allow: string[] = []) {
  for (const [name, value] of Object.entries(PLANTED)) {
    if (allow.includes(name)) continue;
    expect(text, `القيمة المزروعة «${name}» تسرّبت`).not.toContain(value);
  }
}

describe("① غير المالك: الـ404 نفسه، وصفر إنفاق", () => {
  const CASES: Array<[string, () => Request, () => void]> = [
    ["زائر بلا ترويسة", () => buildRequest({ bearer: null }), () => {}],
    ["رمزٌ معطوب", () => buildRequest({ bearer: "garbage" }), () => {}],
    ["مسجَّلٌ غير مالك", () => buildRequest({ bearer: jwtFor(OTHER) }), () => {}],
    [
      "قائمة المالكين غير معرَّفة",
      () => buildRequest(),
      () => vi.stubEnv("FINN_OWNER_USER_IDS", ""),
    ],
    [
      "قائمة المالكين فاسدة",
      () => buildRequest(),
      () => vi.stubEnv("FINN_OWNER_USER_IDS", `${OWNER},not-a-uuid`),
    ],
    [
      "رمزٌ يدّعي المالك ولا تتحقّق منه المصادقة",
      () => buildRequest(),
      () => {
        sim.verifyUser = null;
      },
    ],
    [
      "رمزٌ يدّعي المالك والمتحقَّق منه غيره",
      () => buildRequest(),
      () => {
        sim.verifyUser = OTHER;
      },
    ],
  ];

  it.each(CASES)(
    "%s ⇒ 404 ولا حدّ ولا مطالبة ولا إدخال ولا أثر في السجلّ",
    async (_n, make, setup) => {
      setup();
      const handlers = await loadHandlers();
      const { result, output } = await captureLogs(() => call(handlers, make()));
      expect(result.status).toBe(404);
      expect(spend()).toEqual({ rate: 0, claim: 0, prepare: 0, ingest: 0, fetch: 0 });
      // لا أثر لطلبٍ كُشف في سجلّ الاستيراد (تحذير بوّابة المالك المغلقة سطرٌ آخر، من البوّابة نفسها).
      expect(output).not.toContain("[finn-import]");
    },
  );

  it("الأسباب كلّها بجسمٍ وترويساتٍ متطابقة بايتًا — وتطابق الـ404 الواحد الذي يردّه مسار الدردشة", async () => {
    const reference = finnNotFoundResponse();
    const wanted = JSON.stringify([
      reference.status,
      [...reference.headers].sort(),
      await reference.text(),
    ]);
    const handlers = await loadHandlers();
    const shapes: string[] = [];
    for (const [, make, setup] of CASES) {
      vi.unstubAllEnvs();
      vi.stubEnv("FINN_OWNER_USER_IDS", OWNER);
      stubApprovalSecret(vi);
      sim.verifyUser = OWNER;
      setup();
      const res = await call(handlers, make());
      shapes.push(JSON.stringify([res.status, [...res.headers].sort(), await res.text()]));
    }
    expect(CASES.length).toBeGreaterThanOrEqual(7);
    expect(new Set(shapes).size).toBe(1);
    expect(shapes[0]).toBe(wanted);

    // ومسار الدردشة الحقيقي يردّ الجسم والترويسات أنفسهما لزائر.
    const chat = (await import("@/routes/api/finn/chat")) as unknown as {
      Route: {
        options: {
          server: { handlers: Record<string, (a: { request: Request }) => Promise<Response>> };
        };
      };
    };
    const chatRes = await chat.Route.options.server.handlers.POST({
      request: new Request("http://local/api/finn/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    });
    expect(
      JSON.stringify([chatRes.status, [...chatRes.headers].sort(), await chatRes.text()]),
    ).toBe(wanted);
  });

  // غير المالك على **التنفيذ** برمزٍ صالح تمامًا (للمالك ولملفه): بوّابة المالك يجب أن تسبق كل شيءٍ في
  // الفعلين معًا. قِيس: إسقاطها للتنفيذ وحده لم يُحمرّ إلا حارسٌ نصّيّ، فيفلت مسارٌ ينفّذ بهوية المالك.
  const EXEC_CASES: Array<[string, string | null | undefined, () => void]> = [
    ["زائر بلا ترويسة", null, () => {}],
    ["رمزٌ معطوب", "garbage", () => {}],
    ["مسجَّلٌ غير مالك", jwtFor(OTHER), () => {}],
    ["قائمة المالكين غير معرَّفة", undefined, () => vi.stubEnv("FINN_OWNER_USER_IDS", "")],
    [
      "قائمة المالكين فاسدة",
      undefined,
      () => vi.stubEnv("FINN_OWNER_USER_IDS", `${OWNER},not-a-uuid`),
    ],
    [
      "رمزٌ يدّعي المالك ولا تتحقّق منه المصادقة",
      undefined,
      () => {
        sim.verifyUser = null;
      },
    ],
    [
      "رمزٌ يدّعي المالك والمتحقَّق منه غيره",
      undefined,
      () => {
        sim.verifyUser = OTHER;
      },
    ],
  ];

  it.each(EXEC_CASES)(
    "%s + تنفيذٌ برمزٍ صالح للمالك وملفه ⇒ الـ404 نفسه وصفر حدٍّ/سقفٍ/مطالبةٍ/إدخال، والرمز لم يُحرق",
    async (_n, bearer, arm) => {
      const bytes = xlsxBytes();
      const file = { name: "data.xlsx", bytes };
      const token = await signFor({
        userId: OWNER,
        fileSha256: fileSha256Hex(bytes),
        parts: 1,
        rows: 2,
      });
      const reference = finnNotFoundResponse();
      const wanted = JSON.stringify([
        reference.status,
        [...reference.headers].sort(),
        await reference.text(),
      ]);
      arm();
      const handlers = await loadHandlers();
      const { result: res, output } = await captureLogs(() =>
        call(
          handlers,
          buildRequest({
            action: "execute",
            token,
            file,
            ...(bearer === undefined ? {} : { bearer }),
          }),
        ),
      );
      expect(JSON.stringify([res.status, [...res.headers].sort(), await res.text()])).toBe(wanted);
      expect(spend()).toEqual({ rate: 0, claim: 0, prepare: 0, ingest: 0, fetch: 0 });
      expect(sim.claimBuckets.size).toBe(0);
      expect(sim.quotaCalls).toEqual([]);
      expect(output).not.toContain("[finn-import]");

      // ضابط إيجابي: الرمز نفسه والملف نفسه ينجحان للمالك — فالـ404 أعلاه من البوّابة وحدها لا من فساد الرمز.
      vi.unstubAllEnvs();
      vi.stubEnv("FINN_OWNER_USER_IDS", OWNER);
      vi.stubEnv("SADEED_AI_DISABLED", "");
      stubApprovalSecret(vi);
      sim.verifyUser = OWNER;
      const ok = await call(handlers, buildRequest({ action: "execute", token, file }));
      expect(ok.status).toBe(200);
      expect(spend()).toMatchObject({ claim: 1, prepare: 1, ingest: 1 });
    },
  );

  it("كل رفضٍ ينتظر أرضية الزمن نفسها (لا مجسّ توقيت)", async () => {
    const handlers = await loadHandlers();
    for (const [name, make, setup] of CASES) {
      vi.unstubAllEnvs();
      vi.stubEnv("FINN_OWNER_USER_IDS", OWNER);
      sim.verifyUser = OWNER;
      setup();
      denyClock.t = 0;
      denyClock.slept = [];
      const res = await call(handlers, make());
      expect(res.status, name).toBe(404);
      expect(denyClock.t, `${name}: زمن الرفض`).toBe(FINN_DENY_FLOOR_MS);
    }
  });

  it("كل طريقةٍ غير POST ⇒ ANY ⇒ الـ404 نفسه (لا صفحة SPA تكشف المسار)", async () => {
    const handlers = await loadHandlers();
    expect(typeof handlers.ANY).toBe("function");
    for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
      const res = await handlers.ANY({
        request: new Request("http://local/api/finn/import", { method }),
      });
      expect(res.status, method).toBe(404);
      expect(await res.text()).toBe('{"error":"not_found"}');
    }
  });

  it("مفتاح الإيقاف مرفوعٌ + غير مالك ⇒ 404 لا 503 (وإلا كُشف وجود المسار)", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const res = await call(await loadHandlers(), buildRequest({ bearer: jwtFor(OTHER) }));
    expect(res.status).toBe(404);
  });

  it("والـ404 ليس 401/403 ولا يحمل نصّ مصادقة", async () => {
    const res = await call(await loadHandlers(), buildRequest({ bearer: null }));
    expect(res.status).toBe(404);
    expect(await res.text()).not.toMatch(/unauthor|authenticat|token|forbidden|غير مصرّ?ح|صلاحي/i);
  });
});

describe("② مفتاح الإيقاف", () => {
  it("المالك + المفتاح مرفوع ⇒ 503 ai_disabled بـRetry-After، وقبل أي حدٍّ أو تحليل", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const res = await call(await loadHandlers(), buildRequest());
    expect(res.status).toBe(503);
    const body = await jsonOf(res);
    expect(body.error).toBe("ai_disabled");
    expect(res.headers.get("retry-after")).toBe("300");
    expect(String(body.message_ar)).toMatch(/[؀-ۿ]/);
    expect(spend()).toEqual({ rate: 0, claim: 0, prepare: 0, ingest: 0, fetch: 0 });
  });
});

describe("③ شكل الطلب وحجمه (قبل أن يُنفَق حدّ)", () => {
  it("ليس multipart ⇒ 415 unsupported_type", async () => {
    const handlers = await loadHandlers();
    for (const request of [
      buildRequest({ rawBody: "{}", contentType: "application/json" }),
      buildRequest({ rawBody: "x", contentType: "text/plain" }),
      buildRequest({ rawBody: "x", contentType: null }),
    ]) {
      const res = await call(handlers, request);
      expect(res.status).toBe(415);
      expect((await jsonOf(res)).error).toBe("unsupported_type");
    }
    expect(spend().rate).toBe(0);
  });

  it("Content-Length فوق (الحدّ + ٦٤ ك) ⇒ 413 too_large قبل قراءة الجسم والحدّ", async () => {
    const over = LIMITS.maxFileBytes + 64 * 1024 + 1;
    const res = await call(
      await loadHandlers(),
      buildRequest({ headers: { "content-length": String(over) } }),
    );
    expect(res.status).toBe(413);
    const body = await jsonOf(res);
    expect(body).toMatchObject({ ok: false, error: "too_large" });
    expect(body.message_ar).toBe(FINN_IMPORT_MESSAGES_AR.too_large);
    expect(spend().rate).toBe(0);
  });

  it("Content-Length عند السقف تمامًا يمرّ الفحص المسبق", async () => {
    const res = await call(
      await loadHandlers(),
      buildRequest({ headers: { "content-length": String(LIMITS.maxFileBytes + 64 * 1024) } }),
    );
    expect(res.status).toBe(200);
  });

  it("الحجم الفعلي فوق الحدّ ولو كذبت الترويسة ⇒ 413 قبل أي حدٍّ أو تحليل", async () => {
    const big = new Uint8Array(LIMITS.maxFileBytes + 1).fill(97);
    const res = await call(
      await loadHandlers(),
      buildRequest({
        file: { name: "big.csv", bytes: big },
        headers: { "content-length": "100" },
      }),
    );
    expect(res.status).toBe(413);
    expect((await jsonOf(res)).error).toBe("too_large");
    expect(spend().rate).toBe(0);
  });

  it("الحجم عند الحدّ تمامًا لا يُرفض بالحجم", async () => {
    const edge = new Uint8Array(LIMITS.maxFileBytes).fill(97);
    const res = await call(
      await loadHandlers(),
      buildRequest({ file: { name: "edge.txt", bytes: edge } }),
    );
    expect(res.status).not.toBe(413);
  });

  describe("طلبٌ مجزّأ بلا Content-Length: السقف بالبايتات الفعلية لا بالترويسة", () => {
    const CAP = LIMITS.maxFileBytes + 64 * 1024;

    /** طلبٌ بجسم تدفّق (`duplex: half`) فلا يضع الـRequest ترويسة طول. */
    function streamed(
      body: ReadableStream<Uint8Array>,
      contentType: string,
      headers = {},
    ): Request {
      return new Request("http://local/api/finn/import", {
        method: "POST",
        headers: {
          authorization: `Bearer ${jwtFor(OWNER)}`,
          "content-type": contentType,
          ...headers,
        },
        body,
        duplex: "half",
      } as RequestInit);
    }

    it("جسمٌ مجزّأ يتجاوز السقف ⇒ 413 too_large، يُقطع القارئ قبل استنفاد الجسم، وصفر حدّ/تحليل", async () => {
      let pulled = 0;
      let cancelled = false;
      const TOTAL_CHUNKS = 12; // ١٢ ميغابايت — ثلاثة أضعاف السقف.
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          pulled += 1;
          if (pulled > TOTAL_CHUNKS) controller.close();
          else controller.enqueue(new Uint8Array(1024 * 1024));
        },
        cancel() {
          cancelled = true;
        },
      });
      const request = streamed(stream, "multipart/form-data; boundary=zzz");
      expect(request.headers.get("content-length")).toBeNull();
      const res = await call(await loadHandlers(), request);
      expect(res.status).toBe(413);
      const body = await jsonOf(res);
      expect(body).toMatchObject({ ok: false, error: "too_large" });
      expect(body.message_ar).toBe(FINN_IMPORT_MESSAGES_AR.too_large);
      expect(spend()).toEqual({ rate: 0, claim: 0, prepare: 0, ingest: 0, fetch: 0 });
      // لم يُقرأ كله: القارئ قُطع عند تجاوز السقف (لا تخزين لـ١٢ ميغابايت ولا تحليلها).
      expect(cancelled).toBe(true);
      expect(pulled).toBeLessThan(TOTAL_CHUNKS);
      expect(pulled * 1024 * 1024).toBeLessThan(CAP * 2);
    });

    it("ترويسة طولٍ فاسدة (غير رقمية) تُعامل كغائبة فتُقرأ البايتات بسقفها", async () => {
      let cancelled = false;
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(new Uint8Array(1024 * 1024));
        },
        cancel() {
          cancelled = true;
        },
      });
      const res = await call(
        await loadHandlers(),
        streamed(stream, "multipart/form-data; boundary=zzz", { "content-length": "abc" }),
      );
      expect(res.status).toBe(413);
      expect((await jsonOf(res)).error).toBe("too_large");
      expect(cancelled).toBe(true);
      expect(spend().rate).toBe(0);
    });

    it("جسمٌ مجزّأ صالح تحت السقف يُحلَّل بحدّه الأصلي (الحدّ بالحرف: boundary لا يُصغَّر)", async () => {
      const form = new FormData();
      form.append("action", "preview");
      form.append("file", new File([xlsxBytes() as BlobPart], "data.xlsx"));
      const wrapped = new Response(form);
      const contentType = wrapped.headers.get("content-type") ?? "";
      expect(contentType).toMatch(/boundary=/);
      const bytes = new Uint8Array(await wrapped.arrayBuffer());
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (let at = 0; at < bytes.length; at += 997)
            controller.enqueue(bytes.slice(at, at + 997));
          controller.close();
        },
      });
      const request = streamed(stream, contentType);
      expect(request.headers.get("content-length")).toBeNull();
      const res = await call(await loadHandlers(), request);
      expect(res.status).toBe(200);
      expect(await jsonOf(res)).toMatchObject({ ok: true, kind: "preview" });
      expect(spend().rate).toBe(1);
    });

    it("جسمٌ مجزّأ فارغ أو مشوّه ⇒ 400 invalid_request (لا انهيار)", async () => {
      const empty = new ReadableStream<Uint8Array>({ start: (c) => c.close() });
      const res = await call(
        await loadHandlers(),
        streamed(empty, "multipart/form-data; boundary=zzz"),
      );
      expect(res.status).toBe(400);
      expect((await jsonOf(res)).error).toBe("invalid_request");
      expect(spend().rate).toBe(0);
    });
  });

  it.each([
    ["بلا ملف", () => buildRequest({ file: null })],
    ["ملفان", () => buildRequest({ secondFile: { name: "b.csv", bytes: "a,b\n1,2" } })],
    ["بلا فعل", () => buildRequest({ action: null })],
    ["فعلٌ غير صالح", () => buildRequest({ action: "delete" })],
    ["فعلٌ فارغ", () => buildRequest({ action: "" })],
    ["فعلان", () => buildRequest({ secondAction: "execute" })],
    [
      "رمزان",
      () => {
        const form = new FormData();
        form.append("action", "execute");
        form.append("token", "a".repeat(20));
        form.append("token", "b".repeat(20));
        form.append("file", new File([xlsxBytes() as BlobPart], "data.xlsx"));
        return new Request("http://local/api/finn/import", {
          method: "POST",
          headers: { authorization: `Bearer ${jwtFor(OWNER)}` },
          body: form,
        });
      },
    ],
    [
      "الرمز ملفٌّ لا نص",
      () => {
        const form = new FormData();
        form.append("action", "execute");
        form.append("token", new File(["t".repeat(20)], "token.txt"));
        form.append("file", new File([xlsxBytes() as BlobPart], "data.xlsx"));
        return new Request("http://local/api/finn/import", {
          method: "POST",
          headers: { authorization: `Bearer ${jwtFor(OWNER)}` },
          body: form,
        });
      },
    ],
    [
      "جسمٌ multipart مشوّه",
      () =>
        buildRequest({
          rawBody: "هذا ليس multipart صالحًا",
          contentType: "multipart/form-data; boundary=zzz",
        }),
    ],
  ])("%s ⇒ 400 invalid_request ولا حدّ ولا تحليل", async (_n, make) => {
    const res = await call(await loadHandlers(), make());
    expect(res.status).toBe(400);
    const body = await jsonOf(res);
    expect(body).toMatchObject({ ok: false, error: "invalid_request" });
    expect(body.message_ar).toBe(FINN_IMPORT_MESSAGES_AR.invalid_request);
    expect(spend().rate).toBe(0);
  });

  it("حقل file نصٌّ لا ملف ⇒ 400", async () => {
    const form = new FormData();
    form.append("action", "preview");
    form.append("file", "نصٌّ لا ملف");
    const res = await call(
      await loadHandlers(),
      new Request("http://local/api/finn/import", {
        method: "POST",
        headers: { authorization: `Bearer ${jwtFor(OWNER)}` },
        body: form,
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("④ حدّ المعدّل يفشل مغلقًا", () => {
  it("المعاينة: مفتاح finn-import:preview:<هوية> بـ١٠/دقيقة، والتنفيذ: execute بـ٣/١٠ دقائق", async () => {
    const handlers = await loadHandlers();
    const token = await previewToken(handlers);
    await call(handlers, buildRequest({ action: "execute", token }));
    expect(sim.rateCalls).toEqual([
      { key: `finn-import:preview:${OWNER}`, max: 10, window: 60 },
      { key: `finn-import:execute:${OWNER}`, max: 3, window: 600 },
    ]);
    expect(LIMITS.previewPerMinute).toBe(10);
    expect(LIMITS.executePerTenMinutes).toBe(3);
  });

  it.each([
    ["preview", 60],
    ["execute", 600],
  ])(
    "%s فوق الحدّ ⇒ 429 rate_limited بـRetry-After=%i وصفر تحليل/مطالبة/إدخال",
    async (action, window) => {
      sim.rate = { allowed: false };
      const res = await call(await loadHandlers(), buildRequest({ action, token: "x".repeat(20) }));
      expect(res.status).toBe(429);
      const body = await jsonOf(res);
      expect(body).toMatchObject({ ok: false, error: "rate_limited", retry_after_s: window });
      expect(res.headers.get("retry-after")).toBe(String(window));
      expect(spend()).toMatchObject({ claim: 0, prepare: 0, ingest: 0 });
    },
  );

  it.each([
    ["المحدِّد يعيد unavailable", () => (sim.rate = { allowed: false, unavailable: true })],
    ["المحدِّد يرمي", () => (sim.rateThrows = true)],
  ])("%s ⇒ 503 unavailable بـRetry-After (مغلقًا لا مفتوحًا) وصفر كتابة", async (_n, arm) => {
    arm();
    const res = await call(await loadHandlers(), buildRequest());
    expect(res.status).toBe(503);
    const body = await jsonOf(res);
    expect(body).toMatchObject({ ok: false, error: "unavailable", retry_after_s: 60 });
    expect(res.headers.get("retry-after")).toBe("60");
    expect(JSON.stringify(body)).not.toContain("PLANTED-LIMITER-ERROR-QX7");
    expect(spend()).toMatchObject({ claim: 0, prepare: 0, ingest: 0 });
  });
});

describe("⑤ المعاينة: تحليلٌ في الذاكرة بلا كتابة", () => {
  it("استجابة سليمة بالعقد، والقيم المزروعة والأنماط الشخصية لا تظهر فيها", async () => {
    const bytes = xlsxBytes();
    const res = await call(
      await loadHandlers(),
      buildRequest({ file: { name: "تقرير.xlsx", bytes } }),
    );
    expect(res.status).toBe(200);
    const text = await res.clone().text();
    const body = await jsonOf(res);
    expect(body).toMatchObject({
      ok: true,
      kind: "preview",
      file: { name: "تقرير.xlsx", kind: "xlsx", bytes: bytes.length },
      sheets: [{ name: "البيانات", rows: 2, cols: 3, headers: ["الاسم", "الجوال", "ملاحظة"] }],
      totals: { rows_total: 2, rows_total_exact: true, rows_loaded: 2, parts: 1, truncated: false },
      pii: { id_numbers: 1, phones: 1, emails: 1, masked: true },
    });
    expect(typeof body.token).toBe("string");
    expect(String(body.token).split(".")).toHaveLength(2);
    expect(new Date(String(body.expires_at)).getTime()).toBeGreaterThan(Date.now());
    expect(Array.isArray(body.warnings)).toBe(true);
    // لا خلية ولا رقم هوية/جوال/بريد: العدّاد فقط.
    expectNoPlanted(text);
  });

  it("الصدق العددي: ورقةٌ تجاوزت حدّ القراءة ⇒ rows_total_exact=false (تقدير) والصغيرة true", async () => {
    const handlers = await loadHandlers();
    const small = await jsonOf(await call(handlers, buildRequest()));
    expect(small.totals).toMatchObject({ rows_total_exact: true, truncated: false });

    const over = LIMITS.maxRowsPerSheet + 5;
    const rows: Array<Array<string | number>> = [["id", "v"]];
    for (let i = 1; i <= over; i += 1) rows.push([i, `r${i}`]);
    const big = await jsonOf(
      await call(
        handlers,
        buildRequest({ file: { name: "many.xlsx", bytes: makeXlsx([{ name: "M", rows }]) } }),
      ),
    );
    expect(big.totals).toMatchObject({
      rows_total: over,
      rows_total_exact: false,
      truncated: true,
    });
    expect(
      (big.totals as { rows_loaded: number }).rows_loaded,
      "ما حُمِّل أقلّ من الإجمالي المقدَّر",
    ).toBeLessThan(over);
  }, 60_000);

  it("ترويسة أو اسم ورقة أو اسم ملف يحمل نمطًا شخصيًّا ⇒ يُحجب في الاستجابة", async () => {
    const bytes = xlsxBytes(
      [
        [PLANTED.headerPii, "عمود"],
        ["x", "y"],
      ],
      `ورقة-${PLANTED.id}`,
    );
    const res = await call(
      await loadHandlers(),
      buildRequest({ file: { name: `ملف-${PLANTED.phone}.xlsx`, bytes } }),
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(PLANTED.headerPii);
    expect(text).not.toContain(PLANTED.id);
    expect(text).not.toContain(PLANTED.phone);
    expect(text).toMatch(/محجوب/);
  });

  it("صفر كتابة: لا مطالبة ولا تهيئة إدخال ولا إدخال ولا fetch — ويُحسب حدٌّ واحد", async () => {
    const res = await call(await loadHandlers(), buildRequest());
    expect(res.status).toBe(200);
    expect(spend()).toEqual({ rate: 1, claim: 0, prepare: 0, ingest: 0, fetch: 0 });
  });

  it("معاينتان للملف نفسه ⇒ رمزان مختلفان (رقمٌ عابر لكلٍّ منهما)", async () => {
    const handlers = await loadHandlers();
    const a = await previewToken(handlers);
    const b = await previewToken(handlers);
    expect(a).not.toBe(b);
  });

  it("CSV يعمل أيضًا، وتحذيرات القارئ تصل المالك عربيةً بلا نصّ ملف", async () => {
    const res = await call(
      await loadHandlers(),
      buildRequest({ file: { name: "t.csv", bytes: "الاسم,القيمة\nأ,1\nب,2\n" } }),
    );
    const body = await jsonOf(res);
    expect(res.status).toBe(200);
    expect(body.file).toMatchObject({ kind: "csv" });
    expect(body.totals).toMatchObject({ rows_total: 2, parts: 1 });
  });

  it("بلا سرّ توقيع فِن ⇒ الميزة مغلقة بصدق: المعاينة 503 confirmation_unavailable والتنفيذ كذلك (لا معاينة بلا رمز)", async () => {
    vi.stubEnv("FINN_IMPORT_SIGNING_SECRET", "");
    // أسرار سَدِيد لا تفتح استيراد فِن (فصل المفاتيح) — نضبطها صالحةً لإثبات ذلك.
    vi.stubEnv("SADEED_MESSAGE_APPROVAL_SECRET", "s".repeat(48));
    vi.stubEnv("ARIA_MESSAGE_APPROVAL_SECRET", "a".repeat(48));
    const handlers = await loadHandlers();
    const res = await call(handlers, buildRequest());
    expect(res.status).toBe(503);
    const body = await jsonOf(res);
    expect(body).toMatchObject({ ok: false, error: "confirmation_unavailable" });
    expect(body).not.toHaveProperty("token");
    expect(spend()).toMatchObject({ claim: 0, prepare: 0, ingest: 0 });

    const exec = await call(handlers, buildRequest({ action: "execute", token: "anything" }));
    expect(exec.status).toBe(503);
    expect((await jsonOf(exec)).error).toBe("confirmation_unavailable");
    expect(spend()).toMatchObject({ claim: 0, ingest: 0 });
  });

  it.each([
    ["C:\\Users\\x\\b.xlsx", "b.xlsx"],
    ["a/b/c.xlsx", "c.xlsx"],
    ["../../etc/d.xlsx", "d.xlsx"],
    ["..\\..\\e.xlsx", "e.xlsx"],
  ])("اسم الملف المعروض بلا مسار مجلّدات: %s ⇒ %s", async (sent, shown) => {
    const res = await call(
      await loadHandlers(),
      buildRequest({ file: { name: sent, bytes: xlsxBytes() } }),
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect((JSON.parse(text) as { file: { name: string } }).file.name).toBe(shown);
    for (const fragment of ["Users", "etc", "..", "\\"]) expect(text).not.toContain(fragment);
  });

  it("بوّابة التأكيد قبل التحليل: بلا سرّ، ملفٌّ تالف أو غير آمن يردّ confirmation_unavailable لا malformed/unsafe — معاينةً وتنفيذًا", async () => {
    vi.stubEnv("FINN_IMPORT_SIGNING_SECRET", "");
    const handlers = await loadHandlers();
    const corrupt = { name: "a.xlsx", bytes: `PK\u0003\u0004${PLANTED.cellLatin}` };
    const exe = { name: "a.csv", bytes: "MZ\u0090\u0000\u0003" };
    for (const file of [corrupt, exe]) {
      for (const action of ["preview", "execute"]) {
        const res = await call(handlers, buildRequest({ action, token: "t".repeat(30), file }));
        expect(res.status, `${file.name}/${action}`).toBe(503);
        expect((await jsonOf(res)).error, `${file.name}/${action}`).toBe(
          "confirmation_unavailable",
        );
      }
    }
    expect(spend()).toMatchObject({ claim: 0, prepare: 0, ingest: 0 });
  });

  it("سرٌّ أقصر من ٣٢ حرفًا يعامَل كغائب", async () => {
    vi.stubEnv("FINN_IMPORT_SIGNING_SECRET", "short-secret");
    const res = await call(await loadHandlers(), buildRequest());
    expect(res.status).toBe(503);
    expect(await jsonOf(res)).toMatchObject({ ok: false, error: "confirmation_unavailable" });
  });
});

describe("⑥ أخطاء الملف: رموز وعربية ثابتة بلا نصّ من الملف", () => {
  const xlsx = xlsxBytes();
  const withVba = rewriteXlsx(xlsx, (entries) => [
    ...asSpecs(entries),
    { name: "xl/vbaProject.bin", data: `${PLANTED.cellLatin}` },
  ]);
  const CASES: Array<[string, { name: string; bytes: Uint8Array | string }, number, string]> = [
    ["فارغ", { name: "a.xlsx", bytes: "" }, 422, "empty"],
    ["xls قديم", { name: "a.xls", bytes: "x" }, 415, "unsupported_type"],
    ["xlsm", { name: "a.xlsm", bytes: "x" }, 415, "unsupported_type"],
    ["امتداد غريب", { name: "a.exe", bytes: "MZ" }, 415, "unsupported_type"],
    ["بلا امتداد", { name: "README", bytes: "x" }, 415, "unsupported_type"],
    [
      "xlsx تالف",
      { name: "a.xlsx", bytes: `PK\u0003\u0004${PLANTED.cellLatin}` },
      422,
      "malformed",
    ],
    ["xlsx بماكرو", { name: "a.xlsx", bytes: withVba }, 422, "unsafe"],
    ["csv بتوقيع تنفيذي", { name: "a.csv", bytes: "MZ\u0090\u0000\u0003" }, 422, "unsafe"],
    ["csv صفوفه فارغة", { name: "blank.csv", bytes: "a,b\n,\n,\n" }, 422, "empty"],
  ];

  it.each(CASES)("%s ⇒ %i %s", async (_n, file, status, code) => {
    const { result: res, output } = await captureLogs(async () =>
      call(await loadHandlers(), buildRequest({ file })),
    );
    expect(res.status).toBe(status);
    const text = await res.text();
    const body = JSON.parse(text) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: false, error: code });
    expect(typeof body.message_ar).toBe("string");
    expect(text).not.toContain(PLANTED.cellLatin);
    expect(output).not.toContain(PLANTED.cellLatin);
    expect(spend()).toMatchObject({ claim: 0, prepare: 0, ingest: 0 });
  });

  it("ملفٌّ كل صفوفه فارغة (JSON) ⇒ 422 empty لا معاينةً بصفر وثائق ولا رمزًا — ويُحسب الحدّ مرّةً بلا مطالبة ولا إدخال", async () => {
    const res = await call(
      await loadHandlers(),
      buildRequest({ file: { name: "n.json", bytes: '[{"a":null},{"a":null}]' } }),
    );
    expect(res.status).toBe(422);
    const body = await jsonOf(res);
    expect(body).toMatchObject({ ok: false, error: "empty" });
    expect(body.message_ar).toBe(FINN_IMPORT_MESSAGES_AR.empty);
    expect(body).not.toHaveProperty("token");
    expect(body).not.toHaveProperty("totals");
    expect(spend()).toEqual({ rate: 1, claim: 0, prepare: 0, ingest: 0, fetch: 0 });
  });

  it("وفي التنفيذ أيضًا (رمزٌ بصفر أجزاء) ⇒ 422 empty لا 409 «محمَّل سابقًا» الكاذب، ولا استهلاك ولا إدخال", async () => {
    const handlers = await loadHandlers();
    const file = { name: "n.json", bytes: '[{"a":null},{"a":null}]' };
    const token = await signFor({
      userId: OWNER,
      fileSha256: fileSha256Hex(new TextEncoder().encode(file.bytes)),
      parts: 0,
      rows: 0,
    });
    const exec = await call(handlers, buildRequest({ action: "execute", token, file }));
    expect(exec.status).toBe(422);
    expect(await jsonOf(exec)).toMatchObject({ ok: false, error: "empty" });
    expect(spend()).toMatchObject({ claim: 0, prepare: 0, ingest: 0 });
  });

  it("رسالة القارئ الخاصة تصل المالك كما هي: Excel القديم بجملته المخصَّصة لا العامّة، وغيره بجملة رمزه الثابتة", async () => {
    const handlers = await loadHandlers();
    const legacy = await jsonOf(
      await call(handlers, buildRequest({ file: { name: "a.xls", bytes: "x" } })),
    );
    expect(legacy.error).toBe("unsupported_type");
    // الجملة المخصَّصة (تذكر الحفظ بـxlsx دون ماكرو) — لا العامّة التي تكتفي بسرد الامتدادات.
    expect(legacy.message_ar).toBe(FINN_IMPORT_LEGACY_EXCEL_MESSAGE_AR);
    expect(legacy.message_ar).not.toBe(FINN_IMPORT_MESSAGES_AR.unsupported_type);
    expect(String(legacy.message_ar)).toMatch(/xlsx/);

    // ملف OLE بامتداد xlsx: القارئ نفسه يميّزه ويردّ الجملة المخصَّصة.
    const ole = await jsonOf(
      await call(
        handlers,
        buildRequest({
          file: {
            name: "b.xlsx",
            bytes: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]),
          },
        }),
      ),
    );
    expect(ole.message_ar).toBe(FINN_IMPORT_LEGACY_EXCEL_MESSAGE_AR);

    // وفشلٌ بلا جملة مخصَّصة يأخذ جملة رمزه الثابتة بعينها.
    const plain = await jsonOf(
      await call(handlers, buildRequest({ file: { name: "c.exe", bytes: "MZ" } })),
    );
    expect(plain.message_ar).toBe(FINN_IMPORT_MESSAGES_AR.unsupported_type);
  });
});

describe("⑦ التنفيذ: الرمز ثم المطابقة ثم الاستهلاك ثم الإدخال", () => {
  it("المسار السليم: ٢٠٠ done، إدخال واحد بجزءٍ محجوب، مطالبةٌ واحدة، ولا ادّعاء جاهزية", async () => {
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    const token = await previewToken(handlers, { name: "data.xlsx", bytes });
    const { result: res, output } = await captureLogs(() =>
      call(
        handlers,
        buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes } }),
      ),
    );
    expect(res.status).toBe(200);
    const text = await res.clone().text();
    const body = await jsonOf(res);
    expect(body).toMatchObject({ ok: true, kind: "done", documents: 1, status: "queued" });
    expect(String(body.message_ar)).not.toMatch(/جاهز|ready/i);
    expect(text).not.toContain(token);
    expectNoPlanted(text);

    // إدخال واحد، بهوية المالك، وبعميله هو (لا عميل خدمة).
    expect(sim.ingestCalls).toHaveLength(1);
    const { parts, deps } = sim.ingestCalls[0];
    expect(deps).toMatchObject({ userId: OWNER, origin: "https://app.example.test" });
    expect(deps.supabase).toEqual({ __fakeOwnerClient: true });
    expect(parts).toHaveLength(1);
    expect(parts[0].title).toMatch(/^\[FNN\] data\.xlsx/);
    // النصّ المخزَّن يحوي الخلية (هذا المقصود) لكن الأنماط الشخصية محجوبة دائمًا.
    expect(parts[0].text).toContain(PLANTED.cell);
    for (const raw of [PLANTED.id, PLANTED.phone, PLANTED.email]) {
      expect(parts[0].text).not.toContain(raw);
    }
    expect(parts[0].text).toMatch(/\[هوية محجوبة\]/);

    // مطالبةٌ واحدة بمفتاح المستخدم + الرقم العابر وبحدٍّ ١.
    expect(sim.claimCalls).toHaveLength(1);
    expect(sim.claimCalls[0]).toMatchObject({ max: 1 });
    expect(sim.claimCalls[0].bucket).toMatch(new RegExp(`^fi-claim:${OWNER}:[A-Za-z0-9_-]+$`));
    expect(spend()).toMatchObject({ claim: 1, prepare: 1, ingest: 1 });

    // السجلّ: سطر تدقيق واحد بأعدادٍ فقط، ولا خلية ولا اسم ملف.
    expect(output).not.toContain(PLANTED.cell);
    expect(output).not.toContain("data.xlsx");
    expect(output).not.toContain(token);
  });

  it("إعادة الرمز نفسه ⇒ 409 already_used، والإدخال لم يتكرّر", async () => {
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    const token = await previewToken(handlers, { name: "data.xlsx", bytes });
    const run = () =>
      call(
        handlers,
        buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes } }),
      );
    expect((await run()).status).toBe(200);
    const again = await run();
    expect(again.status).toBe(409);
    expect(await jsonOf(again)).toMatchObject({ ok: false, error: "already_used" });
    expect(sim.ingestCalls).toHaveLength(1);
  });

  it("ملفٌّ آخر بالرمز نفسه ⇒ 422 file_changed، ولا مطالبة ولا إدخال، والرمز لم يُحرق", async () => {
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    const token = await previewToken(handlers, { name: "data.xlsx", bytes });
    const other = xlsxBytes([["أ"], ["ب"]]);
    const res = await call(
      handlers,
      buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes: other } }),
    );
    expect(res.status).toBe(422);
    expect(await jsonOf(res)).toMatchObject({ ok: false, error: "file_changed" });
    expect(spend()).toMatchObject({ claim: 0, prepare: 0, ingest: 0 });
    // الملف الصحيح ما زال يعمل بالرمز نفسه.
    const ok = await call(
      handlers,
      buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes } }),
    );
    expect(ok.status).toBe(200);
  });

  it("ملفٌّ يطابق المعاينة في الشكل والأعداد ويختلف في ذيله وحده ⇒ 422 file_changed (البصمة تغطي الملف كله لا مقدّمته)", async () => {
    const handlers = await loadHandlers();
    const csv = (tail: string) =>
      new TextEncoder().encode(
        `id,value\n${Array.from({ length: 800 }, (_, i) => `r${i},v${i}`).join("\n")}\nlast,${tail}\n`,
      );
    const a = csv("1");
    const b = csv("2");
    // الشرط الذي يجعل الاختبار يعني ما يقول: الحجم نفسه، وكل ما قبل البايت الأخير متطابق (أكثر من ٤ ك).
    expect(a.length).toBe(b.length);
    expect(a.length).toBeGreaterThan(4096);
    expect(Buffer.compare(a.subarray(0, a.length - 3), b.subarray(0, b.length - 3))).toBe(0);
    expect(fileSha256Hex(a)).not.toBe(fileSha256Hex(b));

    const token = await previewToken(handlers, { name: "t.csv", bytes: a });
    const res = await call(
      handlers,
      buildRequest({ action: "execute", token, file: { name: "t.csv", bytes: b } }),
    );
    expect(res.status).toBe(422);
    expect(await jsonOf(res)).toMatchObject({ ok: false, error: "file_changed" });
    expect(spend()).toMatchObject({ claim: 0, prepare: 0, ingest: 0 });
    // والملف الأصلي ما زال يعمل بالرمز نفسه.
    const ok = await call(
      handlers,
      buildRequest({ action: "execute", token, file: { name: "t.csv", bytes: a } }),
    );
    expect(ok.status).toBe(200);
  });

  it("الاسم يتغيّر والبايتات نفسها ⇒ تنجح (البصمة على المحتوى لا الاسم)", async () => {
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    const token = await previewToken(handlers, { name: "a.xlsx", bytes });
    const res = await call(
      handlers,
      buildRequest({ action: "execute", token, file: { name: "b.xlsx", bytes } }),
    );
    expect(res.status).toBe(200);
  });

  it("رمز مستخدمٍ آخر ⇒ 400 token_invalid ولا مطالبة ولا إدخال", async () => {
    const bytes = xlsxBytes();
    const token = await signFor({
      userId: OTHER,
      fileSha256: fileSha256Hex(bytes),
      parts: 1,
      rows: 2,
    });
    const res = await call(
      await loadHandlers(),
      buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes } }),
    );
    expect(res.status).toBe(400);
    expect(await jsonOf(res)).toMatchObject({ ok: false, error: "token_invalid" });
    expect(spend()).toMatchObject({ claim: 0, ingest: 0 });
  });

  it.each([
    ["مفقود", null],
    ["فارغ", ""],
    ["نصٌّ عشوائي", "not-a-token"],
    ["بتوقيعٍ معبوث به", "tamper"],
  ])("رمز %s ⇒ 400 token_invalid", async (name, value) => {
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    let token = value;
    if (name === "بتوقيعٍ معبوث به") {
      const good = await previewToken(handlers, { name: "data.xlsx", bytes });
      const [payload, sig] = good.split(".");
      token = `${payload}.${sig.slice(0, -2)}${sig.endsWith("AA") ? "BB" : "AA"}`;
    }
    const res = await call(
      handlers,
      buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes } }),
    );
    expect(res.status).toBe(400);
    expect(await jsonOf(res)).toMatchObject({ ok: false, error: "token_invalid" });
    expect(spend()).toMatchObject({ claim: 0, ingest: 0 });
  });

  it("رمز منتهٍ ⇒ 400 token_expired", async () => {
    const bytes = xlsxBytes();
    const token = await signFor({
      userId: OWNER,
      fileSha256: fileSha256Hex(bytes),
      parts: 1,
      rows: 2,
      now: Date.now() - LIMITS.tokenTtlMs - 60_000,
    });
    const res = await call(
      await loadHandlers(),
      buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes } }),
    );
    expect(res.status).toBe(400);
    expect(await jsonOf(res)).toMatchObject({ ok: false, error: "token_expired" });
    expect(spend()).toMatchObject({ claim: 0, ingest: 0 });
  });

  it("رمزٌ سليم لكن أعداد الأجزاء/الصفوف لا تطابق ما أُعيد حسابه ⇒ 422 file_changed ولا يُحرق", async () => {
    const bytes = xlsxBytes();
    const sha = fileSha256Hex(bytes);
    for (const [parts, rows] of [
      [5, 2],
      [1, 999],
    ]) {
      const token = await signFor({ userId: OWNER, fileSha256: sha, parts, rows });
      const res = await call(
        await loadHandlers(),
        buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes } }),
      );
      expect(res.status).toBe(422);
      expect((await jsonOf(res)).error).toBe("file_changed");
    }
    expect(spend()).toMatchObject({ claim: 0, prepare: 0, ingest: 0 });
  });

  it("بلا سرّ تأكيد ⇒ 503 confirmation_unavailable قبل أي مطالبة", async () => {
    vi.stubEnv("FINN_IMPORT_SIGNING_SECRET", "");
    const res = await call(
      await loadHandlers(),
      buildRequest({ action: "execute", token: "t".repeat(30) }),
    );
    expect(res.status).toBe(503);
    expect(await jsonOf(res)).toMatchObject({ ok: false, error: "confirmation_unavailable" });
    expect(spend()).toMatchObject({ claim: 0, prepare: 0, ingest: 0 });
  });

  it("الإدخال غير مهيّأ ⇒ 503 unavailable بـRetry-After ٣٠ **قبل** المطالبة، ثم الرمز نفسه ينجح بعد الإصلاح", async () => {
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    const token = await previewToken(handlers, { name: "data.xlsx", bytes });
    const exec = () =>
      call(
        handlers,
        buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes } }),
      );
    sim.prepareOk = false;
    const failed = await exec();
    expect(failed.status).toBe(503);
    expect(failed.headers.get("retry-after")).toBe("30");
    expect(await jsonOf(failed)).toMatchObject({ ok: false, error: "unavailable" });
    expect(spend()).toMatchObject({ claim: 0, ingest: 0 });
    sim.prepareOk = true;
    expect((await exec()).status).toBe(200);
    expect(spend()).toMatchObject({ claim: 1, ingest: 1 });
  });

  it("مخزن المطالبة معطّل ⇒ 503 confirmation_unavailable، فشلٌ مغلق بلا إدخال", async () => {
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    const token = await previewToken(handlers, { name: "data.xlsx", bytes });
    sim.claimMode = "error";
    const res = await call(
      handlers,
      buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes } }),
    );
    expect(res.status).toBe(503);
    expect((await jsonOf(res)).error).toBe("confirmation_unavailable");
    expect(spend().ingest).toBe(0);
  });
});

describe("⑧ نتيجة الإدخال تُروى كما هي (صدقٌ في الجزئي والمكرَّر)", () => {
  async function runExecute(outcome: (typeof sim)["ingestOutcome"]) {
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    const token = await previewToken(handlers, { name: "data.xlsx", bytes });
    sim.ingestOutcome = outcome;
    return call(
      handlers,
      buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes } }),
    );
  }

  it("جزءان أُدرجا ومثلهما مكرَّر ⇒ done وdocuments = المُدرَج فقط، والمكرَّر مذكور", async () => {
    const res = await runExecute(() => ({
      total: 4,
      queued: 2,
      deduped: 2,
      failed: 0,
      parts: ["queued", "queued", "deduped", "deduped"],
    }));
    expect(res.status).toBe(200);
    const body = await jsonOf(res);
    expect(body).toMatchObject({ ok: true, kind: "done", documents: 2, status: "queued" });
    expect(String(body.message_ar)).toMatch(/موجودة سابقًا/);
  });

  it("كلّه مكرَّر ⇒ 409 already_used بعبارة «محمَّل سابقًا» لا «done» (لا تحميل جديد)", async () => {
    const res = await runExecute(() => ({
      total: 1,
      queued: 0,
      deduped: 1,
      failed: 0,
      parts: ["deduped"],
    }));
    expect(res.status).toBe(409);
    const body = await jsonOf(res);
    expect(body).toMatchObject({ ok: false, error: "already_used" });
    expect(body).not.toHaveProperty("documents");
    expect(String(body.message_ar)).toMatch(/سابقًا/);
  });

  it("جزئي (أُدرج ١ وفشل ١) ⇒ 502 unavailable بتفصيل ما تمّ وما لم يتمّ، لا «done»", async () => {
    const res = await runExecute(() => ({
      total: 2,
      queued: 1,
      deduped: 0,
      failed: 1,
      parts: ["queued", "failed"],
    }));
    expect(res.status).toBe(502);
    const body = await jsonOf(res);
    expect(body).toMatchObject({
      ok: false,
      error: "unavailable",
      partial: { total: 2, queued: 1, deduped: 0, failed: 1 },
    });
    expect(String(body.message_ar)).toMatch(/جزء من التحميل/);
    expect(String(body.message_ar)).not.toMatch(/جاهز|ready/i);
    expect(body).not.toHaveProperty("documents");
  });

  it("مكرَّر + فاشل (لا مُدرج) ⇒ جزئي أيضًا 502", async () => {
    const res = await runExecute(() => ({
      total: 2,
      queued: 0,
      deduped: 1,
      failed: 1,
      parts: ["deduped", "failed"],
    }));
    expect(res.status).toBe(502);
    expect((await jsonOf(res)).partial).toMatchObject({ deduped: 1, failed: 1, queued: 0 });
  });

  it("فشل الكل ⇒ 503 unavailable بـRetry-After ولا «محمَّل»", async () => {
    const res = await runExecute(() => ({
      total: 1,
      queued: 0,
      deduped: 0,
      failed: 1,
      parts: ["failed"],
    }));
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("30");
    const body = await jsonOf(res);
    expect(body).toMatchObject({
      ok: false,
      error: "unavailable",
      partial: { total: 1, queued: 0, deduped: 0, failed: 1 },
    });
    // الرمز استُهلك قبل الكتابة: لا «لم يُؤكَّد حفظ أي شيء» ولا «أعد المحاولة»، بل قد يكون بعضٌ حُمِّل.
    expect(body.message_ar).toBe(FINN_IMPORT_LATE_FAILURE_AR);
    expect(body.message_ar).not.toBe(FINN_IMPORT_MESSAGES_AR.unavailable);
    expect(String(body.message_ar)).toMatch(/قد يكون بعض الملف حُمِّل/);
    expect(String(body.message_ar)).toMatch(/أعد المعاينة والتأكيد/);
  });

  it("الإدخال يرمي بنصٍّ مزروع ⇒ 503 عامّ، والنصّ لا يصل استجابةً ولا سجلًّا", async () => {
    sim.ingestThrows = `${PLANTED.error} ${PLANTED.cell}`;
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    const token = await previewToken(handlers, { name: "data.xlsx", bytes });
    const { result: res, output } = await captureLogs(() =>
      call(
        handlers,
        buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes } }),
      ),
    );
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({
      ok: false,
      error: "unavailable",
      message_ar: FINN_IMPORT_LATE_FAILURE_AR,
    });
    for (const dump of [text, output]) {
      expect(dump).not.toContain(PLANTED.error);
      expect(dump).not.toContain(PLANTED.cell);
    }
    expect(output).toContain("[finn-import]");
  });
});

describe("⑧-ب السقف اليومي للتنفيذ وحده: نداء صريح قبل الاستهلاك، يفشل مغلقًا", () => {
  async function armed() {
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    const token = await previewToken(handlers, { name: "data.xlsx", bytes });
    return {
      handlers,
      token,
      request: () => buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes } }),
    };
  }

  it("التنفيذ ينادي السقف اليومي مرّةً (هوية الاستيراد المستقلّة + العامّ) والمعاينة لا تنادي", async () => {
    const { handlers, request } = await armed();
    expect(sim.quotaCalls).toEqual([]); // المعاينة لم تمسّ السقف
    const res = await call(handlers, request());
    expect(res.status).toBe(200);
    expect(sim.quotaCalls).toHaveLength(2);
    const [identity, global] = sim.quotaCalls;
    expect(identity.key).toMatch(
      new RegExp(`^ai-daily-id:finn:\\d{4}-\\d{2}-\\d{2}:finn-import:${OWNER}$`),
    );
    // دلوٌ مستقلّ عن هوية الدردشة: تحميل الملفات لا يستهلك حصّة المحادثة.
    expect(identity.key).not.toContain("finn-chat");
    expect(identity.window).toBe(86_400);
    expect(global.key).toMatch(/^ai-daily-global:finn:\d{4}-\d{2}-\d{2}$/);
  });

  it("تجاوز السقف ⇒ 429 rate_limited بعربية «بعد منتصف الليل» بلا Retry-After، قبل الاستهلاك والإدخال", async () => {
    const { handlers, token, request } = await armed();
    sim.quota = { allowed: false };
    const res = await call(handlers, request());
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeNull();
    const body = await jsonOf(res);
    expect(body).toMatchObject({ ok: false, error: "rate_limited" });
    expect(String(body.message_ar)).toMatch(/حصّتك اليومية/);
    expect(String(body.message_ar)).toMatch(/بعد منتصف الليل/);
    expect(body).not.toHaveProperty("retry_after_s");
    expect(spend()).toMatchObject({ claim: 0, ingest: 0, fetch: 0 });
    // لم يُحرق الرمز: بعد عودة الحصّة يُنفَّذ بالرمز نفسه.
    sim.quota = { allowed: true };
    const again = await call(
      handlers,
      buildRequest({ action: "execute", token, file: { name: "data.xlsx", bytes: xlsxBytes() } }),
    );
    expect(again.status).toBe(200);
    expect(spend()).toMatchObject({ claim: 1, ingest: 1 });
  });

  it("المخزن غير متاح ⇒ مغلقًا: 503 unavailable بلا مطالبة ولا إدخال (لا يمرّ الإنفاق بلا تحقّق)", async () => {
    const { handlers, request } = await armed();
    sim.quota = { allowed: false, unavailable: true };
    const res = await call(handlers, request());
    expect(res.status).toBe(503);
    expect(await jsonOf(res)).toMatchObject({ ok: false, error: "unavailable" });
    expect(res.headers.get("retry-after")).toBe("60");
    expect(spend()).toMatchObject({ claim: 0, ingest: 0, fetch: 0 });
  });

  it("رمزٌ غير صالح أو ملفٌّ تغيّر ⇒ يُرفض قبل السقف فلا يُنفَق منه شيء", async () => {
    const handlers = await loadHandlers();
    const garbage = await call(
      handlers,
      buildRequest({ action: "execute", token: "x".repeat(40) }),
    );
    expect(garbage.status).toBe(400);
    expect(sim.quotaCalls).toEqual([]);
    const { token } = await armed();
    const other = await call(
      handlers,
      buildRequest({
        action: "execute",
        token,
        file: { name: "data.xlsx", bytes: xlsxBytes([["a"], ["b"]]) },
      }),
    );
    expect(other.status).toBe(422);
    expect(sim.quotaCalls).toEqual([]);
  });

  it("مفتاح الإيقاف يسبق السقف (متزامن، بلا شبكة): لا نداء سقفٍ ولا حدّ", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const res = await call(
      await loadHandlers(),
      buildRequest({ action: "execute", token: "x".repeat(40) }),
    );
    expect(res.status).toBe(503);
    expect(sim.quotaCalls).toEqual([]);
    expect(spend().rate).toBe(0);
  });
});

describe("⑨ الاستجابات والسجلّ", () => {
  it("كل استجابة (نجاحًا وفشلًا) بترويسات no-store وnosniff وJSON عربي", async () => {
    const handlers = await loadHandlers();
    const responses = [
      await call(handlers, buildRequest()),
      await call(handlers, buildRequest({ action: "bad" })),
      await call(handlers, buildRequest({ rawBody: "{}", contentType: "application/json" })),
      await call(handlers, buildRequest({ file: { name: "a.exe", bytes: "x" } })),
    ];
    expect(responses.map((r) => r.status)).toEqual([200, 400, 415, 415]);
    for (const res of responses) {
      expect(res.headers.get("cache-control")).toMatch(/no-store/);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("content-type")).toMatch(/application\/json; charset=utf-8/);
    }
  });

  it("السطر الوحيد في السجلّ: [finn-import] بمفاتيح action/ok/ms/bytes/rows وقيمٍ عددية", async () => {
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    const calls: unknown[][] = [];
    const info = vi.spyOn(console, "info").mockImplementation((...args) => {
      calls.push(args);
    });
    const others = (["log", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    await call(handlers, buildRequest({ file: { name: PLANTED.fileName, bytes } }));
    await call(handlers, buildRequest({ action: "nope" }));
    expect(info).toHaveBeenCalledTimes(2);
    expect(calls[0][0]).toBe("[finn-import]");
    expect(calls[0][1]).toEqual({
      action: "preview",
      ok: true,
      ms: expect.any(Number),
      bytes: bytes.length,
      rows: 2,
    });
    expect(calls[1][1]).toMatchObject({ action: "invalid", ok: false });
    expect(Object.keys(calls[0][1] as object).sort()).toEqual([
      "action",
      "bytes",
      "ms",
      "ok",
      "rows",
    ]);
    for (const spy of others) expect(spy).not.toHaveBeenCalled();
    expect(JSON.stringify(calls)).not.toContain(PLANTED.fileName);
    expect(JSON.stringify(calls)).not.toContain(PLANTED.cell);
  });

  it("رسائل الفشل كلّها من الجدول الثابت أو عبارات الرد المعروفة، ولا تحوي كلمات مصادقة", async () => {
    const handlers = await loadHandlers();
    const seen: string[] = [];
    const attempts: Request[] = [
      buildRequest({ action: "bad" }),
      buildRequest({ file: null }),
      buildRequest({ rawBody: "x", contentType: "text/plain" }),
      buildRequest({ file: { name: "a.exe", bytes: "x" } }),
      buildRequest({ file: { name: "a.xlsx", bytes: "" } }),
      buildRequest({ action: "execute", token: "bad" }),
    ];
    for (const request of attempts) {
      const body = await jsonOf(await call(handlers, request));
      if (body.ok === false) seen.push(String(body.message_ar));
    }
    expect(seen.length).toBe(attempts.length);
    for (const message of seen) {
      expect(FIXED_ERROR_VALUES).toContain(message);
      expect(message).not.toMatch(/authenticat|unauthor|token|jwt|bearer|secret|supabase/i);
    }
  });
});
