import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ insert: fixture.insert }) },
}));

import { logSadeedAction } from "./audit-log.server";

beforeEach(() => {
  fixture.insert.mockReset();
});

describe("executive audit write acknowledgement", () => {
  it("does not report failure when the database acknowledges an insert", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      fixture.insert.mockResolvedValue({ error: null });
      await expect(logSadeedAction({ action: "audit.test" })).resolves.toBeUndefined();
      expect(fixture.insert).toHaveBeenCalledTimes(1);
      expect(errorLog).not.toHaveBeenCalled();
    } finally {
      errorLog.mockRestore();
    }
  });

  it.each([
    { error: { message: "synthetic-private-db-result" } },
    undefined,
  ])("detects non-throwing write failures without exposing provider details", async (result) => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      fixture.insert.mockResolvedValue(result);
      await expect(logSadeedAction({ action: "audit.test" })).resolves.toBeUndefined();
      expect(JSON.stringify(errorLog.mock.calls)).toContain("failed to persist action");
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain("synthetic-private-db-result");
    } finally {
      errorLog.mockRestore();
    }
  });

  it("redacts exceptions while preserving nonfatal audit behavior", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      fixture.insert.mockRejectedValue(new Error("synthetic-private-db-exception"));
      await expect(logSadeedAction({ action: "audit.test" })).resolves.toBeUndefined();
      expect(JSON.stringify(errorLog.mock.calls)).toContain("failed to persist action");
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain("synthetic-private-db-exception");
    } finally {
      errorLog.mockRestore();
    }
  });
});
