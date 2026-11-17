import { describe, expect, it } from "vitest";
import {
  computedSimilarityPercent,
  hybridHitCosine,
  similarityLabelAr,
  SIMILARITY_UNMEASURED_AR,
  LEXICAL_MATCH_LABEL_AR,
} from "./similarity-label";

describe("measured cosine labels reject impossible scores", () => {
  it.each([1.000001, 1.25, 50, "1.01", "200"])(
    "does not publish an invented 100%% match for %s",
    (score) => {
      expect(computedSimilarityPercent(score)).toBeNull();
      expect(similarityLabelAr(score)).toBe(SIMILARITY_UNMEASURED_AR);
      expect(hybridHitCosine({ arm: "hybrid", dense_score: score })).toBeNull();
    },
  );

  it.each([
    [0.82, 82],
    ["0.82", 82],
    [1, 100],
  ])("preserves measured similarity %s as %s%%", (score, expected) => {
    expect(computedSimilarityPercent(score)).toBe(expected);
    expect(similarityLabelAr(score)).toBe(`تطابق ${expected}%`);
    expect(hybridHitCosine({ arm: "dense", dense_score: score })).toBe(Number(score));
  });

  it("keeps non-measured and lexical scores unlabelled", () => {
    expect(computedSimilarityPercent(0)).toBeNull();
    expect(computedSimilarityPercent(-0.2)).toBeNull();
    expect(computedSimilarityPercent(Number.POSITIVE_INFINITY)).toBeNull();
    expect(similarityLabelAr(0)).toBe(SIMILARITY_UNMEASURED_AR);
    expect(similarityLabelAr(0.82, { lexical: true })).toBe(LEXICAL_MATCH_LABEL_AR);
    expect(hybridHitCosine({ arm: "lexical", dense_score: 0.82 })).toBeNull();
  });
});
