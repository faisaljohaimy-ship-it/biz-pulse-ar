import { describe, expect, it } from "vitest";
import {
  clearExecutiveAcceptance,
  EXECUTIVE_ACCEPTANCE_KEY,
  hasExecutiveAcceptance,
  recordExecutiveAcceptance,
} from "./executive-acceptance";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

describe("executive acceptance journey", () => {
  it("keeps credentials gated until explicit acceptance is recorded", () => {
    const storage = memoryStorage();
    expect(hasExecutiveAcceptance(storage)).toBe(false);
    recordExecutiveAcceptance(storage, new Date("2026-07-15T00:00:00.000Z"));
    expect(hasExecutiveAcceptance(storage)).toBe(true);
  });

  it("rejects malformed or obsolete acceptance records", () => {
    const storage = memoryStorage();
    storage.setItem(EXECUTIVE_ACCEPTANCE_KEY, JSON.stringify({ version: 0, acceptedAt: "today" }));
    expect(hasExecutiveAcceptance(storage)).toBe(false);
  });

  it("can deliberately return a customer to the public presentation", () => {
    const storage = memoryStorage();
    recordExecutiveAcceptance(storage);
    clearExecutiveAcceptance(storage);
    expect(hasExecutiveAcceptance(storage)).toBe(false);
  });
});
