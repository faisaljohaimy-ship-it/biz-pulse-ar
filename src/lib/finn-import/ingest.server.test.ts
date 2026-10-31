// @vitest-environment node
/**
 * إدخال أجزاء فِن في مكتبة المعرفة: صفٌّ بهوية المالك، تكرارٌ بالبصمة ضمن المالك والمؤسسة، وخطّافٌ
 * غير متزامن لا يُدّعى جاهزًا. القاعدة وهمية في الذاكرة والشبكة مُحاكاة — لا شيء حقيقي.
 *
 * المادة ٣٠: الأعداد أدناه ذات معنى لأن اختباراتٍ موازية تُثبت أنها تتحرّك (إدراجٌ يعمل، تكرارٌ يُلتقط،
 * فشلٌ يُحصى). والبراهين المقابلة بالتضعيف العمدي لهذا الملف في `import-route.mutation.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  IN_PROGRESS_DEDUPE_WINDOW_MS,
  KNOWLEDGE_MAX_TEXT_CHARS,
  knowledgeRevisionHash,
} from "@/lib/sadeed/knowledge-ingest-core";
import { captureLogs } from "./import-route.test-support";
import { FakeDb } from "./fake-db.test-support";
import {
  FINN_IMPORT_TAG,
  INGEST_HOOK_SETTLE_MS,
  KNOWLEDGE_HOOK_PATH,
  ingestKnowledgeParts,
  prepareIngest,
  type IngestDeps,
} from "./ingest.server";

const clientCalls = vi.hoisted(
  () => [] as Array<{ url: string; key: string; options: Record<string, unknown> }>,
);
vi.mock("@supabase/supabase-js", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createClient: (url: string, key: string, options: Record<string, unknown>) => {
    clientCalls.push({ url, key, options });
    return { __fake: true };
  },
}));

const USER = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const OTHER_USER = "9d8c7b6a-5e4f-4a3b-9c2d-1e0f9a8b7c6d";
const HOOK_SECRET = "h".repeat(40);
const ORIGIN = "https://app.example.test";
const TEXT_A = "## الورقة: البيانات\n\nالاسم: خلية-أ · الحالة: مفتوح";
const TEXT_B = "## الورقة: البيانات (تابع)\n\nالاسم: خلية-ب · الحالة: مغلق";

interface HookCall {
  url: string;
  secret: string | null;
  body: Record<string, unknown>;
}

/** fetch وهمي: يسجّل النداء ويردّ بالحالة المبرمَجة (رقم · `"hang"` يعلّق · `"throw"` ينقطع). */
function makeFetch(plan: Array<number | "hang" | "throw"> | number | "hang" | "throw" = 200) {
  const calls: HookCall[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    const index = calls.length;
    calls.push({
      url: String(url),
      secret: new Headers(init?.headers).get("x-cron-secret"),
      body: JSON.parse(String(init?.body)),
    });
    const step = Array.isArray(plan) ? plan[Math.min(index, plan.length - 1)] : plan;
    if (step === "hang") return new Promise<Response>(() => undefined);
    if (step === "throw") throw new Error("PLANTED-NETWORK-ERROR-QX7");
    return new Response("{}", { status: step });
  }) as unknown as typeof fetch;
  return { calls, impl };
}

function deps(db: FakeDb, fetchImpl: typeof fetch, extra: Partial<IngestDeps> = {}): IngestDeps {
  return {
    supabase: db.client() as SupabaseClient<never> as IngestDeps["supabase"],
    userId: USER,
    origin: ORIGIN,
    hookSecret: HOOK_SECRET,
    fetchImpl,
    settleMs: 25,
    ...extra,
  };
}

const parts = [
  { title: "[FNN] data.xlsx — البيانات", text: TEXT_A },
  { title: "[FNN] data.xlsx — جزء 2/2", text: TEXT_B },
];

beforeEach(() => {
  clientCalls.length = 0;
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ingestKnowledgeParts: الإدراج بهوية المالك", () => {
  it("جزءان ⇒ صفّان pending بالبصمة والوسم، وخطّافان بسرّ الخدمة وجسمٍ من حقلين فقط", async () => {
    const db = new FakeDb();
    const hook = makeFetch(200);
    const result = await ingestKnowledgeParts(parts, deps(db, hook.impl));

    expect(result).toEqual({
      total: 2,
      queued: 2,
      deduped: 0,
      failed: 0,
      parts: ["queued", "queued"],
    });
    expect(db.rows).toHaveLength(2);
    for (const [i, row] of db.rows.entries()) {
      expect(row).toMatchObject({
        user_id: USER,
        title: parts[i].title,
        source: "text",
        mime_type: "text/plain",
        storage_path: null,
        size_bytes: parts[i].text.length,
        page_count: 0,
        status: "pending",
        revision_hash: await knowledgeRevisionHash(parts[i].text),
        tags: [FINN_IMPORT_TAG],
      });
    }
    // الخطّاف: نفس مسار رفع المعرفة، وسرّ الخادم، وحقلان لا ثالث لهما (يرفض الخطّاف الحقول الزائدة).
    expect(hook.calls).toHaveLength(2);
    for (const [i, call] of hook.calls.entries()) {
      expect(call.url).toBe(`${ORIGIN}${KNOWLEDGE_HOOK_PATH}`);
      expect(call.secret).toBe(HOOK_SECRET);
      expect(Object.keys(call.body).sort()).toEqual(["document_id", "text"]);
      expect(call.body.document_id).toBe(db.rows[i].id);
      expect(call.body.text).toBe(parts[i].text);
    }
    expect(KNOWLEDGE_HOOK_PATH).toBe("/api/public/hooks/sadeed-docs-ingest");
  });

  it("لا يلمس غير جدول finn_documents (لا جدول تشغيل ولا تخزين ملف)", async () => {
    const db = new FakeDb();
    await ingestKnowledgeParts(parts, deps(db, makeFetch(200).impl));
    expect(new Set(db.ops.map((o) => o.split(":")[0]))).toEqual(new Set(["finn_documents"]));
    expect(db.rows.every((r) => r.storage_path === null)).toBe(true);
  });

  it("الأجزاء تُدرج بالتسلسل وبترتيبها، والحالات بترتيب الإدخال", async () => {
    const db = new FakeDb();
    const result = await ingestKnowledgeParts(
      [...parts, { title: "ثالث", text: "نص ثالث مختلف" }],
      deps(db, makeFetch(200).impl),
    );
    expect(db.rows.map((r) => r.title)).toEqual([parts[0].title, parts[1].title, "ثالث"]);
    expect(result.parts).toEqual(["queued", "queued", "queued"]);
  });

  it("العنوان يُقتطع عند ٣٠٠، والنصّ الفارغ أو الأطول من السقف يفشل بلا إدراج", async () => {
    const db = new FakeDb();
    const hook = makeFetch(200);
    const result = await ingestKnowledgeParts(
      [
        { title: "ع".repeat(500), text: TEXT_A },
        { title: "فارغ", text: "   " },
        { title: "طويل", text: "x".repeat(KNOWLEDGE_MAX_TEXT_CHARS + 1) },
        { title: "   ", text: TEXT_B },
      ],
      deps(db, hook.impl),
    );
    expect(result.parts).toEqual(["queued", "failed", "failed", "failed"]);
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].title).toHaveLength(300);
    expect(hook.calls).toHaveLength(1);
  });
});

describe("ingestKnowledgeParts: منع التكرار (المالك + المؤسسة + البصمة)", () => {
  it("المحتوى نفسه جاهز عند المالك ⇒ deduped: يُسقَط الصفّ الجديد، ولا خطّاف ولا تضمين مدفوع", async () => {
    const db = new FakeDb();
    const existing = db.seed({
      user_id: USER,
      status: "ready",
      revision_hash: await knowledgeRevisionHash(TEXT_A),
    });
    const hook = makeFetch(200);
    const result = await ingestKnowledgeParts(parts, deps(db, hook.impl));

    expect(result).toMatchObject({ queued: 1, deduped: 1, failed: 0 });
    expect(result.parts).toEqual(["deduped", "queued"]);
    // لم يتكرّر شيء: القائم + الجزء الجديد الوحيد؛ والصفّ المكرَّر أُسقط فعلًا.
    expect(db.rows.map((r) => r.id)).toContain(existing.id);
    expect(db.rows).toHaveLength(2);
    expect(db.rows.filter((r) => r.revision_hash === existing.revision_hash)).toHaveLength(1);
    // الخطّاف للجزء الجديد وحده.
    expect(hook.calls).toHaveLength(1);
    expect(hook.calls[0].body.text).toBe(TEXT_B);
  });

  it("كل الأجزاء مكرَّرة ⇒ صفر صفوف جديدة وصفر خطّاف", async () => {
    const db = new FakeDb();
    for (const p of parts) {
      db.seed({
        user_id: USER,
        status: "ready",
        revision_hash: await knowledgeRevisionHash(p.text),
      });
    }
    const hook = makeFetch(200);
    const result = await ingestKnowledgeParts(parts, deps(db, hook.impl));
    expect(result).toMatchObject({ queued: 0, deduped: 2, failed: 0 });
    expect(db.rows).toHaveLength(2);
    expect(hook.calls).toHaveLength(0);
  });

  it("مستند مالكٍ آخر أو مؤسسةٍ أخرى بالبصمة نفسها لا يُحتسب تكرارًا", async () => {
    const db = new FakeDb();
    const hash = await knowledgeRevisionHash(TEXT_A);
    db.seed({ user_id: OTHER_USER, status: "ready", revision_hash: hash });
    db.seed({
      user_id: USER,
      status: "ready",
      revision_hash: hash,
      org_id: "00000000-0000-4000-8000-0000000000bb",
    });
    const result = await ingestKnowledgeParts([parts[0]], deps(db, makeFetch(200).impl));
    expect(result.parts).toEqual(["queued"]);
    expect(db.rows).toHaveLength(3);
  });

  it("قائم فاشل لا يمنع إعادة المحاولة", async () => {
    const db = new FakeDb();
    db.seed({
      user_id: USER,
      status: "failed",
      revision_hash: await knowledgeRevisionHash(TEXT_A),
    });
    const result = await ingestKnowledgeParts([parts[0]], deps(db, makeFetch(200).impl));
    expect(result.parts).toEqual(["queued"]);
  });

  it("قيد الفهرسة ضمن النافذة ⇒ مكرَّر؛ وعالقٌ أقدم من النافذة ⇒ لا", async () => {
    const hash = await knowledgeRevisionHash(TEXT_A);
    const fresh = new FakeDb();
    fresh.seed({ user_id: USER, status: "processing", revision_hash: hash });
    expect(
      (await ingestKnowledgeParts([parts[0]], deps(fresh, makeFetch(200).impl))).parts,
    ).toEqual(["deduped"]);

    const stale = new FakeDb();
    stale.seed({
      user_id: USER,
      status: "pending",
      revision_hash: hash,
      created_at: new Date(Date.now() - IN_PROGRESS_DEDUPE_WINDOW_MS - 60_000).toISOString(),
    });
    expect(
      (await ingestKnowledgeParts([parts[0]], deps(stale, makeFetch(200).impl))).parts,
    ).toEqual(["queued"]);
  });

  it("رفض RLS للحذف بصمت ⇒ الصفّ الزائد يُترك failed بسببٍ ثابت، والحالة deduped", async () => {
    const db = new FakeDb({ silentDelete: true });
    db.seed({
      user_id: USER,
      status: "ready",
      revision_hash: await knowledgeRevisionHash(TEXT_A),
    });
    const hook = makeFetch(200);
    const result = await ingestKnowledgeParts([parts[0]], deps(db, hook.impl));
    expect(result.parts).toEqual(["deduped"]);
    const left = db.rows.find((r) => r.status === "failed");
    expect(left?.error).toMatch(/duplicate_not_dropped/);
    expect(hook.calls).toHaveLength(0);
  });
});

describe("فحص التكرار يُرسل مرشِّحاته كلّها (ولا يعتمد على تعويض الدالة النقيّة)", () => {
  it("المالك والمؤسسة والبصمة والحالات الحيّة وحدها، ويستثني الصفّ الجديد نفسه — و«failed» ليست منها", async () => {
    const db = new FakeDb();
    const result = await ingestKnowledgeParts([parts[0]], deps(db, makeFetch(200).impl));
    expect(result.parts).toEqual(["queued"]);
    const inserted = db.rows[0];
    const lookups = db.queries.filter((q) => q.op === "select");
    expect(lookups).toHaveLength(1);
    const filters = Object.fromEntries(
      lookups[0].filters.map(([kind, col, value]) => [`${kind}:${col}`, value]),
    );
    expect(filters["eq:user_id"]).toBe(USER);
    expect(filters["eq:org_id"]).toBe(db.orgId);
    expect(filters["eq:revision_hash"]).toBe(await knowledgeRevisionHash(TEXT_A));
    expect(filters["neq:id"]).toBe(inserted.id);
    expect(filters["in:status"]).toEqual(["ready", "processing", "pending"]);
    expect(lookups[0].filters).toHaveLength(5);
  });

  it("قائمٌ فاشل لدى المالك نفسه + مستندُ مالكٍ آخر بالبصمة نفسها ⇒ لا تكرار والجزء يُدرج", async () => {
    const db = new FakeDb();
    const hash = await knowledgeRevisionHash(TEXT_A);
    db.seed({ user_id: USER, status: "failed", revision_hash: hash });
    db.seed({ user_id: OTHER_USER, status: "ready", revision_hash: hash });
    db.seed({ user_id: OTHER_USER, status: "failed", revision_hash: hash });
    const hook = makeFetch(200);
    const result = await ingestKnowledgeParts([parts[0]], deps(db, hook.impl));
    expect(result).toMatchObject({ queued: 1, deduped: 0, failed: 0 });
    expect(hook.calls).toHaveLength(1);
    // القائم الثلاثة لم يُمسّوا والجديد أُضيف.
    expect(db.rows).toHaveLength(4);
  });
});

describe("FakeDb نفسها: المرشِّحات تُرشِّح فعلًا (وإلا مرّت اختبارات الإدخال على مرشِّحٍ لا يعمل)", () => {
  type Q = {
    eq: (column: string, value: unknown) => Q;
    neq: (column: string, value: unknown) => Q;
    in: (column: string, values: unknown[]) => Q;
  };
  async function idsOf(db: FakeDb, build: (q: Q) => Q): Promise<string[]> {
    const client = db.client() as unknown as {
      from: (table: string) => { select: (columns: string) => Q };
    };
    const query = build(client.from("finn_documents").select("id, status"));
    const { data } = await (query as unknown as PromiseLike<{ data: Array<{ id: string }> }>);
    return data.map((r) => r.id);
  }

  it("eq وneq وin كلٌّ بدلالته، ومجتمعةً بمنطق «و»", async () => {
    const db = new FakeDb();
    const a = db.seed({ user_id: USER, status: "ready", revision_hash: "h" });
    const b = db.seed({ user_id: USER, status: "failed", revision_hash: "h" });
    const c = db.seed({ user_id: OTHER_USER, status: "pending", revision_hash: "h" });
    expect(await idsOf(db, (q) => q.eq("user_id", USER))).toEqual([a.id, b.id]);
    expect(await idsOf(db, (q) => q.neq("id", a.id))).toEqual([b.id, c.id]);
    expect(await idsOf(db, (q) => q.in("status", ["ready", "pending"]))).toEqual([a.id, c.id]);
    expect(
      await idsOf(db, (q) =>
        q.eq("user_id", USER).neq("id", a.id).in("status", ["ready", "failed"]),
      ),
    ).toEqual([b.id]);
    expect(await idsOf(db, (q) => q.in("status", []))).toEqual([]);
  });
});

describe("ingestKnowledgeParts: الفشل الجزئي يُحصى ولا يُخفى", () => {
  it("فشل إدراج الجزء الأول لا يوقف الثاني: queued 1 · failed 1", async () => {
    const db = new FakeDb({ failInsert: 0 });
    const hook = makeFetch(200);
    const result = await ingestKnowledgeParts(parts, deps(db, hook.impl));
    expect(result).toMatchObject({ total: 2, queued: 1, failed: 1, deduped: 0 });
    expect(result.parts).toEqual(["failed", "queued"]);
    expect(hook.calls).toHaveLength(1);
    expect(hook.calls[0].body.text).toBe(TEXT_B);
  });

  it("فشل كل الإدراجات ⇒ queued 0 · failed 2 وصفر خطّاف", async () => {
    const db = new FakeDb({ failInsert: true });
    const hook = makeFetch(200);
    const result = await ingestKnowledgeParts(parts, deps(db, hook.impl));
    expect(result).toMatchObject({ queued: 0, failed: 2 });
    expect(hook.calls).toHaveLength(0);
  });

  it("استثناءٌ في الإدراج لا يتسرّب: الجزء failed والباقي يمضي", async () => {
    const db = new FakeDb({ throwOnInsert: true });
    const result = await ingestKnowledgeParts([parts[0]], deps(db, makeFetch(200).impl));
    expect(result.parts).toEqual(["failed"]);
  });

  it("فشل فحص التكرار ⇒ الصفّ يُوسم failed بسببٍ ثابت ولا خطّاف", async () => {
    const db = new FakeDb({ failSelect: true });
    const hook = makeFetch(200);
    const result = await ingestKnowledgeParts([parts[0]], deps(db, hook.impl));
    expect(result.parts).toEqual(["failed"]);
    expect(db.rows[0].status).toBe("failed");
    expect(db.rows[0].error).toMatch(/duplicate_check_failed/);
    expect(hook.calls).toHaveLength(0);
  });

  it("خطّاف يردّ 401 فورًا ⇒ failed والصفّ الـpending يُوسم failed بالسبب الثابت", async () => {
    const db = new FakeDb();
    const result = await ingestKnowledgeParts([parts[0]], deps(db, makeFetch(401).impl));
    expect(result).toMatchObject({ queued: 0, failed: 1 });
    expect(db.rows[0]).toMatchObject({ status: "failed" });
    expect(db.rows[0].error).toMatch(/index_start_failed/);
  });

  it("انقطاع الشبكة ⇒ failed (لا استثناء)", async () => {
    const db = new FakeDb();
    const result = await ingestKnowledgeParts([parts[0]], deps(db, makeFetch("throw").impl));
    expect(result.parts).toEqual(["failed"]);
    expect(db.rows[0].status).toBe("failed");
  });

  it("خطّاف ردّ بفشل بعد أن كتب حالته processing ⇒ لا يُكتب فوقها، والجزء failed", async () => {
    const db = new FakeDb();
    const impl = (async () => {
      db.rows[0].status = "processing"; // الخطّاف بلغ الصفّ وبدأ العمل
      return new Response("{}", { status: 502 });
    }) as unknown as typeof fetch;
    const result = await ingestKnowledgeParts([parts[0]], deps(db, impl));
    expect(result.parts).toEqual(["failed"]);
    expect(db.rows[0].status).toBe("processing");
  });

  it("جزء ناجح وجزء بخطّاف فاشل: failed 1 · queued 1 (يُحصى الاثنان)", async () => {
    const db = new FakeDb();
    const result = await ingestKnowledgeParts(parts, deps(db, makeFetch([200, 503]).impl));
    expect(result).toMatchObject({ queued: 1, failed: 1 });
    expect(result.parts).toEqual(["queued", "failed"]);
    expect(db.rows.map((r) => r.status)).toEqual(["pending", "failed"]);
  });
});

describe("ingestKnowledgeParts: الفهرسة غير متزامنة ولا تُدّعى جاهزة", () => {
  it("خطّاف لم يردّ بعد انقضاء المهلة ⇒ queued والصفّ يبقى pending (الخطّاف يملكه)", async () => {
    const db = new FakeDb();
    const started = Date.now();
    const result = await ingestKnowledgeParts([parts[0]], deps(db, makeFetch("hang").impl));
    expect(result.parts).toEqual(["queued"]);
    expect(db.rows[0].status).toBe("pending");
    // لم ينتظر الفهرسة كاملة: عاد قرب المهلة لا قرب ما لا نهاية.
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("الخطّافات معًا لا بالتتابع: جزآن معلّقان ينتظران مهلةً واحدة لا اثنتين", async () => {
    const db = new FakeDb();
    const started = Date.now();
    await ingestKnowledgeParts(parts, deps(db, makeFetch("hang").impl, { settleMs: 300 }));
    expect(Date.now() - started).toBeLessThan(550);
  });

  it("المهلة الافتراضية قصيرة بما يكفي لطلبٍ واحد وطويلة بما يكفي لالتقاط الفشل الفوري", () => {
    expect(INGEST_HOOK_SETTLE_MS).toBeGreaterThanOrEqual(2_000);
    expect(INGEST_HOOK_SETTLE_MS).toBeLessThanOrEqual(15_000);
  });

  it("النتيجة لا تحمل حالة «ready» في أي موضع", async () => {
    const db = new FakeDb();
    const result = await ingestKnowledgeParts(parts, deps(db, makeFetch(200).impl));
    expect(JSON.stringify(result)).not.toMatch(/ready/i);
  });
});

describe("الخصوصية: لا نصّ خطأ ولا نصّ ملف يصل عمودًا أو سجلًّا", () => {
  it("رسالة القاعدة المزروعة لا تظهر في أي صفّ ولا نتيجة ولا كونسول، عبر كل مسارات الفشل", async () => {
    const scenarios: Array<[string, FakeDb, typeof fetch]> = [
      ["إدراج", new FakeDb({ failInsert: true }), makeFetch(200).impl],
      ["استثناء إدراج", new FakeDb({ throwOnInsert: true }), makeFetch(200).impl],
      ["فحص تكرار", new FakeDb({ failSelect: true }), makeFetch(200).impl],
      ["شبكة", new FakeDb(), makeFetch("throw").impl],
      ["خطّاف 500", new FakeDb(), makeFetch(500).impl],
    ];
    for (const [name, db, impl] of scenarios) {
      const { result, output } = await captureLogs(() =>
        ingestKnowledgeParts([parts[0]], deps(db, impl)),
      );
      const dump = JSON.stringify([result, db.rows]) + output;
      expect(dump, name).not.toContain("PLANTED-DB-ERROR-QX7");
      expect(dump, name).not.toContain("PLANTED-NETWORK-ERROR-QX7");
      expect(output, name).toBe("");
    }
    // الأسباب المكتوبة: عربية ثابتة تنتهي برمزٍ بين قوسين (تقبلها knowledgeErrorForDisplay).
    const db = new FakeDb();
    await ingestKnowledgeParts([parts[0]], deps(db, makeFetch(401).impl));
    expect(db.rows[0].error).toMatch(/^[؀-ۿ\s.،()؟a-z_]+$/);
    expect(String(db.rows[0].error)).not.toContain(parts[0].text);
    expect(String(db.rows[0].error)).not.toContain(parts[0].title);
  });

  it("لا يسجّل شيئًا في المسار السليم أيضًا", async () => {
    const db = new FakeDb();
    const { output } = await captureLogs(() =>
      ingestKnowledgeParts(parts, deps(db, makeFetch(200).impl)),
    );
    expect(output).toBe("");
  });
});

describe("prepareIngest: التهيئة قبل أي كتابة", () => {
  const baseEnv = {
    CRON_HOOK_SECRET: HOOK_SECRET,
    SUPABASE_URL: "https://proj.supabase.test",
    SUPABASE_PUBLISHABLE_KEY: "anon-key-planted",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-planted-NEVER",
    PUBLIC_SITE_URL: "https://site.example.test/ignored/path",
  };
  const request = (auth: string | null = "Bearer owner-token-123") =>
    new Request("https://edge.example.test/api/finn/import", {
      method: "POST",
      headers: auth ? { authorization: auth } : {},
    });

  it("سليمة ⇒ عميلٌ بالمفتاح العامّ ورمز المالك، لا مفتاح خدمة أبدًا، وأصلٌ من البيئة", () => {
    const runtime = prepareIngest(request(), baseEnv);
    expect(runtime.ok).toBe(true);
    if (!runtime.ok) return;
    expect(runtime.hookSecret).toBe(HOOK_SECRET);
    expect(runtime.origin).toBe("https://site.example.test");
    expect(clientCalls).toHaveLength(1);
    const [call] = clientCalls;
    expect(call.url).toBe("https://proj.supabase.test");
    expect(call.key).toBe("anon-key-planted");
    expect(JSON.stringify(call)).not.toContain("service-role-planted-NEVER");
    expect(call.options).toMatchObject({
      global: { headers: { Authorization: "Bearer owner-token-123" } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it("الأسماء البديلة لمفتاح Supabase تُقبل (ANON ثم PUBLISHABLE ثم VITE_)", () => {
    const { SUPABASE_PUBLISHABLE_KEY: _drop, ...rest } = baseEnv;
    expect(prepareIngest(request(), { ...rest, SUPABASE_ANON_KEY: "a" }).ok).toBe(true);
    expect(prepareIngest(request(), { ...rest, VITE_SUPABASE_PUBLISHABLE_KEY: "b" }).ok).toBe(true);
  });

  it.each([
    ["سرّ الخطّاف غائب", { CRON_HOOK_SECRET: undefined }],
    ["سرّ الخطّاف أقصر من ١٦", { CRON_HOOK_SECRET: "short" }],
    ["عنوان Supabase غائب", { SUPABASE_URL: "", VITE_SUPABASE_URL: "" }],
    [
      "المفتاح العامّ غائب",
      {
        SUPABASE_PUBLISHABLE_KEY: "",
        SUPABASE_ANON_KEY: "",
        VITE_SUPABASE_ANON_KEY: "",
        VITE_SUPABASE_PUBLISHABLE_KEY: "",
      },
    ],
  ])("%s ⇒ ok:false (المسار يردّ unavailable قبل استهلاك الرمز)", (_name, patch) => {
    // مصدر `import.meta.env` يُثبَّت فارغًا ليُقاس الفرع نفسه لا ما يحقنه البناء.
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    expect(prepareIngest(request(), { ...baseEnv, ...patch }).ok).toBe(false);
    expect(clientCalls).toHaveLength(0);
  });

  it("بلا رمزٍ حامل ⇒ ok:false ولا عميل يُبنى", () => {
    expect(prepareIngest(request(null), baseEnv).ok).toBe(false);
    expect(prepareIngest(request("Basic abc"), baseEnv).ok).toBe(false);
    expect(clientCalls).toHaveLength(0);
  });
});
