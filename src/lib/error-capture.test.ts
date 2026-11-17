// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

type CapturedEvent = { error?: unknown; reason?: unknown };

async function loadCapture() {
  const handlers = new Map<string, (event: CapturedEvent) => void>();
  vi.stubGlobal("addEventListener", (type: string, handler: (event: CapturedEvent) => void) => {
    handlers.set(type, handler);
  });
  vi.resetModules();
  const { consumeLastCapturedError } = await import("./error-capture");
  return {
    recordError: (error: unknown) => handlers.get("error")!({ error }),
    recordRejection: (reason: unknown) => handlers.get("unhandledrejection")!({ reason }),
    consumeLastCapturedError,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("SSR error capture expiry", () => {
  it("does not misattribute a previous failure after the wall clock moves backwards", async () => {
    let now = 100_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const capture = await loadCapture();
    capture.recordError(new Error("previous request"));

    now = 50_000;
    expect(capture.consumeLastCapturedError()).toBeUndefined();
    now = 100_001;
    expect(capture.consumeLastCapturedError()).toBeUndefined();
  });

  it("keeps the existing inclusive 5000ms deadline and discards expired errors", async () => {
    let now = 20_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const capture = await loadCapture();
    const current = new Error("recent request");
    capture.recordError(current);
    now += 5_000;
    expect(capture.consumeLastCapturedError()).toBe(current);
    expect(capture.consumeLastCapturedError()).toBeUndefined();

    capture.recordError(new Error("expired request"));
    now += 5_001;
    expect(capture.consumeLastCapturedError()).toBeUndefined();
  });

  it("returns a fresh rejection reason once without changing the existing event path", async () => {
    let now = 10_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const capture = await loadCapture();
    const reason = new Error("current rejection");
    capture.recordRejection(reason);
    now += 250;
    expect(capture.consumeLastCapturedError()).toBe(reason);
    expect(capture.consumeLastCapturedError()).toBeUndefined();
  });

  it("does not trust an invalid clock reading", async () => {
    let now = 10_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const capture = await loadCapture();
    capture.recordError(new Error("prior error"));
    now = Number.NaN;
    expect(capture.consumeLastCapturedError()).toBeUndefined();
  });
});
