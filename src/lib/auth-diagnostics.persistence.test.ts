import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authLog } from "./auth-diagnostics";

const STORAGE_KEY = "nx_auth_diag";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  delete window.__nxAuthLog;
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  delete window.__nxAuthLog;
  vi.restoreAllMocks();
});

describe("auth diagnostic persistence recovery", () => {
  it.each(["{invalid", "null", '{"stale":true}', "42"])(
    "replaces malformed or non-array stored logs (%s) instead of dropping new events",
    (stored) => {
      window.localStorage.setItem(STORAGE_KEY, stored);

      authLog("login:retry");

      const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
      expect(persisted).toHaveLength(1);
      expect(persisted[0]).toMatchObject({ ev: "login:retry" });
      expect(window.__nxAuthLog?.at(-1)).toMatchObject({ ev: "login:retry" });
    },
  );

  it("preserves valid history and caps the ring at the latest 50 entries", () => {
    const previous = Array.from({ length: 50 }, (_, i) => ({
      t: i,
      sid: "prior",
      ev: `previous:${i}`,
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(previous));

    authLog("login:success");

    const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    expect(persisted).toHaveLength(50);
    expect(persisted[0].ev).toBe("previous:1");
    expect(persisted.at(-1).ev).toBe("login:success");
  });
  it("retains the last 100 in-memory diagnostic events without altering persistence", () => {
    for (let i = 0; i < 102; i++) authLog(`auth:event:${i}`);
    expect(window.__nxAuthLog).toHaveLength(100);
    expect(window.__nxAuthLog?.[0].ev).toBe("auth:event:2");
    expect(window.__nxAuthLog?.at(-1)?.ev).toBe("auth:event:101");
    const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    expect(persisted).toHaveLength(50);
    expect(persisted[0].ev).toBe("auth:event:52");
  });
});
