import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createProvider, selectModel } = vi.hoisted(() => {
  const selectModel = vi.fn(() => ({ modelId: "configured-gemini-gateway" }));
  return { selectModel, createProvider: vi.fn(() => selectModel) };
});

vi.mock("@ai-sdk/openai-compatible", () => ({ createOpenAICompatible: createProvider }));
import { createSadeedBackupModel, SADEED_BACKUP_MODEL } from "./backup-provider.server";

describe("backup provider configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPENAI_API_KEY", "test-only-not-a-secret");
    vi.stubEnv("OPENAI_BASE_URL", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("does not enable fallback merely because the direct OpenAI key exists", () => {
    expect(createSadeedBackupModel()).toBeNull();
    expect(createProvider).not.toHaveBeenCalled();
  });

  it.each([
    "not a URL",
    "/v1",
    "http://gateway.example/v1",
    "https://api.openai.com/v1",
    "https://API.OPENAI.COM.:443/v1",
    "https://openai.com/v1",
    "https://user:password@gateway.example/v1",
    "https://gateway.example/v1?key=unexpected",
    "https://gateway.example/v1#fragment",
  ])("rejects invalid or direct-OpenAI endpoint %s without constructing a provider", (url) => {
    vi.stubEnv("OPENAI_BASE_URL", url);
    expect(createSadeedBackupModel()).toBeNull();
    expect(createProvider).not.toHaveBeenCalled();
  });

  it("preserves explicitly configured HTTPS Gemini-compatible gateways", () => {
    vi.stubEnv("OPENAI_BASE_URL", " https://gateway.example/custom/v1 ");
    expect(createSadeedBackupModel()).toEqual({ modelId: "configured-gemini-gateway" });
    expect(createProvider).toHaveBeenCalledWith({
      name: "sadeed-openai-compatible",
      baseURL: "https://gateway.example/custom/v1",
      headers: { Authorization: "Bearer test-only-not-a-secret" },
    });
    expect(selectModel).toHaveBeenCalledWith(SADEED_BACKUP_MODEL);
  });

  it("requires a gateway credential even with a valid endpoint", () => {
    vi.stubEnv("OPENAI_API_KEY", " ");
    vi.stubEnv("OPENAI_BASE_URL", "https://gateway.example/v1");
    expect(createSadeedBackupModel()).toBeNull();
    expect(createProvider).not.toHaveBeenCalled();
  });
});
