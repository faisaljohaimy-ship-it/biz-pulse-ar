// @vitest-environment node
/**
 * قواعد طباعة الاستشهاد (O7 ج، المادة ٢٧): كتلة السياق تطبع `(مطابقة نصّية)` للمعجمي
 * و`(sim NN%)` **لكوساين محسوب وحده**؛ وJSON الاستشهاد يحمل `arm` و`label` و`similarity`
 * (`null` للمعجمي)؛ و`model_version` لا يُلصق حيث يُختلق. لكل قاعدة حالة حمراء مزروعة.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ARM_NAMES, type AggregateOutcome } from "@/lib/retrieval/aggregate.server";
import { fuseRankedLists } from "@/lib/retrieval/fuse.server";
import type { Hit } from "@/lib/retrieval/types";
import { isVendorSafe } from "@/lib/sadeed/vendor-mask";
import { assembleRagContext } from "../rag.server";
import { RAG_MODEL_VERSION } from "./embed.server";

const hit = (id: string, source: Hit["source"], over: Partial<Hit> = {}): Hit => ({
  id,
  source,
  title: `عنوان ${id}`,
  excerpt: `مقتطف ${id}`,
  score: 1,
  rank: 1,
  provenance: { docId: `kb/${id}`, citable: source !== "upload-unverified", label: "مطابقة نصّية" },
  ...over,
});

/** نتيجةٌ مدموجة حقيقية (RRF) من قوائم الأذرع المعطاة. */
function outcomeOf(lists: Array<{ arm: string; hits: Hit[] }>): AggregateOutcome {
  return {
    arms: lists.map((l) => ({
      arm: l.arm,
      served: true,
      hits: l.hits,
      reason: null,
      latencyMs: 1,
    })),
    fused: fuseRankedLists(lists),
    servedArms: lists.map((l) => l.arm),
    latencyMs: 1,
  };
}

const lineOf = (block: string, id: string) => {
  const lines = block.split("\n");
  const at = lines.findIndex((l) => l.includes(`[KB:عنوان ${id}]`));
  return at < 0 ? "" : lines[at]!;
};

describe("① المعجمي: `(مطابقة نصّية)` بلا نسبة أبدًا", () => {
  const lexical = assembleRagContext(
    outcomeOf([
      { arm: ARM_NAMES.seed, hits: [hit("a", "seed"), hit("b", "hcis", { score: 9.4 })] },
    ]),
  );

  it("سطر الكتلة يطبع الوسم بين قوسين ولا `sim` ولا `%`", () => {
    for (const id of ["a", "b"]) {
      const line = lineOf(lexical.contextBlock, id);
      expect(line, id).toContain("(مطابقة نصّية)");
      expect(line).not.toMatch(/sim|%/);
    }
    expect(lexical.contextBlock).not.toMatch(/\(sim\b/);
  });

  it("JSON الاستشهاد: arm وlabel، وsimilarity=null (ولو حملت الدرجة الخام رقمًا كبيرًا)", () => {
    // الحلقة أدناه تفرغ بصمت لو لم يُبنَ استشهاد: العدد مثبّت قبلها.
    expect(lexical.citations).toHaveLength(2);
    for (const c of lexical.citations) {
      expect(c.arm).toBe(ARM_NAMES.seed);
      expect(c.label).toBe("مطابقة نصّية");
      expect(c.similarity).toBeNull();
    }
  });

  it("مزروع: الصيغة القديمة تطبع `(sim 940%)` لدرجة BM25 خام — رقمٌ لم يقسه أحد", () => {
    const old = (score: number) => `(sim ${Math.round(score * 100)}%)`;
    expect(old(9.4)).toBe("(sim 940%)");
    expect(lexical.contextBlock).not.toContain("940%");
  });
});

describe("② المتّجهي: `(sim NN%)` لكوساين محسوب وحده", () => {
  it("كوساين 0.91 ⇒ `(sim 91%)` وsimilarity=0.91 وlabel «تشابه دلالي» وarm المتّجهية", () => {
    const ctx = assembleRagContext(
      outcomeOf([
        {
          arm: ARM_NAMES.vector,
          hits: [
            hit("v", "knowledge", {
              score: 0.91,
              provenance: { docId: "kb/v", citable: true, label: "تشابه دلالي" },
            }),
          ],
        },
      ]),
    );
    expect(lineOf(ctx.contextBlock, "v")).toContain("(sim 91%)");
    expect(ctx.citations[0]).toMatchObject({
      arm: ARM_NAMES.vector,
      label: "تشابه دلالي",
      similarity: 0.91,
    });
  });

  it("المدموج (معجمي أولًا + متّجهي محسوب) ⇒ `(sim NN%)` ولا يُفقَد الرقم المحسوب", () => {
    const ctx = assembleRagContext(
      outcomeOf([
        { arm: ARM_NAMES.seed, hits: [hit("m", "knowledge")] },
        { arm: ARM_NAMES.vector, hits: [hit("m", "knowledge", { score: 0.77 })] },
      ]),
    );
    expect(lineOf(ctx.contextBlock, "m")).toContain("(sim 77%)");
    expect(ctx.citations[0]).toMatchObject({ arm: ARM_NAMES.seed, similarity: 0.77 });
  });

  it.each([
    ["صفر («لم يُقَس»)", 0],
    ["NaN", Number.NaN],
    ["سالب", -0.2],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["0.004 (يُقرَّب إلى 0%)", 0.004],
  ])(
    "درجة متّجهية %s ليست كوساين محسوبًا ⇒ لا `(sim` ولا 0% ولا NaN%، وsimilarity=null",
    (_l, score) => {
      const ctx = assembleRagContext(
        outcomeOf([
          {
            arm: ARM_NAMES.vector,
            hits: [
              hit("z", "knowledge", {
                score,
                provenance: { docId: "kb/z", citable: true, label: "تشابه دلالي" },
              }),
            ],
          },
        ]),
      );
      const line = lineOf(ctx.contextBlock, "z");
      expect(line).toContain("(تشابه دلالي)");
      expect(line).not.toMatch(/\(sim|NaN|Infinity|(^|[^\d.])0%/);
      expect(ctx.citations[0]!.similarity).toBeNull();
    },
  );

  it("مزروع: الصيغة القديمة على الدرجات نفسها تطبع `(sim 0%)` و`(sim NaN%)`", () => {
    const old = (sim: number) => `(sim ${Math.round(sim * 100)}%)`;
    expect(old(0)).toBe("(sim 0%)");
    expect(old(Number.NaN)).toBe("(sim NaN%)");
    expect(old(0.004)).toBe("(sim 0%)");
  });
});

describe("③ model_version: لا يُلصق حيث يُختلق", () => {
  // لا صفّ ولا RPC يعيد إصدار نموذج التضمين اليوم (NULL في كل صفوف الإنتاج، ولا يظهر في
  // أعمدة `sadeed_match_*`)، فلا مسار يملك قيمةً حقيقية. الحارس: المفتاح غائبٌ عن كل استشهاد.
  const ctx = assembleRagContext(
    outcomeOf([
      { arm: ARM_NAMES.seed, hits: [hit("a", "seed")] },
      {
        arm: ARM_NAMES.vector,
        hits: [
          hit("v", "knowledge", {
            score: 0.9,
            provenance: { docId: "kb/v", citable: true, label: "تشابه دلالي" },
          }),
        ],
      },
    ]),
  );

  it("لا استشهاد (معجميًّا كان أو متّجهيًّا) يحمل المفتاح، ولا الكتلة تذكره", () => {
    expect(ctx.citations.length).toBe(2);
    for (const c of ctx.citations) expect("model_version" in c).toBe(false);
    expect(JSON.stringify(ctx.citations)).not.toContain("model_version");
    expect(ctx.contextBlock).not.toContain("model_version");
    expect(ctx.contextBlock).not.toContain(RAG_MODEL_VERSION);
  });

  it("مزروع: لصق إصدار نموذج الاستعلام على استشهادٍ معجمي يُدان بالكاشف نفسه", () => {
    const stamps = (cs: unknown[]) =>
      cs.some((c) => typeof c === "object" && c && "model_version" in c);
    expect(stamps(ctx.citations)).toBe(false);
    const planted = ctx.citations.map((c) => ({ ...c, model_version: RAG_MODEL_VERSION }));
    expect(stamps(planted)).toBe(true);
  });

  it("المصدر: rag.server.ts لا يبني model_version ولا يستورد إصدار التضمين", () => {
    const src = readFileSync("src/lib/sadeed/rag.server.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[\s;{}(])\/\/[^\n]*/gm, "$1");
    expect(src).not.toMatch(/model_version|RAG_MODEL_VERSION|modelVersion/);
  });
});

describe("④ قناع المزوّدين: لا اسم مزوّد في سطور الكتلة المعروضة", () => {
  /**
   * كل سطر غير فارغ في الكتلة، لا ما يبدأ ببادئةٍ بعينها: تغيير بادئة القائمة (`- ` ⇒ `* `)
   * كان يفرغ المرشَّح فتمرّ الحلقة بلا فحص. وفراغ الكتلة يُدان صراحةً لا يمرّ.
   */
  const scannedLines = (block: string): string[] => {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    expect(lines.length, "الكتلة بلا أسطر: لا شيء يُفحَص").toBeGreaterThan(0);
    return lines;
  };

  it("كل سطر في الكتلة يعبر القناع دون أن يفقد حرفًا، وعدد الأسطر المفحوصة مثبّت", () => {
    const ctx = assembleRagContext(
      outcomeOf([
        { arm: ARM_NAMES.seed, hits: [hit("a", "seed")] },
        {
          arm: ARM_NAMES.vector,
          hits: [
            hit("v", "knowledge", {
              score: 0.9,
              provenance: { docId: "kb/v", citable: true, label: "تشابه دلالي" },
            }),
          ],
        },
      ]),
    );
    const lines = scannedLines(ctx.contextBlock);
    // ترويسة القسم + (سطر الاستشهاد + سطر المقتطف) × استشهادين = 5 على الأقل.
    expect(lines.length).toBeGreaterThanOrEqual(5);
    // سطرا الاستشهاد حاضران بين المفحوص: لو غابا فالفحص لا يصل ما أُريد له.
    expect(lines.filter((l) => l.includes("[KB:عنوان a]"))).toHaveLength(1);
    expect(lines.filter((l) => l.includes("[KB:عنوان v]"))).toHaveLength(1);
    for (const line of lines) expect(isVendorSafe(line), line).toBe(true);
  });

  it("مزروع: كتلةٌ فارغة تُدان، وبادئة قائمة مختلفة لا تفرّغ الفحص، واسم مزوّد في أي سطر يُدان", () => {
    expect(() => scannedLines("")).toThrow();
    expect(() => scannedLines("  \n\n")).toThrow();
    // القديم: المرشِّح على بادئة `- ` يعود فارغًا لو صارت `* ` فتمرّ الحلقة بلا فحص.
    const bulleted = "# KNOWLEDGE BASE\n* [KB:x] · y\n  مقتطف";
    expect(bulleted.split("\n").filter((l) => l.startsWith("-"))).toHaveLength(0);
    expect(scannedLines(bulleted)).toHaveLength(3);
    const planted = "- [KB:x] · gemini-2.5-pro\n  مقتطف";
    expect(scannedLines(planted).some((l) => !isVendorSafe(l))).toBe(true);
  });
});
