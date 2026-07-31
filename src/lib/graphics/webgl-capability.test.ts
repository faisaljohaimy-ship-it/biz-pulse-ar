/**
 * WebGL capability — contract guard.
 *
 * The brief requires a fallback that appears WITHOUT mounting a renderer. The
 * load-bearing property is therefore negative: on a device with no WebGL,
 * `getContext` must be asked and the answer must be false, so the component
 * returns before `<Canvas>` is reached. A guard that returns true by accident
 * puts the repeating three.js error straight back.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetWebGLCapabilityCache, cappedDpr, canUseWebGL } from "./webgl-capability";

afterEach(() => {
  __resetWebGLCapabilityCache();
  vi.restoreAllMocks();
});

describe("canUseWebGL", () => {
  it("is false when no context can be created", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(canUseWebGL()).toBe(false);
  });

  it("is false when context creation throws rather than returning null", () => {
    // Locked-down environments reject outright instead of answering.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("WebGL blocked by policy");
    });
    expect(canUseWebGL()).toBe(false);
  });

  it("caches — repeated probing is itself a source of context exhaustion", () => {
    // Browsers cap live WebGL contexts and evict the oldest. Probing on every
    // render can therefore break a canvas that was already working.
    const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    canUseWebGL();
    canUseWebGL();
    canUseWebGL();
    const callsAfterFirstAnswer = spy.mock.calls.length;
    canUseWebGL();
    expect(spy.mock.calls.length).toBe(callsAfterFirstAnswer);
  });

  it("actually asks the canvas — a guard that never probes proves nothing", () => {
    const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    canUseWebGL();
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.flat()).toContain("webgl2");
  });
});

describe("cappedDpr", () => {
  it("never exceeds the cap", () => {
    vi.stubGlobal("devicePixelRatio", 3);
    // An uncapped 3× surface renders nine times the pixels of 1× for what is
    // decorative geometry — the usual cause of thermal throttling on mobile.
    expect(cappedDpr(2)[1]).toBe(2);
    vi.unstubAllGlobals();
  });

  it("does not upscale a low-DPR screen", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    expect(cappedDpr(2)[1]).toBe(1);
    vi.unstubAllGlobals();
  });
});
