/**
 * وسم التشابه الصادق (O7 د، المادة ٢٧): نسبةٌ لكوساين محسوب وحده؛ المعجمي «مطابقة
 * نصّية»؛ وكل ما لم يُقَس «تطابق لم يُقَس» — لا `0%` ولا `NaN%` ولا `null%` ولا
 * `undefined%` في أي حال. لكل قاعدة حالة حمراء مزروعة: الصيغة القديمة نفسها على
 * المدخل نفسه تطبع الرقم المختلَق.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SimilarityLabel } from "@/components/sadeed/SimilarityLabel";
import {
  computedSimilarityPercent,
  hybridHitCosine,
  LEXICAL_MATCH_LABEL_AR,
  SIMILARITY_UNMEASURED_AR,
  similarityLabelAr,
} from "./similarity-label";

/** كل ما لا يجوز أن يُطبع بوصفه نسبة. */
const BAD_PRINT = /(^|[^\d.])0%|NaN|null|undefined|Infinity|-\d+%/;

/** الصيغة التي كانت على الأسطح الثلاثة قبل O7 (د) — للمزروع وحده. */
const OLD_FORMULA = (similarity: unknown) => `تطابق ${Math.round((similarity as number) * 100)}%`;

const NOT_MEASURED: Array<[string, unknown]> = [
  ["null", null],
  ["undefined", undefined],
  ["NaN", Number.NaN],
  ["0 (علامة «لم يُقَس»)", 0],
  ["0.004 (يُقرَّب إلى 0%)", 0.004],
  ["سالب", -0.4],
  ["Infinity", Number.POSITIVE_INFINITY],
  ["نصّ غير رقمي", "abc"],
  ["نصّ فارغ", ""],
  ["كائن", {}],
];

describe("computedSimilarityPercent", () => {
  it.each(NOT_MEASURED)("%s ⇒ null (لا كوساين محسوب)", (_label, value) => {
    expect(computedSimilarityPercent(value)).toBeNull();
  });

  it.each([
    [0.005, 1],
    [0.4, 40],
    [0.82, 82],
    [0.915, 92],
    [1, 100],
    [1.02, 100],
    ["0.82", 82],
  ] as const)("%j ⇒ %d", (value, expected) => {
    expect(computedSimilarityPercent(value)).toBe(expected);
  });
});

describe("similarityLabelAr", () => {
  it("كوساين محسوب ⇒ «تطابق NN%»", () => {
    expect(similarityLabelAr(0.82)).toBe("تطابق 82%");
  });

  it.each(NOT_MEASURED)("%s ⇒ «تطابق لم يُقَس» لا نسبة", (_label, value) => {
    const label = similarityLabelAr(value);
    expect(label).toBe(SIMILARITY_UNMEASURED_AR);
    expect(label).toBe("تطابق لم يُقَس");
    expect(label).not.toMatch(BAD_PRINT);
  });

  it("المعجمي ⇒ «مطابقة نصّية» دائمًا، ولو وصل رقمٌ معه (BM25 ليس تشابهًا دلاليًّا)", () => {
    expect(LEXICAL_MATCH_LABEL_AR).toBe("مطابقة نصّية");
    for (const v of [null, 0, 0.9, 1, Number.NaN]) {
      const label = similarityLabelAr(v, { lexical: true });
      expect(label).toBe("مطابقة نصّية");
      expect(label).not.toContain("%");
    }
  });

  it("مزروع: الصيغة القديمة تطبع 0% لـnull وNaN% لـundefined — والجديدة لا", () => {
    expect(OLD_FORMULA(null)).toBe("تطابق 0%");
    expect(OLD_FORMULA(undefined)).toBe("تطابق NaN%");
    expect(OLD_FORMULA(0)).toBe("تطابق 0%");
    for (const v of [null, undefined, 0]) {
      expect(OLD_FORMULA(v)).toMatch(BAD_PRINT);
      expect(similarityLabelAr(v)).not.toMatch(BAD_PRINT);
    }
  });

  it("النصّ عربي أولًا، قصير، بلا شرطة طويلة ولا اسم مزوّد", () => {
    for (const v of [0.82, null]) {
      const label = similarityLabelAr(v);
      expect(label).toMatch(/[؀-ۿ]/);
      expect(label).not.toMatch(/[—–]/);
      expect(label).not.toMatch(/gemini|openai|google/i);
    }
  });
});

describe("hybridHitCosine: الكوساين المحسوب هو dense_score وحده، لا رقم البوّابة (RRF)", () => {
  /** رقم البوّابة كما في `retrieve.server`: الكوساين إن كان > 0 وإلا RRF × 30. */
  const gateNumber = (dense: number, rrf: number) => (dense > 0 ? dense : Math.min(1, rrf * 30));

  it.each([
    ["هجينة بكوساين 0.82", { arm: "hybrid", dense_score: 0.82 }, 0.82],
    ["هجينة والكوساين نصّ رقمي «0.82»", { arm: "hybrid", dense_score: "0.82" }, 0.82],
  ] as const)("%s ⇒ الكوساين نفسه", (_label, hit, expected) => {
    expect(hybridHitCosine(hit)).toBe(expected);
  });

  it.each([
    ["هجينة dense_score=0", { arm: "hybrid", dense_score: 0 }],
    ["هجينة dense_score=NaN", { arm: "hybrid", dense_score: Number.NaN }],
    ["هجينة dense_score=null", { arm: "hybrid", dense_score: null }],
    ["هجينة بلا dense_score", { arm: "hybrid" }],
    ["هجينة dense_score=0.004 (يُقرَّب إلى 0%)", { arm: "hybrid", dense_score: 0.004 }],
    ["هجينة dense_score سالب", { arm: "hybrid", dense_score: -0.3 }],
    ["معجمية ولو حملت dense_score=0.9", { arm: "lexical", dense_score: 0.9 }],
  ] as const)("%s ⇒ null (لا كوساين محسوب)", (_label, hit) => {
    expect(hybridHitCosine(hit)).toBeNull();
    expect(similarityLabelAr(hybridHitCosine(hit), { lexical: hit.arm === "lexical" })).not.toMatch(
      /\d%/,
    );
  });

  it("مزروع: ضربة dense_score=0 ورقم بوّابتها من RRF يطبع «تطابق 98%» لو أُخذ رقم البوّابة، والدالّة تعيد null", () => {
    const hit = { arm: "hybrid", dense_score: 0, rrf_score: 0.0328 } as const;
    const gate = gateNumber(hit.dense_score, hit.rrf_score);
    expect(gate).toBeCloseTo(0.984, 6);
    expect(similarityLabelAr(gate)).toBe("تطابق 98%");
    expect(similarityLabelAr(hybridHitCosine(hit))).toBe(SIMILARITY_UNMEASURED_AR);
  });
});

describe("<SimilarityLabel/> يعرض النصّ بالصنف الممرَّر وحده", () => {
  it("كوساين محسوب ⇒ span بصنف السطح الحالي ونصّ النسبة", () => {
    const { container } = render(<SimilarityLabel value={0.82} className="text-[12px] x" />);
    const span = container.querySelector("span");
    expect(span?.className).toBe("text-[12px] x");
    expect(span?.textContent).toBe("تطابق 82%");
  });

  it.each(NOT_MEASURED)("%s ⇒ «تطابق لم يُقَس» في الـDOM", (_label, value) => {
    const { container } = render(<SimilarityLabel value={value} />);
    expect(container.textContent).toBe("تطابق لم يُقَس");
    expect(container.textContent).not.toMatch(BAD_PRINT);
  });

  it("lexical ⇒ «مطابقة نصّية» بلا نسبة", () => {
    const { container } = render(<SimilarityLabel value={0.97} lexical />);
    expect(container.textContent).toBe("مطابقة نصّية");
  });
});
