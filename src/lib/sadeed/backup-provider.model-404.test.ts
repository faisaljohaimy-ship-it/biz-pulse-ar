import { describe, expect, it } from "vitest";
import { shouldUseBackup } from "./backup-provider.server";

describe("backup on unavailable primary model", () => {
  it("moves a 'model not found' failure to the backup", () => {
    expect(shouldUseBackup(new Error("models/gemini-x is not found for API version v1beta"))).toBe(
      true,
    );
    expect(shouldUseBackup(new Error("Model gemini-3.6-flash not found"))).toBe(true);
  });
  it("keeps ordinary request errors terminal", () => {
    expect(shouldUseBackup(new Error("400 invalid argument"))).toBe(false);
  });
  it.each([400, 401, 402, 403])("keeps structured status %s terminal despite quota/unavailable text", (statusCode) => {
    expect(shouldUseBackup(Object.assign(new Error("quota unavailable"), { statusCode }))).toBe(false);
    expect(shouldUseBackup(new Error(`${statusCode} quota unavailable`))).toBe(false);
  });
  it("preserves transient fallback and the supported-model fallback", () => {
    expect(shouldUseBackup(new Error("429 resource_exhausted"))).toBe(true);
    expect(shouldUseBackup(new Error("503 overloaded"))).toBe(true);
    expect(shouldUseBackup(new Error("Model gemini-x not supported"))).toBe(true);
  });
});
