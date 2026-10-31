// @vitest-environment node
/**
 * مسار الاستيراد من أوله لآخره **بالإدخال الحقيقي**: المعالج الحقيقي + `ingest.server.ts` الحقيقي +
 * قاعدة وهمية في الذاكرة (`FakeDb`) + خطّاف فهرسة وهمي. المحاكى فقط: المصادقة وحدّ المعدّل ومطالبة
 * الرمز وعميل Supabase ونداء الخطّاف. هنا يُرى الأثر الفعلي على جدول `finn_documents`:
 * معاينةٌ لا تكتب، وتنفيذٌ يكتب بهوية المالك، وإعادةُ تنفيذ لا تكرّر، وفشلٌ جزئيٌّ يُعاد بلا تكرار.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "./fake-db.test-support";
import { FINN_IMPORT_LIMITS } from "./contract";
import {
  CRON_SECRET,
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
  resetSim,
  sim,
  stubApprovalSecret,
} from "./import-route.harness.test-support";
import { setFinnDenyClockForTests } from "@/lib/finn-agent/owner-gate.server";

const wire = vi.hoisted(() => ({
  db: null as null | { client(): unknown },
  clients: [] as Array<{ url: string; key: string; options: Record<string, unknown> }>,
  /** جسر العميل الحقيقي إلى المعالج الحقيقي (يحلّ محلّ authenticatedFetch). */
  bridge: null as null | ((input: string, init: RequestInit) => Promise<Response>),
}));

vi.mock("@supabase/supabase-js", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createClient: (url: string, key: string, options: Record<string, unknown>) => {
    wire.clients.push({ url, key, options });
    return wire.db?.client();
  },
}));
vi.mock("@/lib/auth-fetch", () => ({
  authenticatedFetch: (input: string, init: RequestInit) => {
    if (!wire.bridge) throw new Error("bridge not armed");
    return wire.bridge(input, init);
  },
}));
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

interface HookCall {
  url: string;
  secret: string | null;
  body: { document_id: string; text: string };
}
const hook = { calls: [] as HookCall[], plan: [200] as number[] };

let db: FakeDb;

beforeEach(() => {
  resetSim();
  db = new FakeDb();
  wire.db = db;
  wire.clients = [];
  hook.calls = [];
  hook.plan = [200];
  setFinnDenyClockForTests({ now: () => 0, sleep: async () => undefined });
  vi.stubEnv("FINN_OWNER_USER_IDS", OWNER);
  vi.stubEnv("SADEED_AI_DISABLED", "");
  vi.stubEnv("CRON_HOOK_SECRET", CRON_SECRET);
  vi.stubEnv("SUPABASE_URL", "https://proj.supabase.test");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "anon-key-planted");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-planted-NEVER");
  vi.stubEnv("PUBLIC_SITE_URL", "https://site.example.test");
  stubApprovalSecret(vi);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      sim.fetchCalls++;
      hook.calls.push({
        url: String(url),
        secret: new Headers(init.headers).get("x-cron-secret"),
        body: JSON.parse(String(init.body)),
      });
      const status = hook.plan[Math.min(hook.calls.length - 1, hook.plan.length - 1)];
      return new Response("{}", { status });
    }),
  );
});
afterEach(() => {
  setFinnDenyClockForTests(null);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const NAME = "data.xlsx";

async function preview(
  handlers: Awaited<ReturnType<typeof loadHandlers>>,
  name: string,
  bytes: Uint8Array | string,
) {
  const res = await call(handlers, buildRequest({ action: "preview", file: { name, bytes } }));
  return { res, body: await jsonOf(res) };
}
async function execute(
  handlers: Awaited<ReturnType<typeof loadHandlers>>,
  name: string,
  bytes: Uint8Array | string,
  token: string,
) {
  const res = await call(
    handlers,
    buildRequest({ action: "execute", token, file: { name, bytes } }),
  );
  return { res, body: await jsonOf(res) };
}

describe("المعاينة ثم التنفيذ بالإدخال الحقيقي", () => {
  it("المعاينة لا تلمس القاعدة ولا الخطّاف ولا تبني عميلًا", async () => {
    const handlers = await loadHandlers();
    const { res, body } = await preview(handlers, NAME, xlsxBytes());
    expect(res.status).toBe(200);
    expect(body.token).toBeTruthy();
    expect(db.ops).toEqual([]);
    expect(db.rows).toEqual([]);
    expect(hook.calls).toEqual([]);
    expect(wire.clients).toEqual([]);
    expect(sim.claimCalls).toEqual([]);
  });

  it("التنفيذ يكتب صفًّا بهوية المالك ورمزه ومفتاح الـanon، ويستدعي الخطّاف بسرّ الخادم والنصّ المحجوب", async () => {
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    const { body: pv } = await preview(handlers, NAME, bytes);
    const { result, output } = await captureLogs(() =>
      execute(handlers, NAME, bytes, String(pv.token)),
    );
    expect(result.res.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, kind: "done", documents: 1, status: "queued" });

    // عميل المالك: رمزه هو، ومفتاح anon العامّ، لا مفتاح الخدمة أبدًا.
    expect(wire.clients).toHaveLength(1);
    expect(wire.clients[0].url).toBe("https://proj.supabase.test");
    expect(wire.clients[0].key).toBe("anon-key-planted");
    expect(wire.clients[0].options).toMatchObject({
      global: { headers: { Authorization: `Bearer ${jwtFor(OWNER)}` } },
    });
    expect(JSON.stringify(wire.clients)).not.toContain("service-role-planted-NEVER");

    // الصفّ.
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({
      user_id: OWNER,
      source: "text",
      status: "pending",
      tags: ["fnn-import"],
    });
    expect(String(db.rows[0].title)).toMatch(/^\[FNN\] data\.xlsx/);
    expect(Array.from(new Set(db.ops.map((o) => o.split(":")[0])))).toEqual(["finn_documents"]);

    // الخطّاف: أصل البيئة، وسرّ الخادم، والنصّ المحجوب.
    expect(hook.calls).toHaveLength(1);
    expect(hook.calls[0].url).toBe("https://site.example.test/api/public/hooks/sadeed-docs-ingest");
    expect(hook.calls[0].secret).toBe(CRON_SECRET);
    expect(hook.calls[0].body.document_id).toBe(db.rows[0].id);
    expect(hook.calls[0].body.text).toContain(PLANTED.cell);
    for (const raw of [PLANTED.id, PLANTED.phone, PLANTED.email]) {
      expect(hook.calls[0].body.text).not.toContain(raw);
    }

    // لا شيء من الملف يبلغ الاستجابة أو السجلّ أو أعمدة القاعدة عدا النصّ المحجوب المقصود.
    const responseText = JSON.stringify(result.body);
    for (const dump of [responseText, output]) {
      for (const value of [PLANTED.cell, PLANTED.id, PLANTED.phone, PLANTED.email]) {
        expect(dump).not.toContain(value);
      }
    }
    expect(JSON.stringify({ ...db.rows[0], title: "" })).not.toContain(PLANTED.cell);
  });

  it("إعادة رفع الملف نفسه بمعاينةٍ جديدة ⇒ 409 «محمَّل سابقًا»: لا صفّ ثانٍ ولا خطّاف ثانٍ", async () => {
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    const first = await preview(handlers, NAME, bytes);
    expect((await execute(handlers, NAME, bytes, String(first.body.token))).res.status).toBe(200);
    // يصير الصفّ جاهزًا (الخطّاف الحقيقي يفعل ذلك).
    db.rows[0].status = "ready";

    const second = await preview(handlers, NAME, bytes);
    const again = await execute(handlers, NAME, bytes, String(second.body.token));
    expect(again.res.status).toBe(409);
    expect(again.body).toMatchObject({
      ok: false,
      error: "already_used",
      partial: { total: 1, queued: 0, deduped: 1, failed: 0 },
    });
    expect(String(again.body.message_ar)).toMatch(/سابقًا/);
    expect(db.rows).toHaveLength(1);
    expect(hook.calls).toHaveLength(1);
  });

  it("خطّاف يردّ 401 فورًا ⇒ 503 unavailable، والصفّ يُوسم failed بسببٍ عربي ثابت", async () => {
    hook.plan = [401];
    const handlers = await loadHandlers();
    const bytes = xlsxBytes();
    const { body: pv } = await preview(handlers, NAME, bytes);
    const { res, body } = await execute(handlers, NAME, bytes, String(pv.token));
    expect(res.status).toBe(503);
    expect(body).toMatchObject({ ok: false, error: "unavailable", partial: { failed: 1 } });
    expect(db.rows[0]).toMatchObject({ status: "failed" });
    expect(String(db.rows[0].error)).toMatch(/^[؀-ۿ\s.،()؟a-z_]+$/);
  });
});

describe("ملفٌّ بوثيقتين: الفشل الجزئي صادق، وإعادة المحاولة لا تكرّر ما حُمِّل", () => {
  /** CSV يكفي لوثيقتين (فوق سقف الوثيقة الواحدة) وأقل من سقف الملف. */
  function bigCsv(): string {
    const filler = "ن".repeat(160);
    const lines = ["id,text"];
    const rows = Math.ceil((FINN_IMPORT_LIMITS.maxCharsPerDocument * 1.4) / 180);
    for (let i = 1; i <= rows; i += 1) lines.push(`${i},${filler}${i}`);
    return lines.join("\n");
  }

  it("المعاينة تعدّ وثيقتين؛ نجاح الأولى وفشل الثانية ⇒ 502 جزئي؛ ثم معاينةٌ جديدة تُدرج الفاشلة وحدها", async () => {
    const handlers = await loadHandlers();
    const csv = bigCsv();
    expect(csv.length).toBeLessThan(FINN_IMPORT_LIMITS.maxFileBytes);

    const first = await preview(handlers, "big.csv", csv);
    expect(first.body.totals).toMatchObject({ parts: 2, truncated: false });

    hook.plan = [200, 503];
    const partial = await execute(handlers, "big.csv", csv, String(first.body.token));
    expect(partial.res.status).toBe(502);
    expect(partial.body).toMatchObject({
      ok: false,
      error: "unavailable",
      partial: { total: 2, queued: 1, deduped: 0, failed: 1 },
    });
    expect(String(partial.body.message_ar)).toMatch(/جزء من التحميل/);
    expect(db.rows.map((r) => r.status).sort()).toEqual(["failed", "pending"]);
    expect(hook.calls).toHaveLength(2);

    // الرمز استُهلك: إعادته ⇒ already_used (لا إعادة صامتة لكتابةٍ لا يُعرف أثرها).
    const replay = await execute(handlers, "big.csv", csv, String(first.body.token));
    expect(replay.res.status).toBe(409);
    expect(hook.calls).toHaveLength(2);

    // معاينة جديدة ثم تنفيذ: الجزء الأول مكرَّر (قيد الفهرسة) فلا يتكرّر، والثاني يُدرج من جديد.
    hook.plan = [200];
    const second = await preview(handlers, "big.csv", csv);
    const retry = await execute(handlers, "big.csv", csv, String(second.body.token));
    expect(retry.res.status).toBe(200);
    expect(retry.body).toMatchObject({ ok: true, kind: "done", documents: 1 });
    expect(String(retry.body.message_ar)).toMatch(/موجودة سابقًا/);
    // الصفوف: الأولى (pending) + الفاشلة القديمة + الجديدة؛ لا نسخة ثانية للأولى.
    const hashes = db.rows.map((r) => r.revision_hash);
    expect(hashes).toHaveLength(3);
    expect(new Set(hashes).size).toBe(2);
    expect(db.rows.filter((r) => r.status === "failed")).toHaveLength(1);
  });
});

describe("العميل الحقيقي (client.ts) أمام المعالج الحقيقي: العقد يعمل من الطرفين", () => {
  async function arm() {
    const handlers = await loadHandlers();
    wire.bridge = (input, init) =>
      handlers.POST({
        request: new Request(`http://local${input}`, {
          method: init.method,
          body: init.body as BodyInit,
          headers: { authorization: `Bearer ${jwtFor(OWNER)}` },
        }),
      });
    return await import("./client");
  }
  const file = () => new File([xlsxBytes() as BlobPart], NAME);

  it("معاينة ثم تنفيذ: preview بعدّاداتٍ ورمز، ثم done بعدد المُدرَج", async () => {
    const client = await arm();
    const pv = await client.postFinnImport({ file: file(), action: "preview" });
    expect(pv).toMatchObject({
      ok: true,
      kind: "preview",
      totals: { rows_total: 2, rows_loaded: 2, parts: 1, truncated: false },
      pii: { id_numbers: 1, phones: 1, emails: 1, masked: true },
    });
    if (!pv.ok || pv.kind !== "preview") throw new Error("preview expected");
    const done = await client.postFinnImport({ file: file(), action: "execute", token: pv.token });
    expect(done).toEqual({ ok: true, kind: "done", documents: 1, deduped: 0 });
    expect(client.describeDone(1)).toMatch(/قيد الفهرسة/);
  });

  it("إعادة المحتوى نفسه ⇒ already_used بعبارة «سابقًا» تصل الشاشة (لا done مزيّف)", async () => {
    const client = await arm();
    const run = async () => {
      const pv = await client.postFinnImport({ file: file(), action: "preview" });
      if (!pv.ok || pv.kind !== "preview") throw new Error("preview expected");
      return client.postFinnImport({ file: file(), action: "execute", token: pv.token });
    };
    expect((await run()).ok).toBe(true);
    db.rows[0].status = "ready";
    const again = await run();
    expect(again).toMatchObject({ ok: false, error: "already_used" });
    if (again.ok) throw new Error("failure expected");
    expect(again.message_ar).toMatch(/سابقًا/);
  });

  it("التعافي بعد فشلٍ متأخر: إعادة الرمز المحروق تكذب (409)، فالتعافي معاينةٌ جديدة بالرمز الجديد وينجح", async () => {
    hook.plan = [401]; // الإدخال يفشل كلّه بعد استهلاك الرمز
    const client = await arm();
    const pv = await client.postFinnImport({ file: file(), action: "preview" });
    if (!pv.ok || pv.kind !== "preview") throw new Error("preview expected");

    const failed = await client.postFinnImport({
      file: file(),
      action: "execute",
      token: pv.token,
    });
    expect(failed).toMatchObject({ ok: false, error: "unavailable" });
    if (failed.ok) throw new Error("failure expected");
    expect(failed.message_ar).toMatch(/قد يكون بعض الملف حُمِّل/);
    // الخادم استهلك الرمز قبل الكتابة: إعادته تردّ 409 «نُفِّذ من قبل» وما كُتب شيءٌ ناجح — هذا الكذب هو الخلل.
    const replay = await client.postFinnImport({
      file: file(),
      action: "execute",
      token: pv.token,
    });
    expect(replay).toMatchObject({ ok: false, error: "already_used" });
    expect(db.rows.map((r) => r.status)).toEqual(["failed"]);

    // لذا يرفض العميل عرض إعادة الرمز بعد فشل التنفيذ المتأخر (أيًّا كان رمز الفشل)، ويعرض المعاينة الجديدة.
    expect(client.finnImportRecovery(failed.error, "execute")).toBe("refresh");
    expect(client.finnImportRecovery("network", "execute")).toBe("refresh");
    expect(client.finnImportRecovery("timeout", "execute")).toBe("refresh");

    // تنفيذ التوصية: معاينةٌ جديدة من الملف نفسه (رمزٌ مختلف) ثم تأكيدٌ جديد ⇒ ينجح بوثيقة واحدة.
    hook.plan = [200];
    const fresh = await client.postFinnImport({ file: file(), action: "preview" });
    if (!fresh.ok || fresh.kind !== "preview") throw new Error("preview expected");
    expect(fresh.token).not.toBe(pv.token);
    const done = await client.postFinnImport({
      file: file(),
      action: "execute",
      token: fresh.token,
    });
    expect(done).toEqual({ ok: true, kind: "done", documents: 1, deduped: 0 });
    expect(db.rows.map((r) => r.status).sort()).toEqual(["failed", "pending"]);
  });

  it("الاسترداد بعد فشلٍ جزئي: المعاينة الجديدة تذكر ما لم يُكرَّر في نتيجة التمام (deduped يصل العميل)", async () => {
    hook.plan = [200, 503];
    const csv = ["id,text"]
      .concat(
        Array.from(
          { length: Math.ceil((FINN_IMPORT_LIMITS.maxCharsPerDocument * 1.4) / 180) },
          (_v, i) => `${i + 1},${"ن".repeat(160)}${i + 1}`,
        ),
      )
      .join("\n");
    const big = () => new File([csv], "big.csv");
    const client = await arm();
    const first = await client.postFinnImport({ file: big(), action: "preview" });
    if (!first.ok || first.kind !== "preview") throw new Error("preview expected");
    const partial = await client.postFinnImport({
      file: big(),
      action: "execute",
      token: first.token,
    });
    expect(partial).toMatchObject({ ok: false, error: "unavailable" });
    if (partial.ok) throw new Error("failure expected");
    expect(client.finnImportRecovery(partial.error, "execute")).toBe("refresh");

    hook.plan = [200];
    const second = await client.postFinnImport({ file: big(), action: "preview" });
    if (!second.ok || second.kind !== "preview") throw new Error("preview expected");
    const done = await client.postFinnImport({
      file: big(),
      action: "execute",
      token: second.token,
    });
    // وثيقتان وعدتهما المعاينة: واحدة مكرَّرة (موجودة) وواحدة جديدة — والرسالة تقولهما.
    expect(done).toEqual({ ok: true, kind: "done", documents: 1, deduped: 1 });
    if (!done.ok || done.kind !== "done") throw new Error("done expected");
    expect(client.describeDone(done.documents, done.deduped)).toMatch(/الموجود سابقًا ولم يُكرَّر/);
  });

  it("الفشل الجزئي يصل المالك بنصّه الصادق (لا يُقرأ تحميلًا ناجحًا)", async () => {
    hook.plan = [200, 503];
    const csv = ["id,text"]
      .concat(
        Array.from(
          { length: Math.ceil((FINN_IMPORT_LIMITS.maxCharsPerDocument * 1.4) / 180) },
          (_v, i) => `${i + 1},${"ن".repeat(160)}${i + 1}`,
        ),
      )
      .join("\n");
    const big = () => new File([csv], "big.csv");
    const client = await arm();
    const pv = await client.postFinnImport({ file: big(), action: "preview" });
    if (!pv.ok || pv.kind !== "preview") throw new Error("preview expected");
    const res = await client.postFinnImport({ file: big(), action: "execute", token: pv.token });
    expect(res).toMatchObject({ ok: false, error: "unavailable" });
    if (res.ok) throw new Error("failure expected");
    expect(res.message_ar).toMatch(/جزء من التحميل/);
  });

  it("حدّ المعدّل ⇒ rate_limited مع مهلة الانتظار؛ ومفتاح الإيقاف ⇒ unavailable بنصّه العربي", async () => {
    const client = await arm();
    sim.rate = { allowed: false };
    const limited = await client.postFinnImport({ file: file(), action: "preview" });
    expect(limited).toMatchObject({ ok: false, error: "rate_limited", retry_after_s: 60 });

    sim.rate = { allowed: true };
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const off = await client.postFinnImport({ file: file(), action: "preview" });
    expect(off).toMatchObject({ ok: false, error: "unavailable" });
    if (off.ok) throw new Error("failure expected");
    expect(off.message_ar).toMatch(/[\u0600-\u06ff]/);
  });

  it("بلا سرّ توقيع: المعاينة نفسها مغلقة (confirmation_unavailable) ولا كتابة", async () => {
    vi.stubEnv("FINN_IMPORT_SIGNING_SECRET", "");
    const client = await arm();
    const pv = await client.postFinnImport({ file: file(), action: "preview" });
    expect(pv).toMatchObject({ ok: false, error: "confirmation_unavailable" });
    expect(db.ops).toEqual([]);
  });
});
