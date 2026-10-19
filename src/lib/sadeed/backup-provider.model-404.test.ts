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
});
