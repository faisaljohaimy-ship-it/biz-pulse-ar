import { describe, expect, it, vi } from "vitest";
import { createHealthProbeCache } from "./health-probe-cache";

describe("health probe single-flight cache", () => {
  it("runs one storage probe for simultaneous requests and shares fail-closed results", async () => {
    let finish: (unavailable: boolean) => void = () => {};
    const check = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    const read = createHealthProbeCache(check, 15_000, () => 100);
    const first = read();
    const second = read();
    await Promise.resolve();
    expect(check).toHaveBeenCalledTimes(1);
    finish(true);
    expect(await Promise.all([first, second])).toEqual([true, true]);
    expect(await read()).toBe(true);
    expect(check).toHaveBeenCalledTimes(1);
  });

  it("expires cache at the existing 15-second TTL and rechecks storage", async () => {
    let time = 0;
    const check = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const read = createHealthProbeCache(check, 15_000, () => time);
    expect(await read()).toBe(false);
    time = 14_999;
    expect(await read()).toBe(false);
    expect(check).toHaveBeenCalledTimes(1);
    time = 15_000;
    expect(await read()).toBe(true);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("never caches rejected probes and allows a subsequent retry", async () => {
    const check = vi.fn()
      .mockRejectedValueOnce(new Error("storage failure"))
      .mockResolvedValueOnce(false);
    const read = createHealthProbeCache(check, 15_000, () => 100);
    await expect(read()).rejects.toThrow("storage failure");
    expect(await read()).toBe(false);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("does not reuse a cached result when the system clock moves backwards", async () => {
    let time = 50_000;
    const check = vi.fn().mockResolvedValue(false);
    const read = createHealthProbeCache(check, 15_000, () => time);
    await read();
    time = 40_000;
    await read();
    expect(check).toHaveBeenCalledTimes(2);
  });
});
