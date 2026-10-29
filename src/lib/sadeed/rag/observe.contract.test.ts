// @vitest-environment node
/**
 * عقد الرصد (O7) — الحدثان `rag.outcome` و`rag.arm_failed` من
 * `observe.server.ts`: شكل الحمولة مغلق (لا نصّ استعلام ولا رسالة خطأ ولا
 * هوية)، وp95 بالرتبة الأقرب و`null` بلا عيّنات، والنافذة 200 عيّنة، والنداء
 * واقعٌ فعلًا من `gatherRagContext` لا بالادّعاء. لكل قاعدة حالة حمراء مزروعة
 * (المادة ٣٠).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ARM_NAMES, type AggregateOutcome } from "@/lib/retrieval/aggregate.server";
import { gatherRagContext } from "../rag.server";
import { resetLexicalArmsStateForTests } from "./lexical-arms.server";
import {
  observeRagOutcome,
  p95,
  RAG_LATENCY_WINDOW,
  reasonCode,
  recordArmSample,
  resetRagObservationForTests,
} from "./observe.server";

vi.mock("@/lib/sadeed/embeddings.server", () => ({
  embedText: async () => null,
  toPgVector: (v: number[]) => `[${v.join(",")}]`,
}));

/** الحمولة الوحيدة المسموحة لحدث فشل/تخطّي ذراع — مفاتيح بعينها، لا حقل حرّ. */
const ARM_FAILED_KEYS = ["arm", "code", "event", "latencyMs", "requestId"] as const;
function armFailedShapeOk(payload: Record<string, unknown>): boolean {
  if (Object.keys(payload).sort().join(",") !== ARM_FAILED_KEYS.join(",")) return false;
  return (
    (payload.event === "rag.arm_failed" || payload.event === "rag.arm_skipped") &&
    typeof payload.arm === "string" &&
    typeof payload.code === "string" &&
    /^[A-Za-z0-9_]{1,32}$/.test(payload.code as string) &&
    typeof payload.latencyMs === "number" &&
    (payload.requestId === null || typeof payload.requestId === "string")
  );
}

const OUTCOME_KEYS = [
  "arms",
  "audience",
  "event",
  "hitCount",
  "latencyMs",
  "requestId",
  "servedArms",
];

function rejectingClient(): SupabaseClient {
  const chain: unknown = new Proxy(() => chain, {
    get(_t, prop) {
      if (prop === "then")
        return (_r: unknown, fail?: (e: unknown) => unknown) =>
          fail?.({
            code: "ECONNREFUSED",
            message: 'connect ECONNREFUSED — select * from "finn_knowledge"',
          });
      return () => chain;
    },
    apply: () => chain,
  });
  return { from: () => chain, rpc: () => chain } as unknown as SupabaseClient;
}

/** الأحداث المهيكلة من نداءات `console.*` المرصودة — الحمولة في الوسيط الثاني. */
function eventsOf(calls: unknown[][], event: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const c of calls) {
    const e = c[1];
    if (e && typeof e === "object" && (e as Record<string, unknown>).event === event)
      out.push(e as Record<string, unknown>);
  }
  return out;
}

const outcomeWith = (arms: AggregateOutcome["arms"]): AggregateOutcome => ({
  arms,
  fused: [],
  servedArms: arms.filter((a) => a.served).map((a) => a.arm),
  latencyMs: 7,
});

beforeEach(() => {
  resetRagObservationForTests();
  resetLexicalArmsStateForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("① p95 بالرتبة الأقرب — null بلا عيّنات لا صفر، ونافذة 200", () => {
  it("p95([]) = null · [1..100] ⇐ 95 · [5,1,3] ⇐ 5 · [10] ⇐ 10", () => {
    expect(p95([])).toBeNull();
    expect(p95(Array.from({ length: 100 }, (_, i) => i + 1))).toBe(95);
    expect(p95([5, 1, 3])).toBe(5);
    expect(p95([10])).toBe(10);
    expect(p95([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])).toBe(19);
  });

  it("مزروع: المتوسّط أو الصفر بدل null كانا رقمًا مختلَقًا بلا عيّنة (المادة ٢٧)", () => {
    const plantedZero = (v: readonly number[]) => (v.length ? p95(v) : 0);
    expect(plantedZero([])).toBe(0);
    expect(p95([])).not.toBe(0);
  });

  it("النافذة 200: 250 عيّنة ⇐ 200 محفوظة والأقدم تُسقط فتتبدّل p95", () => {
    expect(RAG_LATENCY_WINDOW).toBe(200);
    for (let i = 0; i < 250; i++) recordArmSample("w", i < 50 ? 1_000 : 5, 1);
    const log = { info: vi.fn(), warn: vi.fn() };
    const ev = observeRagOutcome(
      outcomeWith([{ arm: "w", served: true, hits: [], reason: null, latencyMs: 5 }]),
      { audience: "anonymous" },
      log,
    );
    expect(ev.arms.w.samples).toBe(RAG_LATENCY_WINDOW);
    // الخمسون الأولى (1,000) سقطت من النافذة: p95 = 5 لا 1,000.
    expect(ev.arms.w.p95LatencyMs).toBe(5);
  });
});

describe("② شكل الحمولة مغلق — رموزٌ وأعداد وأسماء أذرع فقط", () => {
  it("ذراع مخدومة وأخرى فاشلة ⇐ حدث outcome واحد بمفاتيحه، وarm_failed واحد بمفاتيحه بالضبط", () => {
    const log = { info: vi.fn(), warn: vi.fn() };
    const ev = observeRagOutcome(
      outcomeWith([
        { arm: ARM_NAMES.seed, served: true, hits: [], reason: null, latencyMs: 3 },
        { arm: ARM_NAMES.hcisLive, served: false, hits: [], reason: "timeout", latencyMs: 1_500 },
      ]),
      { requestId: "r-1", audience: "anonymous" },
      log,
    );
    expect(log.info).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(Object.keys(ev).sort()).toEqual(OUTCOME_KEYS);
    expect(ev).toMatchObject({
      event: "rag.outcome",
      requestId: "r-1",
      servedArms: [ARM_NAMES.seed],
      hitCount: 0,
      latencyMs: 7,
    });
    expect(ev.arms[ARM_NAMES.seed]).toMatchObject({ served: true, reason: null, samples: 1 });
    expect(ev.arms[ARM_NAMES.hcisLive]).toMatchObject({
      served: false,
      reason: "timeout",
      p95LatencyMs: null,
      samples: 0,
    });
    const failed = log.warn.mock.calls[0][1] as Record<string, unknown>;
    expect(armFailedShapeOk(failed)).toBe(true);
    expect(failed).toEqual({
      event: "rag.arm_failed",
      requestId: "r-1",
      arm: ARM_NAMES.hcisLive,
      code: "timeout",
      latencyMs: 1_500,
    });
  });

  it("مزروع: حقلٌ حرّ في الحمولة (message: رسالة الخطأ) يُدان بفاحص الشكل نفسه", () => {
    const honest = {
      event: "rag.arm_failed",
      requestId: null,
      arm: ARM_NAMES.finnKnowledge,
      code: "42501",
      latencyMs: 2,
    };
    expect(armFailedShapeOk(honest)).toBe(true);
    expect(
      armFailedShapeOk({ ...honest, message: "permission denied for table finn_knowledge" }),
    ).toBe(false);
    expect(armFailedShapeOk({ ...honest, query: "ما متطلبات الأسوار؟" })).toBe(false);
    expect(armFailedShapeOk({ ...honest, code: "permission denied for table" })).toBe(false);
  });

  it("سببٌ بنصّ حرّ من ذراعٍ مستقبلية يُردّ `error` لا يُمرَّر — في الحدث وفي arms", () => {
    expect(reasonCode("permission denied for table finn_knowledge")).toBe("error");
    expect(reasonCode("42P01")).toBe("42P01");
    expect(reasonCode("negative_cache")).toBe("negative_cache");
    expect(reasonCode(null)).toBe("unknown");
    const log = { info: vi.fn(), warn: vi.fn() };
    const ev = observeRagOutcome(
      outcomeWith([
        {
          arm: "future",
          served: false,
          hits: [],
          reason: 'relation "finn_knowledge" does not exist: select …',
          latencyMs: 1,
        },
      ]),
      { audience: "member" },
      log,
    );
    expect(JSON.stringify(log.warn.mock.calls[0][1])).not.toContain("does not exist");
    expect(ev.arms.future.reason).toBe("error");
    expect(JSON.stringify(ev)).not.toContain("does not exist");
  });
});

describe("③ gatherRagContext يرصد فعلًا — لا بالادّعاء", () => {
  it("دور مسجَّل وكل قراءة ترفض ⇐ حدث outcome واحد، وarm_failed لكل ذراع غير مخدومة، بلا نصّ الخطأ ولا الاستعلام", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const q = "ما متطلبات الأسوار الأمنية حول المنشأة؟";
    const ctx = await gatherRagContext(
      rejectingClient(),
      "11111111-1111-4111-8111-111111111111",
      "00000000-0000-0000-0000-000000000001",
      q,
      { audience: "member", requestId: "r-7", env: { SADEED_GEMINI_RAG_READY: "false" } },
    );
    const outcomes = eventsOf(info.mock.calls, "rag.outcome");
    expect(outcomes).toHaveLength(1);
    const ev = outcomes[0]!;
    expect(Object.keys(ev).sort()).toEqual(OUTCOME_KEYS);
    expect(ev.requestId).toBe("r-7");
    expect(ev.servedArms).toEqual(ctx.retrieval.servedArms);
    expect(ev.hitCount).toBe(ctx.retrieval.hitCount);
    expect(typeof ev.latencyMs).toBe("number");
    const failed = eventsOf(warn.mock.calls, "rag.arm_failed");
    const skipped = eventsOf(info.mock.calls, "rag.arm_skipped");
    const unserved = ctx.retrieval.arms.filter((a) => !a.served);
    expect(unserved.length).toBeGreaterThanOrEqual(4);
    // الرافضة (ECONNREFUSED) تُنذر؛ والمتّجهية flag_off تُسجَّل تخطّيًا لا إنذارًا.
    expect(failed.map((f) => f.arm).sort()).toEqual(
      unserved
        .filter((a) => a.reason !== "flag_off")
        .map((a) => a.arm)
        .sort(),
    );
    expect(skipped).toEqual([
      expect.objectContaining({ arm: ARM_NAMES.vector, code: "flag_off", requestId: "r-7" }),
    ]);
    for (const f of [...failed, ...skipped])
      expect(armFailedShapeOk(f), JSON.stringify(f)).toBe(true);
    const all = JSON.stringify([...info.mock.calls, ...warn.mock.calls]);
    expect(all).not.toContain("ECONNREFUSED —");
    expect(all).not.toContain("select *");
    expect(all).not.toContain("الأسوار");
    expect(all).not.toContain("11111111-1111");
  });

  it("المخزن معطّل ⇐ الأذرع القاعدية المُسقَطة (والمتّجهية معها) تُسجَّل db_unavailable في الحدث لا تغيب عنه — تخطّيًا لا إنذارًا", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const ctx = await gatherRagContext(
      rejectingClient(),
      "11111111-1111-4111-8111-111111111111",
      "00000000-0000-0000-0000-000000000001",
      "ما متطلبات الأسوار الأمنية؟",
      { audience: "member", dbUnavailable: true, env: { SADEED_GEMINI_RAG_READY: "false" } },
    );
    const skipped = ctx.retrieval.arms
      .filter((a) => a.reason === "db_unavailable")
      .map((a) => a.arm);
    expect(skipped.sort()).toEqual(
      [
        ARM_NAMES.hcisLive,
        ARM_NAMES.finnKnowledge,
        ARM_NAMES.secKnowledge,
        ARM_NAMES.documentChunks,
        ARM_NAMES.vector,
      ].sort(),
    );
    const logged = eventsOf(info.mock.calls, "rag.arm_skipped").filter(
      (e) => e.code === "db_unavailable",
    );
    expect(logged.map((f) => f.arm).sort()).toEqual(skipped.sort());
    expect(eventsOf(warn.mock.calls, "rag.arm_failed")).toEqual([]);
  });
});

describe("④ التخطّي المتوقَّع لا يُنذر — warn للفشل الفعلي وحده", () => {
  it("flag_off وguest وnegative_cache وbreaker_open وdb_unavailable وempty_query ⇐ info بحدث rag.arm_skipped؛ وtimeout و42P01 وthrew ⇐ warn", () => {
    const log = { info: vi.fn(), warn: vi.fn() };
    const unserved = (reason: string, arm = "a") => ({
      arm,
      served: false,
      hits: [],
      reason,
      latencyMs: 1,
    });
    const ev = observeRagOutcome(
      outcomeWith([
        unserved("flag_off", ARM_NAMES.vector),
        unserved("guest", ARM_NAMES.finnKnowledge),
        unserved("negative_cache", ARM_NAMES.hcisLive),
        unserved("breaker_open", "b"),
        unserved("db_unavailable", "c"),
        unserved("empty_query", "d"),
        unserved("timeout", "t"),
        unserved("42P01", "p"),
        unserved("threw", "x"),
        unserved("embed_unavailable", "e"),
      ]),
      { audience: "member" },
      log,
    );
    const skipped = log.info.mock.calls
      .map((c) => c[1] as Record<string, unknown>)
      .filter((e) => e?.event === "rag.arm_skipped")
      .map((e) => e.code);
    const failed = log.warn.mock.calls
      .map((c) => c[1] as Record<string, unknown>)
      .filter((e) => e?.event === "rag.arm_failed")
      .map((e) => e.code);
    expect(skipped.sort()).toEqual(
      [
        "flag_off",
        "guest",
        "negative_cache",
        "breaker_open",
        "db_unavailable",
        "empty_query",
      ].sort(),
    );
    // راية مرفوعة بلا مفتاح سوء إعدادٍ يستحق الإنذار — ليست تخطّيًا متوقَّعًا.
    expect(failed.sort()).toEqual(["timeout", "42P01", "threw", "embed_unavailable"].sort());
    // الحدث الموجز يحمل السبب للجميع، مخدومًا أو لا.
    expect(ev.arms[ARM_NAMES.vector].reason).toBe("flag_off");
    expect(ev.arms.p.reason).toBe("42P01");
  });

  it("مزروع: الصيغة القديمة (warn لكل ذراع غير مخدومة) كانت تُنذر flag_off في كل دور مسجَّل — إنذارٌ بالبناء لا بعطل", () => {
    const log = { info: vi.fn(), warn: vi.fn() };
    observeRagOutcome(
      outcomeWith([
        { arm: ARM_NAMES.seed, served: true, hits: [], reason: null, latencyMs: 2 },
        { arm: ARM_NAMES.vector, served: false, hits: [], reason: "flag_off", latencyMs: 0 },
      ]),
      { audience: "member" },
      log,
    );
    expect(log.warn).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledTimes(2); // تخطٍّ واحد + الحدث الموجز
  });
});
