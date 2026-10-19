import { afterEach, describe, expect, it, vi } from "vitest";
import { createSadeedOpenAiModel, openAiRequested, safeOpenAiError, SADEED_OPENAI_MODEL, SADEED_OPENAI_MAX_OUTPUT_TOKENS, SADEED_OPENAI_DEADLINE_MS } from "./openai-provider.server";

afterEach(() => vi.unstubAllEnvs());
describe("OpenAI opt-in safety", () => {
  it("keeps Gemini default unless OpenAI is explicitly requested", () => {
    expect(openAiRequested(new Headers())).toBe(false);
    expect(openAiRequested(new Headers({ "X-SADEED-Provider": "arbitrary" }))).toBe(false);
    expect(openAiRequested(new Headers({ "X-SADEED-Provider": "openai" }))).toBe(true);
  });
  it("does not create a model without a server key", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(createSadeedOpenAiModel()).toBeNull();
  });
  it("uses the fixed Responses model and bounded output and deadline", () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only-not-a-secret");
    expect(createSadeedOpenAiModel()?.modelId).toBe(SADEED_OPENAI_MODEL);
    expect(SADEED_OPENAI_MAX_OUTPUT_TOKENS).toBe(1200);
    expect(SADEED_OPENAI_DEADLINE_MS).toBe(25000);
  });
  it.each([400,401,402,403,429,500])("logs only status for failure %s", (statusCode) => {
    expect(safeOpenAiError({ statusCode, responseBody: "private upstream body" })).toBe(`OpenAI request failed (${statusCode})`);
  });
});