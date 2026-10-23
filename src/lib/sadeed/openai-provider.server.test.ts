import { afterEach, describe, expect, it, vi } from "vitest";
import {
  openAiRequested,
  safeOpenAiError,
  SADEED_OPENAI_MAX_OUTPUT_TOKENS,
  SADEED_OPENAI_DEADLINE_MS,
} from "./openai-provider.server";
import { resolveProviderPlan } from "./llm/provider-plan.server";

afterEach(() => vi.unstubAllEnvs());

describe("OpenAI opt-in safety — الترويسة تطلب وخطّة البيئة تأذن", () => {
  it("keeps Gemini default unless OpenAI is explicitly requested", () => {
    expect(openAiRequested(new Headers())).toBe(false);
    expect(openAiRequested(new Headers({ "X-SADEED-Provider": "arbitrary" }))).toBe(false);
    expect(openAiRequested(new Headers({ "X-SADEED-Provider": "openai" }))).toBe(true);
  });
  it("a header request without both env gates never yields a model — and never Gemini instead", () => {
    const gemini = { GEMINI_API_KEY: "gemini-key-not-a-secret-000" };
    for (const env of [
      gemini,
      { ...gemini, OPENAI_API_KEY: "openai-key-not-a-secret-0000" },
      { ...gemini, SADEED_OPENAI_ENABLED: "true" },
    ]) {
      const plan = resolveProviderPlan({ env, requestedVendor: "openai" });
      expect(plan.mode).toBe("zero_cost");
      expect(plan.reason).toBe("requested_provider_not_configured");
    }
  });
  it("both gates ⇐ the allowlisted server model, bounded output and deadline", () => {
    const plan = resolveProviderPlan({
      env: { OPENAI_API_KEY: "openai-key-not-a-secret-0000", SADEED_OPENAI_ENABLED: "true" },
      requestedVendor: "openai",
    });
    expect(plan.mode).toBe("llm");
    expect(plan.primary?.vendor).toBe("openai");
    expect(plan.primary?.modelId).toBe("gpt-5-mini");
    expect(SADEED_OPENAI_MAX_OUTPUT_TOKENS).toBe(1200);
    expect(SADEED_OPENAI_DEADLINE_MS).toBe(25000);
  });
  it.each([400, 401, 402, 403, 429, 500])("logs only status for failure %s", (statusCode) => {
    expect(safeOpenAiError({ statusCode, responseBody: "private upstream body" })).toBe(
      `OpenAI request failed (${statusCode})`,
    );
  });
});
