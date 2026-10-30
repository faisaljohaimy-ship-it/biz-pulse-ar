// @vitest-environment node
/**
 * نصّ وكيل المعرفة (O7 د): `تطابق ${score}%` و`أعلى تطابق ${max_similarity}%` كانا يضربان
 * الحقل في مئة بلا حارس: `null` ⇒ «0%»، و`undefined`/`NaN` ⇒ «NaN%». يُشغَّل الوكيل نفسه
 * فوق استرجاعٍ مزروع، وتُفحص أسطر الدليل والنصّ الذي يصل المجلس.
 *
 * **والمصدر `dense_score` لا `similarity`** (مراجعة O7): `RagHit.similarity` رقم البوّابة،
 * ولضربةٍ هجينة بلا كوساين (`dense_score = 0`) يساوي `min(1, rrf_score * 30)` — ترتيبٌ مدموج
 * لا تشابه. فالضربة الهجينة النصّية/الثلاثية فقط تُطبع «تطابق لم يُقَس» ولا تدخل «أعلى تطابق»،
 * والاختبار الأخير يشغّل `retrieveWithEvidenceGate` الحقيقي فوق صفوف RPC بـ`dense_score: 0`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

type Hit = {
  id: string;
  doc_code: string | null;
  title_ar: string | null;
  title_en: string | null;
  summary_ar: string | null;
  summary_en: string | null;
  arm: "hybrid" | "lexical";
  dense_score: unknown;
  rrf_score: unknown;
  /** رقم البوّابة كما يبنيه `retrieve.server`: الكوساين إن وُجد وإلا RRF مضروبًا في 30. */
  similarity: unknown;
};

const ORG = "00000000-0000-0000-0000-000000000001";

const sim = vi.hoisted(() => ({
  outcome: null as null | { gate_result: string; hits: unknown[]; max_similarity: unknown },
  /** `true` ⇒ `retrieveWithEvidenceGate` الحقيقي فوق `rpcRows` (الاختبار الأخير). */
  real: false,
  rpcRows: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/sadeed/rag/retrieve.server", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/sadeed/rag/retrieve.server")>();
  return {
    ...real,
    retrieveWithEvidenceGate: (...args: Parameters<typeof real.retrieveWithEvidenceGate>) =>
      sim.real ? real.retrieveWithEvidenceGate(...args) : Promise.resolve(sim.outcome),
  };
});
vi.mock("@/lib/sadeed/rag.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isGeminiRagReady: () => true,
}));
vi.mock("@/lib/sadeed/rag/embed.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  embedOne: async () => ({ vector: [0.1, 0.2, 0.3], model_version: "x" }),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async () => ({ data: sim.rpcRows, error: null }),
    from: () => ({ insert: async () => ({ error: null }) }),
  },
}));

/** رقم البوّابة كما في `compositeSimilarity`: الكوساين إن كان > 0 وإلا RRF × 30 (سقفه 1). */
const gateNumber = (dense: number, rrf: number) => (dense > 0 ? dense : Math.min(1, rrf * 30));

/** ضربة هجينة: `similarity` فيها رقم البوّابة المشتقّ من الكوساين أو من RRF. */
const hit = (n: number, dense: unknown, arm: Hit["arm"] = "hybrid", rrf = 0.03): Hit => ({
  id: `kb-${n}`,
  doc_code: `SEC-0${n}`,
  title_ar: `توجيه ${n}`,
  title_en: null,
  summary_ar: `ملخّص ${n}`,
  summary_en: null,
  arm,
  dense_score: dense,
  rrf_score: rrf,
  similarity: gateNumber(typeof dense === "number" && Number.isFinite(dense) ? dense : 0, rrf),
});

async function runAgent(hits: Hit[], max: unknown, gate = "passed", orgId: string | null = null) {
  sim.outcome = { gate_result: gate, hits, max_similarity: max };
  await import("./agents");
  const { getAgent } = await import("./registry");
  const agent = getAgent("knowledge")!;
  return agent.run({
    mission_id: "m-1",
    request: { question: "ما اشتراطات الأسوار؟", orgId } as never,
    memory: null,
    prior_results: [],
    signal: new AbortController().signal,
  });
}

const contribution = (r: Awaited<ReturnType<typeof runAgent>>) =>
  r.contribution as { text_ar: string; evidence: string[]; sources: string[] };
const BAD = /(^|[^\d.])0%|NaN|null|undefined|Infinity/;

beforeEach(() => {
  sim.outcome = null;
  sim.real = false;
  sim.rpcRows = [];
});

describe("وكيل المعرفة: النسبة لكوساين محسوب وحده", () => {
  it("تشابهٌ محسوب ⇒ «تطابق 82%» في الدليل و«(أعلى تطابق 91%)» في النصّ — كما كان", async () => {
    const r = await runAgent([hit(1, 0.82), hit(2, 0.91)], 0.91);
    const c = contribution(r);
    expect(r.status).toBe("completed");
    expect(c.evidence[0]).toContain("[مرجع SEC-01 · تطابق 82%]");
    expect(c.evidence[1]).toContain("[مرجع SEC-02 · تطابق 91%]");
    expect(c.text_ar).toBe("استرجع وكيل المعرفة 2 مقاطع مرجعية (أعلى تطابق 91%).");
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["NaN", Number.NaN],
    ["0", 0],
  ])(
    "dense_score=%s (ورقم البوّابة RRF) ⇒ «تطابق لم يُقَس» ولا «أعلى تطابق» ولا 0%/NaN%",
    async (_l, v) => {
      const r = await runAgent([hit(1, v)], v);
      const c = contribution(r);
      expect(r.status).toBe("completed");
      expect(c.evidence[0]).toContain("[مرجع SEC-01 · تطابق لم يُقَس]");
      expect(c.text_ar).toBe("استرجع وكيل المعرفة 1 مقاطع مرجعية.");
      expect(c.evidence.join("\n")).not.toMatch(BAD);
      expect(c.text_ar).not.toMatch(BAD);
    },
  );

  it("ذراع معجمية ⇒ «مطابقة نصّية» ولو حملت رقمًا، والنصّ بلا «أعلى تطابق» حين max فارغ", async () => {
    const r = await runAgent([hit(1, 0.9, "lexical"), hit(2, null, "lexical")], null);
    const c = contribution(r);
    expect(c.evidence[0]).toContain("[مرجع SEC-01 · مطابقة نصّية]");
    expect(c.evidence[1]).toContain("[مرجع SEC-02 · مطابقة نصّية]");
    expect(c.evidence.join("\n")).not.toContain("%");
    expect(c.text_ar).not.toContain("%");
  });

  it("مختلط: المحسوب ينسب والفارغ يُوسم في الاستجابة نفسها", async () => {
    const r = await runAgent([hit(1, 0.7), hit(2, null)], 0.7);
    const c = contribution(r);
    expect(c.evidence[0]).toContain("تطابق 70%");
    expect(c.evidence[1]).toContain("تطابق لم يُقَس");
    expect(c.text_ar).toContain("(أعلى تطابق 70%)");
  });

  it("ضربة هجينة بلا كوساين (dense_score=0، رقم البوّابة من RRF) ⇒ «تطابق لم يُقَس»، لا 98%", async () => {
    const hits = [hit(1, 0, "hybrid", 0.0328), hit(2, 0, "hybrid", 0.03)];
    // رقم البوّابة على الضربتين 0.984 و0.9 — يمرّ حدّ الانتهاء وحدّ 1% ولا كوساين وراءه.
    expect(hits[0]!.similarity as number).toBeCloseTo(0.984, 6);
    expect(hits[1]!.similarity as number).toBeCloseTo(0.9, 6);
    const r = await runAgent(hits, 0.984);
    const c = contribution(r);
    expect(c.evidence[0]).toContain("[مرجع SEC-01 · تطابق لم يُقَس]");
    expect(c.evidence[1]).toContain("[مرجع SEC-02 · تطابق لم يُقَس]");
    expect(c.text_ar).toBe("استرجع وكيل المعرفة 2 مقاطع مرجعية.");
    expect(c.evidence.join("\n")).not.toMatch(/\d%/);
    expect(c.text_ar).not.toMatch(/\d%/);
  });

  it("مختلط: «أعلى تطابق» من أعلى كوساين محسوب (70) لا من رقم البوّابة RRF (98)", async () => {
    const r = await runAgent([hit(1, 0.7), hit(2, 0, "hybrid", 0.0328)], 0.984);
    const c = contribution(r);
    expect(c.evidence[0]).toContain("تطابق 70%");
    expect(c.evidence[1]).toContain("تطابق لم يُقَس");
    expect(c.text_ar).toBe("استرجع وكيل المعرفة 2 مقاطع مرجعية (أعلى تطابق 70%).");
    expect(c.text_ar + c.evidence.join("\n")).not.toMatch(/9[08]%/);
  });

  it("من طرف إلى طرف: `retrieveWithEvidenceGate` الحقيقي فوق صفوف dense_score=0 يمرّ البوّابة ولا يُطبع تشابه", async () => {
    sim.real = true;
    const row = (n: number, rrf: number) => ({
      id: `kb-${n}`,
      doc_code: `SEC-0${n}`,
      title_ar: `توجيه ${n}`,
      title_en: null,
      summary_ar: `ملخّص ${n}`,
      summary_en: null,
      category_code: null,
      risk_level: null,
      priority: null,
      dense_score: 0,
      fts_score: 0.4,
      trgm_score: 0.3,
      rrf_score: rrf,
    });
    sim.rpcRows = [row(1, 0.0328), row(2, 0.03), row(3, 0.03)];
    const r = await runAgent([], null, "passed", ORG);
    const c = contribution(r);
    // البوّابة مرّت برقمها المشتقّ من RRF (أرقامها لم تُمسّ)، والوكيل لا يطبعه تشابهًا.
    expect(r.status).toBe("completed");
    expect(c.evidence).toHaveLength(3);
    for (const line of c.evidence) expect(line).toContain("تطابق لم يُقَس");
    expect(c.text_ar).toBe("استرجع وكيل المعرفة 3 مقاطع مرجعية.");
    expect(c.evidence.join("\n") + c.text_ar).not.toMatch(/\d%/);
  });

  it("البوّابة لم تُمرَّر ⇒ unavailable كما كان (لا تغيير في العقد)", async () => {
    const r = await runAgent([hit(1, 0.2)], 0.2, "below_threshold");
    expect(r.unavailable).toBe(true);
    expect(r.error).toBe("gate:below_threshold");
  });

  it("المصدر: لا ضرب في مئة لتشابه في agents.ts، والصيغة من الدوالّ المشتركة", () => {
    const src = readFileSync("src/lib/sadeed/orchestrator/agents.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[\s;{}(])\/\/[^\n]*/gm, "$1");
    expect(src).not.toMatch(/(similarity|score)\w*\)?\s*\*\s*100/);
    expect(src).toContain("similarityLabelAr(");
    expect(src).toContain("computedSimilarityPercent(");
    // المصدر الكوساين المحسوب (`dense_score` عبر `hybridHitCosine`) لا رقم البوّابة المشتقّ من RRF.
    expect(src).toContain("hybridHitCosine(");
    expect(src).not.toMatch(/\.similarity\b|\bmax_similarity\b/);
    expect("similarityLabelAr(h.similarity, { lexical })").toMatch(/\.similarity\b/);
    expect("computedSimilarityPercent(outcome.max_similarity)").toMatch(/\bmax_similarity\b/);
    // مزروع: السطران القديمان يُدانان بالكاشف نفسه.
    const old = [
      "const score = (h.similarity * 100).toFixed(0);",
      "(أعلى تطابق ${(outcome.max_similarity * 100).toFixed(0)}%)",
    ];
    for (const line of old) expect(line).toMatch(/(similarity|score)\w*\)?\s*\*\s*100/);
  });
});
