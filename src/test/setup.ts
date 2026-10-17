import "@testing-library/jest-dom/vitest";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

// ملفٌّ يعلن `// @vitest-environment node` (مسارات الخادم التي تقرأ `FormData`
// بصنف `File` الأصلي لا صنف jsdom) لا يملك `window`؛ فتوثيق jsdom أدناه له وحده.
const hasDom = typeof window !== "undefined" && typeof HTMLCanvasElement !== "undefined";

// jsdom lacks matchMedia & ResizeObserver — used by Radix and reduced-motion checks.
if (hasDom && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

class ROStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (hasDom) {
  (window as unknown as { ResizeObserver: typeof ROStub }).ResizeObserver ||= ROStub;

  // jsdom deliberately leaves canvas unimplemented and emits noisy diagnostics.
  // Returning null matches a browser where WebGL is unavailable and exercises
  // each component's lightweight fallback path.
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => null,
  });
}
