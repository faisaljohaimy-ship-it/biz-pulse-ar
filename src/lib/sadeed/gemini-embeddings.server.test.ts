import { afterEach, describe, expect, it, vi } from "vitest";
import {
  embedGeminiText,
  prepareGeminiEmbeddingText,
  resolveGeminiEmbeddingModel,
} from "./gemini-embeddings.server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("SADEED Gemini embeddings", () => {
  it("places the retrieval role inside the text for Gemini Embedding 2", () => {
    const query = prepareGeminiEmbeddingText("حالة المخاطر", "retrieval-query");
    const document = prepareGeminiEmbeddingText(
      "إجراء الاستجابة للحوادث",
      "retrieval-document",
      "خطة الطوارئ",
    );
    expect(query).toContain("query: حالة المخاطر");
    expect(document).toContain("document title: خطة الطوارئ");
    expect(query).toContain("industrial security evidence");
  });

  it("rejects an unsafe model override", () => {
    expect(resolveGeminiEmbeddingModel({ GEMINI_EMBEDDING_MODEL: "../../secret" })).toBe(
      "gemini-embedding-2",
    );
  });

  it("calls the canonical Gemini endpoint with fixed dimensions and no task_type", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
    vi.stubEnv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2");
    const fetchMock = vi.fn(async () =>
      Response.json({
        embedding: { values: Array.from({ length: 128 }, (_, index) => index / 128) },
        usageMetadata: { totalTokenCount: 17 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await embedGeminiText("تحليل مخاطر منشأة صناعية", {
      dimensions: 128,
      purpose: "retrieval-query",
    });

    expect(result?.vector).toHaveLength(128);
    expect(result?.usageTokens).toBe(17);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("models/gemini-embedding-2:embedContent");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.output_dimensionality).toBe(128);
    expect(body).not.toHaveProperty("task_type");
  });
});
