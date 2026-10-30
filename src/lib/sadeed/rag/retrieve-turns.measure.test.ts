// @vitest-environment node
/**
 * قياس O3 على مستوى الوحدة: كم صفًّا تكتب البوابة المحكومة في `rag_query_log`
 * لكل N دورًا، وكم مرّةً تعود `embed_unavailable`، وكم خطأ إدراج يُسجَّل؟
 *
 * الملف نفسه يُشغَّل على الشجرة الحالية وعلى ما قبل O3 (`6940f97a5`) ليعطي
 * رقمَي «قبل/بعد» من الكود لا من التقدير؛ لذلك هو **قائمٌ بذاته** (عميله
 * الوهمي مضمَّن، لا يستورد مساعدًا غير موجود قبل O3) ويستورد الوحدتين
 * `retrieve.server` و`rag.server`/`embed.server` المحاكاتين بالمسار نفسه.
 * التشغيل على الشجرة القديمة: `RAG_TURNS_MEASURE_ONLY=1` (لا تأكيدات «بعد»).
 *
 * ما يقيسه (حتمي، بلا شبكة ولا مزوّد ولا ساعة):
 * - عميل JWT: سياسة إدراج `rag_query_log` في الإنتاج (`user_id = auth.uid()` و
 *   `org_id` غير فارغ — قِيست ٢٠٢٦/١٠/٣٠). صفٌّ بلا `user_id` يُرفض.
 * - عميل الخدمة: يتجاوز السياسة.
 * - التضمين: يرمي (لا مفتاح) ⇒ المسار الذي كان يعيد `embed_unavailable` فارغًا.
 * - الراية المطفأة: كانت خروجًا مبكّرًا بلا قراءة، وصارت قراءة معجمية.
 * - `max_similarity` المخزَّن: عدّ الصفوف بصفر وبـNULL (المادة ٢٧).
 * - قاعدة لا تردّ (إدراج السجلّ أو قراءة المقالات معلّقة): بعد كم مللي ثانية
 *   **افتراضية** (ساعة مزيّفة بخطوة 100، والقيمة نهاية الخطوة) تعود المكالمة؟ `null` = لم تعد خلال 5000.
 *
 * **ما لا يقيسه:** الإنتاج (جدول `rag_query_log` فيه 0 صفّ ولم يُشغَّل أي دور
 * عليه هنا) — «لم يُقَس». الأرقام عدّ أحداثٍ في عميل وهمي، لا أداء ولا جودة.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const TURNS = 20;
const ORG = "a0000000-0000-4000-8000-000000000001";
const USER = "11111111-1111-4111-8111-111111111111";
const MEASURE_ONLY = process.env.RAG_TURNS_MEASURE_ONLY === "1";

const state = vi.hoisted(() => ({ ready: true }));
vi.mock("../rag.server", () => ({ isGeminiRagReady: () => state.ready }));
vi.mock("./embed.server", () => ({
  RAG_MODEL_VERSION: "measure-1536-v1",
  toPgVector: (v: number[]) => `[${v.join(",")}]`,
  embedOne: async () => {
    throw new Error("no embedding key");
  },
}));

type Row = Record<string, unknown>;

const QUESTIONS = [
  "ما اشتراطات الأسوار الأمنية؟",
  "كيف يتم تفتيش المركبات عند البوابات؟",
  "ما متطلبات كاميرات المراقبة؟",
  "من يصدر تصاريح الدخول للمقاولين؟",
  "ما خطوات الإخلاء في الطوارئ؟",
];

const ARTICLES: Row[] = [
  ["سياسة الأسوار الأمنية", "اشتراطات الأسوار الأمنية ومواصفات الارتفاع حول المنشآت"],
  ["إجراءات تفتيش المركبات", "خطوات تفتيش المركبات عند البوابات الرئيسية"],
  ["معايير كاميرات المراقبة", "متطلبات تركيب كاميرات المراقبة وتغطية المحيط"],
  ["تصاريح دخول المقاولين", "الجهة التي تصدر تصاريح الدخول للمقاولين والزوار"],
  ["خطة الإخلاء في الطوارئ", "خطوات الإخلاء عند الطوارئ ونقاط التجمع"],
].map(([title, summary], i) => ({
  id: `aaaaaaaa-0000-4000-8000-${String(i).padStart(12, "0")}`,
  doc_code: `KB-${i + 1}`,
  title_ar: title,
  title_en: null,
  summary_ar: summary,
  summary_en: null,
  purpose_ar: null,
  keywords_ar: [],
  risk_level: null,
  priority: null,
  org_id: ORG,
  status: "published",
  sec_knowledge_categories: null,
}));

type Hang = "none" | "insert" | "read";

function makeClient(mode: "jwt" | "service", hang: Hang = "none") {
  const tally = {
    attempted: 0,
    persisted: 0,
    rejected: 0,
    rpc: 0,
    zeroSimilarityRows: 0,
    nullSimilarityRows: 0,
  };
  const client = {
    rpc() {
      tally.rpc += 1;
      return { then: (res: (v: unknown) => unknown) => res({ data: [], error: null }) };
    },
    from(table: string) {
      const eqs: Array<[string, unknown]> = [];
      const ors: string[] = [];
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq(c: string, v: unknown) {
          eqs.push([c, v]);
          return chain;
        },
        or(f: string) {
          ors.push(f);
          return chain;
        },
        limit: () => chain,
        insert(row: Row) {
          tally.attempted += 1;
          if (hang === "insert") return new Promise(() => {});
          const rls = mode === "jwt" && row.user_id !== USER;
          if (!row.org_id || rls) {
            tally.rejected += 1;
            return Promise.resolve({
              error: { code: rls ? "42501" : "23502", message: "rejected" },
            });
          }
          tally.persisted += 1;
          if (row.max_similarity === 0) tally.zeroSimilarityRows += 1;
          if (row.max_similarity === null) tally.nullSimilarityRows += 1;
          return Promise.resolve({ error: null });
        },
        then(res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) {
          if (hang === "read") return new Promise(() => {}).then(res, rej);
          const rows = table === "sec_knowledge_articles" ? ARTICLES : [];
          const out = rows.filter(
            (r) =>
              eqs.every(([c, v]) => r[c] === v) &&
              ors.every((f) =>
                f.split(",").some((cl) => {
                  const m = /^([a-z_]+)\.ilike\.\*(.+)\*$/.exec(cl);
                  const val = m ? r[m[1]] : null;
                  return typeof val === "string" && val.includes(m![2]);
                }),
              ),
          );
          return Promise.resolve({ data: out, error: null }).then(res, rej);
        },
      };
      return chain;
    },
  };
  return { client: client as unknown as SupabaseClient, tally };
}

let warns: unknown[][] = [];
let infos: unknown[][] = [];

beforeEach(() => {
  state.ready = true;
  warns = [];
  infos = [];
  vi.spyOn(console, "warn").mockImplementation((...a) => void warns.push(a));
  vi.spyOn(console, "info").mockImplementation((...a) => void infos.push(a));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const eventCount = (all: unknown[][], name: string) =>
  all.filter((a) => (a[1] as { event?: string } | undefined)?.event === name).length;

interface Scenario {
  name: string;
  mode: "jwt" | "service";
  orgId: string | null;
  flagReady: boolean;
}

async function runScenario(s: Scenario) {
  state.ready = s.flagReady;
  warns = [];
  infos = [];
  const { retrieveWithEvidenceGate } = await import("./retrieve.server");
  const db = makeClient(s.mode);
  let embedUnavailable = 0;
  let withHits = 0;
  for (let i = 0; i < TURNS; i++) {
    const out = await retrieveWithEvidenceGate(db.client, {
      query: QUESTIONS[i % QUESTIONS.length],
      orgId: s.orgId,
      // قبل O3 يُتجاهل الحقل؛ بعده يحمله الصفّ.
      ...(s.mode === "jwt" ? { userId: USER } : {}),
      route: "measure:turns",
    } as never);
    if (out.reason === "embed_unavailable") embedUnavailable += 1;
    if (out.hits.length > 0) withHits += 1;
  }
  return {
    scenario: s.name,
    turns: TURNS,
    embed_unavailable_results: embedUnavailable,
    results_with_hits: withHits,
    log_inserts_attempted: db.tally.attempted,
    log_rows_persisted: db.tally.persisted,
    log_rows_rejected_by_policy: db.tally.rejected,
    log_errors_recorded:
      eventCount(warns, "rag.query_log_failed") +
      warns.filter((a) => String(a[0]).includes("log insert failed")).length,
    log_skips_recorded: eventCount(infos, "rag.query_log_skipped"),
    hybrid_rpc_calls: db.tally.rpc,
    log_rows_with_zero_similarity: db.tally.zeroSimilarityRows,
    log_rows_with_null_similarity: db.tally.nullSimilarityRows,
  };
}

/** مكالمة واحدة على قاعدة معلّقة: بعد كم مللي ثانية افتراضية تعود؟ `null` = لم تعد خلال 5000. */
async function runHungScenario(name: string, flagReady: boolean, hang: Hang, userId: boolean) {
  state.ready = flagReady;
  vi.useFakeTimers();
  try {
    const { retrieveWithEvidenceGate } = await import("./retrieve.server");
    const db = makeClient("jwt", hang);
    const settled: { at: number | null } = { at: null };
    let now = 0;
    const pending = retrieveWithEvidenceGate(db.client, {
      query: QUESTIONS[0],
      orgId: ORG,
      ...(userId ? { userId: USER } : {}),
      route: "measure:hung",
    } as never).then(() => {
      settled.at = now;
    });
    await vi.advanceTimersByTimeAsync(0); // تفريغ المهام الدقيقة: العودة الفورية = 0
    while (now < 5000 && settled.at === null) {
      now += 100;
      await vi.advanceTimersByTimeAsync(100);
    }
    if (settled.at !== null) await pending;
    return { scenario: name, hung: hang, settled_after_virtual_ms: settled.at };
  } finally {
    vi.useRealTimers();
  }
}

describe("O3 — قياس الأدوار (حتمي، عميل وهمي)", () => {
  it(`${TURNS} دورًا في كل سيناريو: صفوف السجلّ ونتائج embed_unavailable والأخطاء المسجَّلة`, async () => {
    const results = [
      await runScenario({ name: "jwt_embedder_down", mode: "jwt", orgId: ORG, flagReady: true }),
      await runScenario({
        name: "service_embedder_down",
        mode: "service",
        orgId: ORG,
        flagReady: true,
      }),
      await runScenario({ name: "jwt_flag_off", mode: "jwt", orgId: ORG, flagReady: false }),
      await runScenario({ name: "jwt_missing_org", mode: "jwt", orgId: null, flagReady: true }),
    ];
    const hung = [
      await runHungScenario("flag_off_insert_hangs", false, "insert", true),
      await runHungScenario("embedder_down_read_hangs", true, "read", true),
    ];
    // السطر الذي يقرؤه من يقيس: JSON واحد على stdout.
    console.log(`RAG_TURNS_MEASURE ${JSON.stringify(results)}`);
    console.log(`RAG_HUNG_MEASURE ${JSON.stringify(hung)}`);

    for (const r of results) expect(r.turns).toBe(TURNS);
    if (MEASURE_ONLY) return;

    const by = Object.fromEntries(results.map((r) => [r.scenario, r]));
    // بعد O3: كل دور لعميل JWT يُسجَّل فعلًا، ولا embed_unavailable، ولا RPC بمتّجه فارغ.
    expect(by.jwt_embedder_down).toMatchObject({
      embed_unavailable_results: 0,
      results_with_hits: TURNS,
      log_inserts_attempted: TURNS,
      log_rows_persisted: TURNS,
      log_rows_rejected_by_policy: 0,
      log_errors_recorded: 0,
      hybrid_rpc_calls: 0,
    });
    expect(by.service_embedder_down).toMatchObject({
      log_rows_persisted: TURNS,
      embed_unavailable_results: 0,
    });
    // الراية المطفأة لم تعد خروجًا مبكّرًا: قراءة معجمية بنتائج، وصفّ سجلّ لكل دور.
    expect(by.jwt_flag_off).toMatchObject({
      embed_unavailable_results: 0,
      results_with_hits: TURNS,
      log_rows_persisted: TURNS,
      hybrid_rpc_calls: 0,
    });
    // والتشابه الذي لم يُقَس يُخزَّن NULL لا صفرًا في كل صفّ.
    for (const name of ["jwt_embedder_down", "service_embedder_down", "jwt_flag_off"])
      expect(by[name]).toMatchObject({
        log_rows_with_zero_similarity: 0,
        log_rows_with_null_similarity: TURNS,
      });
    // وقاعدة لا تردّ لا تعلّق المكالمة: تعود خلال ثانيتين افتراضيتين.
    for (const h of hung) {
      expect(h.settled_after_virtual_ms).not.toBeNull();
      expect(h.settled_after_virtual_ms as number).toBeLessThanOrEqual(2000);
    }
    // وبلا مؤسسة: لا صفّ ممكن (org_id غير قابل للفراغ) لكن كل دور يترك أثرًا في السجلّ.
    expect(by.jwt_missing_org).toMatchObject({
      log_inserts_attempted: 0,
      log_skips_recorded: TURNS,
    });
  });
});
