import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// Exercise the actual inline head script rather than a mocked replacement.
const ROOT = readFileSync("src/routes/__root.tsx", "utf8");
const start = ROOT.indexOf("PWA service-worker registration");
if (start < 0) throw new Error("PWA registration section is missing");
const script = ROOT.slice(start).match(/children:\s*`([^`]+)`/)?.[1] ?? "";
if (!script) throw new Error("PWA registration script was not found");

function simulate(protocol: string, supported = true) {
  const calls: string[] = [];
  const listeners: Record<string, () => void> = {};
  const navigator = supported
    ? {
        serviceWorker: {
          register: (path: string) => {
            calls.push(path);
            return Promise.resolve();
          },
        },
      }
    : {};
  runInNewContext(script, {
    location: { protocol },
    navigator,
    window: {
      addEventListener: (name: string, callback: () => void) => {
        listeners[name] = callback;
      },
    },
  });
  listeners.load?.();
  return { calls, hasLoadHandler: Boolean(listeners.load) };
}

describe("PWA registration scheme guard", () => {
  it("never attempts to register from HTTP localhost in Safari and CI", () => {
    expect(simulate("http:")).toEqual({ calls: [], hasLoadHandler: false });
  });

  it("registers the same worker from a supported HTTPS origin", () => {
    expect(simulate("https:")).toEqual({ calls: ["/sw.js"], hasLoadHandler: true });
  });

  it("does not register when the browser has no service worker support", () => {
    expect(simulate("https:", false)).toEqual({ calls: [], hasLoadHandler: false });
  });
});
