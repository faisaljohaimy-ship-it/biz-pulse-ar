import { describe, expect, it } from "vitest";
import { evaluateRagCoverage, type RagCitation } from "./rag.server";

const citation = (title: string, kind: RagCitation["kind"] = "document"): RagCitation => ({
  kind,
  id: title,
  title,
  similarity: 0.9,
  tag: `[${kind === "document" ? "DOC" : kind === "knowledge" ? "KB" : "MEM"}:${title}]`,
  excerpt: "Verified source excerpt",
  label: "تشابه دلالي",
  arm: "vector",
  bodyText: true,
});

describe("RAG coverage counts complete citation tags", () => {
  it("does not count a title mentioned in prose as another citation", () => {
    const sources = [citation("Policy A"), citation("Policy B")];
    expect(evaluateRagCoverage("[DOC:Policy A] also discusses Policy B.", sources)).toMatchObject({
      available: 2,
      cited: 1,
      citedTags: ["[DOC:Policy A]"],
      uncitedTags: ["[DOC:Policy B]"],
      coverageRatio: 0.5,
    });
  });

  it("distinguishes titles sharing the first 24 characters", () => {
    const sources = [
      citation("Industrial security policy A"),
      citation("Industrial security policy B"),
    ];
    expect(evaluateRagCoverage(sources[0].tag, sources).citedTags).toEqual([sources[0].tag]);
  });

  it("does not mix document and knowledge tags", () => {
    const sources = [citation("Policy A"), citation("Policy A", "knowledge")];
    expect(evaluateRagCoverage("[DOC:Policy A]", sources).citedTags).toEqual([sources[0].tag]);
    expect(evaluateRagCoverage("[KB:Policy A]", sources).citedTags).toEqual([sources[1].tag]);
  });

  it("requires a complete tag and accepts case differences", () => {
    const source = citation("Policy A");
    expect(evaluateRagCoverage("[DOC:Policy A", [source]).status).toBe("uncited");
    expect(evaluateRagCoverage("[doc:policy a] [doc:policy a]", [source]).cited).toBe(1);
  });

  it("ignores memory citations and handles no sources", () => {
    expect(evaluateRagCoverage("[MEM:Policy A]", [citation("Policy A", "memory")])).toMatchObject({
      available: 0,
      cited: 0,
      status: "no-sources",
    });
  });
});
