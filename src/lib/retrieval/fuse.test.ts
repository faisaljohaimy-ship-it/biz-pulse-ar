/**
 * RRF — القيم الدقيقة، حفظ المصدر، الحتمية، والدمج الخاطئ المزروع (المادة ٣٠).
 */
import { describe, expect, it } from "vitest";
import { FUSE_K, fuseRankedLists, rrfContribution } from "./fuse.server";
import type { Hit } from "./types";

const hit = (id: string, score: number, source: Hit["source"] = "seed"): Hit => ({
  id,
  source,
  title: id,
  excerpt: "",
  score,
  rank: 0,
  provenance: { citable: true, label: "مطابقة نصّية" },
});

describe("fuseRankedLists", () => {
  it("k = 60 وإسهام الرتبة 1/(k+rank)", () => {
    expect(FUSE_K).toBe(60);
    expect(rrfContribution(1)).toBeCloseTo(1 / 61, 12);
    expect(rrfContribution(2, 10)).toBeCloseTo(1 / 12, 12);
  });

  it("وثيقة في قائمتين تجمع إسهاميها، والمصدر محفوظ لكل ذراع", () => {
    const fused = fuseRankedLists([
      { arm: "lexical", hits: [hit("a", 9), hit("b", 4)] },
      { arm: "vector", hits: [hit("b", 0.9), hit("c", 0.8)] },
    ]);
    expect(fused.map((h) => h.id)).toEqual(["b", "a", "c"]);
    expect(fused[0].fusedScore).toBeCloseTo(1 / 62 + 1 / 61, 12);
    expect(fused[0].contributions).toEqual([
      { arm: "lexical", rank: 2, score: 4 },
      { arm: "vector", rank: 1, score: 0.9 },
    ]);
    expect(fused.map((h) => h.rank)).toEqual([1, 2, 3]);
    expect(fused[1].contributions).toEqual([{ arm: "lexical", rank: 1, score: 9 }]);
  });

  it("المعرّف نفسه من مصدرين مختلفين لا يُدمج", () => {
    const fused = fuseRankedLists([
      { arm: "l", hits: [hit("x", 1, "seed")] },
      { arm: "v", hits: [hit("x", 1, "hcis")] },
    ]);
    expect(fused).toHaveLength(2);
  });

  it("التعادل يُحسم بالمفتاح تصاعديًّا — حتمي عبر التشغيلات", () => {
    const lists = [
      { arm: "l", hits: [hit("b", 1)] },
      { arm: "v", hits: [hit("a", 1)] },
    ];
    expect(fuseRankedLists(lists).map((h) => h.id)).toEqual(["a", "b"]);
    expect(fuseRankedLists(lists)).toEqual(fuseRankedLists(lists));
  });

  it("قوائم فارغة ⇐ []، وlimit يُحترم", () => {
    expect(fuseRankedLists([])).toEqual([]);
    expect(fuseRankedLists([{ arm: "l", hits: [] }])).toEqual([]);
    expect(
      fuseRankedLists([{ arm: "l", hits: [hit("a", 1), hit("b", 1)] }], { limit: 1 }),
    ).toHaveLength(1);
  });

  it("k غير الموجب ورتبة غير صالحة يُرفضان", () => {
    expect(() => rrfContribution(1, 0)).toThrow(RangeError);
    expect(() => rrfContribution(0)).toThrow(RangeError);
    expect(() => fuseRankedLists([{ arm: "l", hits: [hit("a", 1)] }], { k: -60 })).toThrow(
      RangeError,
    );
  });

  it("لا يعدّل النتائج المُدخلة", () => {
    const a = hit("a", 1);
    fuseRankedLists([{ arm: "l", hits: [a] }]);
    expect(a.rank).toBe(0);
    expect(a.score).toBe(1);
  });
});

describe("مزروع (المادة ٣٠): دمج بجمع الدرجات الخام يقلب الترتيب", () => {
  it("الذراع ذات المقياس الأكبر تطغى في الدمج الخاطئ، وRRF لا يأبه بالمقياس", () => {
    const lexical = { arm: "lexical", hits: [hit("a", 12), hit("b", 11)] };
    const vector = { arm: "vector", hits: [hit("b", 0.9), hit("c", 0.85)] };
    // الدمج الخاطئ: Σ الدرجات الخام.
    const misFused = new Map<string, number>();
    for (const l of [lexical, vector])
      for (const h of l.hits) misFused.set(h.id, (misFused.get(h.id) ?? 0) + h.score);
    const misOrder = Array.from(misFused)
      .sort((x, y) => y[1] - x[1])
      .map(([id]) => id);
    const rrfOrder = fuseRankedLists([lexical, vector]).map((h) => h.id);
    expect(rrfOrder).toEqual(["b", "a", "c"]);
    expect(misOrder).not.toEqual(rrfOrder);
  });
});
